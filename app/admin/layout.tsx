import { auth, currentUser } from '@clerk/nextjs/server';
import SideNav from '@/app/ui/dashboard/sidenav';
import { syncUser } from '@/app/lib/user-sync';

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
    <div className="flex h-screen overflow-hidden">
      <SideNav />
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--cream)' }}>
        {children}
      </div>
    </div>
  );
}
