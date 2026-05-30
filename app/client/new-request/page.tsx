import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/prisma';
import { NewRequestForm } from './form';
import Link from 'next/link';
import { cormorant } from '@/app/ui/fonts';

export default async function NewRequestPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { renapaNumber: true },
  });

  if (!dbUser?.renapaNumber) {
    return (
      <div className="p-8 md:p-10">
        <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>
          NUEVA SOLICITUD
        </p>
        <h1
          className={`${cormorant.className} text-4xl font-light tracking-wide mb-8`}
          style={{ color: 'var(--dark)' }}
        >
          SOLICITAR EXTRACCIÓN
        </h1>

        <div
          className="max-w-lg flex items-start gap-4 px-5 py-4 border mb-6"
          style={{ borderColor: 'rgba(201,168,76,0.45)', backgroundColor: 'rgba(201,168,76,0.06)' }}
        >
          <span
            className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-medium mt-0.5"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--dark)' }}
          >
            !
          </span>
          <div>
            <p className="text-[9px] tracking-[0.3em] mb-1" style={{ color: 'var(--gold)' }}>
              DATOS INCOMPLETOS
            </p>
            <p className="text-[11px] font-light leading-relaxed mb-3" style={{ color: 'var(--dark)' }}>
              Para solicitar un turno de extracción es necesario registrar tu número de RENAPA. Completalo en tu perfil y volvé a intentarlo.
            </p>
            <Link
              href="/client/settings"
              className="text-[8px] tracking-[0.35em] px-4 py-2 inline-block transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
            >
              IR A CONFIGURACIÓN
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <NewRequestForm />;
}
