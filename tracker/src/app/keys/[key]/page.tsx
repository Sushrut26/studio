import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyLink, KeyTypeBadge, RelBadge } from '@/components/KeyBadge';
import { SetupNotice } from '@/components/SetupNotice';
import { ensureSchema, isDatabaseConfigured } from '@/lib/db';
import { getChildren, getKey, getParent, listsForKey, ticketsForKey } from '@/lib/queries';
import { formatDate, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function KeyPage({ params }: { params: Promise<{ key: string }> }) {
  if (!isDatabaseConfigured()) return <SetupNotice />;
  await ensureSchema();

  const { key: rawKey } = await params;
  const keyText = decodeURIComponent(rawKey);
  const key = await getKey(keyText);
  if (!key) notFound();

  const [tickets, lists, children, parent] = await Promise.all([
    ticketsForKey(keyText),
    listsForKey(keyText),
    getChildren(key.id),
    getParent(key.parent_key_id),
  ]);

  const jiraBase = process.env.NEXT_PUBLIC_JIRA_BASE_URL;

  // A ticket can match through several app groups at once; collapse those into
  // one row per ticket so the table and the counts agree with each other.
  const ticketRows = Array.from(
    tickets
      .reduce((acc, t) => {
        const existing = acc.get(t.ticket_key);
        if (existing) {
          existing.matches.push({ rel: t.rel, key: t.matched_key });
          for (const c of t.found_in ?? []) existing.foundIn.add(c);
          if (t.rel === 'self') existing.rel = 'self';
          return acc;
        }
        acc.set(t.ticket_key, {
          ticket: t,
          rel: t.rel,
          matches: [{ rel: t.rel, key: t.matched_key }],
          foundIn: new Set(t.found_in ?? []),
        });
        return acc;
      }, new Map<string, { ticket: (typeof tickets)[number]; rel: string; matches: { rel: string; key: string }[]; foundIn: Set<string> }>())
      .values()
  );

  const listRows = Array.from(
    lists
      .reduce((acc, l) => {
        const existing = acc.get(l.list_id);
        if (existing) {
          existing.via.push({ rel: l.rel, key: l.matched_key });
          if (l.rel === 'self') existing.rel = 'self';
          return acc;
        }
        acc.set(l.list_id, { list: l, rel: l.rel, via: [{ rel: l.rel, key: l.matched_key }] });
        return acc;
      }, new Map<number, { list: (typeof lists)[number]; rel: string; via: { rel: string; key: string }[] }>())
      .values()
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="key-text text-2xl font-semibold">{key.key_text}</h1>
          <KeyTypeBadge type={key.key_type} />
          {key.country && <Badge variant="outline">{key.country}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          First imported {formatDate(key.first_seen_at)} · last imported {formatDate(key.last_seen_at)}
          {parent && (
            <>
              {' · parent catalog '}
              <KeyLink keyText={parent.key_text} className="text-xs" />
            </>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">In tickets</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{ticketRows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">In lists</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{listRows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Child app groups</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{children.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lists</CardTitle>
        </CardHeader>
        <CardContent>
          {listRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not in any list yet.</p>
          ) : (
            <ul className="space-y-2">
              {listRows.map(({ list: l, rel, via }) => (
                <li key={l.list_id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Link href={`/lists/${l.list_id}`} className="font-medium text-primary hover:underline">
                    {l.list_name}
                  </Link>
                  <RelBadge rel={rel} />
                  {rel !== 'self' && (
                    <span className="key-text text-xs text-muted-foreground">
                      {via.map((v) => v.key).join(', ')}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDate(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets ({ticketRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ticketRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not found in any imported ticket.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Found in</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketRows.map(({ ticket: t, rel, matches, foundIn }) => (
                  <TableRow key={t.ticket_key}>
                    <TableCell>
                      <Link href={`/tickets/${encodeURIComponent(t.ticket_key)}`} className="key-text text-primary hover:underline">
                        {t.ticket_key}
                      </Link>
                      {jiraBase && (
                        <a
                          href={`${jiraBase.replace(/\/$/, '')}/browse/${t.ticket_key}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-xs text-muted-foreground hover:underline"
                        >
                          JIRA
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{t.summary ?? '—'}</TableCell>
                    <TableCell className="text-xs">{t.status ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <RelBadge rel={rel} />
                        {rel !== 'self' && (
                          <span className="key-text text-xs text-muted-foreground">
                            {matches.map((m) => m.key).join(', ')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {Array.from(foundIn).join(', ')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(t.jira_created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{pluralize(children.length, 'child app group')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {children.map((c) => (
                <KeyLink key={c.id} keyText={c.key_text} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
