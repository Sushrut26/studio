import { AlertTriangle } from 'lucide-react';

/**
 * Shown when DATABASE_URL is missing. This is the single most likely state on a
 * fresh deploy, so it gets a real explanation rather than a generic error.
 */
export function SetupNotice() {
  return (
    <div className="rounded-lg border border-chart-3/40 bg-chart-3/10 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-chart-3" />
        <div className="space-y-2 text-sm">
          <p className="font-medium">No database connected yet.</p>
          <p className="text-muted-foreground">
            Create a free Neon Postgres project, run <code className="key-text">db/001_init.sql</code>{' '}
            against it, then set <code className="key-text">DATABASE_URL</code> in{' '}
            <code className="key-text">.env.local</code> (or in your Vercel project settings) and reload.
          </p>
        </div>
      </div>
    </div>
  );
}
