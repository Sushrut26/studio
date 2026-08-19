import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyLink } from '@/components/KeyBadge';
import { RepeatsChart } from '@/components/RepeatsChart';
import { SetupNotice } from '@/components/SetupNotice';
import { ensureSchema, isDatabaseConfigured } from '@/lib/db';
import { catalogRepeats, dashboardStats, listOverlap } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function RepeatsPage({
  searchParams,
}: {
  searchParams: Promise<{ minLists?: string; country?: string }>;
}) {
  if (!isDatabaseConfigured()) return <SetupNotice />;
  await ensureSchema();

  const sp = await searchParams;
  const minLists = Number(sp.minLists ?? '0') || 0;
  const country =
    sp.country === 'USA' || sp.country === 'BRA' || sp.country === 'MEX' ? sp.country : undefined;

  const [repeats, overlap, stats] = await Promise.all([
    catalogRepeats({ minLists, country, limit: 100 }),
    listOverlap(20),
    dashboardStats(),
  ]);

  const top = repeats[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Repeats</h1>
        <p className="mt-1 text-muted-foreground">
          Which catalogs keep coming back. Counts roll app groups up into their parent catalog, so thirty
          app groups appearing once each still register as one heavily repeated catalog.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Catalogs tracked', value: stats.catalog_count, sub: undefined as string | undefined },
          { label: 'Catalogs in >1 list', value: stats.repeated_catalog_count, sub: undefined },
          { label: 'Lists', value: stats.list_count, sub: undefined },
          {
            label: 'Most repeated',
            value: top ? Number(top.list_count) : 0,
            sub: top?.catalog_key,
          },
        ].map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{Number(t.value ?? 0)}</p>
              {t.sub && <p className="key-text mt-1 truncate text-xs text-muted-foreground">{t.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {[
          { label: 'All', href: '/repeats' },
          { label: 'In 2+ lists', href: '/repeats?minLists=2' },
          { label: 'In 3+ lists', href: '/repeats?minLists=3' },
          { label: 'USA', href: '/repeats?country=USA' },
          { label: 'BRA', href: '/repeats?country=BRA' },
          { label: 'MEX', href: '/repeats?country=MEX' },
        ].map((f) => (
          <Link key={f.href} href={f.href}>
            <Badge variant="outline" className="hover:bg-secondary">
              {f.label}
            </Badge>
          </Link>
        ))}
      </div>

      {repeats.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nothing to rank yet — import some tickets or create a couple of lists first.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Top catalogs by number of lists</CardTitle>
              <CardDescription>
                How many distinct lists each catalog appears in, counting its app groups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RepeatsChart
                data={repeats.map((r) => ({
                  catalog_key: r.catalog_key,
                  list_count: Number(r.list_count),
                  ticket_count: Number(r.ticket_count),
                  app_group_count: Number(r.app_group_count),
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                The three counts stay separate because they answer different questions — 40 tickets in 1
                list is a different problem from 1 ticket across 8 lists.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catalog</TableHead>
                    <TableHead className="text-right">Lists</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                    <TableHead className="text-right">Mentions</TableHead>
                    <TableHead className="text-right">App groups</TableHead>
                    <TableHead>Appears in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repeats.map((r) => (
                    <TableRow key={r.catalog_key}>
                      <TableCell>
                        <KeyLink keyText={r.catalog_key} />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {Number(r.list_count) || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(r.ticket_count) || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {Number(r.total_occurrences) || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {Number(r.app_group_count) || '—'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {(r.list_names ?? []).join(', ') || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {overlap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>List overlap</CardTitle>
            <CardDescription>Pairs of lists that cover the same keys.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>List</TableHead>
                  <TableHead>List</TableHead>
                  <TableHead className="text-right">Shared keys</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overlap.map((o) => (
                  <TableRow key={`${o.list_a}-${o.list_b}`}>
                    <TableCell>
                      <Link href={`/lists/${o.list_a}`} className="text-primary hover:underline">
                        {o.list_a_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/lists/${o.list_b}`} className="text-primary hover:underline">
                        {o.list_b_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {Number(o.shared_keys)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
