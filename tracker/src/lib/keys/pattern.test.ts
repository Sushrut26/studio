import {
  classifyKey,
  deriveParentCandidates,
  extractKeys,
  isDescendantOf,
  normalizeKey,
  parseKey,
  tokenizeKeyInput,
} from './pattern';

// Real examples supplied by the user.
const CATALOGS = [
  '144488-USA_FBRB_5340',
  '45489-BRA_OXYN_12345',
  '45489-MEX_OXYN_12346',
];

const APP_GROUPS = [
  '144488-USA_FBRB_53401230183',
  '144488-USA_FBRB_53401230183', // duplicated in the source list
  '144488-USA_FBRB_53401826801',
  '144488-USA_FBRB_534050611',
  '144488-USA_FBRB_53401816932',
  '144488-USA_FBRB_534050611', // duplicated in the source list
  '144488-USA_FBRB_534074933',
  '144488-USA_FBRB_534051652',
  '144488-USA_FBRB_53401816932', // duplicated in the source list
  '144488-USA_FBRB_53401479803',
  '144488-USA_FBRB_534086371',
  '144488-USA_FBRB_534051651',
  '144488-USA_FBRB_53401777693',
];

const PARENT = '144488-USA_FBRB_5340';

describe('parseKey', () => {
  it.each(CATALOGS)('parses catalog %s', (key) => {
    expect(parseKey(key)).not.toBeNull();
  });

  it.each([...new Set(APP_GROUPS)])('parses app group %s', (key) => {
    expect(parseKey(key)).not.toBeNull();
  });

  it('splits a key into its parts', () => {
    expect(parseKey('144488-USA_FBRB_53401230183')).toEqual({
      raw: '144488-USA_FBRB_53401230183',
      normalized: '144488-USA_FBRB_53401230183',
      org: '144488',
      country: 'USA',
      segment: 'FBRB',
      tail: '53401230183',
    });
  });

  it('accepts all three country codes', () => {
    for (const c of ['USA', 'BRA', 'MEX']) {
      expect(parseKey(`45489-${c}_OXYN_12345`)?.country).toBe(c);
    }
  });

  it('rejects an unknown country code', () => {
    expect(parseKey('45489-CAN_OXYN_12345')).toBeNull();
  });
});

describe('normalizeKey', () => {
  it('uppercases and trims', () => {
    expect(normalizeKey('  144488-usa_fbrb_5340 ')).toBe('144488-USA_FBRB_5340');
  });

  it('strips BOM and zero-width characters left by CSV exports', () => {
    expect(normalizeKey('﻿144488-USA_FBRB_5340​')).toBe('144488-USA_FBRB_5340');
  });

  it('makes a lowercase key parse identically', () => {
    expect(parseKey('144488-usa_fbrb_5340')?.normalized).toBe(PARENT);
  });
});

describe('extractKeys', () => {
  it('finds a key embedded in free text', () => {
    const text = 'Remediation needed for 144488-USA_FBRB_5340 before Friday.';
    expect(extractKeys(text).map((k) => k.normalized)).toEqual([PARENT]);
  });

  it('finds several keys across a multiline description', () => {
    const text = `Affected:\n  144488-USA_FBRB_53401230183\n  45489-BRA_OXYN_12345\ndone`;
    expect(extractKeys(text).map((k) => k.normalized)).toEqual([
      '144488-USA_FBRB_53401230183',
      '45489-BRA_OXYN_12345',
    ]);
  });

  it('deduplicates repeated mentions within one blob', () => {
    const text = `${PARENT} and again ${PARENT}`;
    expect(extractKeys(text)).toHaveLength(1);
  });

  it('is not confused by adjacent punctuation', () => {
    expect(extractKeys(`(${PARENT}), [45489-BRA_OXYN_12345];`).map((k) => k.normalized)).toEqual([
      PARENT,
      '45489-BRA_OXYN_12345',
    ]);
  });

  it('returns nothing for empty or null input', () => {
    expect(extractKeys('')).toEqual([]);
    expect(extractKeys(null)).toEqual([]);
    expect(extractKeys(undefined)).toEqual([]);
  });

  // The whole scan-every-column strategy rests on these not matching.
  it.each([
    ['a JIRA issue id', 'AZ-1234'],
    ['a longer JIRA issue id', 'AZSUP-98765'],
    ['an ISO date', '2025-03-16'],
    ['a status word', 'WAITING_FOR_VERIFICATION'],
    ['a version string', '1.2.3-RC_BUILD_44'],
    ['prose', 'Autoapp-Issue reported by the store team'],
    ['a phone number', '144488-5340'],
  ])('produces no false positive for %s', (_label, text) => {
    expect(extractKeys(text)).toEqual([]);
  });

  it('does not match a key glued to surrounding word characters', () => {
    expect(extractKeys(`X${PARENT}`)).toEqual([]);
    expect(extractKeys(`${PARENT}X`)).toEqual([]);
  });
});

