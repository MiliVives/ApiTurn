'use client';

import { UserButton } from '@clerk/nextjs';

export function UserFooter({ shortId }: { shortId: string }) {
  return (
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
  );
}
