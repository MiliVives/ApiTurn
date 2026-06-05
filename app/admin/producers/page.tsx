import Link from 'next/link';
import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';
import { updateProducerPriority } from '@/app/lib/actions';
import type { AppointmentStatus, UrgencyLevel } from '@/generated/prisma/client';

const ACTIVE_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'PENDIENTE', CONFIRMED: 'CONFIRMADO', IN_PROGRESS: 'EN PROCESO',
  COMPLETED: 'COMPLETADO', CANCELLED: 'CANCELADO', NO_SHOW: 'AUSENTE',
};
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: '#c9a84c', CONFIRMED: '#2e7d4f', IN_PROGRESS: '#1a6890',
  COMPLETED: '#8a7a6a', CANCELLED: '#c0392b', NO_SHOW: '#e67e22',
};

// Producer priority labels (admin-only — different from appointment urgency labels)
const PRIORITY_LABELS: Record<UrgencyLevel, string> = {
  STANDARD: 'ESTÁNDAR',
  PRIORITY: 'URGENTE',
  IMMEDIATE: 'EXTRAORDINARIO',
};
const PRIORITY_COLORS: Record<UrgencyLevel, string> = {
  STANDARD: '#8a7a6a',
  PRIORITY: '#c9a84c',
  IMMEDIATE: '#c0392b',
};
const PRIORITY_LEVELS: UrgencyLevel[] = ['STANDARD', 'PRIORITY', 'IMMEDIATE'];

