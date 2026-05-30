import { auth, currentUser } from '@clerk/nextjs/server';
import { cormorant } from '@/app/ui/fonts';
import { prisma } from '@/app/lib/prisma';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'PENDIENTE',
  CONFIRMED: 'CONFIRMADO',
  IN_PROGRESS: 'EN PROCESO',
  COMPLETED: 'COMPLETADO',
  CANCELLED: 'CANCELADO',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#9a6e00',
  CONFIRMED: '#2e7d4f',
  IN_PROGRESS: '#1a6890',
  COMPLETED: '#6b5e52',
  CANCELLED: '#b03020',
};

type ApptSummary = {
  id: string;
  scheduledAt: Date;
  honeyVariety: string | null;
  apiarySource: string | null;
  status: string;
};

function AppointmentCard({ appt, accent }: { appt: ApptSummary; accent: string }) {
  return (
    <div
      className="p-5 flex items-center justify-between flex-wrap gap-3"
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #d0c8bc',
        borderRight: '1px solid #d0c8bc',
        borderBottom: '1px solid #d0c8bc',
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div>
        <p className="text-[9px] tracking-[0.2em] mb-1" style={{ color: '#2f4858' }}>
          {appt.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'long' })}
          {' · '}
          {appt.scheduledAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>
          {appt.honeyVariety ?? 'Extracción'}
          {appt.apiarySource ? ` — ${appt.apiarySource}` : ''}
        </p>
      </div>
      <span
        className="text-[8px] tracking-[0.25em] px-2.5 py-1"
        style={{
          backgroundColor: `${STATUS_COLORS[appt.status]}15`,
          color: STATUS_COLORS[appt.status],
          border: `1px solid ${STATUS_COLORS[appt.status]}35`,
        }}
      >
        {STATUS_LABELS[appt.status] ?? appt.status}
      </span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div
      className="p-4"
      style={{ border: '1px solid #d0c8bc', backgroundColor: '#ffffff' }}
    >
      <p className="text-[8px] tracking-[0.25em] mb-3" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className={`${cormorant.className} text-3xl font-light mb-1`} style={{ color: 'var(--dark)' }}>
        {value}
      </p>
      <p className="text-[8px] tracking-[0.15em]" style={{ color: 'var(--muted)' }}>
        {sub}
      </p>
    </div>
  );
}

