'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  FolderTree,
  LayoutDashboard,
  Menu,
  Radio,
  Server,
  Settings,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Übersicht', icon: <LayoutDashboard size={20} /> },
  { href: '/sender', label: 'Sender', icon: <Radio size={20} /> },
  { href: '/kategorien', label: 'Kategorien', icon: <FolderTree size={20} /> },
  { href: '/incidents', label: 'Incidents', icon: <AlertTriangle size={20} /> },
  { href: '/statistiken', label: 'Statistiken', icon: <BarChart3 size={20} /> },
  { href: '/provider', label: 'Provider', icon: <Server size={20} /> },
  { href: '/einstellungen', label: 'Einstellungen', icon: <Settings size={20} /> },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-lg border border-border bg-surface-elevated p-2 text-text-muted lg:hidden"
        aria-label="Navigation öffnen"
      >
        <Menu size={22} />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
          role="button"
          tabIndex={-1}
          aria-label="Navigation schließen"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface',
          'transition-transform duration-200 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-vhv-text no-underline">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Radio size={18} />
            </span>
            VHV-TV
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="text-text-muted lg:hidden"
            aria-label="Navigation schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors no-underline',
                  active
                    ? 'bg-primary/12 text-primary-light'
                    : 'text-text-muted hover:bg-surface-hover hover:text-vhv-text',
                )}
              >
                <span className={cn(active ? 'text-primary-light' : 'text-text-subtle')}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4">
          <p className="text-xs text-text-subtle">VHV Stream Monitor</p>
        </div>
      </aside>
    </>
  );
}
