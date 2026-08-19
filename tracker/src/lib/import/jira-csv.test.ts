import { baseHeader, buildTickets, chunk, findField, parseJiraDate } from './jira-csv';

const HEADERS = ['Issue key', 'Summary', 'Status', 'Created', 'Description', 'Comment_1', 'Comment_2'];

const ROWS: Record<string, string>[] = [
  {
    'Issue key': 'AZSUP-1001',
    Summary: 'Register offline at 144488-USA_FBRB_53401230183',
    Status: 'Open',
    Created: '16/Mar/25 3:42 PM',
    Description: 'Catalog 144488-USA_FBRB_5340 impacted.',
    Comment_1: 'also 144488-USA_FBRB_534050611',
    Comment_2: '',
  },
  {
    'Issue key': 'AZSUP-1002',
    Summary: 'Nothing relevant here',
    Status: 'Waiting for Verification',
    Created: '17/Mar/25 9:00 AM',
    Description: 'No keys in this ticket at all.',
    Comment_1: '',
    Comment_2: '',
  },
  {
    'Issue key': '',
    Summary: 'Orphan row with no issue key',
    Status: 'Open',
    Created: '',
    Description: '45489-BRA_OXYN_12345',
    Comment_1: '',
    Comment_2: '',
  },
];

describe('baseHeader', () => {
  it('strips the numeric suffix Papa Parse adds to duplicate JIRA headers', () => {
    expect(baseHeader('Comment_2')).toBe('comment');
    expect(baseHeader('Comment')).toBe('comment');
  });

  it('lowercases and trims custom field names', () => {
    expect(baseHeader('  Custom field (Catalog) ')).toBe('custom field (catalog)');
  });
});

describe('findField', () => {
  it('finds the issue key column', () => {
    expect(findField(HEADERS, 'ticketKey')).toBe('Issue key');
  });

  it('is case-insensitive', () => {
    expect(findField(['ISSUE KEY'], 'ticketKey')).toBe('ISSUE KEY');
  });

  it('returns null when the column is absent', () => {
    expect(findField(['Summary'], 'ticketKey')).toBeNull();
  });
});

describe('parseJiraDate', () => {
  it('reads the JIRA dd/Mon/yy h:mm AM format', () => {
    expect(parseJiraDate('16/Mar/25 3:42 PM')).toBe('2025-03-16T15:42:00.000Z');
  });

  it('handles 12 AM and 12 PM correctly', () => {
    expect(parseJiraDate('16/Mar/25 12:00 AM')).toBe('2025-03-16T00:00:00.000Z');
    expect(parseJiraDate('16/Mar/25 12:00 PM')).toBe('2025-03-16T12:00:00.000Z');
  });

  it('falls back to ISO parsing', () => {
    expect(parseJiraDate('2025-03-16T10:00:00Z')).toBe('2025-03-16T10:00:00.000Z');
  });

  it('returns null rather than a wrong date for junk', () => {
    expect(parseJiraDate('not a date')).toBeNull();
    expect(parseJiraDate('')).toBeNull();
    expect(parseJiraDate(null)).toBeNull();
  });
});

describe('buildTickets', () => {
  const report = buildTickets(ROWS, HEADERS);

  it('skips rows with no issue key and counts them', () => {
    expect(report.tickets).toHaveLength(2);
    expect(report.rowsWithoutTicketKey).toBe(1);
  });

  it('promotes the known JIRA fields', () => {
    const t = report.tickets[0];
    expect(t.ticketKey).toBe('AZSUP-1001');
    expect(t.status).toBe('Open');
    expect(t.jiraCreatedAt).toBe('2025-03-16T15:42:00.000Z');
  });

  it('finds keys across summary, description and comment columns', () => {
    const t = report.tickets[0];
    expect(t.keys.map((k) => k.key).sort()).toEqual([
      '144488-USA_FBRB_5340',
      '144488-USA_FBRB_53401230183',
      '144488-USA_FBRB_534050611',
    ]);
  });

  it('records which column each key came from', () => {
    const t = report.tickets[0];
    const byKey = Object.fromEntries(t.keys.map((k) => [k.key, k.column]));
    expect(byKey['144488-USA_FBRB_5340']).toBe('description');
    expect(byKey['144488-USA_FBRB_53401230183']).toBe('summary');
    expect(byKey['144488-USA_FBRB_534050611']).toBe('comment');
  });

  it('counts tickets that contain no keys', () => {
    expect(report.rowsWithoutKeys).toBe(1);
  });

  it('keeps the full row so nothing from the export is lost', () => {
    expect(report.tickets[0].raw['Comment_1']).toContain('534050611');
  });

  it('reports an error when there is no issue key column', () => {
    const bad = buildTickets([{ Summary: 'x' }], ['Summary']);
    expect(bad.errors[0]).toMatch(/Issue key/);
    expect(bad.tickets).toHaveLength(0);
  });

  it('flags keys repeated across the source', () => {
    const dupRows = [
      { 'Issue key': 'A-1', Summary: '144488-USA_FBRB_5340' },
      { 'Issue key': 'A-2', Summary: '144488-USA_FBRB_5340' },
    ];
    const r = buildTickets(dupRows, ['Issue key', 'Summary']);
    expect(r.duplicateKeys).toEqual([{ key: '144488-USA_FBRB_5340', count: 2 }]);
  });

  it('does not double-record a key repeated in the same column of one ticket', () => {
    const r = buildTickets(
      [{ 'Issue key': 'A-1', Summary: '144488-USA_FBRB_5340 and 144488-USA_FBRB_5340' }],
      ['Issue key', 'Summary']
    );
    expect(r.tickets[0].keys).toHaveLength(1);
  });
});

describe('ragged and messy rows', () => {
  // Papa Parse emits null for missing trailing fields; these used to reach the
  // API as nulls and fail validation for the whole batch.
  it('coerces null and undefined cells to empty strings', () => {
    const r = buildTickets(
      [{ 'Issue key': 'A-1', Summary: '144488-USA_FBRB_5340', Comment: null, Extra: undefined }],
      ['Issue key', 'Summary', 'Comment', 'Extra']
    );
    expect(r.tickets[0].raw.Comment).toBe('');
    expect(r.tickets[0].raw.Extra).toBe('');
    expect(Object.values(r.tickets[0].raw).every((v) => typeof v === 'string')).toBe(true);
  });

  it('flattens the __parsed_extra array Papa adds to over-long rows', () => {
    const r = buildTickets(
      [{ 'Issue key': 'A-1', Summary: 'x', __parsed_extra: ['144488-USA_FBRB_5340', null] }],
      ['Issue key', 'Summary']
    );
    expect(r.tickets[0].raw.__parsed_extra).toBe('144488-USA_FBRB_5340');
    // Keys hiding in overflow columns are still found.
    expect(r.tickets[0].keys.map((k) => k.key)).toContain('144488-USA_FBRB_5340');
  });

  it('coerces numeric cells to strings', () => {
    const r = buildTickets([{ 'Issue key': 'A-1', Votes: 3 }], ['Issue key', 'Votes']);
    expect(r.tickets[0].raw.Votes).toBe('3');
  });
});

describe('chunk', () => {
  it('splits into batches of the requested size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns nothing for an empty list', () => {
    expect(chunk([], 10)).toEqual([]);
  });
});
