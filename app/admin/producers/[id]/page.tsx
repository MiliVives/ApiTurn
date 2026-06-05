import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';
import type { AppointmentStatus, UrgencyLevel } from '@/generated/prisma/client';

const ALL_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'PENDIENTE', CONFIRMED: 'CONFIRMADO', IN_PROGRESS: 'EN PROCESO',
  COMPLETED: 'COMPLETADO', CANCELLED: 'CANCELADO', NO_SHOW: 'AUSENTE',
};
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: '#c9a84c', CONFIRMED: '#2e7d4f', IN_PROGRESS: '#1a6890',
  COMPLETED: '#8a7a6a', CANCELLED: '#c0392b', NO_SHOW: '#e67e22',
};

const PRIORITY_LABELS: Record<UrgencyLevel, string> = {
  STANDARD: 'ESTÁNDAR', PRIORITY: 'URGENTE', IMMEDIATE: 'EXTRAORDINARIO',
};
const PRIORITY_COLORS: Record<UrgencyLevel, string> = {
  STANDARD: '#8a7a6a', PRIORITY: '#c9a84c', IMMEDIATE: '#c0392b',
};

const FILTER_OPTIONS: { label: string; value: string; statuses: AppointmentStatus[] | null }[] = [
  { label: 'ACTIVOS',     value: 'active',    statuses: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
  { label: 'TODOS',       value: 'all',       statuses: null },
  { label: 'PENDIENTES',  value: 'PENDING',   statuses: ['PENDING'] },
  { label: 'CONFIRMADOS', value: 'CONFIRMED', statuses: ['CONFIRMED'] },
  { label: 'COMPLETADOS', value: 'COMPLETED', statuses: ['COMPLETED'] },
  { label: 'CANCELADOS',  value: 'CANCELLED', statuses: ['CANCELLED'] },
];

export default async function ProducerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { id } = await params;
  const { filter = 'active' } = await searchParams;

  const filterOption = FILTER_OPTIONS.find(f => f.value === filter) ?? FILTER_OPTIONS[0];
  const statusFilter = filterOption.statuses
    ? { status: { in: filterOption.statuses } }
    : {};

  const producer = await prisma.user.findUnique({
    where: { id, role: 'CLIENT' },
    include: {
      appointments: {
        where: statusFilter,
        orderBy: { scheduledAt: 'desc' },
        include: { service: true },
      },
    },
  });

  if (!producer) notFound();

  const priorityColor = PRIORITY_COLORS[producer.producerPriority];

  return (
    <div className="p-8 md:p-10 max-w-3xl">
      <Link
        href="/admin/producers"
        className="text-[8px] tracking-[0.3em] transition-opacity hover:opacity-60 mb-6 inline-block"
        style={{ color: 'var(--muted)' }}
      >
        ← PRODUCTORES
      </Link>

      <p className="text-[9px] tracking-[0.4em] mb-1" style={{ color: 'var(--muted)' }}>PRODUCTOR</p>
      <h1
        className={`${cormorant.className} text-4xl font-light tracking-wide mb-1`}
        style={{ color: 'var(--dark)' }}
      >
        {producer.name}
      </h1>
      <p className="text-[10px] font-light mb-6" style={{ color: 'var(--muted)' }}>{producer.email}</p>

      {/* Producer info strip */}
      <div className="flex flex-wrap gap-6 mb-8 px-5 py-4 border" style={{ borderColor: 'var(--border)', backgroundColor: '#ffffff' }}>
        <div>
          <p className="text-[7px] tracking-[0.25em] mb-0.5" style={{ color: 'var(--muted)' }}>RENAPA</p>
          <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{producer.renapaNumber ?? '—'}</p>
        </div>
        <div>
          <p className="text-[7px] tracking-[0.25em] mb-1" style={{ color: 'var(--muted)' }}>PRIORIDAD ASIGNADA</p>
          <span
            className="text-[8px] tracking-[0.25em] px-2.5 py-1 rounded-sm"
            style={{
              backgroundColor: priorityColor,
              color: '#ffffff',
              border: `1px solid ${priorityColor}`,
            }}
          >
            {PRIORITY_LABELS[producer.producerPriority]}
          </span>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {FILTER_OPTIONS.map((opt) => {
          const active = opt.value === filter || (filter === undefined && opt.value === 'active');
          return (
            <Link
              key={opt.value}
              href={`/admin/producers/${id}?filter=${opt.value}`}
              className="text-[8px] tracking-[0.25em] px-3 py-1.5 border transition-all"
              style={{
                borderColor: active ? 'var(--dark)' : 'var(--border)',
                backgroundColor: active ? 'var(--dark)' : 'transparent',
                color: active ? 'var(--gold)' : 'var(--muted)',
              }}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>

      {/* Appointment list */}
      {producer.appointments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-12 border border-dashed"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[10px] tracking-[0.3em] mb-1" style={{ color: 'var(--muted)' }}>SIN TURNOS</p>
          <p className={`${cormorant.className} text-base italic`} style={{ color: 'var(--border)' }}>
            No hay turnos en esta categoría.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {producer.appointments.map((appt) => {
            const totalFrames =
              (appt.frameCount1Half ?? 0) +
              (appt.frameCount3Quarter ?? 0) +
              (appt.frameCountStd ?? 0);
            const statusColor = STATUS_COLORS[appt.status];

            return (
              <Link
                key={appt.id}
                href={`/admin/appointments/${appt.id}`}
                className="block border p-5 transition-opacity hover:opacity-80"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: '#ffffff',
                  borderLeft: `3px solid ${statusColor}`,
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <p className="text-[12px] font-light" style={{ color: 'var(--dark)' }}>
                    {appt.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'long' })}
                    <span className="ml-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                      {appt.scheduledAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                  <span
                    className="text-[8px] tracking-[0.25em] px-2 py-1 rounded-sm"
                    style={{
                      backgroundColor: `${statusColor}15`,
                      color: statusColor,
                      border: `1px solid ${statusColor}35`,
                    }}
                  >
                    {STATUS_LABELS[appt.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'APIARIO',  value: appt.apiarySource ?? '—' },
                    { label: 'VARIEDAD', value: appt.honeyVariety ?? '—' },
                    { label: 'ALZAS',    value: totalFrames > 0 ? `${totalFrames}` : appt.quantity ? `${appt.quantity}` : '—' },
                    { label: 'LOTE',     value: appt.loteNumber ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[7px] tracking-[0.2em] mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                      <p className="text-[10px] font-light" style={{ color: 'var(--dark)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[8px] tracking-[0.2em] mt-3 text-right" style={{ color: 'var(--muted)' }}>
                  VER DETALLE →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
