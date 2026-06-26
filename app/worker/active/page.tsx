import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cormorant } from '@/app/ui/fonts';
import { prisma } from '@/app/lib/prisma';
import { FinalizadosSection } from './finalizados-section';

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED:   'CONFIRMADO',
  CHECKED_IN:  'PRESENTE',
  IN_PROGRESS: 'EN PROCESO',
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:   '#2e7d4f',
  CHECKED_IN:  '#2f7e9c',
  IN_PROGRESS: '#c9a84c',
};

type ActiveAppt = Awaited<ReturnType<typeof fetchAll>>[number];

async function fetchAll() {
  return prisma.appointment.findMany({
    where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'] } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { scheduledAt: 'asc' },
  });
}

function ActiveRow({ a }: { a: ActiveAppt }) {
  const color = STATUS_COLORS[a.status] ?? 'var(--muted)';
  const label = STATUS_LABELS[a.status] ?? a.status;
  return (
    <Link
      href={`/worker/appointments/${a.id}`}
      className="flex items-center gap-4 px-5 py-4 border-b transition-opacity hover:opacity-70"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="w-20 shrink-0">
        <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>
          {a.scheduledAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-[9px]" style={{ color: 'var(--muted)' }}>
          {a.scheduledAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate" style={{ color: 'var(--dark)' }}>
          {a.user.name}
        </p>
        {a.honeyVariety && (
          <p className="text-[10px] italic truncate" style={{ color: 'var(--muted)' }}>
            {a.honeyVariety}
          </p>
        )}
      </div>
      {a.apiarySource && (
        <div className="shrink-0 hidden sm:block max-w-[200px]">
          <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>
            {a.apiarySource}
          </p>
        </div>
      )}
      <div className="shrink-0">
        <span
          className="text-[8px] tracking-[0.2em] px-2 py-0.5 rounded-sm"
          style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}35` }}
        >
          {label}
        </span>
      </div>
      <div className="shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" style={{ color: 'var(--muted)' }}>
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
    </Link>
  );
}

export default async function WorkerActivePage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const all = await fetchAll();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const todayAppts    = all.filter(a => a.scheduledAt >= today && a.scheduledAt <= todayEnd && a.status !== 'COMPLETED');
  const upcomingAppts = all.filter(a => a.scheduledAt > todayEnd && a.status === 'CONFIRMED');
  const finishedAppts = all.filter(a => a.status === 'COMPLETED').reverse();

  const isEmpty = todayAppts.length === 0 && upcomingAppts.length === 0 && finishedAppts.length === 0;

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>
        PANEL DE PLANTA
      </p>
      <h1
        className={`${cormorant.className} text-4xl font-light tracking-wide mb-8`}
        style={{ color: 'var(--dark)' }}
      >
        TURNOS
      </h1>

      {isEmpty ? (
        <div
          className="flex flex-col items-center justify-center py-20 border border-dashed rounded-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[10px] tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>SIN TURNOS</p>
          <p className={`${cormorant.className} text-lg italic`} style={{ color: 'var(--border)' }}>
            No hay turnos registrados.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {todayAppts.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold tracking-[0.3em] mb-3" style={{ color: 'var(--dark)' }}>HOY</p>
              <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                {todayAppts.map(a => <ActiveRow key={a.id} a={a} />)}
              </div>
            </section>
          )}
          {upcomingAppts.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold tracking-[0.3em] mb-3" style={{ color: 'var(--dark)' }}>PRÓXIMOS</p>
              <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                {upcomingAppts.map(a => <ActiveRow key={a.id} a={a} />)}
              </div>
            </section>
          )}
          {finishedAppts.length > 0 && (
            <FinalizadosSection
              appointments={finishedAppts.map(a => ({
                id: a.id,
                scheduledAt: a.scheduledAt.toISOString(),
                honeyVariety: a.honeyVariety,
                apiarySource: a.apiarySource,
                loteNumber: a.loteNumber,
                user: { name: a.user.name },
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}
