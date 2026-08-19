import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DashboardClient } from '@/components/DashboardClient';
import { SetupNotice } from '@/components/SetupNotice';
import { Card, CardContent } from '@/components/ui/card';
import { isDatabaseConfigured } from '@/lib/db';
import { dashboardStats } from '@/lib/queries';

export const dynamic = 'force-dynamic';

async function Stats() {
  let stats: Record<string, number> | null = null;
  try {
    stats = await dashboardStats();
  } catch {
    return null;
  }

  const tiles = [
    { label: 'Tickets', value: stats.ticket_count, href: '/tickets' },
    { label: 'Keys tracked', value: stats.key_count, href: null },
    { label: 'Lists', value: stats.list_count, href: '/lists' },
    { label: 'Catalogs in >1 list', value: stats.repeated_catalog_count, href: '/repeats' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => {
        const body = (
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{Number(t.value ?? 0)}</p>
            </CardContent>
          </Card>
        );
        return t.href ? (
          <Link key={t.label} href={t.href}>
            {body}
          </Link>
        ) : (
          <div key={t.label}>{body}</div>
        );
      })}
    </div>
  );
}

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Catalog Key Tracker</h1>
        <SetupNotice />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Where have I seen this key?</h1>
        <p className="mt-1 text-muted-foreground">
          Look up a catalog or app group key to see every JIRA ticket and every list it has appeared in.
        </p>
      </div>

      <Stats />
      <DashboardClient />

      <p className="text-sm text-muted-foreground">
        No data yet?{' '}
        <Link href="/import" className="inline-flex items-center gap-1 text-primary hover:underline">
          Import a JIRA CSV export <ArrowRight className="size-3.5" />
        </Link>
      </p>
    </div>
  );
}
