'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export function CollapsibleSidebarShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close when navigating (mobile only — desktop sidebar is always visible)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Backdrop — mobile only, shown when drawer is open */}
      {open && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar
          Mobile:  fixed overlay, slides in/out via translate
          Desktop: static flex child, always visible */}
      <div
        className={[
          'relative',
          'fixed inset-y-0 left-0 z-30',
          'md:static md:flex md:flex-shrink-0',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Close button — mobile only */}
        <button
          className="absolute top-3 right-3 z-10 md:hidden p-1"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
          style={{ color: 'var(--gold)' }}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
        {sidebar}
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile top bar with hamburger — hidden on desktop */}
        <div
          className="flex md:hidden h-12 items-center gap-3 px-4 shrink-0"
          style={{ backgroundColor: 'var(--dark)' }}
        >
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            style={{ color: 'var(--gold)' }}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <span
            className="text-[11px] font-light tracking-[0.5em]"
            style={{ color: 'var(--gold)' }}
          >
            A P I T U R N
          </span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--cream)' }}>
          {children}
        </div>

      </div>
    </div>
  );
}