export default async function ClientPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const firstName = user?.firstName ?? 'Productor';

  const [active, pendingList, alzasAggregate, completedCount, unreadCount] = await Promise.all([
    userId ? prisma.appointment.findMany({
      where: { userId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } },
      orderBy: { scheduledAt: 'asc' },
    }) : [],
    userId ? prisma.appointment.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: { scheduledAt: 'asc' },
    }) : [],
    userId ? prisma.appointment.aggregate({
      where: { userId, status: 'COMPLETED' },
      _sum: { quantity: true },
    }) : null,
    userId ? prisma.appointment.count({ where: { userId, status: 'COMPLETED' } }) : 0,
    userId ? prisma.notification.count({ where: { userId, read: false } }) : 0,
  ]);

  const totalAlzas = alzasAggregate?._sum?.quantity ?? 0;
  const nextAppt = active[0] ?? null;

  return (
    <div className="p-8 md:p-10 lg:grid lg:grid-cols-[1fr_296px] lg:gap-10 lg:items-start">

      {/* ── Left column ── */}
      <div>
        <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>
          PORTAL DEL PRODUCTOR
        </p>
        <h1
          className={`${cormorant.className} text-4xl font-light tracking-wide mb-1`}
          style={{ color: 'var(--dark)' }}
        >
          Bienvenido/a, {firstName}
        </h1>
        <p className={`${cormorant.className} text-lg italic mb-8`} style={{ color: 'var(--muted)' }}>
          Gestiona tus solicitudes de extracción desde aquí.
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          <StatCard label="ALZAS PROCESADAS" value={totalAlzas} sub="en total" />
          <StatCard label="ACTIVAS" value={active.length} sub="en curso" />
          <StatCard label="EXTRACCIONES" value={completedCount} sub="completadas" />
        </div>

        {/* Active appointments */}
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-medium tracking-[0.25em]" style={{ color: 'var(--dark)' }}>
              MIS SOLICITUDES ACTIVAS
            </p>
            <Link
              href="/client/new-request"
              className="text-[9px] tracking-[0.3em] px-4 py-2 transition-opacity hover:opacity-80 lg:hidden"
              style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
            >
              + NUEVA
            </Link>
          </div>

          {active.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-14 border border-dashed"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="text-[10px] tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>
                SIN SOLICITUDES ACTIVAS
              </p>
              <p className={`${cormorant.className} text-lg italic`} style={{ color: 'var(--border)' }}>
                Todavía no tenés turnos confirmados.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-3">
                {active.map(appt => (
                  <AppointmentCard key={appt.id} appt={appt} accent="#c9a84c" />
                ))}
              </div>
              <p className="text-[8px] tracking-[0.15em] leading-relaxed" style={{ color: 'var(--muted)' }}>
                * Presentate al apiario <strong>15 minutos antes</strong> del turno asignado. Las solicitudes confirmadas que no sean atendidas en horario podrán ser canceladas automáticamente.
              </p>
            </>
          )}
        </div>

        {/* Pending appointments */}
        <div>
          <p className="text-[10px] font-medium tracking-[0.25em] mb-4" style={{ color: 'var(--dark)' }}>
            MIS SOLICITUDES PENDIENTES
          </p>

          {pendingList.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 border border-dashed"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className="text-[10px] tracking-[0.3em] mb-1" style={{ color: 'var(--muted)' }}>
                SIN SOLICITUDES PENDIENTES
              </p>
              <p className={`${cormorant.className} text-base italic`} style={{ color: 'var(--border)' }}>
                Tus próximas solicitudes aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingList.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} accent="#2f4858" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="mt-10 lg:mt-0 lg:sticky lg:top-0 lg:self-start flex flex-col gap-4">

        {/* Próximo turno */}
        <div>
          <p className="text-[9px] tracking-[0.3em] mb-3" style={{ color: 'var(--muted)' }}>
            PRÓXIMO TURNO
          </p>
          {nextAppt ? (
            <div
              className="p-5"
              style={{
                borderTop: '1px solid rgba(201,168,76,0.35)',
                borderRight: '1px solid rgba(201,168,76,0.35)',
                borderBottom: '1px solid rgba(201,168,76,0.35)',
                borderLeft: '3px solid #c9a84c',
                backgroundColor: 'rgba(201,168,76,0.04)',
              }}
            >
              <p className="text-[9px] tracking-[0.2em] mb-2" style={{ color: '#2f4858' }}>
                {nextAppt.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'long' })}
                {' · '}
                {nextAppt.scheduledAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className={`${cormorant.className} text-xl font-light mb-2`} style={{ color: 'var(--dark)' }}>
                {nextAppt.honeyVariety ?? 'Extracción'}
              </p>
              {nextAppt.apiarySource && (
                <p className="text-[9px] tracking-[0.15em] mb-3" style={{ color: 'var(--muted)' }}>
                  {nextAppt.apiarySource}
                </p>
              )}
              <span
                className="text-[8px] tracking-[0.25em] px-2.5 py-1"
                style={{
                  backgroundColor: `${STATUS_COLORS[nextAppt.status]}15`,
                  color: STATUS_COLORS[nextAppt.status],
                  border: `1px solid ${STATUS_COLORS[nextAppt.status]}35`,
                }}
              >
                {STATUS_LABELS[nextAppt.status] ?? nextAppt.status}
              </span>
            </div>
          ) : (
            <div
              className="p-5 border border-dashed"
              style={{ borderColor: 'var(--border)' }}
            >
              <p className={`${cormorant.className} text-base italic`} style={{ color: 'var(--border)' }}>
                Sin turnos próximos.
              </p>
            </div>
          )}
        </div>

        {/* Notifications */}
        {unreadCount > 0 && (
          <Link
            href="/client/notifications"
            className="flex items-center gap-3 px-4 py-3 border transition-opacity hover:opacity-80"
            style={{ borderColor: 'rgba(201,168,76,0.4)', backgroundColor: 'rgba(201,168,76,0.05)' }}
          >
            <span
              className="flex items-center justify-center rounded-full text-[8px] font-light w-5 h-5 shrink-0"
              style={{ backgroundColor: 'var(--gold)', color: 'var(--dark)' }}
            >
              {unreadCount}
            </span>
            <span className="text-[9px] tracking-[0.3em]" style={{ color: 'var(--gold)' }}>
              {unreadCount === 1 ? '1 NOTIFICACIÓN SIN LEER' : `${unreadCount} SIN LEER`}
            </span>
          </Link>
        )}

        {/* CTA */}
        <Link
          href="/client/new-request"
          className="flex items-center justify-center py-3 text-[9px] tracking-[0.35em] transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
        >
          + NUEVA SOLICITUD
        </Link>

        {/* Divider + status note */}
        <div className="h-px" style={{ backgroundColor: '#d0c8bc' }} />
        <p className="text-[8px] tracking-[0.2em] leading-relaxed" style={{ color: 'var(--muted)' }}>
          PORTAL DE PRODUCTORES // ACTIVO
        </p>
      </div>

    </div>
  );
}
