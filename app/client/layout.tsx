import { auth, currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { syncUser } from '@/app/lib/user-sync';
import { ClientNav } from './client-nav';

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
        style={{ width: '220px', flexShrink: 0, backgroundColor: 'var(--dark)' }}
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

        {/* User footer */}
        <div className="px-6 pb-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <UserButton />
            <div>
              <p className="text-[8px] tracking-[0.2em]" style={{ color: 'rgba(201,168,76,0.5)' }}>
                ID DE CLIENTE
              </p>
              <p className="text-[9px] tracking-[0.1em] font-light" style={{ color: 'var(--gold)' }}>
                ...{shortId}
              </p>
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
            <p className="text-[8px] font-light tracking-[0.2em] leading-relaxed" style={{ color: 'rgba(201,168,76,0.4)' }}>
              PORTAL DE PRODUCTORES // ACTIVO
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--cream)' }}>
        {children}
      </div>
    </div>
  );
}
