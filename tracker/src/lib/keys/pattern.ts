/**
 * The one place the catalog / app group key format lives.
 *
 * Observed shape:
 *   catalog     144488-USA_FBRB_5340
 *   app group   144488-USA_FBRB_53401230183
 *               \____/ \_/ \__/ \_________/
 *                org  ctry seg      tail
 *
 * The defining property: an app group key is its catalog key with extra digits
 * appended to the tail. That makes the Catalog -> App Group hierarchy derivable
 * from the string itself, with one caveat -- given an app group key alone the
 * split point is ambiguous (5340|1230183 vs 53401|230183), so a registry of
 * known catalogs is what resolves it. See classifyKey().
 */

export const COUNTRY_CODES = ['USA', 'BRA', 'MEX'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

/** Catalog tails run 3-5 digits ("length can vary by 1 or 2"). */
export const CATALOG_TAIL_MIN = 3;
export const CATALOG_TAIL_MAX = 5;

const COUNTRY_ALT = COUNTRY_CODES.join('|');

/**
 * Global matcher used to sweep free text. Deliberately specific: ticket ids
 * (AZ-1234), ISO dates (2025-03-16) and status words cannot match it, which is
 * what makes scanning every CSV column safe.
 */
export const KEY_PATTERN = new RegExp(
  String.raw`(?<![A-Za-z0-9_-])(\d{4,8})-(${COUNTRY_ALT})_([A-Z0-9]{2,8})_(\d{2,20})(?![A-Za-z0-9_-])`,
  'gi'
);

/** Anchored variant for validating a single candidate string. */
export const KEY_PATTERN_EXACT = new RegExp(
  String.raw`^(\d{4,8})-(${COUNTRY_ALT})_([A-Z0-9]{2,8})_(\d{2,20})$`,
  'i'
);

export type KeyType = 'catalog' | 'app_group' | 'unknown';

export interface ParsedKey {
  /** Text exactly as it appeared in the source. */
  raw: string;
  /** Uppercased, trimmed -- the canonical form stored in the database. */
  normalized: string;
  org: string;
  country: string;
  segment: string;
  tail: string;
}

/**
 * Canonical form. Strips BOM / zero-width characters that survive CSV exports
 * and would otherwise create a second, invisibly-different key row.
 */
export function normalizeKey(input: string): string {
  return input
    .replace(/[﻿​-‍⁠]/g, '')
    .trim()
    .toUpperCase();
}

function toParsed(raw: string, m: RegExpMatchArray): ParsedKey {
  const normalized = normalizeKey(raw);
  return {
    raw,
    normalized,
    org: m[1],
    country: m[2].toUpperCase(),
    segment: m[3].toUpperCase(),
    tail: m[4],
  };
}

/** Parse a single string that is expected to be a whole key. */
export function parseKey(input: string): ParsedKey | null {
  const normalized = normalizeKey(input);
  const m = normalized.match(KEY_PATTERN_EXACT);
  return m ? toParsed(input.trim(), m) : null;
}

/**
 * Pull every key out of a blob of text (a CSV cell, a description, a pasted
 * column). Deduplicated by normalized form, first occurrence wins.
 */
export function extractKeys(text: string | null | undefined): ParsedKey[] {
  if (!text) return [];
  const out: ParsedKey[] = [];
  const seen = new Set<string>();
  // Fresh regex per call: KEY_PATTERN is /g and carries lastIndex state.
  const re = new RegExp(KEY_PATTERN.source, KEY_PATTERN.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const parsed = toParsed(m[0], m);
    if (seen.has(parsed.normalized)) continue;
    seen.add(parsed.normalized);
    out.push(parsed);
  }
  return out;
}

/**
 * Split a pasted block or CSV column into candidate key strings. Accepts
 * newline, comma, semicolon, tab and whitespace separation, which covers every
 * way a key list arrives in practice.
 *
 * Returns raw tokens (including junk) so callers can report what failed to
 * parse rather than silently dropping it.
 */
export function tokenizeKeyInput(input: string): string[] {
  return input
    .split(/[\s,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export interface Classification {
  type: KeyType;
  /** Normalized catalog key this app group belongs to, when resolvable. */
  parentKey: string | null;
  /**
   * 'registry' -- matched a known catalog, definitive.
   * 'heuristic' -- inferred from tail length, may be corrected later.
   */
  confidence: 'registry' | 'heuristic';
}

/**
 * Decide whether a key is a catalog or an app group.
 *
 * 1. Exact hit in the catalog registry            -> catalog          (definitive)
 * 2. Longest known catalog that is a strict prefix -> app group + parent (definitive)
 * 3. Nothing known                                 -> tail length guess (heuristic)
 *
 * Case 3 is why registerCatalog() runs a backfill: once a catalog becomes
 * known, previously-orphaned app groups get relinked to it.
 */
export function classifyKey(
  key: string,
  catalogRegistry: ReadonlySet<string> | readonly string[] = []
): Classification {
  const normalized = normalizeKey(key);
  const registry =
    catalogRegistry instanceof Set ? catalogRegistry : new Set(catalogRegistry);

  const parsed = parseKey(normalized);
  if (!parsed) return { type: 'unknown', parentKey: null, confidence: 'heuristic' };

  if (registry.has(normalized)) {
    return { type: 'catalog', parentKey: null, confidence: 'registry' };
  }

  // Longest prefix wins: with both ..._5340 and ..._53401 registered, the more
  // specific catalog is the true parent.
  let best: string | null = null;
  for (const candidate of registry) {
    if (candidate.length >= normalized.length) continue;
    if (!normalized.startsWith(candidate)) continue;
    // Guard against 144488-USA_FBRB_5340 matching 144488-USA_FBRB_53 style
    // partials from a different segment -- prefix must end inside the tail.
    if (best === null || candidate.length > best.length) best = candidate;
  }
  if (best) {
    return { type: 'app_group', parentKey: best, confidence: 'registry' };
  }

  const isCatalogLength =
    parsed.tail.length >= CATALOG_TAIL_MIN && parsed.tail.length <= CATALOG_TAIL_MAX;
  return {
    type: isCatalogLength ? 'catalog' : 'app_group',
    parentKey: null,
    confidence: 'heuristic',
  };
}

/**
 * Possible catalog keys an unresolved app group could belong to, longest tail
 * first. Used to suggest a parent when the registry has no answer yet.
 */
export function deriveParentCandidates(key: string): string[] {
  const parsed = parseKey(key);
  if (!parsed) return [];
  const { org, country, segment, tail } = parsed;
  const out: string[] = [];
  const max = Math.min(CATALOG_TAIL_MAX, tail.length - 1);
  for (let len = max; len >= CATALOG_TAIL_MIN; len--) {
    out.push(`${org}-${country}_${segment}_${tail.slice(0, len)}`);
  }
  return out;
}

/** True when `child` is a strictly longer key sharing `parent` as its prefix. */
export function isDescendantOf(child: string, parent: string): boolean {
  const c = normalizeKey(child);
  const p = normalizeKey(parent);
  return c.length > p.length && c.startsWith(p);
}
