import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SetupNotice } from '@/components/SetupNotice';
import { isDatabaseConfigured } from '@/lib/db';
import { getLists } from '@/lib/queries';
import { formatDate, pluralize } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ListsPage() {
  if (!isDatabaseConfigured()) return <SetupNotice />;
  const lists = await getLists();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lists</h1>
          <p className="mt-1 text-muted-foreground">Named sets of catalog and app group keys.</p>
        </div>
        <Button asChild>
          <Link href="/lists/new">
            <Plus className="size-4" />
            New list
          </Link>
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No lists yet. Create one by pasting keys or uploading a CSV.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <Link key={l.id} href={`/lists/${l.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="p-4">
                  <p className="font-medium">{l.name}</p>
                  {l.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {pluralize(l.item_count, 'key')} · {formatDate(l.created_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