describe('classifyKey with a populated registry', () => {
  const registry = new Set(CATALOGS);

  it.each(CATALOGS)('classifies %s as a catalog', (key) => {
    expect(classifyKey(key, registry)).toEqual({
      type: 'catalog',
      parentKey: null,
      confidence: 'registry',
    });
  });

  it.each([...new Set(APP_GROUPS)])('classifies %s as an app group under its catalog', (key) => {
    expect(classifyKey(key, registry)).toEqual({
      type: 'app_group',
      parentKey: PARENT,
      confidence: 'registry',
    });
  });

  it('prefers the longest matching catalog prefix', () => {
    const nested = new Set([PARENT, '144488-USA_FBRB_53401']);
    expect(classifyKey('144488-USA_FBRB_53401230183', nested).parentKey).toBe(
      '144488-USA_FBRB_53401'
    );
  });

  it('does not treat a catalog as its own parent', () => {
    expect(classifyKey(PARENT, registry).parentKey).toBeNull();
  });
});

describe('classifyKey with an empty registry', () => {
  it.each(CATALOGS)('guesses %s is a catalog from its short tail', (key) => {
    expect(classifyKey(key, [])).toEqual({
      type: 'catalog',
      parentKey: null,
      confidence: 'heuristic',
    });
  });

  it.each([...new Set(APP_GROUPS)])('guesses %s is an app group with no parent yet', (key) => {
    expect(classifyKey(key, [])).toEqual({
      type: 'app_group',
      parentKey: null,
      confidence: 'heuristic',
    });
  });

  it('marks unparseable input as unknown', () => {
    expect(classifyKey('not-a-key', []).type).toBe('unknown');
  });
});

describe('deriveParentCandidates', () => {
  it('offers the real catalog among the candidates, longest tail first', () => {
    const candidates = deriveParentCandidates('144488-USA_FBRB_53401230183');
    expect(candidates).toContain(PARENT);
    expect(candidates[0]).toBe('144488-USA_FBRB_53401');
  });

  it('returns nothing for a tail too short to split', () => {
    expect(deriveParentCandidates('144488-USA_FBRB_534')).toEqual([]);
  });

  it('returns nothing for unparseable input', () => {
    expect(deriveParentCandidates('nope')).toEqual([]);
  });
});

describe('isDescendantOf', () => {
  it.each([...new Set(APP_GROUPS)])('%s descends from its catalog', (key) => {
    expect(isDescendantOf(key, PARENT)).toBe(true);
  });

  it('a key does not descend from itself', () => {
    expect(isDescendantOf(PARENT, PARENT)).toBe(false);
  });

  it('an unrelated catalog is not a descendant', () => {
    expect(isDescendantOf('45489-BRA_OXYN_12345', PARENT)).toBe(false);
  });
});

describe('tokenizeKeyInput', () => {
  it('splits on newlines, commas, semicolons and whitespace', () => {
    const input = `${PARENT}\n45489-BRA_OXYN_12345, 45489-MEX_OXYN_12346;  144488-USA_FBRB_534050611`;
    expect(tokenizeKeyInput(input)).toEqual([
      PARENT,
      '45489-BRA_OXYN_12345',
      '45489-MEX_OXYN_12346',
      '144488-USA_FBRB_534050611',
    ]);
  });

  it('drops empty segments from ragged paste', () => {
    expect(tokenizeKeyInput(`\n\n  ${PARENT}  \n\n`)).toEqual([PARENT]);
  });
});
