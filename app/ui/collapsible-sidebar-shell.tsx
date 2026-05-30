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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Top bar — always visible */}
      <div
        className="flex h-12 items-center gap-3 px-4 shrink-0 z-10"
        style={{ backgroundColor: 'var(--dark)' }}
      >
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          style={{ color: 'var(--gold)' }}
        >
          {open
            ? <XMarkIcon className="w-5 h-5" />
            : <Bars3Icon className="w-5 h-5" />}
        </button>
        <span
          className="text-[11px] font-light tracking-[0.5em]"
          style={{ color: 'var(--gold)' }}
        >
          A P I T U R N
        </span>
      </div>

      {/* Page content — always full width */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--cream)' }}>
        {children}
      </div>

      {/* Backdrop — fixed, sits above content, below sidebar */}
      {open && (
        <div
          className="fixed inset-0 z-20"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay, slides in from the left */}
      <div
        className={`fixed top-12 bottom-0 left-0 z-30 transition-transform duration-200 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </div>

    </div>
  );
}
