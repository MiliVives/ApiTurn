import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import NavLinks from '@/app/ui/dashboard/nav-links';
import { prisma } from '@/app/lib/prisma';

export default async function SideNav() {
  const pendingCount = await prisma.appointment.count({ where: { status: 'PENDING' } });

  return (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: 'var(--dark)', width: '220px', flexShrink: 0 }}
    >
      {/* Brand */}
      <div className="px-8 pt-8 pb-10">
        <Link href="/admin/scheduler">
          <span
            className="text-[14px] font-medium tracking-[0.4em]"
            style={{ color: 'var(--gold)' }}
          >
            APITURN
          </span>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 px-6">
        <NavLinks pendingCount={pendingCount} />
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 flex flex-col gap-4">
        <SignOutButton redirectUrl="/">
          <button
            className="text-left text-[10px] font-light tracking-[0.3em] transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)' }}
          >
            CERRAR SESIÓN
          </button>
        </SignOutButton>

        <div className="border-t pt-4" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
          <p className="text-[8px] font-light tracking-[0.2em] leading-relaxed" style={{ color: 'rgba(201,168,76,0.4)' }}>
            CARGA DEL SISTEMA / ESTABLE // 24ms
          </p>
        </div>
      </div>
    </div>
  );
}
