/**
 * Seed a database with the sample JIRA export plus two overlapping lists, so
 * every page has something real in it on first launch.
 *
 * Deliberately drives the same functions the app uses -- buildTickets,
 * upsertKey, upsertTicket, replaceOccurrences, registerCatalog, createList --
 * rather than raw INSERTs, so seeding exercises the real import path and cannot
 * quietly diverge from it.
 *
 * Idempotent: re-running updates rather than duplicating.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Papa from 'papaparse';

import { buildTickets } from '../src/lib/import/jira-csv';
import { closePool, ensureSchema, getSql } from '../src/lib/db';
import {
  createList,
  getCatalogRegistry,
  getLists,
  registerCatalog,
  replaceOccurrences,
  upsertKey,
  upsertTicket,
} from '../src/lib/queries';

const CSV = resolve(__dirname, '..', 'samples', 'sample-jira-export.csv');

const CATALOGS = ['144488-USA_FBRB_5340', '45489-BRA_OXYN_12345', '45489-MEX_OXYN_12346'];

const LISTS = [
  {
    name: 'March remediation',
    description: 'App groups flagged during the March sweep.',
    keys: ['144488-USA_FBRB_53401230183', '144488-USA_FBRB_534050611', '45489-BRA_OXYN_12345'],
  },
  {
    name: 'April sweep',
    description: 'Follow-up batch. Overlaps March on one app group.',
    keys: ['144488-USA_FBRB_53401230183', '144488-USA_FBRB_534074933'],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Run `npm run db:up` first, or set it yourself.');
    process.exit(1);
  }

  await ensureSchema();
  console.log('· schema ready');

  const csv = readFileSync(CSV, 'utf8');
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.replace(/^﻿/, '').trim(),
  });

  const report = buildTickets(parsed.data, parsed.meta.fields ?? []);
  console.log(`· parsed ${report.tickets.length} tickets, ${report.uniqueKeys.length} distinct keys`);

  // Register catalogs first so app groups resolve to the right parent immediately.
  for (const catalog of CATALOGS) {
    const { adopted } = await registerCatalog(catalog);
    if (adopted) console.log(`· ${catalog} adopted ${adopted} app group(s)`);
  }

  const registry = await getCatalogRegistry();
  const keyIds = new Map<string, number>();
  for (const key of report.uniqueKeys) {
    const row = await upsertKey(key, registry);
    keyIds.set(row.key_text, Number(row.id));
  }

  for (const ticket of report.tickets) {
    const { id } = await upsertTicket({
      ticketKey: ticket.ticketKey,
      summary: ticket.summary,
      status: ticket.status,
      issueType: ticket.issueType,
      assignee: ticket.assignee,
      reporter: ticket.reporter,
      jiraCreatedAt: ticket.jiraCreatedAt,
      jiraUpdatedAt: ticket.jiraUpdatedAt,
      raw: ticket.raw,
    });
    await replaceOccurrences(
      Number(id),
      ticket.keys
        .map((k) => ({ keyId: keyIds.get(k.key)!, column: k.column, rawMatch: k.rawMatch }))
        .filter((o) => o.keyId != null)
    );
  }
  console.log(`· imported ${report.tickets.length} tickets`);

  const existing = new Set((await getLists()).map((l) => l.name));
  for (const list of LISTS) {
    if (existing.has(list.name)) {
      console.log(`· list "${list.name}" already exists, leaving it alone`);
      continue;
    }
    const { inserted } = await createList({
      name: list.name,
      description: list.description,
      source: 'manual',
      items: list.keys.map((key) => ({ key })),
    });
    console.log(`· created list "${list.name}" with ${inserted} keys`);
  }

  const sql = getSql();
  const [counts] = (await sql`
    select (select count(*) from tickets) as tickets,
           (select count(*) from keys)    as keys,
           (select count(*) from lists)   as lists
  `) as { tickets: string; keys: string; lists: string }[];
  console.log(
    `\nSeeded: ${counts.tickets} tickets, ${counts.keys} keys, ${counts.lists} lists.`
  );
  console.log('Try: npm run dev  ->  http://localhost:3100');
  console.log('Then look up 144488-USA_FBRB_5340 on the dashboard.');

  await closePool();
}

main().catch(async (error) => {
  console.error(error);
  await closePool().catch(() => {});
  process.exit(1);
});
