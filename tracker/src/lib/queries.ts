import { getSql } from './db';
import {
  classifyKey,
  normalizeKey,
  parseKey,
  type KeyType,
} from './keys/pattern';

/* ------------------------------------------------------------------ types */

export interface KeyRow {
  id: number;
  key_text: string;
  key_type: KeyType;
  parent_key_id: number | null;
  org_id: string | null;
  country: string | null;
  segment: string | null;
  tail: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export type Relation = 'self' | 'parent' | 'child';

export interface TicketMatch {
  rel: Relation;
  matched_key: string;
  ticket_key: string;
  summary: string | null;
  status: string | null;
  issue_type: string | null;
  jira_created_at: string | null;
  found_in: string[];
}

export interface ListMatch {
  rel: Relation;
  matched_key: string;
  list_id: number;
  list_name: string;
  created_at: string;
}

export interface LookupResult {
  input: string;
  normalized: string | null;
  known: boolean;
  type: KeyType;
  parentKey: string | null;
  confidence: 'registry' | 'heuristic';
  listCount: number;
  ticketCount: number;
  lists: { id: number; name: string; rel: Relation }[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

/* ------------------------------------------------------- catalog registry */

/** Every key currently classified as a catalog. Drives classification. */
export async function getCatalogRegistry(): Promise<Set<string>> {
  const sql = getSql();
  const rows = (await sql`
    select key_text from keys where key_type = 'catalog'
  `) as { key_text: string }[];
  return new Set(rows.map((r) => r.key_text));
}

/**
 * Insert a key if absent, returning its row. Classification uses the supplied
 * registry so a bulk import can classify hundreds of keys against one snapshot
 * rather than re-reading the registry per key.
 */
export async function upsertKey(
  keyText: string,
  registry: ReadonlySet<string>
): Promise<KeyRow & { inserted: boolean }> {
  const sql = getSql();
  const normalized = normalizeKey(keyText);
  const parsed = parseKey(normalized);
  const { type, parentKey } = classifyKey(normalized, registry);

  let parentId: number | null = null;
  if (parentKey) {
    const parentRows = (await sql`
      select id from keys where key_text = ${parentKey}
    `) as { id: number }[];
    parentId = parentRows[0]?.id ?? null;
  }

  const rows = (await sql`
    insert into keys (key_text, key_type, parent_key_id, org_id, country, segment, tail)
    values (
      ${normalized}, ${type}, ${parentId},
      ${parsed?.org ?? null}, ${parsed?.country ?? null},
      ${parsed?.segment ?? null}, ${parsed?.tail ?? null}
    )
    on conflict (key_text) do update set
      last_seen_at = now(),
      -- Never downgrade a definitive parent link back to null.
      parent_key_id = coalesce(excluded.parent_key_id, keys.parent_key_id)
    returning *, (xmax = 0) as inserted
  `) as (KeyRow & { inserted: boolean })[];

  return rows[0];
}

/**
 * Promote a key to catalog and adopt any orphaned app groups beneath it.
 *
 * This is what makes classification self-correcting: keys imported before their
 * catalog was known get relinked the moment it is registered.
 */
export async function registerCatalog(
  keyText: string
): Promise<{ key: KeyRow; adopted: number }> {
  const sql = getSql();
  const normalized = normalizeKey(keyText);
  const parsed = parseKey(normalized);
  if (!parsed) throw new Error(`Not a valid key: ${keyText}`);

  const rows = (await sql`
    insert into keys (key_text, key_type, org_id, country, segment, tail)
    values (${normalized}, 'catalog', ${parsed.org}, ${parsed.country}, ${parsed.segment}, ${parsed.tail})
    on conflict (key_text) do update set
      key_type = 'catalog', parent_key_id = null, last_seen_at = now()
    returning *
  `) as KeyRow[];
  const key = rows[0];

  const adopted = (await sql`
    update keys child
       set parent_key_id = ${key.id},
           key_type      = 'app_group'
     where child.id <> ${key.id}
       and child.parent_key_id is distinct from ${key.id}
       and child.key_type <> 'catalog'
       and child.key_text like ${normalized + '%'}
    returning child.id
  `) as { id: number }[];

  return { key, adopted: adopted.length };
}

/* ----------------------------------------------------------- cross-refs */

/**
 * A key's family: itself, its parent catalog, and its child app groups.
 * Every cross-reference query fans out over this, which is how searching a
 * catalog surfaces tickets that only ever named one of its app groups.
 */
export async function ticketsForKey(keyText: string): Promise<TicketMatch[]> {
  const sql = getSql();
  const normalized = normalizeKey(keyText);
  return (await sql`
    with target as (
      select * from keys where key_text = ${normalized}
    ),
    family as (
      select t.id, t.key_text, 'self'::text as rel from target t
      union all
      select c.id, c.key_text, 'child' from keys c join target t on c.parent_key_id = t.id
      union all
      select p.id, p.key_text, 'parent' from keys p join target t on t.parent_key_id = p.id
    )
    select f.rel,
           f.key_text                          as matched_key,
           tk.ticket_key,
           tk.summary,
           tk.status,
           tk.issue_type,
           tk.jira_created_at,
           array_agg(distinct o.column_name)   as found_in
      from family f
      join ticket_key_occurrences o on o.key_id = f.id
      join tickets tk               on tk.id    = o.ticket_id
     group by f.rel, f.key_text, tk.id, tk.ticket_key, tk.summary,
              tk.status, tk.issue_type, tk.jira_created_at
     order by tk.jira_created_at desc nulls last, tk.ticket_key
  `) as TicketMatch[];
}

export async function listsForKey(keyText: string): Promise<ListMatch[]> {
  const sql = getSql();
  const normalized = normalizeKey(keyText);
  return (await sql`
    with target as (
      select * from keys where key_text = ${normalized}
    ),
    family as (
      select t.id, t.key_text, 'self'::text as rel from target t
      union all
      select c.id, c.key_text, 'child' from keys c join target t on c.parent_key_id = t.id
      union all
      select p.id, p.key_text, 'parent' from keys p join target t on t.parent_key_id = p.id
    )
    select distinct f.rel,
           f.key_text  as matched_key,
           l.id        as list_id,
           l.name      as list_name,
           l.created_at
      from family f
      join list_items li on li.key_id = f.id
      join lists l       on l.id      = li.list_id
     order by l.created_at desc
  `) as ListMatch[];
}

export async function getKey(keyText: string): Promise<KeyRow | null> {
  const sql = getSql();
  const rows = (await sql`
    select * from keys where key_text = ${normalizeKey(keyText)}
  `) as KeyRow[];
  return rows[0] ?? null;
}

export async function getChildren(keyId: number): Promise<KeyRow[]> {
  const sql = getSql();
  return (await sql`
    select * from keys where parent_key_id = ${keyId} order by key_text
  `) as KeyRow[];
}

export async function getParent(parentId: number | null): Promise<KeyRow | null> {
  if (!parentId) return null;
  const sql = getSql();
  const rows = (await sql`select * from keys where id = ${parentId}`) as KeyRow[];
  return rows[0] ?? null;
}

/**
 * Bulk cross-reference -- one round trip for a whole pasted column.
 *
 * Powers the dashboard, the list-create preview and CSV drop alike, so those
 * three surfaces can never disagree about what "seen before" means.
 */
export async function bulkLookup(inputs: string[]): Promise<LookupResult[]> {
  const sql = getSql();
  const normalized = inputs.map((i) => normalizeKey(i));
  const unique = Array.from(new Set(normalized.filter(Boolean)));
  if (unique.length === 0) return [];

  const registry = await getCatalogRegistry();

  const rows = (await sql`
    with target as (
      select k.* from keys k where k.key_text = any(${unique})
    ),
    family as (
      select t.id as root_id, t.key_text as root_key, t.id as member_id, 'self'::text as rel
        from target t
      union all
      select t.id, t.key_text, c.id, 'child' from keys c join target t on c.parent_key_id = t.id
      union all
      select t.id, t.key_text, p.id, 'parent' from keys p join target t on t.parent_key_id = p.id
    ),
    list_hits as (
      select f.root_key, l.id as list_id, l.name as list_name, min(f.rel) as rel
        from family f
        join list_items li on li.key_id = f.member_id
        join lists l       on l.id      = li.list_id
       group by f.root_key, l.id, l.name
    ),
    ticket_hits as (
      select f.root_key, count(distinct o.ticket_id) as ticket_count
        from family f
        join ticket_key_occurrences o on o.key_id = f.member_id
       group by f.root_key
    )
    select t.key_text,
           t.key_type,
           t.first_seen_at,
           t.last_seen_at,
           p.key_text as parent_key,
           coalesce(th.ticket_count, 0) as ticket_count,
           coalesce(
             (select json_agg(json_build_object('id', lh.list_id, 'name', lh.list_name, 'rel', lh.rel)
                              order by lh.list_name)
                from list_hits lh where lh.root_key = t.key_text),
             '[]'::json
           ) as lists
      from target t
      left join keys p       on p.id = t.parent_key_id
      left join ticket_hits th on th.root_key = t.key_text
  `) as {
    key_text: string;
    key_type: KeyType;
    first_seen_at: string;
    last_seen_at: string;
    parent_key: string | null;
    ticket_count: number;
    lists: { id: number; name: string; rel: Relation }[];
  }[];

  const byKey = new Map(rows.map((r) => [r.key_text, r]));

  // Preserve caller order and keep duplicate inputs as separate rows, so a
  // pasted column with repeats shows the repeats rather than silently collapsing.
  return inputs.map((input) => {
    const norm = normalizeKey(input);
    const parsed = parseKey(norm);
    const hit = byKey.get(norm);

    if (!hit) {
      const guess = classifyKey(norm, registry);
      return {
        input,
        normalized: parsed ? norm : null,
        known: false,
        type: guess.type,
        parentKey: guess.parentKey,
        confidence: guess.confidence,
        listCount: 0,
        ticketCount: 0,
        lists: [],
        firstSeenAt: null,
        lastSeenAt: null,
      };
    }

    return {
      input,
      normalized: norm,
      known: true,
      type: hit.key_type,
      parentKey: hit.parent_key,
      confidence: hit.parent_key || hit.key_type === 'catalog' ? 'registry' : 'heuristic',
      listCount: hit.lists.length,
      ticketCount: Number(hit.ticket_count),
      lists: hit.lists,
      firstSeenAt: hit.first_seen_at,
      lastSeenAt: hit.last_seen_at,
    };
  });
}

export async function suggestKeys(prefix: string, limit = 10): Promise<KeyRow[]> {
  const sql = getSql();
  const p = normalizeKey(prefix);
  if (!p) return [];
  return (await sql`
    select * from keys
     where key_text like ${p + '%'}
     order by key_text
     limit ${limit}
  `) as KeyRow[];
}

/* --------------------------------------------------------------- ingest */

export interface UpsertTicketInput {
  ticketKey: string;
  summary?: string | null;
  status?: string | null;
  issueType?: string | null;
  assignee?: string | null;
  reporter?: string | null;
  jiraCreatedAt?: string | null;
  jiraUpdatedAt?: string | null;
  raw?: Record<string, string | number | null>;
  importId?: number | null;
}

/**
 * Upsert on the JIRA issue key, which is the ticket's natural identity. This is
 * what makes re-uploading the same export idempotent rather than duplicating.
 */
export async function upsertTicket(t: UpsertTicketInput): Promise<{ id: number; inserted: boolean }> {
  const sql = getSql();
  const rows = (await sql`
    insert into tickets (
      ticket_key, summary, status, issue_type, assignee, reporter,
      jira_created_at, jira_updated_at, raw, import_id
    )
    values (
      ${t.ticketKey}, ${t.summary ?? null}, ${t.status ?? null}, ${t.issueType ?? null},
      ${t.assignee ?? null}, ${t.reporter ?? null},
      ${t.jiraCreatedAt || null}, ${t.jiraUpdatedAt || null},
      ${JSON.stringify(t.raw ?? {})}::jsonb, ${t.importId ?? null}
    )
    on conflict (ticket_key) do update set
      summary         = excluded.summary,
      status          = excluded.status,
      issue_type      = excluded.issue_type,
      assignee        = excluded.assignee,
      reporter        = excluded.reporter,
      jira_created_at = excluded.jira_created_at,
      jira_updated_at = excluded.jira_updated_at,
      raw             = excluded.raw,
      import_id       = excluded.import_id,
      last_seen_at    = now()
    returning id, (xmax = 0) as inserted
  `) as { id: number; inserted: boolean }[];
  return rows[0];
}

/**
 * Replace a ticket's key occurrences wholesale. Deleting first means a key
 * removed from a ticket between two exports disappears, instead of lingering
 * forever as a phantom match.
 */
export async function replaceOccurrences(
  ticketId: number,
  occurrences: { keyId: number; column: string; rawMatch: string }[]
): Promise<void> {
  const sql = getSql();
  await sql`delete from ticket_key_occurrences where ticket_id = ${ticketId}`;
  if (occurrences.length === 0) return;

  const keyIds = occurrences.map((o) => o.keyId);
  const columns = occurrences.map((o) => o.column);
  const matches = occurrences.map((o) => o.rawMatch);

  await sql`
    insert into ticket_key_occurrences (ticket_id, key_id, column_name, raw_match)
    select ${ticketId}, k, c, m
      from unnest(${keyIds}::bigint[], ${columns}::text[], ${matches}::text[]) as t(k, c, m)
    on conflict do nothing
  `;
}

export async function createImport(kind: string, filename: string | null): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    insert into imports (kind, filename) values (${kind}, ${filename}) returning id
  `) as { id: number | string }[];
  // bigserial comes back as a string from node-postgres and a number from Neon;
  // normalize so callers and JSON payloads always see a number.
  return Number(rows[0].id);
}

export async function finishImport(
  id: number,
  patch: { status: string; rowCount?: number; ticketCount?: number; keyCount?: number; error?: string | null }
): Promise<void> {
  const sql = getSql();
  await sql`
    update imports set
      status       = ${patch.status},
      row_count    = coalesce(${patch.rowCount ?? null}, row_count),
      ticket_count = coalesce(${patch.ticketCount ?? null}, ticket_count),
      key_count    = coalesce(${patch.keyCount ?? null}, key_count),
      error        = ${patch.error ?? null}
    where id = ${id}
  `;
}

export async function listImports(limit = 50) {
  const sql = getSql();
  return (await sql`
    select * from imports order by created_at desc limit ${limit}
  `) as Record<string, unknown>[];
}

/* ------------------------------------------------------------- analytics */

export interface CatalogRepeat {
  catalog_key: string;
  country: string | null;
  list_count: number;
  ticket_count: number;
  total_occurrences: number;
  app_group_count: number;
  list_names: string[];
}

/**
 * Repetition leaderboard, rolled up to the catalog.
 *
 * The roll-up is the point: thirty app groups under one catalog appearing once
 * each is a heavily repeated *catalog*, which a flat per-key count would miss
 * entirely. The three counts stay separate columns because they answer
 * different questions -- 40 tickets / 1 list is a different problem from
 * 1 ticket / 8 lists.
 */
export async function catalogRepeats(opts: {
  minLists?: number;
  country?: string;
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<CatalogRepeat[]> {
  const sql = getSql();
  const { minLists = 0, country = null, from = null, to = null, limit = 100 } = opts;

  return (await sql`
    with fam as (
      select coalesce(p.id, k.id)             as catalog_id,
             coalesce(p.key_text, k.key_text) as catalog_key,
             coalesce(p.country, k.country)   as country,
             k.id                             as key_id
        from keys k
        left join keys p on k.parent_key_id = p.id
       where k.key_type <> 'unknown'
    )
    select f.catalog_key,
           max(f.country)                                        as country,
           count(distinct li.list_id)                            as list_count,
           count(distinct o.ticket_id)                           as ticket_count,
           count(o.id)                                           as total_occurrences,
           count(distinct f.key_id) filter (
             where f.key_id <> f.catalog_id)                     as app_group_count,
           coalesce(array_agg(distinct l.name) filter (
             where l.name is not null), '{}')                    as list_names
      from fam f
      left join list_items li            on li.key_id = f.key_id
      left join lists l                  on l.id      = li.list_id
      left join ticket_key_occurrences o on o.key_id  = f.key_id
      left join tickets tk               on tk.id     = o.ticket_id
     where (${country}::text is null or f.country = ${country})
       and (${from}::timestamptz is null or tk.jira_created_at >= ${from}::timestamptz)
       and (${to}::timestamptz   is null or tk.jira_created_at <= ${to}::timestamptz)
     group by f.catalog_id, f.catalog_key
    having count(distinct li.list_id) >= ${minLists}
       and (count(distinct li.list_id) > 0 or count(distinct o.ticket_id) > 0)
     order by count(distinct li.list_id) desc,
              count(distinct o.ticket_id) desc,
              f.catalog_key
     limit ${limit}
  `) as CatalogRepeat[];
}

export interface ListOverlap {
  list_a: number;
  list_a_name: string;
  list_b: number;
  list_b_name: string;
  shared_keys: number;
}

/** Which pairs of lists cover the same ground -- "have I already done this sweep". */
export async function listOverlap(limit = 50): Promise<ListOverlap[]> {
  const sql = getSql();
  return (await sql`
    select a.list_id as list_a, la.name as list_a_name,
           b.list_id as list_b, lb.name as list_b_name,
           count(*)  as shared_keys
      from list_items a
      join list_items b on a.key_id = b.key_id and a.list_id < b.list_id
      join lists la on la.id = a.list_id
      join lists lb on lb.id = b.list_id
     group by a.list_id, la.name, b.list_id, lb.name
     order by count(*) desc
     limit ${limit}
  `) as ListOverlap[];
}

export async function dashboardStats() {
  const sql = getSql();
  const rows = (await sql`
    select
      (select count(*) from tickets)                         as ticket_count,
      (select count(*) from keys)                            as key_count,
      (select count(*) from keys where key_type = 'catalog') as catalog_count,
      (select count(*) from lists)                           as list_count,
      (select count(*) from (
         select coalesce(p.id, k.id) as cid
           from keys k
           left join keys p on k.parent_key_id = p.id
           join list_items li on li.key_id = k.id
          group by coalesce(p.id, k.id)
         having count(distinct li.list_id) > 1
       ) t)                                                  as repeated_catalog_count
  `) as Record<string, number>[];
  return rows[0];
}

/* ------------------------------------------------------------------ lists */

export interface ListSummary {
  id: number;
  name: string;
  description: string | null;
  source: string;
  created_at: string;
  item_count: number;
}

export async function getLists(): Promise<ListSummary[]> {
  const sql = getSql();
  return (await sql`
    select l.*, count(li.id)::int as item_count
      from lists l
      left join list_items li on li.list_id = l.id
     group by l.id
     order by l.created_at desc
  `) as ListSummary[];
}

/**
 * Create a list and report, per key, where it had already been seen.
 *
 * The overlap is computed *before* inserting so a key is never reported as
 * "already in this list" against the list being created.
 */
export async function createList(input: {
  name: string;
  description?: string | null;
  source: 'manual' | 'csv';
  items: { key: string; rawInput?: string; note?: string | null }[];
}): Promise<{ id: number; inserted: number; skipped: number }> {
  const sql = getSql();
  const registry = await getCatalogRegistry();

  const rows = (await sql`
    insert into lists (name, description, source)
    values (${input.name}, ${input.description ?? null}, ${input.source})
    returning id
  `) as { id: number }[];
  const listId = Number(rows[0].id);

  let inserted = 0;
  let skipped = 0;
  let position = 0;

  for (const item of input.items) {
    const parsed = parseKey(item.key);
    if (!parsed) {
      skipped++;
      continue;
    }
    const keyRow = await upsertKey(item.key, registry);
    const res = (await sql`
      insert into list_items (list_id, key_id, raw_input, note, position)
      values (${listId}, ${keyRow.id}, ${item.rawInput ?? item.key}, ${item.note ?? null}, ${position++})
      on conflict (list_id, key_id) do nothing
      returning id
    `) as { id: number }[];
    if (res.length > 0) inserted++;
    else skipped++;
  }

  return { id: listId, inserted, skipped };
}

export interface ListDetail {
  list: ListSummary;
  items: {
    key_id: number;
    key_text: string;
    key_type: KeyType;
    parent_key: string | null;
    raw_input: string | null;
    note: string | null;
    ticket_count: number;
    other_lists: { id: number; name: string }[];
  }[];
}

export async function getListDetail(listId: number): Promise<ListDetail | null> {
  const sql = getSql();
  const listRows = (await sql`
    select l.*, (select count(*) from list_items where list_id = l.id)::int as item_count
      from lists l where l.id = ${listId}
  `) as ListSummary[];
  if (listRows.length === 0) return null;

  const items = (await sql`
    with member as (
      select li.key_id as root_id, k.key_text, k.key_type, li.raw_input, li.note, li.position,
             p.key_text as parent_key
        from list_items li
        join keys k on k.id = li.key_id
        left join keys p on p.id = k.parent_key_id
       where li.list_id = ${listId}
    ),
    family as (
      select m.root_id, m.root_id as member_id from member m
      union all
      select m.root_id, c.id from keys c join member m on c.parent_key_id = m.root_id
      union all
      select m.root_id, pk.id from keys pk
        join member m on m.parent_key is not null and pk.key_text = m.parent_key
    )
    select m.root_id as key_id, m.key_text, m.key_type, m.parent_key, m.raw_input, m.note,
           coalesce((select count(distinct o.ticket_id)
                       from family f
                       join ticket_key_occurrences o on o.key_id = f.member_id
                      where f.root_id = m.root_id), 0)::int as ticket_count,
           coalesce((select json_agg(distinct jsonb_build_object('id', l2.id, 'name', l2.name))
                       from family f
                       join list_items li2 on li2.key_id = f.member_id
                       join lists l2 on l2.id = li2.list_id
                      where f.root_id = m.root_id and l2.id <> ${listId}),
                    '[]'::json) as other_lists
      from member m
     order by m.position
  `) as ListDetail['items'];

  return { list: listRows[0], items };
}

export async function updateList(
  id: number,
  patch: { name?: string; description?: string | null }
): Promise<void> {
  const sql = getSql();
  await sql`
    update lists set
      name        = coalesce(${patch.name ?? null}, name),
      description = ${patch.description ?? null},
      updated_at  = now()
    where id = ${id}
  `;
}

export async function deleteList(id: number): Promise<void> {
  const sql = getSql();
  await sql`delete from lists where id = ${id}`;
}

/* ---------------------------------------------------------------- tickets */

export async function searchTickets(q: string, page = 0, pageSize = 50) {
  const sql = getSql();
  const term = `%${q.trim()}%`;
  const offset = page * pageSize;
  const rows = (await sql`
    select t.id, t.ticket_key, t.summary, t.status, t.issue_type, t.jira_created_at,
           (select count(*) from ticket_key_occurrences o where o.ticket_id = t.id)::int as key_count
      from tickets t
     where ${q.trim() === ''} or t.ticket_key ilike ${term} or t.summary ilike ${term}
     order by t.jira_created_at desc nulls last, t.ticket_key
     limit ${pageSize} offset ${offset}
  `) as Record<string, unknown>[];
  return rows;
}

export async function getTicket(ticketKey: string) {
  const sql = getSql();
  const rows = (await sql`select * from tickets where ticket_key = ${ticketKey}`) as Record<
    string,
    unknown
  >[];
  if (rows.length === 0) return null;
  const keys = (await sql`
    select k.key_text, k.key_type, p.key_text as parent_key,
           array_agg(distinct o.column_name) as found_in
      from ticket_key_occurrences o
      join tickets t on t.id = o.ticket_id
      join keys k on k.id = o.key_id
      left join keys p on p.id = k.parent_key_id
     where t.ticket_key = ${ticketKey}
     group by k.key_text, k.key_type, p.key_text
     order by k.key_text
  `) as Record<string, unknown>[];
  return { ticket: rows[0], keys };
}
