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
  PENDING: '#c9a84c',
  CONFIRMED: '#2e7d4f',
  IN_PROGRESS: '#1a6890',
  COMPLETED: '#8a7a6a',
  CANCELLED: '#c0392b',
};

export default async function ClientPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const firstName = user?.firstName ?? 'Productor';

  const appointments = userId
    ? await prisma.appointment.findMany({
        where: {
          userId,
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      })
    : [];

  const unreadCount = userId
    ? await prisma.notification.count({ where: { userId, read: false } })
    : 0;

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>
        PORTAL DEL PRODUCTOR
      </p>
      <h1
        className={`${cormorant.className} text-4xl font-light tracking-wide mb-1`}
        style={{ color: 'var(--dark)' }}
      >
        Bienvenido/a, {firstName}
      </h1>
      <p className={`${cormorant.className} text-lg italic mb-10`} style={{ color: 'var(--muted)' }}>
        Gestiona tus solicitudes de extracción desde aquí.
      </p>

      {unreadCount > 0 && (
        <Link
          href="/client/notifications"
          className="flex items-center gap-3 mb-8 px-4 py-3 rounded-sm border transition-opacity hover:opacity-80"
          style={{ borderColor: 'rgba(201,168,76,0.4)', backgroundColor: 'rgba(201,168,76,0.05)' }}
        >
          <span
            className="flex items-center justify-center rounded-full text-[8px] font-light w-5 h-5"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--dark)' }}
          >
            {unreadCount}
          </span>
          <span className="text-[9px] tracking-[0.3em]" style={{ color: 'var(--gold)' }}>
            {unreadCount === 1 ? 'TIENES 1 NOTIFICACIÓN SIN LEER' : `TIENES ${unreadCount} NOTIFICACIONES SIN LEER`}
          </span>
        </Link>
      )}

      <div className="mb-6 flex items-center justify-between">
        <p className="text-[9px] tracking-[0.35em]" style={{ color: 'var(--muted)' }}>
          MIS SOLICITUDES ACTIVAS
        </p>
        <Link
          href="/client/new-request"
          className="text-[9px] tracking-[0.3em] px-4 py-2 transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
        >
          + NUEVA SOLICITUD
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 border border-dashed rounded-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[10px] tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>
            SIN SOLICITUDES ACTIVAS
          </p>
          <p className={`${cormorant.className} text-lg italic mb-6`} style={{ color: 'var(--border)' }}>
            Todavía no has realizado ninguna solicitud.
          </p>
          <Link
            href="/client/new-request"
            className="text-[9px] tracking-[0.3em] px-5 py-2.5 transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
          >
            SOLICITAR EXTRACCIÓN
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="border rounded-sm p-5 flex items-center justify-between flex-wrap gap-3"
              style={{ borderColor: 'var(--border)', backgroundColor: '#ffffff' }}
            >
              <div>
                <p className="text-[9px] tracking-[0.2em] mb-1" style={{ color: 'var(--muted)' }}>
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
                className="text-[8px] tracking-[0.25em] px-2.5 py-1 rounded-sm"
                style={{
                  backgroundColor: `${STATUS_COLORS[appt.status]}15`,
                  color: STATUS_COLORS[appt.status],
                  border: `1px solid ${STATUS_COLORS[appt.status]}35`,
                }}
              >
                {STATUS_LABELS[appt.status] ?? appt.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
