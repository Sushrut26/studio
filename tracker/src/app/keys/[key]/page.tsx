import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyLink, KeyTypeBadge, RelBadge } from '@/components/KeyBadge';
import { SetupNotice } from '@/components/SetupNotice';
import { isDatabaseConfigured } from '@/lib/db';
import { getChildren, getKey, getParent, listsForKey, ticketsForKey } from '@/lib/queries';
import { formatDate, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function KeyPage({ params }: { params: Promise<{ key: string }> }) {
  if (!isDatabaseConfigured()) return <SetupNotice />;

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

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="key-text text-2xl font-semibold">{key.key_text}</h1>
          <KeyTypeBadge type={key.key_type} />
          {key.country && <Badge variant="outline">{key.country}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          First seen {formatDate(key.first_seen_at)} · last seen {formatDate(key.last_seen_at)}
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
            <p className="mt-1 text-2xl font-semibold tabular-nums">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">In lists</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{lists.length}</p>
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
          {lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not in any list yet.</p>
          ) : (
            <ul className="space-y-2">
              {lists.map((l) => (
                <li key={`${l.list_id}-${l.matched_key}`} className="flex flex-wrap items-center gap-2 text-sm">
                  <Link href={`/lists/${l.list_id}`} className="font-medium text-primary hover:underline">
                    {l.list_name}
                  </Link>
                  <RelBadge rel={l.rel} />
                  {l.rel !== 'self' && <span className="key-text text-xs text-muted-foreground">{l.matched_key}</span>}
                  <span className="text-xs text-muted-foreground">{formatDate(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
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
                {tickets.map((t) => (
                  <TableRow key={`${t.ticket_key}-${t.matched_key}`}>
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
                        <RelBadge rel={t.rel} />
                        {t.rel !== 'self' && (
                          <span className="key-text text-xs text-muted-foreground">{t.matched_key}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(t.found_in ?? []).join(', ')}
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
