import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function KeyTypeBadge({ type }: { type: string }) {
  if (type === 'catalog') return <Badge variant="default">catalog</Badge>;
  if (type === 'app_group') return <Badge variant="secondary">app group</Badge>;
  return <Badge variant="outline">unrecognized</Badge>;
}

/** Relationship labels exist so an inherited match never reads as a direct one. */
export function RelBadge({ rel }: { rel: string }) {
  if (rel === 'self') return <Badge variant="success">direct</Badge>;
  if (rel === 'parent') return <Badge variant="warning">via parent catalog</Badge>;
  return <Badge variant="warning">via child app group</Badge>;
}

export function KeyLink({ keyText, className }: { keyText: string; className?: string }) {
  return (
    <Link
      href={`/keys/${encodeURIComponent(keyText)}`}
      className={cn('key-text text-sm text-primary hover:underline', className)}
    >
      {keyText}
    </Link>
  );
}
