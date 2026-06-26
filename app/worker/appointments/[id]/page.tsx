import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cormorant } from '@/app/ui/fonts';
import { prisma } from '@/app/lib/prisma';
import { updateAppointmentStatus } from '@/app/lib/actions';
import type { AppointmentStatus } from '@/generated/prisma/client';

const STEPS: AppointmentStatus[] = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'];

const STEP_LABELS: Record<string, string> = {
  CONFIRMED:   'Turno confirmado',
  CHECKED_IN:  'Productor presente',
  IN_PROGRESS: 'Extracción en proceso',
  COMPLETED:   'Extracción finalizada',
};

const STEP_ADVANCE_LABELS: Record<string, string> = {
  CONFIRMED:   'MARCAR PRODUCTOR PRESENTE',
  CHECKED_IN:  'INICIAR EXTRACCIÓN',
  IN_PROGRESS: 'MARCAR FINALIZADO',
};

const TERMINAL: AppointmentStatus[] = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

export default async function WorkerAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/');

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!appt) notFound();

  const currentStepIdx = STEPS.indexOf(appt.status as AppointmentStatus);
  const isTerminal = TERMINAL.includes(appt.status as AppointmentStatus);
  const canAdvance = !isTerminal && currentStepIdx < STEPS.length - 1;

  return (
    <div className="p-8 md:p-10">

      {/* Back button — left aligned */}
      <div className="mb-8">

        <Link
          href="/worker/active"
          className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] transition-opacity hover:opacity-60"
          style={{ color: 'var(--dark)', fontWeight: 500 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          TURNOS ACTIVOS
        </Link>
      </div>

      {/* Centered content */}
      <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl">

      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>
        PANEL DE PLANTA
      </p>
      <h1
        className={`${cormorant.className} text-4xl font-light tracking-wide mb-8`}
        style={{ color: 'var(--dark)' }}
      >
        DETALLE DE TURNO
      </h1>

      {/* Client info */}
      <div className="border rounded-sm p-5 mb-6" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[8px] tracking-[0.35em] mb-3" style={{ color: 'var(--muted)' }}>PRODUCTOR</p>
        <p className="text-[15px] font-light mb-1" style={{ color: 'var(--dark)' }}>{appt.user.name}</p>
        <a
          href={`mailto:${appt.user.email}`}
          className="text-[10px] tracking-[0.15em] transition-opacity hover:opacity-60"
          style={{ color: 'var(--gold)' }}
        >
          {appt.user.email}
        </a>
      </div>

      {/* Appointment details */}
      <div className="border rounded-sm p-5 mb-6" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[8px] tracking-[0.35em] mb-4" style={{ color: 'var(--muted)' }}>DETALLES DEL TURNO</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {[
            ['FECHA Y HORA', appt.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'long' }) + ' · ' + appt.scheduledAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })],
            ['VARIEDAD',     appt.honeyVariety ?? '—'],
            ['ALZAS',        appt.quantity != null ? `${appt.quantity} marcos` : '—'],
            ['APIARIO',      appt.apiarySource ?? '—'],
            ['LOTE',         appt.loteNumber ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[8px] tracking-[0.2em] mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
              <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{value}</p>
            </div>
          ))}
        </div>
        {appt.notes && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[8px] tracking-[0.2em] mb-1" style={{ color: 'var(--muted)' }}>NOTAS</p>
            <p className={`${cormorant.className} text-sm italic`} style={{ color: 'var(--dark)' }}>{appt.notes}</p>
          </div>
        )}
      </div>

      {/* Vertical status timeline */}
      <div className="border rounded-sm p-5 mb-6" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[8px] tracking-[0.35em] mb-5" style={{ color: 'var(--muted)' }}>ESTADO DE LA EXTRACCIÓN</p>
        {STEPS.map((step, idx) => {
          const done    = idx < currentStepIdx || appt.status === 'COMPLETED';
          const current = idx === currentStepIdx && appt.status !== 'COMPLETED';
          const future  = !done && !current;
          const isLast  = idx === STEPS.length - 1;
          return (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: done ? 'var(--gold)' : current ? 'var(--dark)' : 'transparent',
                    border: future ? '1.5px solid var(--border)' : current ? '2px solid var(--gold)' : 'none',
                  }}
                >
                  {done && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" style={{ color: 'var(--dark)' }}>
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                  )}
                  {current && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--gold)' }} />}
                </div>
                {!isLast && (
                  <div className="w-px my-1" style={{ minHeight: '20px', backgroundColor: done ? 'var(--gold)' : 'var(--border)' }} />
                )}
              </div>
              <div className="pb-4">
                <p
                  className="text-[12px] leading-tight"
                  style={{ color: future ? 'var(--border)' : 'var(--dark)', fontWeight: current ? 500 : 300 }}
                >
                  {STEP_LABELS[step]}
                </p>
                {current && (
                  <p className="text-[8px] tracking-[0.15em] mt-0.5" style={{ color: 'var(--gold)' }}>EN CURSO</p>
                )}
              </div>
            </div>
          );
        })}

        {appt.status === 'CANCELLED' && (
          <p className="text-[9px] tracking-[0.2em] mt-2" style={{ color: '#c0392b' }}>TURNO CANCELADO</p>
        )}
        {appt.status === 'NO_SHOW' && (
          <p className="text-[9px] tracking-[0.2em] mt-2" style={{ color: 'var(--muted)' }}>PRODUCTOR NO SE PRESENTÓ</p>
        )}
      </div>

      {/* Advance button */}
      {canAdvance && (
        <form action={updateAppointmentStatus}>
          <input type="hidden" name="appointmentId" value={appt.id} />
          <button
            type="submit"
            className="w-full py-3.5 text-[9px] font-light tracking-[0.4em] transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
          >
            {STEP_ADVANCE_LABELS[appt.status] ?? 'AVANZAR ESTADO'}
          </button>
        </form>
      )}

      {appt.status === 'COMPLETED' && (
        <div
          className="py-3.5 text-center text-[9px] tracking-[0.4em] rounded-sm"
          style={{ backgroundColor: 'rgba(36,113,163,0.08)', color: '#2471a3', border: '1px solid rgba(36,113,163,0.3)' }}
        >
          EXTRACCIÓN FINALIZADA
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
