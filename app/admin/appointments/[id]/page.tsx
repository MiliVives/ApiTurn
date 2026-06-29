import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';
import { confirmAppointment, rescheduleAppointment, cancelAppointment } from '@/app/lib/actions';
import { estimateCost } from '@/app/lib/pricing';
import { formatDuration, estimateDurationFromFrames } from '@/app/lib/scheduling';
import type { UrgencyLevel, AppointmentStatus } from '@/generated/prisma/client';

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  STANDARD: 'ESTÁNDAR', PRIORITY: 'PRIORIDAD', IMMEDIATE: 'INMEDIATA',
};
const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  STANDARD: '#8a7a6a', PRIORITY: '#c9a84c', IMMEDIATE: '#c0392b',
};
const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'PENDIENTE', CONFIRMED: 'CONFIRMADO', CHECKED_IN: 'PRESENTE',
  IN_PROGRESS: 'EN PROCESO', COMPLETED: 'COMPLETADO', CANCELLED: 'CANCELADO', NO_SHOW: 'AUSENTE',
};
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: '#c9a84c', CONFIRMED: '#2e7d4f', CHECKED_IN: '#2f7e9c',
  IN_PROGRESS: '#1a6890', COMPLETED: '#8a7a6a', CANCELLED: '#c0392b', NO_SHOW: '#e67e22',
};

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { user: true, service: true },
  });

  if (!appt) notFound();

  const totalFrames =
    (appt.frameCount1Half ?? 0) +
    (appt.frameCount3Quarter ?? 0) +
    (appt.frameCountStd ?? 0);

  const hasWeights = appt.totalFilledKg != null || appt.totalEmptyKg != null;
  const costEst = estimateCost(appt.service, appt, false);
  const isPending = appt.status === 'PENDING';

  const fields = [
    { label: 'PRODUCTOR',     value: appt.user.name },
    { label: 'CORREO',        value: appt.user.email },
    { label: 'RENAPA',        value: appt.user.renapaNumber ?? '—' },
    { label: 'APIARIO',       value: appt.apiarySource ?? '—' },
    { label: 'VARIEDAD',      value: appt.honeyVariety ?? '—' },
    { label: 'URGENCIA',      value: URGENCY_LABELS[appt.urgencyLevel] },
    { label: 'TURNO PEDIDO',  value: appt.scheduledAt.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'long', timeStyle: 'short' }) },
    { label: 'CREADO',        value: appt.createdAt.toLocaleDateString('es-AR', { dateStyle: 'medium' }) },
    ...(appt.loteNumber ? [
      { label: 'LOTE', value: appt.loteNumber },
      { label: 'FECHA LOTE', value: appt.loteDate?.toLocaleDateString('es-AR', { dateStyle: 'medium' }) ?? '—' },
    ] : []),
    ...(appt.adminNotes ? [{ label: 'NOTAS ADMIN', value: appt.adminNotes }] : []),
  ];

  return (
    <div className="p-8 md:p-10 max-w-3xl">
      {/* Back link */}
      <Link
        href={`/admin/producers/${appt.userId}`}
        className="text-[8px] tracking-[0.3em] transition-opacity hover:opacity-60 mb-6 inline-block"
        style={{ color: 'var(--muted)' }}
      >
        ← VOLVER AL PRODUCTOR
      </Link>

      <div className="flex items-center gap-4 mb-1 flex-wrap">
        <p className="text-[9px] tracking-[0.4em]" style={{ color: 'var(--muted)' }}>TURNO</p>
        <span
          className="text-[8px] tracking-[0.25em] px-2.5 py-1 rounded-sm"
          style={{
            backgroundColor: `${STATUS_COLORS[appt.status]}15`,
            color: STATUS_COLORS[appt.status],
            border: `1px solid ${STATUS_COLORS[appt.status]}35`,
          }}
        >
          {STATUS_LABELS[appt.status]}
        </span>
        <span
          className="text-[8px] tracking-[0.25em] px-2.5 py-1 rounded-sm"
          style={{
            backgroundColor: `${URGENCY_COLORS[appt.urgencyLevel]}18`,
            color: URGENCY_COLORS[appt.urgencyLevel],
            border: `1px solid ${URGENCY_COLORS[appt.urgencyLevel]}40`,
          }}
        >
          {URGENCY_LABELS[appt.urgencyLevel]}
        </span>
      </div>

      <h1
        className={`${cormorant.className} text-4xl font-light tracking-wide mb-8`}
        style={{ color: 'var(--dark)' }}
      >
        {appt.user.name}
      </h1>

      {/* Info fields */}
      <div className="border overflow-hidden mb-6" style={{ borderColor: 'var(--border)' }}>
        {fields.map(({ label, value }, i) => (
          <div
            key={label}
            className="flex flex-col sm:flex-row sm:items-center gap-1 px-5 py-3 border-b last:border-b-0"
            style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? '#ffffff' : '#faf8f4' }}
          >
            <p className="text-[8px] tracking-[0.3em] sm:w-40 shrink-0" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Frame breakdown */}
      {totalFrames > 0 && (
        <div
          className="mb-6 p-4 border"
          style={{ borderColor: 'rgba(201,168,76,0.25)', backgroundColor: 'rgba(201,168,76,0.04)' }}
        >
          <p className="text-[8px] tracking-[0.3em] mb-3" style={{ color: 'var(--gold)' }}>ALZAS</p>
          <div className="flex flex-wrap gap-8">
            {([
              { label: '1/2',  val: appt.frameCount1Half },
              { label: '3/4',  val: appt.frameCount3Quarter },
              { label: 'STD',  val: appt.frameCountStd },
            ] as const).filter(({ val }) => (val ?? 0) > 0).map(({ label, val }) => (
              <div key={label}>
                <p className="text-[8px] tracking-[0.2em] mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                <p className="text-xl font-light" style={{ color: 'var(--dark)' }}>{val}</p>
              </div>
            ))}
            <div>
              <p className="text-[8px] tracking-[0.2em] mb-0.5" style={{ color: 'var(--muted)' }}>TOTAL</p>
              <p className="text-xl font-light" style={{ color: 'var(--dark)' }}>{totalFrames}</p>
            </div>
            <div>
              <p className="text-[8px] tracking-[0.2em] mb-0.5" style={{ color: 'var(--muted)' }}>DURACIÓN EST.</p>
              <p className="text-xl font-light" style={{ color: 'var(--dark)' }}>
                {formatDuration(estimateDurationFromFrames(
                  appt.frameCount1Half ?? 0,
                  appt.frameCount3Quarter ?? 0,
                  appt.frameCountStd ?? 0
                ))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weights + cost estimate */}
      {hasWeights && (
        <div
          className="mb-6 p-4 border"
          style={{ borderColor: 'rgba(201,168,76,0.25)', backgroundColor: 'rgba(201,168,76,0.03)' }}
        >
          <p className="text-[8px] tracking-[0.3em] mb-3" style={{ color: 'var(--gold)' }}>PESOS Y ESTIMACIÓN DE COSTO</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'KG LLENAS',     value: appt.totalFilledKg != null ? `${appt.totalFilledKg} kg` : '—' },
              { label: 'KG VACÍAS',     value: appt.totalEmptyKg  != null ? `${appt.totalEmptyKg} kg`  : '—' },
              { label: 'MIEL NETA EST.',value: `${costEst.estimatedHoneyKg.toFixed(1)} kg` },
              { label: 'TAMBORES EST.', value: `${costEst.estimatedDrumsNeeded}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[7px] tracking-[0.2em] mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                <p className="text-[12px] font-light" style={{ color: 'var(--dark)' }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
            <p className="text-[8px] tracking-[0.3em]" style={{ color: 'var(--dark)' }}>TOTAL ESTIMADO</p>
            <p className="text-[14px] font-light" style={{ color: 'var(--dark)' }}>${costEst.totalCost.toFixed(2)}</p>
          </div>
          {appt.estimatedCostARS != null && (
            <p className="text-[8px] tracking-[0.15em] mt-1" style={{ color: 'var(--muted)' }}>
              Registrado al confirmar: ${appt.estimatedCostARS.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      {appt.notes && (
        <div className="mb-6 p-4 border" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[8px] tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>INSTRUCCIONES ESPECIALES</p>
          <p className="text-[11px] font-light italic leading-relaxed" style={{ color: 'var(--dark)' }}>
            "{appt.notes}"
          </p>
        </div>
      )}

      {/* Admin actions — only for pending appointments */}
      {isPending && (
        <div className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[8px] tracking-[0.3em] mb-4" style={{ color: 'var(--muted)' }}>ACCIONES</p>
          <div className="flex flex-wrap gap-3 items-end">
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

            <form action={rescheduleAppointment} className="flex items-center gap-2">
              <input type="hidden" name="id" value={appt.id} />
              <input
                type="datetime-local"
                name="newDate"
                required
                defaultValue={appt.scheduledAt.toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).replace(' ', 'T').slice(0, 16)}
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
      )}
    </div>
  );
}
