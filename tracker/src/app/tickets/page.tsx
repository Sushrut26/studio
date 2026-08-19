import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SetupNotice } from '@/components/SetupNotice';
import { ensureSchema, isDatabaseConfigured } from '@/lib/db';
import { searchTickets } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!isDatabaseConfigured()) return <SetupNotice />;
  await ensureSchema();

  const { q = '' } = await searchParams;
  const tickets = await searchTickets(q);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="mt-1 text-muted-foreground">Every JIRA ticket imported so far.</p>
      </div>

      <form className="max-w-md">
        <Input name="q" defaultValue={q} placeholder="Search by ticket key or summary…" />
      </form>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {q ? 'No tickets match that search.' : 'No tickets imported yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Keys</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={String(t.id)}>
                  <TableCell>
                    <Link
                      href={`/tickets/${encodeURIComponent(String(t.ticket_key))}`}
                      className="key-text text-primary hover:underline"
                    >
                      {String(t.ticket_key)}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-lg truncate">{(t.summary as string) ?? '—'}</TableCell>
                  <TableCell className="text-xs">{(t.status as string) ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(t.key_count)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(t.jira_created_at as string)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
