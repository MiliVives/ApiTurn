import { auth, currentUser } from '@clerk/nextjs/server';
import { syncUser } from '@/app/lib/user-sync';
import { prisma } from '@/app/lib/prisma';
import { ClientNav } from './client-nav';
import { UserFooter } from './user-footer';
import { CollapsibleSidebarShell } from '@/app/ui/collapsible-sidebar-shell';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const user = await currentUser();

  if (userId && user) {
    await syncUser(
      userId,
      user.emailAddresses[0]?.emailAddress ?? '',
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    );
  }

  const shortId = userId ? userId.slice(-8).toUpperCase() : '--------';

  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { renapaNumber: true } })
    : null;
  const hasPendingData = !dbUser?.renapaNumber;

  const sidebar = (
    <div
      className="flex flex-col h-full"
      style={{ width: '252px', flexShrink: 0, backgroundColor: 'var(--dark)' }}
    >
      <div className="px-8 pt-8 pb-10">
        <span className="text-[14px] font-medium tracking-[0.4em]" style={{ color: 'var(--gold)' }}>
          APITURN
        </span>
      </div>
      <div className="flex-1 px-6">
        <ClientNav hasPendingData={hasPendingData} />
      </div>
      <UserFooter shortId={shortId} />
    </div>
  );

  return (
    <CollapsibleSidebarShell sidebar={sidebar}>
      {children}
    </CollapsibleSidebarShell>
  );
}
