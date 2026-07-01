import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';
import Link from 'next/link';
import { CalendarClient } from './calendar-client';
import { estimateDuration } from '@/app/lib/scheduling';

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

  const [appointments, service] = await Promise.all([
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: weekStart, lt: weekEnd } },
      include: { user: true, service: true },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.service.findFirst({ where: { isActive: true } }),
  ]);

  const dateRangeLabel = `${weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} — ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString();
  });

  return (
    <div className="flex flex-col h-full min-h-screen">
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

      {/* Calendar + optimizer panel (client component) */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <CalendarClient
          appointments={appointments.map((a) => ({
            id: a.id,
            userId: a.userId,
            userName: a.user.name,
            honeyVariety: a.honeyVariety ?? null,
            scheduledAt: a.scheduledAt.toISOString(),
            createdAt: a.createdAt.toISOString(),
            urgencyLevel: a.urgencyLevel,
            quantity: a.quantity,
            durationMin: estimateDuration(a.quantity ?? 0),
            frameCount1Half: a.frameCount1Half ?? null,
            frameCount3Quarter: a.frameCount3Quarter ?? null,
            frameCountStd: a.frameCountStd ?? null,
          }))}
          weekStartISO={weekStart.toISOString()}
          dayDates={dayDates}
          serviceConfig={{
            avgKgPer1HalfAlza:    service?.avgKgPer1HalfAlza    ?? null,
            avgKgPer3QuarterAlza: service?.avgKgPer3QuarterAlza ?? null,
            avgKgPerStdAlza:      service?.avgKgPerStdAlza      ?? null,
          }}
        />
      </div>
    </div>
  );
}
