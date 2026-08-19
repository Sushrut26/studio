/**
 * @jest-environment node
 */
/**
 * End-to-end checks against a real Postgres.
 *
 * Skipped automatically when TEST_DATABASE_URL is unset, so `npm test` stays
 * green without a database. Run the full suite with:
 *   TEST_DATABASE_URL=postgres://... npm test
 */
const DB_URL = process.env.TEST_DATABASE_URL;
const describeDb = DB_URL ? describe : describe.skip;

process.env.DATABASE_URL = DB_URL ?? '';

import { buildTickets } from '@/lib/import/jira-csv';
import { closePool, getSql } from '@/lib/db';
import {
  bulkLookup,
  catalogRepeats,
  createList,
  getCatalogRegistry,
  getKey,
  getListDetail,
  listOverlap,
  listsForKey,
  registerCatalog,
  replaceOccurrences,
  ticketsForKey,
  upsertKey,
  upsertTicket,
} from '@/lib/queries';

const CATALOG = '144488-USA_FBRB_5340';
const APP_A = '144488-USA_FBRB_53401230183';
const APP_B = '144488-USA_FBRB_534050611';
const OTHER = '45489-BRA_OXYN_12345';

const HEADERS = ['Issue key', 'Summary', 'Status', 'Created', 'Description'];
const ROWS = [
  {
    'Issue key': 'AZSUP-1',
    Summary: `Outage on ${APP_A}`,
    Status: 'Open',
    Created: '16/Mar/25 3:42 PM',
    Description: `Also affects ${APP_B}`,
  },
  {
    'Issue key': 'AZSUP-2',
    Summary: 'Register down',
    Status: 'Open',
    Created: '17/Mar/25 9:00 AM',
    Description: `Catalog ${CATALOG} impacted`,
  },
  {
    'Issue key': 'AZSUP-3',
    Summary: `Unrelated ${OTHER}`,
    Status: 'Closed',
    Created: '18/Mar/25 9:00 AM',
    Description: 'nothing else',
  },
];

/** Mirrors what the import route does, so the test exercises the real path. */
async function ingest(rows: Record<string, string>[], headers: string[]) {
  const report = buildTickets(rows, headers);
  const registry = await getCatalogRegistry();
  const keyIds = new Map<string, number>();
  for (const k of report.uniqueKeys) {
    const row = await upsertKey(k, registry);
    keyIds.set(row.key_text, row.id);
  }
  for (const t of report.tickets) {
    const { id } = await upsertTicket({
      ticketKey: t.ticketKey,
      summary: t.summary,
      status: t.status,
      jiraCreatedAt: t.jiraCreatedAt,
      raw: t.raw,
    });
    await replaceOccurrences(
      id,
      t.keys.map((k) => ({ keyId: keyIds.get(k.key)!, column: k.column, rawMatch: k.rawMatch }))
    );
  }
  return report;
}

