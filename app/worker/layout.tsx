import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { syncUser } from '@/app/lib/user-sync';
import { prisma } from '@/app/lib/prisma';
import { CollapsibleSidebarShell } from '@/app/ui/collapsible-sidebar-shell';
import { WorkerNav } from './worker-nav';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const [user, dbUser] = await Promise.all([
    currentUser(),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } }),
  ]);

  if (user) {
    await syncUser(
      userId,
      user.emailAddresses[0]?.emailAddress ?? '',
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    );
  }

  if (!dbUser || (dbUser.role !== 'WORKER' && dbUser.role !== 'ADMIN')) {
    redirect('/');
  }

  const displayName = dbUser.name || user?.firstName || 'Operario';

  const sidebar = (
    <div
      className="flex flex-col h-full"
      style={{ width: '252px', flexShrink: 0, backgroundColor: 'var(--dark)' }}
    >
      <div className="px-8 pt-8 pb-10">
        <span className="text-[14px] font-medium tracking-[0.4em]" style={{ color: 'var(--gold)' }}>
          APITURN
        </span>
        <p className="text-[8px] tracking-[0.3em] mt-1" style={{ color: 'rgba(201,168,76,0.45)' }}>
          PANEL DE PLANTA
        </p>
      </div>
      <div className="flex-1 px-6">
        <WorkerNav />
      </div>
      <div className="px-6 pb-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <UserButton />
          <div>
            <p className="text-[8px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.5)' }}>
              OPERARIO
            </p>
            <p className="text-[9px] tracking-[0.1em] font-light truncate max-w-[140px]" style={{ color: 'var(--gold)' }}>
              {displayName.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="border-t pt-4" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
          <p className="text-[8px] font-light tracking-[0.2em] leading-relaxed" style={{ color: 'rgba(201,168,76,0.4)' }}>
            PLANTA DE EXTRACCIÓN // ACTIVO
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <CollapsibleSidebarShell sidebar={sidebar}>
      {children}
    </CollapsibleSidebarShell>
  );
}
