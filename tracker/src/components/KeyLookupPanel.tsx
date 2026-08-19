'use client';

import { useCallback, useRef, useState } from 'react';
import { FileUp, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LookupResults, type LookupRow } from '@/components/LookupResults';
import { tokenizeKeyInput } from '@/lib/keys/pattern';
import { parseKeyCsvFile } from '@/lib/import/jira-csv';
import { cn } from '@/lib/utils';

type Mode = 'single' | 'paste';

export function KeyLookupPanel({
  onResults,
  compact = false,
}: {
  onResults?: (rows: LookupRow[], tokens: string[]) => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('single');
  const [single, setSingle] = useState('');
  const [paste, setPaste] = useState('');
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const runLookup = useCallback(
    async (tokens: string[]) => {
      if (tokens.length === 0) {
        setRows([]);
        onResults?.([], []);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/keys/lookup', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ keys: tokens }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? 'Lookup failed');
        setRows(json.results);
        onResults?.(json.results, tokens);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Lookup failed');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [onResults]
  );

  const onFile = async (file: File) => {
    const { keys } = await parseKeyCsvFile(file);
    setPaste(keys.join('\n'));
    setMode('paste');
    await runLookup(keys);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm">
          {(['single', 'paste'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 rounded px-3 py-1.5 transition-colors',
                mode === m ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m === 'single' ? 'One key' : 'Paste many'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <FileUp className="size-4" />
            CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = '';
            }}
          />
        </div>

        {mode === 'single' ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void runLookup(tokenizeKeyInput(single));
            }}
          >
            <Input
              value={single}
              onChange={(e) => setSingle(e.target.value)}
              placeholder="144488-USA_FBRB_5340"
              className={cn('key-text', compact ? '' : 'h-12 text-base')}
              autoFocus={!compact}
            />
            <Button type="submit" size={compact ? 'default' : 'lg'} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Look up
            </Button>
          </form>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={'Paste a column of keys — one per line, or comma separated.\n\n144488-USA_FBRB_5340\n144488-USA_FBRB_53401230183\n45489-BRA_OXYN_12345'}
              className="key-text min-h-[160px]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {tokenizeKeyInput(paste).length} token(s) detected
              </p>
              <Button onClick={() => void runLookup(tokenizeKeyInput(paste))} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Look up
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <LookupResults rows={rows} />
    </div>
  );
}
