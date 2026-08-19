import { NewListClient } from '@/components/NewListClient';
import { SetupNotice } from '@/components/SetupNotice';
import { isDatabaseConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function NewListPage() {
  if (!isDatabaseConfigured()) return <SetupNotice />;

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
