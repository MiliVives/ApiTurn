'use client';

import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { LockClosedIcon, UserPlusIcon } from '@heroicons/react/24/outline';

export function AuthButtons() {
  return (
    <div className="space-y-3 w-full">
      <SignInButton mode="modal">
        <button className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[var(--dark)] text-[var(--cream)] text-xs tracking-[0.2em] hover:opacity-90 transition font-light cursor-pointer">
          <LockClosedIcon className="w-3.5 h-3.5 shrink-0" />
          INICIAR SESIÓN
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="w-full flex items-center justify-center gap-3 py-4 px-6 border border-[var(--dark)] text-[var(--dark)] text-xs tracking-[0.2em] hover:bg-[var(--dark)]/5 transition font-light cursor-pointer">
          <UserPlusIcon className="w-3.5 h-3.5 shrink-0" />
          REGISTRARSE
        </button>
      </SignUpButton>
    </div>
  );
}