export default async function ProducersPage() {
  const producers = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    include: {
      _count: { select: { appointments: true } },
      appointments: {
        where: { status: { in: ACTIVE_STATUSES } },
        orderBy: { scheduledAt: 'asc' },
        take: 1,
        select: { id: true, status: true, scheduledAt: true, honeyVariety: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>GESTIÓN</p>
      <h1 className={`${cormorant.className} text-4xl font-light tracking-wide mb-1`} style={{ color: 'var(--dark)' }}>
        PRODUCTORES
      </h1>
      <p className={`${cormorant.className} text-lg italic mb-8`} style={{ color: 'var(--muted)' }}>
        {producers.length} productores registrados en el sistema.
      </p>

      <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {/* Header */}
        <div
          className="hidden sm:grid text-[9px] tracking-[0.25em] font-medium px-5 py-3 border-b gap-x-6"
          style={{
            gridTemplateColumns: '1.4fr 2fr 0.8fr 2.5fr 2fr',
            borderColor: 'var(--border)',
            backgroundColor: '#faf8f4',
            color: 'var(--dark)',
          }}
        >
          <span>PRODUCTOR</span>
          <span className="text-center">CORREO</span>
          <span className="text-center">TURNOS</span>
          <span className="text-center">PRÓXIMO TURNO ACTIVO</span>
          <span className="text-center">PRIORIDAD</span>
        </div>

        {producers.map((p, i) => {
          const next = p.appointments[0] ?? null;

          return (
            <div
              key={p.id}
              className="border-b last:border-b-0"
              style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? '#ffffff' : '#fdf9f4' }}
            >
              {/* Desktop row */}
              <div
                className="hidden sm:grid items-center px-5 py-4 w-full gap-x-6"
                style={{ gridTemplateColumns: '1.4fr 2fr 0.8fr 2.5fr 2fr' }}
              >
                {/* Producer name */}
                <Link href={`/admin/producers/${p.id}`} className="group">
                  <p className="text-[11px] font-light group-hover:underline" style={{ color: 'var(--dark)' }}>{p.name}</p>
                  <p className="text-[8px] tracking-[0.1em] mt-0.5" style={{ color: 'rgba(138,122,106,0.6)' }}>
                    ...{p.id.slice(-8).toUpperCase()}
                  </p>
                </Link>

                {/* Email */}
                <p className="text-[10px] font-light text-center" style={{ color: 'var(--muted)' }}>{p.email}</p>

                {/* Turnos — link to full history */}
                <div className="flex justify-center">
                  {p._count.appointments > 0 ? (
                    <Link
                      href={`/admin/producers/${p.id}?filter=all`}
                      className="text-[8px] tracking-[0.25em] px-3 py-1.5 border transition-opacity hover:opacity-70 inline-block"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      VER TURNOS ({p._count.appointments})
                    </Link>
                  ) : (
                    <p className="text-[9px]" style={{ color: 'var(--border)' }}>Sin turnos</p>
                  )}
                </div>

                {/* Earliest active appointment */}
                <div className="flex justify-center">
                  {next ? (
                    <Link href={`/admin/appointments/${next.id}`} className="group block text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span
                          className="text-[7px] tracking-[0.2em] px-1.5 py-0.5 rounded-sm"
                          style={{
                            backgroundColor: `${STATUS_COLORS[next.status]}15`,
                            color: STATUS_COLORS[next.status],
                            border: `1px solid ${STATUS_COLORS[next.status]}30`,
                          }}
                        >
                          {STATUS_LABELS[next.status]}
                        </span>
                      </div>
                      <p className="text-[10px] font-light mt-1 group-hover:underline" style={{ color: 'var(--dark)' }}>
                        {next.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'medium' })}
                      </p>
                      {next.honeyVariety && (
                        <p className="text-[9px] italic mt-0.5" style={{ color: 'var(--muted)' }}>{next.honeyVariety}</p>
                      )}
                    </Link>
                  ) : (
                    <p className="text-[9px]" style={{ color: 'var(--border)' }}>Sin turnos activos</p>
                  )}
                </div>

                {/* Priority toggle */}
                <div className="flex justify-center">
                  <PriorityToggle userId={p.id} current={p.producerPriority} />
                </div>
              </div>

              {/* Mobile layout */}
              <div className="sm:hidden px-5 py-4 flex flex-col gap-2">
                <Link href={`/admin/producers/${p.id}`} className="group">
                  <p className="text-[12px] font-light group-hover:underline" style={{ color: 'var(--dark)' }}>{p.name}</p>
                  <p className="text-[9px]" style={{ color: 'var(--muted)' }}>{p.email}</p>
                </Link>
                <div className="flex items-center gap-4 flex-wrap">
                  {p._count.appointments > 0 ? (
                    <Link href={`/admin/producers/${p.id}?filter=all`} className="text-[9px] hover:underline" style={{ color: 'var(--muted)' }}>
                      Ver {p._count.appointments} turnos
                    </Link>
                  ) : (
                    <span className="text-[9px]" style={{ color: 'var(--border)' }}>Sin turnos</span>
                  )}
                  {next && (
                    <Link href={`/admin/appointments/${next.id}`} className="flex items-center gap-1 hover:underline">
                      <span
                        className="text-[8px] tracking-[0.2em] px-2 py-0.5 rounded-sm"
                        style={{
                          backgroundColor: `${STATUS_COLORS[next.status]}15`,
                          color: STATUS_COLORS[next.status],
                          border: `1px solid ${STATUS_COLORS[next.status]}30`,
                        }}
                      >
                        {STATUS_LABELS[next.status]}
                      </span>
                      <span className="text-[9px] font-light" style={{ color: 'var(--dark)' }}>
                        {next.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'short' })}
                      </span>
                    </Link>
                  )}
                  <div className="ml-auto">
                    <PriorityToggle userId={p.id} current={p.producerPriority} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriorityToggle({ userId, current }: { userId: string; current: UrgencyLevel }) {
  return (
    <form action={updateProducerPriority} className="flex">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex border overflow-hidden rounded-sm" style={{ borderColor: 'var(--border)' }}>
        {PRIORITY_LEVELS.map((level) => {
          const selected = current === level;
          const color = PRIORITY_COLORS[level];
          return (
            <button
              key={level}
              type="submit"
              name="priority"
              value={level}
              title={PRIORITY_LABELS[level]}
              className="px-2.5 py-1.5 text-[7px] tracking-[0.15em] transition-all"
              style={{
                backgroundColor: selected ? color : 'transparent',
                color: selected ? '#ffffff' : 'var(--muted)',
                borderRight: level !== 'IMMEDIATE' ? `1px solid var(--border)` : 'none',
                fontWeight: selected ? '500' : '300',
              }}
            >
              {level === 'STANDARD' ? 'EST' : level === 'PRIORITY' ? 'URG' : 'EXT'}
            </button>
          );
        })}
      </div>
    </form>
  );
}
