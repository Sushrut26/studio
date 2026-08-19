import { ImportClient } from '@/components/ImportClient';
import { SetupNotice } from '@/components/SetupNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isDatabaseConfigured } from '@/lib/db';
import { listImports } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  if (!isDatabaseConfigured()) return <SetupNotice />;

  let imports: Record<string, unknown>[] = [];
  try {
    imports = await listImports();
  } catch {
    imports = [];
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
        <p className="mt-1 text-muted-foreground">
          Load JIRA exports and register catalog keys.
        </p>
      </div>

      <ImportClient />

      <Card>
        <CardHeader>
          <CardTitle>Import history</CardTitle>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing imported yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Keys</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={String(imp.id)}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(imp.created_at as string)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{(imp.filename as string) ?? '—'}</TableCell>
                    <TableCell className="text-xs">{String(imp.kind)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(imp.row_count)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(imp.ticket_count)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(imp.key_count)}</TableCell>
                    <TableCell className="text-xs">{String(imp.status)}</TableCell>
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
