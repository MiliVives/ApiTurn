'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { name: 'PLANIFICADOR', href: '/admin/scheduler' },
  { name: 'PENDIENTES', href: '/admin/pending' },
  { name: 'PRODUCTORES', href: '/admin/producers' },
  { name: 'LOGÍSTICA', href: '/admin/logistics' },
  { name: 'GENÉTICA', href: '/admin/genetics' },
  { name: 'ANALÍTICA', href: '/admin/analytics' },
];

export default function NavLinks({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.name}
            href={link.href}
            className="flex items-center gap-3 py-2 text-[11px] font-light tracking-[0.18em] transition-opacity hover:opacity-100"
            style={{ color: active ? 'var(--gold)' : 'rgba(201,168,76,0.55)', opacity: active ? 1 : undefined }}
          >
            <span className="w-3 text-center" style={{ color: 'var(--gold)' }}>
              {active ? '•' : ''}
            </span>
            <span>{link.name}</span>
            {link.name === 'PENDIENTES' && pendingCount > 0 && (
              <span
                className="ml-auto flex items-center justify-center rounded-full text-[8px] font-light w-4 h-4"
                style={{ backgroundColor: 'var(--gold)', color: 'var(--dark)' }}
              >
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
