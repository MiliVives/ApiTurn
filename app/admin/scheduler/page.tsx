import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';
import Link from 'next/link';
import { OptimizerPanel } from './optimizer-panel';

function getWeekBounds(from: string | undefined): { weekStart: Date; weekEnd: Date } {
  let base: Date;
  if (from) {
    base = new Date(from + 'T00:00:00');
  } else {
    base = new Date();
  }
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  return { weekStart: monday, weekEnd: sunday };
}

function toDateParam(d: Date): string {
  return d.toISOString().split('T')[0];
}

const DAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // 9:00 → 18:00

export default async function SchedulerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const { weekStart, weekEnd } = getWeekBounds(params.from);

  const prevWeek = new Date(weekStart);
  prevWeek.setDate(weekStart.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);

  const appointments = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: weekStart, lt: weekEnd } },
    include: { user: true, service: true },
    orderBy: { scheduledAt: 'asc' },
  });

  // byDayHour[dayIdx 0=Mon…6=Sun][hour 9-17] = appointments[]
  const byDayHour: Record<number, Record<number, typeof appointments>> = {};
  for (let d = 0; d < 7; d++) {
    byDayHour[d] = {};
    for (const h of HOURS) byDayHour[d][h] = [];
  }
  for (const appt of appointments) {
    const dow = appt.scheduledAt.getDay();
    const dayIdx = dow === 0 ? 6 : dow - 1;
    const hour = appt.scheduledAt.getHours();
    if (hour >= 9 && hour <= 17) {
      byDayHour[dayIdx][hour].push(appt);
    }
  }

  const dateRangeLabel = `${weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} — ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="flex h-full min-h-screen">
      {/* Calendar column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page header */}
        <div className="px-8 pt-8 pb-5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[9px] tracking-[0.4em] mb-1" style={{ color: 'var(--muted)' }}>
            RESUMEN SEMANAL
          </p>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <h1
              className={`${cormorant.className} text-4xl font-light tracking-wide`}
              style={{ color: 'var(--dark)' }}
            >
              CICLO DE EXTRACCIÓN
            </h1>
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/scheduler?from=${toDateParam(prevWeek)}`}
                className="text-[9px] tracking-[0.3em] transition-opacity hover:opacity-60"
                style={{ color: 'var(--muted)' }}
              >
                ← ANTERIOR
              </Link>
              <span className="text-[9px] tracking-[0.2em]" style={{ color: 'var(--dark)' }}>
                {dateRangeLabel.toUpperCase()}
              </span>
              <Link
                href={`/admin/scheduler?from=${toDateParam(nextWeek)}`}
                className="text-[9px] tracking-[0.3em] transition-opacity hover:opacity-60"
                style={{ color: 'var(--muted)' }}
              >
                SIGUIENTE →
              </Link>
            </div>
          </div>
        </div>

        {/* Grid wrapper — scrollable */}
        <div className="flex-1 overflow-auto">
          {/* Sticky day-header row */}
          <div
            className="sticky top-0 z-10 grid border-b"
            style={{
              gridTemplateColumns: '48px repeat(7, 1fr)',
              borderColor: 'var(--border)',
              backgroundColor: 'var(--cream)',
            }}
          >
            {/* Time gutter */}
            <div />
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                className="py-3 text-center border-l"
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="text-[8px] tracking-[0.3em]" style={{ color: 'var(--muted)' }}>
                  {label}
                </p>
                <p className="text-[12px] font-light mt-0.5" style={{ color: 'var(--dark)' }}>
                  {dayDates[i].getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b"
              style={{
                gridTemplateColumns: '48px repeat(7, 1fr)',
                borderColor: 'var(--border)',
                minHeight: '72px',
              }}
            >
              {/* Time label */}
              <div
                className="flex items-start justify-end pr-2 pt-2 border-r flex-shrink-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="text-[8px] tracking-[0.1em]" style={{ color: 'var(--muted)' }}>
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>

              {/* Day cells */}
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const slotAppts = byDayHour[dayIdx][hour];
                return (
                  <div
                    key={dayIdx}
                    className="border-l p-1 relative"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {slotAppts.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {slotAppts.map((appt) => (
                          <div
                            key={appt.id}
                            className="rounded-sm px-2 py-1.5 border-l-2"
                            style={{
                              backgroundColor: 'rgba(201,168,76,0.08)',
                              borderLeftColor: 'var(--gold)',
                              border: '1px solid var(--border)',
                              borderLeft: '2px solid var(--gold)',
                            }}
                          >
                            <p
                              className="text-[9px] font-medium leading-tight"
                              style={{ color: 'var(--dark)' }}
                            >
                              {appt.user.name}
                            </p>
                            {appt.honeyVariety && (
                              <p
                                className="text-[8px] italic mt-0.5 leading-tight"
                                style={{ color: 'var(--muted)' }}
                              >
                                {appt.honeyVariety}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* 18:00 end marker */}
          <div
            className="grid"
            style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}
          >
            <div
              className="flex items-start justify-end pr-2 pt-1.5 border-r"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-[8px] tracking-[0.1em]" style={{ color: 'var(--muted)' }}>
                18:00
              </span>
            </div>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="border-l h-4" style={{ borderColor: 'var(--border)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Optimizer panel */}
      <div
        className="hidden lg:flex flex-col border-l"
        style={{ width: '280px', flexShrink: 0, borderColor: 'var(--border)' }}
      >
        <OptimizerPanel
          appointments={appointments.map((a) => ({
            id: a.id,
            userId: a.userId,
            userName: a.user.name,
            scheduledAt: a.scheduledAt.toISOString(),
            urgencyLevel: a.urgencyLevel,
            quantity: a.quantity,
          }))}
        />
      </div>
    </div>
  );
}
