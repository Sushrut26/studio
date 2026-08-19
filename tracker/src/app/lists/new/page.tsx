import { NewListClient } from '@/components/NewListClient';
import { SetupNotice } from '@/components/SetupNotice';
import { ensureSchema, isDatabaseConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function NewListPage() {
  if (!isDatabaseConfigured()) return <SetupNotice />;
  await ensureSchema();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New list</h1>
        <p className="mt-1 text-muted-foreground">
          Paste keys or upload a CSV. Before you save, you will see which keys have already turned up in
          earlier lists and tickets.
        </p>
      </div>
      <NewListClient />
    </div>
  );
}
