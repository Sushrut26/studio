'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyLookupPanel } from '@/components/KeyLookupPanel';
import type { LookupRow } from '@/components/LookupResults';

/**
 * Looking a key up and saving a list are separate actions: you never have to
 * create a list to answer "where have I seen this before". Saving is offered
 * only once there is something worth saving.
 */
export function DashboardClient() {
  const router = useRouter();
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = rows.filter((r) => r.normalized !== null);

  const save = async () => {
    if (!name.trim() || valid.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          source: 'manual',
          items: valid.map((r) => ({ key: r.normalized!, rawInput: r.input })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Could not save the list');
      router.push(`/lists/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the list');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <KeyLookupPanel onResults={(r) => setRows(r)} />

      {valid.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Save these {valid.length} keys as a list</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mar 2025 remediation"
              className="sm:max-w-sm"
            />
            <Button onClick={() => void save()} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save as list
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
