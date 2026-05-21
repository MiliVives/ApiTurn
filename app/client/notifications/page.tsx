import { auth } from '@clerk/nextjs/server';
import { cormorant } from '@/app/ui/fonts';
import { prisma } from '@/app/lib/prisma';
import { markNotificationRead } from '@/app/lib/actions';
import type { NotificationType } from '@/generated/prisma/client';

const TYPE_LABELS: Record<NotificationType, string> = {
  CONFIRMED: 'CONFIRMADO',
  RESCHEDULED: 'REPROGRAMADO',
  CANCELLED: 'CANCELADO',
};

const TYPE_COLORS: Record<NotificationType, string> = {
  CONFIRMED: '#2e7d4f',
  RESCHEDULED: '#c9a84c',
  CANCELLED: '#c0392b',
};

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>
        PORTAL DEL PRODUCTOR
      </p>
      <h1
        className={`${cormorant.className} text-4xl font-light tracking-wide mb-8`}
        style={{ color: 'var(--dark)' }}
      >
        NOTIFICACIONES
      </h1>

      {notifications.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 border border-dashed rounded-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[10px] tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>
            SIN NOTIFICACIONES
          </p>
          <p className={`${cormorant.className} text-lg italic`} style={{ color: 'var(--border)' }}>
            No hay actividad reciente en tu cuenta.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="border rounded-sm p-5 flex items-start justify-between gap-4"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: n.read ? '#ffffff' : 'rgba(201,168,76,0.03)',
                borderLeft: n.read ? `1px solid var(--border)` : `3px solid ${TYPE_COLORS[n.type]}`,
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="text-[8px] tracking-[0.3em] px-2 py-0.5 rounded-sm"
                    style={{
                      backgroundColor: `${TYPE_COLORS[n.type]}15`,
                      color: TYPE_COLORS[n.type],
                      border: `1px solid ${TYPE_COLORS[n.type]}35`,
                    }}
                  >
                    {TYPE_LABELS[n.type]}
                  </span>
                  {!n.read && (
                    <span className="text-[8px] tracking-[0.2em]" style={{ color: 'var(--gold)' }}>
                      NUEVO
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-light leading-relaxed mb-1" style={{ color: 'var(--dark)' }}>
                  {n.message}
                </p>
                <p className="text-[8px] tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
                  {n.createdAt.toLocaleDateString('es-AR', { dateStyle: 'long' })}
                  {' · '}
                  {n.createdAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {!n.read && (
                <form action={markNotificationRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="text-[8px] tracking-[0.25em] px-3 py-1.5 border transition-opacity hover:opacity-60 shrink-0"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                  >
                    MARCAR LEÍDA
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
