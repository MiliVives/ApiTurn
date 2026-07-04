import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';
import { confirmAppointment, rescheduleAppointment, cancelAppointment } from '@/app/lib/actions';
import { estimateCost } from '@/app/lib/pricing';
import { estimateDuration, appointmentsOverlap, findNextAvailableSlot } from '@/app/lib/scheduling';
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
    include: { user: true, service: true },
    orderBy: [{ urgencyLevel: 'asc' }, { createdAt: 'asc' }],
  });

  // Detect which pending appointments conflict with an already-confirmed one,
  // and compute a viable reschedule suggestion for each conflicting appointment.
  const conflictingIds  = new Set<string>();
  const suggestedSlots  = new Map<string, Date>();
  let   confirmedAppts: Array<{ scheduledAt: Date; quantity: number | null }> = [];

  if (pending.length > 0) {
    const timestamps = pending.map(p => p.scheduledAt.getTime());
    const rangeStart = new Date(Math.min(...timestamps) - 3 * 3_600_000);
    const rangeEnd   = new Date(Math.max(...timestamps) + 6 * 3_600_000);
    confirmedAppts   = await prisma.appointment.findMany({
      where: { status: 'CONFIRMED', scheduledAt: { gte: rangeStart, lte: rangeEnd } },
      select: { scheduledAt: true, quantity: true },
    });

    for (const p of pending) {
      const pDur = estimateDuration(p.quantity ?? 1);
      for (const c of confirmedAppts) {
        if (appointmentsOverlap(p.scheduledAt, pDur, c.scheduledAt, estimateDuration(c.quantity ?? 1))) {
          conflictingIds.add(p.id);
          break;
        }
      }
    }

    // Compute a unique viable slot for each conflicting appointment.
    // virtualOccupied grows as we assign suggestions so no two get the same slot.
    const virtualOccupied = [...confirmedAppts];
    for (const p of pending) {
      if (!conflictingIds.has(p.id)) continue;
      const dur       = estimateDuration(p.quantity ?? 1);
      const suggested = findNextAvailableSlot(p.scheduledAt, dur, virtualOccupied);
      suggestedSlots.set(p.id, suggested);
      virtualOccupied.push({ scheduledAt: suggested, quantity: p.quantity });
    }
  }

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
          {pending.map((appt) => {
            const totalFrames =
              (appt.frameCount1Half ?? 0) +
              (appt.frameCount3Quarter ?? 0) +
              (appt.frameCountStd ?? 0);
            const hasWeights = appt.totalFilledKg != null || appt.totalEmptyKg != null;
            const costEst = estimateCost(appt.service, appt, false);

            return (
              <div
                key={appt.id}
                className="border rounded-sm p-6"
                style={{ borderColor: 'var(--border)', backgroundColor: '#ffffff' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <p className={`${cormorant.className} text-xl font-light`} style={{ color: 'var(--dark)' }}>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'APIARIO',      value: appt.apiarySource || '—' },
                    { label: 'VARIEDAD',     value: appt.honeyVariety || '—' },
                    { label: 'TOTAL ALZAS',  value: totalFrames > 0 ? `${totalFrames}` : appt.quantity ? `${appt.quantity}` : '—' },
                    { label: 'TURNO PEDIDO', value: appt.scheduledAt.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'medium', timeStyle: 'short' }) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[8px] tracking-[0.25em] mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
                      <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Frame breakdown — read-only summary (client-provided data) */}
                {totalFrames > 0 && (
                  <div
                    className="mb-4 px-4 py-3 border flex flex-wrap gap-6"
                    style={{ borderColor: 'rgba(201,168,76,0.2)', backgroundColor: 'rgba(201,168,76,0.04)' }}
                  >
                    <p className="w-full text-[8px] tracking-[0.3em] mb-1" style={{ color: 'var(--gold)' }}>DESGLOSE DE ALZAS</p>
                    {([
                      { label: '1/2',  val: appt.frameCount1Half },
                      { label: '3/4',  val: appt.frameCount3Quarter },
                      { label: 'STD',  val: appt.frameCountStd },
                    ] as const).filter(({ val }) => (val ?? 0) > 0).map(({ label, val }) => (
                      <div key={label}>
                        <p className="text-[8px] tracking-[0.2em] mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                        <p className="text-[13px] font-light" style={{ color: 'var(--dark)' }}>{val}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-[8px] tracking-[0.2em] mb-0.5" style={{ color: 'var(--muted)' }}>TOTAL</p>
                      <p className="text-[13px] font-light" style={{ color: 'var(--dark)' }}>{totalFrames}</p>
                    </div>
                  </div>
                )}

                {/* Cost estimate — admin only, shown when weights are available */}
                {hasWeights && (
                  <div
                    className="mb-4 p-4 border"
                    style={{ borderColor: 'rgba(201,168,76,0.25)', backgroundColor: 'rgba(201,168,76,0.03)' }}
                  >
                    <p className="text-[8px] tracking-[0.3em] mb-3" style={{ color: 'var(--gold)' }}>
                      ESTIMACIÓN DE COSTO
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      {[
                        { label: 'SERVICIO BASE',  value: `$${costEst.baseCost.toFixed(2)}` },
                        { label: 'PROCESAMIENTO',  value: `$${costEst.processingCost.toFixed(2)}` },
                        { label: 'TAMBORES',       value: `$${costEst.drumCost.toFixed(2)}` },
                        { label: 'MIEL NETA EST.', value: `${costEst.estimatedHoneyKg.toFixed(1)} kg` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[7px] tracking-[0.2em] mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                          <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div
                      className="flex justify-between items-center pt-2 border-t"
                      style={{ borderColor: 'rgba(201,168,76,0.2)' }}
                    >
                      <p className="text-[8px] tracking-[0.3em]" style={{ color: 'var(--dark)' }}>TOTAL ESTIMADO</p>
                      <p className="text-[13px] font-light" style={{ color: 'var(--dark)' }}>
                        ${costEst.totalCost.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-[7px] tracking-[0.15em] mt-2 italic" style={{ color: 'var(--muted)' }}>
                      * Monto final se calcula tras la extracción según datos reales
                    </p>
                  </div>
                )}

                {appt.notes && (
                  <p className="text-[10px] italic mb-4 leading-relaxed" style={{ color: 'var(--muted)' }}>
                    "{appt.notes}"
                  </p>
                )}

                {/* Conflict warning */}
                {conflictingIds.has(appt.id) && (
                  <div
                    className="mb-4 px-4 py-3 text-[9px] tracking-[0.2em] leading-relaxed"
                    style={{
                      backgroundColor: 'rgba(192,57,43,0.06)',
                      border: '1px solid rgba(192,57,43,0.3)',
                      color: '#c0392b',
                    }}
                  >
                    CONFLICTO — Este turno solapa con uno ya confirmado. Reprogramar antes de confirmar.
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 items-end border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  {/* Confirm — hidden when there is a scheduling conflict */}
                  {!conflictingIds.has(appt.id) && (
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
                  )}

                  {/* Reschedule */}
                  <form action={rescheduleAppointment} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={appt.id} />
                    <input
                      type="datetime-local"
                      name="newDate"
                      required
                      defaultValue={(suggestedSlots.get(appt.id) ?? appt.scheduledAt).toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).replace(' ', 'T').slice(0, 16)}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
