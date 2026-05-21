import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';
import { confirmAppointment, rescheduleAppointment, cancelAppointment } from '@/app/lib/actions';
import type { UrgencyLevel } from '@/generated/prisma/client';

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  STANDARD: 'ESTÁNDAR',
  PRIORITY: 'PRIORIDAD',
  IMMEDIATE: 'INMEDIATA',
};

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  STANDARD: '#8a7a6a',
  PRIORITY: '#c9a84c',
  IMMEDIATE: '#c0392b',
};

export default async function PendingPage() {
  const pending = await prisma.appointment.findMany({
    where: { status: 'PENDING' },
    include: { user: true },
    orderBy: [{ urgencyLevel: 'asc' }, { createdAt: 'asc' }],
  });

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>
        ADMINISTRACIÓN
      </p>
      <h1
        className={`${cormorant.className} text-4xl font-light tracking-wide mb-8`}
        style={{ color: 'var(--dark)' }}
      >
        SOLICITUDES PENDIENTES
      </h1>

      {pending.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 border border-dashed rounded-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[10px] tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>
            SIN SOLICITUDES PENDIENTES
          </p>
          <p className={`${cormorant.className} text-lg italic`} style={{ color: 'var(--border)' }}>
            Todas las solicitudes han sido procesadas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((appt) => (
            <div
              key={appt.id}
              className="border rounded-sm p-6"
              style={{ borderColor: 'var(--border)', backgroundColor: '#ffffff' }}
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <p
                    className={`${cormorant.className} text-xl font-light`}
                    style={{ color: 'var(--dark)' }}
                  >
                    {appt.user.name}
                  </p>
                  <p className="text-[9px] tracking-[0.2em] mt-0.5" style={{ color: 'var(--muted)' }}>
                    {appt.user.email}
                  </p>
                </div>
                <span
                  className="text-[8px] tracking-[0.3em] px-2.5 py-1 rounded-sm"
                  style={{
                    backgroundColor: `${URGENCY_COLORS[appt.urgencyLevel]}18`,
                    color: URGENCY_COLORS[appt.urgencyLevel],
                    border: `1px solid ${URGENCY_COLORS[appt.urgencyLevel]}40`,
                  }}
                >
                  {URGENCY_LABELS[appt.urgencyLevel]}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'APIARIO', value: appt.apiarySource || '—' },
                  { label: 'VARIEDAD', value: appt.honeyVariety || '—' },
                  { label: 'CANTIDAD', value: appt.quantity ? `${appt.quantity} colmenas` : '—' },
                  {
                    label: 'SOLICITADO',
                    value: appt.createdAt.toLocaleDateString('es-AR', { dateStyle: 'medium' }),
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[8px] tracking-[0.25em] mb-1" style={{ color: 'var(--muted)' }}>
                      {label}
                    </p>
                    <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {appt.notes && (
                <p className="text-[10px] italic mb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  "{appt.notes}"
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 items-end border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                {/* Confirm */}
                <form action={confirmAppointment}>
                  <input type="hidden" name="id" value={appt.id} />
                  <button
                    type="submit"
                    className="text-[9px] tracking-[0.3em] px-4 py-2 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
                  >
                    CONFIRMAR
                  </button>
                </form>

                {/* Reschedule */}
                <form action={rescheduleAppointment} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={appt.id} />
                  <input
                    type="datetime-local"
                    name="newDate"
                    required
                    className="text-[9px] px-2 py-2 border outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--dark)', backgroundColor: 'transparent' }}
                  />
                  <button
                    type="submit"
                    className="text-[9px] tracking-[0.3em] px-4 py-2 border transition-opacity hover:opacity-60"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                  >
                    REPROGRAMAR
                  </button>
                </form>

                {/* Cancel */}
                <form action={cancelAppointment} className="flex items-center gap-2 ml-auto">
                  <input type="hidden" name="id" value={appt.id} />
                  <input
                    type="text"
                    name="reason"
                    placeholder="Motivo (opcional)"
                    className="text-[9px] px-2 py-2 border outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--dark)', backgroundColor: 'transparent' }}
                  />
                  <button
                    type="submit"
                    className="text-[9px] tracking-[0.3em] px-4 py-2 border transition-opacity hover:opacity-60"
                    style={{ borderColor: '#c0392b40', color: '#c0392b' }}
                  >
                    CANCELAR
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
