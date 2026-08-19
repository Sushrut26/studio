import { NextRequest } from 'next/server';
import { fail, ok, ready } from '@/lib/api';
import { importJiraBatchSchema } from '@/lib/schemas';
import {
  getCatalogRegistry,
  replaceOccurrences,
  upsertKey,
  upsertTicket,
} from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Ingest one batch of already-parsed tickets.
 *
 * Batching (500 rows) rather than one big upload keeps each request inside
 * Vercel's body-size and duration limits. dryRun resolves the same key work
 * without writing, so the import screen can show a full report first.
 */
export async function POST(req: NextRequest) {
  try {
    await ready();
    const { batch, importId, dryRun } = importJiraBatchSchema.parse(await req.json());
    const registry = await getCatalogRegistry();

    // Resolve every distinct key in the batch once, not once per occurrence.
    const distinctKeys = [...new Set(batch.flatMap((t) => t.keys.map((k) => k.key)))];
    const keyIds = new Map<string, number>();
    let newKeys = 0;

    if (!dryRun) {
      for (const keyText of distinctKeys) {
        const row = await upsertKey(keyText, registry);
        keyIds.set(row.key_text, row.id);
        if (row.inserted) newKeys++;
      }
    }

    let inserted = 0;
    let updated = 0;
    let occurrences = 0;

    for (const t of batch) {
      occurrences += t.keys.length;
      if (dryRun) continue;

      const { id, inserted: isNew } = await upsertTicket({
        ticketKey: t.ticketKey,
        summary: t.summary,
        status: t.status,
        issueType: t.issueType,
        assignee: t.assignee,
        reporter: t.reporter,
        jiraCreatedAt: t.jiraCreatedAt,
        jiraUpdatedAt: t.jiraUpdatedAt,
        raw: t.raw,
        importId: importId ?? null,
      });
      if (isNew) inserted++;
      else updated++;

      await replaceOccurrences(
        id,
        t.keys
          .map((k) => ({ keyId: keyIds.get(k.key)!, column: k.column, rawMatch: k.rawMatch }))
          .filter((o) => o.keyId != null)
      );
    }

    return ok({
      dryRun,
      tickets: batch.length,
      inserted,
      updated,
      distinctKeys: distinctKeys.length,
      newKeys,
      occurrences,
    });
  } catch (error) {
    return fail(error);
  }
}
