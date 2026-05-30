import { auth, currentUser } from '@clerk/nextjs/server';
import SideNav from '@/app/ui/dashboard/sidenav';
import { syncUser } from '@/app/lib/user-sync';
import { CollapsibleSidebarShell } from '@/app/ui/collapsible-sidebar-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const user = await currentUser();

  if (userId && user) {
    await syncUser(
      userId,
      user.emailAddresses[0]?.emailAddress ?? '',
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    );
  }

  return (
    <CollapsibleSidebarShell sidebar={<SideNav />}>
      {children}
    </CollapsibleSidebarShell>
  );
}
