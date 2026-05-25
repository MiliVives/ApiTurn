import { auth, currentUser } from '@clerk/nextjs/server';
import { syncUser } from '@/app/lib/user-sync';
import { ClientNav } from './client-nav';
import { UserFooter } from './user-footer';

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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className="flex flex-col h-full"
        style={{ width: '252px', flexShrink: 0, backgroundColor: 'var(--dark)' }}
      >
        {/* Brand */}
        <div className="px-8 pt-8 pb-10">
          <span className="text-[14px] font-medium tracking-[0.4em]" style={{ color: 'var(--gold)' }}>
            APITURN
          </span>
        </div>

        {/* Nav */}
        <div className="flex-1 px-6">
          <ClientNav />
        </div>

        <UserFooter shortId={shortId} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--cream)' }}>
        {children}
      </div>
    </div>
  );
}
