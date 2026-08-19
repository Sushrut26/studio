'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyLink, KeyTypeBadge } from '@/components/KeyBadge';
import { formatDate, pluralize } from '@/lib/utils';

export interface LookupRow {
  input: string;
  normalized: string | null;
  known: boolean;
  type: string;
  parentKey: string | null;
  confidence: string;
  listCount: number;
  ticketCount: number;
  lists: { id: number; name: string; rel: string }[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

function toCsv(rows: LookupRow[]): string {
  const header = ['key', 'status', 'type', 'parent_catalog', 'list_count', 'ticket_count', 'lists'];
  const body = rows.map((r) =>
    [
      r.normalized ?? r.input,
      r.normalized === null ? 'unrecognized' : r.known ? 'seen before' : 'new',
      r.type,
      r.parentKey ?? '',
      r.listCount,
      r.ticketCount,
      r.lists.map((l) => l.name).join(' | '),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header.join(','), ...body].join('\n');
}

export function LookupResults({ rows }: { rows: LookupRow[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const summary = useMemo(() => {
    const seen = rows.filter((r) => r.listCount > 0).length;
    const fresh = rows.filter((r) => r.normalized !== null && r.listCount === 0).length;
    const inTickets = rows.filter((r) => r.ticketCount > 0).length;
    const invalid = rows.filter((r) => r.normalized === null).length;
    const distinctLists = new Set(rows.flatMap((r) => r.lists.map((l) => l.id))).size;
    // Duplicates in the pasted input are kept as separate rows and reported --
    // a copy-paste error in a remediation list should be visible, not silently merged.
    const counts = new Map<string, number>();
    for (const r of rows) if (r.normalized) counts.set(r.normalized, (counts.get(r.normalized) ?? 0) + 1);
    const dupes = [...counts.values()].filter((c) => c > 1).length;
    return { seen, fresh, inTickets, invalid, distinctLists, dupes };
  }, [rows]);

  if (rows.length === 0) return null;

  const downloadCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'key-lookup.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-sm">
          <span className="font-medium">{pluralize(rows.length, 'key')}</span>
          {' — '}
          <span className="text-success">{summary.seen} already in a list</span>
          {summary.distinctLists > 0 && ` (${pluralize(summary.distinctLists, 'list')})`}
          {' · '}
          <span className="font-medium">{summary.fresh} in no list yet</span>
          {summary.inTickets > 0 && ` · ${summary.inTickets} seen in tickets`}
          {summary.dupes > 0 && (
            <span className="text-chart-3">
              {' · '}
              {pluralize(summary.dupes, 'key')} repeated in your input
            </span>
          )}
          {summary.invalid > 0 && (
            <span className="text-destructive"> · {summary.invalid} unrecognized</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Key</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parent catalog</TableHead>
              <TableHead className="text-right">In lists</TableHead>
              <TableHead className="text-right">In tickets</TableHead>
              <TableHead>Last import</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => {
              const isOpen = expanded === i;
              const unrecognized = row.normalized === null;
              return (
                <Fragment key={`${row.input}-${i}`}>
                  <TableRow
                    className={row.lists.length > 0 ? 'cursor-pointer' : undefined}
                    onClick={() => row.lists.length > 0 && setExpanded(isOpen ? null : i)}
                  >
                    <TableCell>
                      {row.lists.length > 0 &&
                        (isOpen ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        ))}
                    </TableCell>
                    <TableCell>
                      {unrecognized ? (
                        <span className="key-text text-sm text-muted-foreground line-through">
                          {row.input}
                        </span>
                      ) : (
                        <KeyLink keyText={row.normalized!} />
                      )}
                    </TableCell>
                    <TableCell>
                      {unrecognized ? (
                        <Badge variant="destructive">unrecognized</Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <KeyTypeBadge type={row.type} />
                          {row.confidence === 'heuristic' && !unrecognized && (
                            <span
                              className="text-xs text-muted-foreground"
                              title="Inferred from key length. Register its catalog to confirm."
                            >
                              guessed
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.parentKey ? (
                        <KeyLink keyText={row.parentKey} className="text-xs" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.listCount > 0 ? (
                        <span className="font-medium text-success">{row.listCount}</span>
                      ) : (
                        <Badge variant="outline">{row.known ? 'none' : 'new'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.ticketCount || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(row.lastSeenAt)}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell />
                      <TableCell colSpan={6} className="py-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Previously detected in
                        </p>
                        <ul className="space-y-1">
                          {row.lists.map((l) => (
                            <li key={l.id} className="flex items-center gap-2 text-sm">
                              <Link href={`/lists/${l.id}`} className="text-primary hover:underline">
                                {l.name}
                              </Link>
                              {l.rel !== 'self' && (
                                <Badge variant="warning">
                                  {l.rel === 'parent' ? 'via parent catalog' : 'via child app group'}
                                </Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
