import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';
import Link from 'next/link';
import { CalendarGrid } from '@/app/admin/scheduler/calendar-grid';
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

export default async function WorkerSchedulePage({
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
    where: {
      scheduledAt: { gte: weekStart, lt: weekEnd },
      status: { in: ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
    },
    include: { user: true },
    orderBy: { scheduledAt: 'asc' },
  });

  const dateRangeLabel = `${weekStart.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} — ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString();
  });

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="px-8 pt-8 pb-5 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[9px] tracking-[0.4em] mb-1" style={{ color: 'var(--muted)' }}>
          PANEL DE PLANTA
        </p>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <h1
            className={`${cormorant.className} text-4xl font-light tracking-wide`}
            style={{ color: 'var(--dark)' }}
          >
            HORARIO SEMANAL
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href={`/worker/schedule?from=${toDateParam(prevWeek)}`}
              className="text-[9px] tracking-[0.3em] transition-opacity hover:opacity-60"
              style={{ color: 'var(--muted)' }}
            >
              ← ANTERIOR
            </Link>
            <span className="text-[9px] tracking-[0.2em]" style={{ color: 'var(--dark)' }}>
              {dateRangeLabel.toUpperCase()}
            </span>
            <Link
              href={`/worker/schedule?from=${toDateParam(nextWeek)}`}
              className="text-[9px] tracking-[0.3em] transition-opacity hover:opacity-60"
              style={{ color: 'var(--muted)' }}
            >
              SIGUIENTE →
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <CalendarGrid
          appointments={appointments.map(a => ({
            id: a.id,
            userId: a.userId,
            userName: a.user.name,
            honeyVariety: a.honeyVariety ?? null,
            scheduledAt: a.scheduledAt.toISOString(),
            urgencyLevel: a.urgencyLevel,
            quantity: a.quantity,
            durationMin: estimateDuration(a.quantity ?? 0),
          }))}
          proposedSchedule={null}
          dayDates={dayDates}
        />
      </div>
    </div>
  );
}