describeDb('end-to-end against Postgres', () => {
  beforeAll(async () => {
    const sql = getSql();
    await sql`truncate ticket_key_occurrences, list_items, lists, tickets, keys, imports restart identity cascade`;
  });

  afterAll(async () => {
    const sql = getSql();
    await sql`truncate ticket_key_occurrences, list_items, lists, tickets, keys, imports restart identity cascade`;
    await closePool();
  });

  it('imports a JIRA export and records key occurrences', async () => {
    const report = await ingest(ROWS, HEADERS);
    expect(report.tickets).toHaveLength(3);

    const sql = getSql();
    const [{ count }] = await sql<{ count: string }>`select count(*) from tickets`;
    expect(Number(count)).toBe(3);
  });

  it('re-importing the same export does not duplicate anything', async () => {
    const sql = getSql();
    const before = await sql<{ t: string; o: string }>`
      select (select count(*) from tickets) as t,
             (select count(*) from ticket_key_occurrences) as o
    `;
    await ingest(ROWS, HEADERS);
    const after = await sql<{ t: string; o: string }>`
      select (select count(*) from tickets) as t,
             (select count(*) from ticket_key_occurrences) as o
    `;
    expect(after[0]).toEqual(before[0]);
  });

  it('leaves an app group unparented when its catalog is not yet known', async () => {
    // Imported against an empty registry, with no catalog to match a prefix against.
    const orphan = await upsertKey('999999-MEX_ZZZZ_777012345', new Set<string>());
    expect(orphan.parent_key_id).toBeNull();
    expect(orphan.key_type).toBe('app_group');
  });

  it('registering a catalog adopts app groups imported beneath it', async () => {
    const { adopted } = await registerCatalog('999999-MEX_ZZZZ_777');
    expect(adopted).toBe(1);

    const child = await getKey('999999-MEX_ZZZZ_777012345');
    const catalog = await getKey('999999-MEX_ZZZZ_777');
    expect(String(child?.parent_key_id)).toBe(String(catalog!.id));
    expect(child?.key_type).toBe('app_group');
  });

  it('links app groups to their catalog once it is known', async () => {
    await registerCatalog(CATALOG);
    const child = await getKey(APP_A);
    const catalog = await getKey(CATALOG);
    expect(String(child?.parent_key_id)).toBe(String(catalog!.id));
    expect(child?.key_type).toBe('app_group');
  });

  it('a catalog search surfaces tickets that only named its app groups', async () => {
    const tickets = await ticketsForKey(CATALOG);
    const byTicket = Object.fromEntries(tickets.map((t) => [t.ticket_key, t.rel]));

    // AZSUP-2 names the catalog itself; AZSUP-1 only names its app groups.
    expect(byTicket['AZSUP-2']).toBe('self');
    expect(byTicket['AZSUP-1']).toBe('child');
    // The unrelated catalog must not leak in.
    expect(byTicket['AZSUP-3']).toBeUndefined();
  });

  it('returns one row per matching key, which callers must collapse per ticket', async () => {
    // AZSUP-1 names two different app groups of the same catalog, so a catalog
    // search yields two rows for that one ticket. The key page groups these;
    // counting raw rows would overstate "in tickets" -- which it once did.
    const tickets = await ticketsForKey(CATALOG);
    const forAzsup1 = tickets.filter((t) => t.ticket_key === 'AZSUP-1');
    expect(forAzsup1.length).toBe(2);
    expect(new Set(forAzsup1.map((t) => t.matched_key)).size).toBe(2);

    const distinct = new Set(tickets.map((t) => t.ticket_key));
    expect(distinct.size).toBeLessThan(tickets.length);
  });

  it('bulk lookup counts distinct tickets, not match rows', async () => {
    // The same situation via the other code path: this one must already be
    // distinct, because nothing downstream collapses it.
    const [result] = await bulkLookup([CATALOG]);
    expect(result.ticketCount).toBe(2);
  });

  it('an app group search surfaces its parent catalog', async () => {
    const tickets = await ticketsForKey(APP_A);
    const rels = tickets.map((t) => t.rel);
    expect(rels).toContain('self');
    expect(rels).toContain('parent');
  });

  it('creates a list and finds it from a member key', async () => {
    const { id, inserted } = await createList({
      name: 'March remediation',
      source: 'manual',
      items: [{ key: APP_A }, { key: APP_B }, { key: OTHER }],
    });
    expect(inserted).toBe(3);

    const lists = await listsForKey(APP_A);
    expect(lists.map((l) => l.list_name)).toContain('March remediation');

    const detail = await getListDetail(id);
    expect(detail?.items).toHaveLength(3);
  });

  it('reports which earlier lists a new list overlaps with', async () => {
    const { id } = await createList({
      name: 'April sweep',
      source: 'manual',
      items: [{ key: APP_A }, { key: CATALOG }],
    });

    const detail = await getListDetail(id);
    const appA = detail!.items.find((i) => i.key_text === APP_A)!;
    expect(appA.other_lists.map((l) => l.name)).toContain('March remediation');
  });

  it('bulk lookup flags seen keys and new keys distinctly', async () => {
    const results = await bulkLookup([APP_A, '144488-USA_FBRB_534099999', 'garbage']);

    expect(results[0].known).toBe(true);
    expect(results[0].listCount).toBeGreaterThanOrEqual(2);
    expect(results[0].parentKey).toBe(CATALOG);

    expect(results[1].known).toBe(false);
    expect(results[1].listCount).toBe(0);

    expect(results[2].normalized).toBeNull();
  });

  it('bulk lookup keeps duplicate inputs as separate rows', async () => {
    const results = await bulkLookup([APP_A, APP_A]);
    expect(results).toHaveLength(2);
  });

  it('rolls app groups up into their parent catalog in the repeats leaderboard', async () => {
    const repeats = await catalogRepeats({ limit: 50 });
    const row = repeats.find((r) => r.catalog_key === CATALOG)!;

    // APP_A is in both lists and CATALOG is in one, so the catalog rolls up to 2.
    expect(Number(row.list_count)).toBe(2);
    expect(Number(row.app_group_count)).toBeGreaterThanOrEqual(2);
    // Tickets from both the catalog and its children are counted.
    expect(Number(row.ticket_count)).toBe(2);
  });

  it('respects the minLists filter', async () => {
    const repeats = await catalogRepeats({ minLists: 2, limit: 50 });
    expect(repeats.every((r) => Number(r.list_count) >= 2)).toBe(true);
    expect(repeats.map((r) => r.catalog_key)).toContain(CATALOG);
  });

  it('reports the shared keys between two lists', async () => {
    const overlap = await listOverlap();
    expect(overlap).toHaveLength(1);
    expect(Number(overlap[0].shared_keys)).toBe(1);
  });

  it('removes occurrences for a key dropped from a ticket between exports', async () => {
    // Re-import AZSUP-1 with the second app group removed from its description.
    await ingest(
      [{ ...ROWS[0], Description: 'no longer mentions the second app group' }],
      HEADERS
    );

    const tickets = await ticketsForKey(APP_B);
    expect(tickets.map((t) => t.ticket_key)).not.toContain('AZSUP-1');
  });
});
