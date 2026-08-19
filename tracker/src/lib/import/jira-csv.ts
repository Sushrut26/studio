import Papa from 'papaparse';
import { extractKeys } from '@/lib/keys/pattern';

/**
 * Header names JIRA uses for the fields we promote to columns. Matching is
 * case-insensitive and ignores the numeric suffix Papa Parse adds to duplicate
 * headers (JIRA repeats "Comment", "Labels", "Attachment" once per value).
 */
const FIELD_ALIASES: Record<string, string[]> = {
  ticketKey: ['issue key', 'key', 'issuekey'],
  summary: ['summary'],
  status: ['status'],
  issueType: ['issue type', 'issuetype', 'type'],
  assignee: ['assignee'],
  reporter: ['reporter'],
  jiraCreatedAt: ['created'],
  jiraUpdatedAt: ['updated'],
};

/** "Comment_3" -> "comment"; "Custom field (Catalog)" -> "custom field (catalog)". */
export function baseHeader(header: string): string {
  return header.replace(/_\d+$/, '').trim().toLowerCase();
}

export function findField(headers: string[], field: keyof typeof FIELD_ALIASES): string | null {
  const aliases = FIELD_ALIASES[field];
  for (const h of headers) {
    if (aliases.includes(baseHeader(h))) return h;
  }
  return null;
}

export interface ExtractedKeyRef {
  key: string;
  column: string;
  rawMatch: string;
}

export interface ParsedTicketRow {
  ticketKey: string;
  summary: string | null;
  status: string | null;
  issueType: string | null;
  assignee: string | null;
  reporter: string | null;
  jiraCreatedAt: string | null;
  jiraUpdatedAt: string | null;
  raw: Record<string, string>;
  keys: ExtractedKeyRef[];
}

export interface ParseReport {
  rows: number;
  tickets: ParsedTicketRow[];
  rowsWithoutTicketKey: number;
  rowsWithoutKeys: number;
  uniqueKeys: string[];
  /** Keys appearing more than once in the source, before dedupe. */
  duplicateKeys: { key: string; count: number }[];
  headers: string[];
  errors: string[];
}

/**
 * JIRA writes dates as "16/Mar/25 3:42 PM" among other things. Anything we
 * cannot confidently read becomes null rather than a wrong timestamp.
 */
export function parseJiraDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  const m = v.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?)?$/);
  if (m) {
    const [, d, mon, y, hh, mm, ap] = m;
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const monthIndex = months.indexOf(mon.toLowerCase());
    if (monthIndex >= 0) {
      let year = Number(y);
      if (year < 100) year += 2000;
      let hour = hh ? Number(hh) : 0;
      if (ap) {
        const isPm = ap.toLowerCase() === 'pm';
        if (isPm && hour < 12) hour += 12;
        if (!isPm && hour === 12) hour = 0;
      }
      const date = new Date(Date.UTC(year, monthIndex, Number(d), hour, mm ? Number(mm) : 0));
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }

  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Turn already-parsed CSV rows into tickets plus their key occurrences.
 *
 * Every column is scanned, not just known ones -- keys turn up in descriptions
 * and custom fields as often as in dedicated columns, and the key pattern is
 * specific enough that a blanket scan produces no false positives.
 */
/**
 * Papa Parse yields null/undefined for ragged trailing fields, and an array
 * under `__parsed_extra` when a row has more fields than headers. Flatten all
 * of it to strings so downstream code and validation only ever see strings.
 */
function coerceRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null) out[k] = '';
    else if (Array.isArray(v)) out[k] = v.filter((x) => x != null).join(' ');
    else out[k] = String(v);
  }
  return out;
}

export function buildTickets(
  rawRows: Record<string, unknown>[],
  headers: string[]
): ParseReport {
  const rows = rawRows.map(coerceRow);
  const keyCol = findField(headers, 'ticketKey');
  const tickets: ParsedTicketRow[] = [];
  const keyCounts = new Map<string, number>();
  let rowsWithoutTicketKey = 0;
  let rowsWithoutKeys = 0;

  const get = (row: Record<string, string>, field: keyof typeof FIELD_ALIASES) => {
    const col = findField(headers, field);
    const v = col ? row[col] : undefined;
    return v && v.trim() ? v.trim() : null;
  };

  for (const row of rows) {
    const ticketKey = keyCol ? (row[keyCol] ?? '').trim() : '';
    if (!ticketKey) {
      rowsWithoutTicketKey++;
      continue;
    }

    const found: ExtractedKeyRef[] = [];
    const seenInRow = new Set<string>();
    for (const [header, value] of Object.entries(row)) {
      if (!value) continue;
      for (const k of extractKeys(value)) {
        keyCounts.set(k.normalized, (keyCounts.get(k.normalized) ?? 0) + 1);
        const dedupeKey = `${k.normalized}::${baseHeader(header)}`;
        if (seenInRow.has(dedupeKey)) continue;
        seenInRow.add(dedupeKey);
        found.push({ key: k.normalized, column: baseHeader(header), rawMatch: k.raw });
      }
    }
    if (found.length === 0) rowsWithoutKeys++;

    tickets.push({
      ticketKey,
      summary: get(row, 'summary'),
      status: get(row, 'status'),
      issueType: get(row, 'issueType'),
      assignee: get(row, 'assignee'),
      reporter: get(row, 'reporter'),
      jiraCreatedAt: parseJiraDate(get(row, 'jiraCreatedAt')),
      jiraUpdatedAt: parseJiraDate(get(row, 'jiraUpdatedAt')),
      raw: row,
      keys: found,
    });
  }

  const duplicateKeys = [...keyCounts.entries()]
    .filter(([, c]) => c > 1)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  return {
    rows: rows.length,
    tickets,
    rowsWithoutTicketKey,
    rowsWithoutKeys,
    uniqueKeys: [...keyCounts.keys()],
    duplicateKeys,
    headers,
    errors: keyCol ? [] : ['No "Issue key" column found -- nothing can be imported from this file.'],
  };
}

/**
 * Parse a JIRA CSV in the browser.
 *
 * Parsing client-side is deliberate: Vercel caps serverless request bodies
 * around 4.5 MB and Hobby functions at 10s, and a JIRA export with full
 * description fields blows past both. Extracting here means only compact
 * {ticket, keys[]} records cross the wire.
 */
export function parseJiraCsvFile(file: File): Promise<ParseReport> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.replace(/^﻿/, '').trim(),
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const report = buildTickets(result.data as Record<string, unknown>[], headers);
        report.errors.push(
          ...result.errors.slice(0, 5).map((e) => `Row ${e.row ?? '?'}: ${e.message}`)
        );
        resolve(report);
      },
      error: (err) => reject(err),
    });
  });
}

/** Parse a CSV of bare keys (a remediation list export, or the catalog registry). */
export function parseKeyCsvFile(file: File): Promise<{ keys: string[]; raw: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (result) => {
        const raw: string[] = [];
        const keys: string[] = [];
        for (const row of result.data) {
          for (const cell of row) {
            if (!cell) continue;
            raw.push(cell);
            for (const k of extractKeys(cell)) keys.push(k.normalized);
          }
        }
        resolve({ keys, raw });
      },
      error: (err) => reject(err),
    });
  });
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
