'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Squares2X2Icon,
  PlusCircleIcon,
  BellIcon,
  ClipboardDocumentListIcon,
  HomeModernIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type NavLink = {
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
};

const links: NavLink[] = [
  { name: 'VISTA GENERAL',   href: '/client',                icon: Squares2X2Icon,           exact: true },
  { name: 'NUEVA SOLICITUD', href: '/client/new-request',    icon: PlusCircleIcon },
  { name: 'NOTIFICACIONES',  href: '/client/notifications',  icon: BellIcon },
  { name: 'HISTORIAL',       href: '/client/history',        icon: ClipboardDocumentListIcon },
  { name: 'MIS APIARIOS',    href: '/client/apiaries',       icon: HomeModernIcon },
  { name: 'CONFIGURACIÓN',   href: '/client/settings',       icon: Cog6ToothIcon },
];

export function ClientNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className="flex items-center gap-2.5 py-2 text-[11px] font-light tracking-[0.18em] transition-opacity hover:opacity-100"
            style={{ color: active ? 'var(--gold)' : 'rgba(201,168,76,0.55)' }}
          >
            <span className="w-3 text-center shrink-0" style={{ color: 'var(--gold)' }}>
              {active ? '•' : ''}
            </span>
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: active ? 'var(--gold)' : 'rgba(201,168,76,0.45)' }} />
            <span>{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
