'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyLookupPanel } from '@/components/KeyLookupPanel';
import type { LookupRow } from '@/components/LookupResults';

export function NewListClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = rows.filter((r) => r.normalized !== null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name — e.g. Mar 2025 remediation"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="min-h-[64px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyLookupPanel compact onResults={(r) => setRows(r)} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void save()} disabled={saving || !name.trim() || valid.length === 0}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save list ({valid.length} keys)
        </Button>
        {!name.trim() && valid.length > 0 && (
          <span className="text-sm text-muted-foreground">Give the list a name to save it.</span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
