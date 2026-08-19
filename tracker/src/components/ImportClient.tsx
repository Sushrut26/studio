'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { chunk, parseJiraCsvFile, parseKeyCsvFile, type ParseReport } from '@/lib/import/jira-csv';
import { tokenizeKeyInput } from '@/lib/keys/pattern';

const BATCH_SIZE = 200;

interface Totals {
  inserted: number;
  updated: number;
  newKeys: number;
  occurrences: number;
}

export function ImportClient() {
  const [report, setReport] = useState<ParseReport | null>(null);
  const [filename, setFilename] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setTotals(null);
    try {
      setFilename(file.name);
      setReport(await parseJiraCsvFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse that CSV');
    } finally {
      setBusy(false);
    }
  };

  /** Commit in batches so each request stays inside Vercel's limits. */
  const commit = async () => {
    if (!report) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    const acc: Totals = { inserted: 0, updated: 0, newKeys: 0, occurrences: 0 };

    try {
      const importRes = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'jira_csv', filename }),
      });
      const importJson = await importRes.json();
      if (!importRes.ok) throw new Error(importJson.message ?? 'Could not start the import');
      const importId: number = importJson.importId;

      const batches = chunk(report.tickets, BATCH_SIZE);
      for (let i = 0; i < batches.length; i++) {
        const res = await fetch('/api/import/jira', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ importId, dryRun: false, batch: batches[i] }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? `Batch ${i + 1} failed`);
        acc.inserted += json.inserted;
        acc.updated += json.updated;
        acc.newKeys += json.newKeys;
        acc.occurrences += json.occurrences;
        setProgress(Math.round(((i + 1) / batches.length) * 100));
      }

      await fetch(`/api/imports/${importId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'ok',
          rowCount: report.rows,
          ticketCount: acc.inserted + acc.updated,
          keyCount: report.uniqueKeys.length,
        }),
      });

      setTotals(acc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>JIRA CSV export</CardTitle>
          <CardDescription>
            Every column is scanned, including descriptions and custom fields. Parsing happens in your
            browser, so large exports are fine. Re-uploading the same export updates tickets rather than
            duplicating them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy && !report ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              Choose CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = '';
              }}
            />
            {filename && <span className="ml-3 text-sm text-muted-foreground">{filename}</span>}
          </div>

          {report && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Preview — nothing has been saved yet</p>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ['Rows', report.rows],
                  ['Tickets', report.tickets.length],
                  ['Distinct keys', report.uniqueKeys.length],
                  ['Tickets with no key', report.rowsWithoutKeys],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                    <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>

              {report.rowsWithoutTicketKey > 0 && (
                <p className="text-sm text-chart-3">
                  {report.rowsWithoutTicketKey} row(s) have no issue key and will be skipped.
                </p>
              )}
              {report.duplicateKeys.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {report.duplicateKeys.length} key(s) appear more than once across the export — most
                  repeated: <span className="key-text">{report.duplicateKeys[0].key}</span> (
                  {report.duplicateKeys[0].count}×).
                </p>
              )}
              {report.errors.length > 0 && (
                <ul className="space-y-1 text-sm text-destructive">
                  {report.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}

              <Button onClick={() => void commit()} disabled={busy || report.tickets.length === 0}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? `Importing… ${progress}%` : `Import ${report.tickets.length} tickets`}
              </Button>
            </div>
          )}

          {totals && (
            <div className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
              <p>
                Imported. {totals.inserted} new ticket(s), {totals.updated} updated, {totals.newKeys} new
                key(s), {totals.occurrences} key occurrence(s) recorded.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <CatalogRegistryCard />
    </div>
  );
}

/**
 * Registering catalogs resolves the one genuine ambiguity in the key format:
 * given an app group key alone, there is no way to know where the catalog tail
 * ends. Registration also adopts app groups already imported beneath it.
 */
function CatalogRegistryCard() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ registered: number; adopted: number; invalid: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (keys: string[]) => {
    if (keys.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/import/catalogs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Could not register catalogs');
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not register catalogs');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalog registry</CardTitle>
        <CardDescription>
          Register your known catalog keys so app groups can be linked to the right parent. Without this
          the app guesses from key length, and corrects itself once the catalog is registered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'144488-USA_FBRB_5340\n45489-BRA_OXYN_12345\n45489-MEX_OXYN_12346'}
          className="key-text min-h-[120px]"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void submit(tokenizeKeyInput(text))} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Register catalogs
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <FileUp className="size-4" />
            Upload CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              const { keys } = await parseKeyCsvFile(f);
              setText(keys.join('\n'));
              await submit(keys);
            }}
          />
        </div>
        {result && (
          <p className="text-sm text-muted-foreground">
            Registered {result.registered} catalog(s); {result.adopted} app group(s) relinked to their
            parent.
            {result.invalid > 0 && ` ${result.invalid} entry(ies) were not valid keys.`}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
