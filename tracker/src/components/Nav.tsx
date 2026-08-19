'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, KeyRound, ListChecks, Search, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Dashboard', icon: Search },
  { href: '/repeats', label: 'Repeats', icon: BarChart3 },
  { href: '/lists', label: 'Lists', icon: ListChecks },
  { href: '/tickets', label: 'Tickets', icon: KeyRound },
  { href: '/import', label: 'Import', icon: Upload },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-5 text-primary" />
          <span className="hidden sm:inline">Catalog Key Tracker</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-secondary font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
