import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyLink, KeyTypeBadge } from '@/components/KeyBadge';
import { SetupNotice } from '@/components/SetupNotice';
import { isDatabaseConfigured } from '@/lib/db';
import { getListDetail } from '@/lib/queries';
import { formatDate, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return <SetupNotice />;

  const { id } = await params;
  const detail = await getListDetail(Number(id));
  if (!detail) notFound();

  const { list, items } = detail;
  const overlapping = items.filter((i) => i.other_lists.length > 0);
  const otherListNames = new Set(overlapping.flatMap((i) => i.other_lists.map((l) => l.name)));
  const inTickets = items.filter((i) => i.ticket_count > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
        {list.description && <p className="mt-1 text-muted-foreground">{list.description}</p>}
        <p className="mt-1 text-sm text-muted-foreground">
          {pluralize(items.length, 'key')} · created {formatDate(list.created_at)}
        </p>
      </div>

      <Card
        className={
          overlapping.length > 0 ? 'border-chart-3/40 bg-chart-3/5' : 'border-success/40 bg-success/5'
        }
      >
        <CardContent className="p-4 text-sm">
          {overlapping.length > 0 ? (
            <p>
              <span className="font-medium">
                {overlapping.length} of {items.length} keys
              </span>{' '}
              already appeared in {pluralize(otherListNames.size, 'earlier list')}
              {inTickets > 0 && `, and ${inTickets} appear in imported tickets`}.
            </p>
          ) : (
            <p>
              No key in this list appears in any other list
              {inTickets > 0 ? `, though ${inTickets} appear in imported tickets.` : '.'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parent catalog</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
              <TableHead>Also in these lists</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.key_id}>
                <TableCell>
                  <KeyLink keyText={item.key_text} />
                </TableCell>
                <TableCell>
                  <KeyTypeBadge type={item.key_type} />
                </TableCell>
                <TableCell>
                  {item.parent_key ? (
                    <KeyLink keyText={item.parent_key} className="text-xs" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{item.ticket_count || '—'}</TableCell>
                <TableCell>
                  {item.other_lists.length === 0 ? (
                    <Badge variant="outline">only here</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {item.other_lists.map((l) => (
                        <Link key={l.id} href={`/lists/${l.id}`}>
                          <Badge variant="warning" className="hover:bg-chart-3/25">
                            {l.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
