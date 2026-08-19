import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyLink, KeyTypeBadge } from '@/components/KeyBadge';
import { SetupNotice } from '@/components/SetupNotice';
import { isDatabaseConfigured } from '@/lib/db';
import { getTicket } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TicketPage({ params }: { params: Promise<{ key: string }> }) {
  if (!isDatabaseConfigured()) return <SetupNotice />;

  const { key } = await params;
  const result = await getTicket(decodeURIComponent(key));
  if (!result) notFound();

  const { ticket, keys } = result;
  const jiraBase = process.env.NEXT_PUBLIC_JIRA_BASE_URL;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="key-text text-2xl font-semibold">{String(ticket.ticket_key)}</h1>
          {jiraBase && (
            <a
              href={`${jiraBase.replace(/\/$/, '')}/browse/${String(ticket.ticket_key)}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Open in JIRA
            </a>
          )}
        </div>
        <p className="mt-1 text-lg">{(ticket.summary as string) ?? '—'}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {(ticket.status as string) ?? '—'} · {(ticket.issue_type as string) ?? '—'} · created{' '}
          {formatDate(ticket.jira_created_at as string)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Keys found in this ticket ({keys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No catalog or app group keys detected.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Parent catalog</TableHead>
                  <TableHead>Found in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={String(k.key_text)}>
                    <TableCell>
                      <KeyLink keyText={String(k.key_text)} />
                    </TableCell>
                    <TableCell>
                      <KeyTypeBadge type={String(k.key_type)} />
                    </TableCell>
                    <TableCell>
                      {k.parent_key ? (
                        <KeyLink keyText={String(k.parent_key)} className="text-xs" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {((k.found_in as string[]) ?? []).join(', ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
