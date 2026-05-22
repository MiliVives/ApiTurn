import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';

export default async function AnalyticsPage() {
  const [total, pending, confirmed, inProgress, completed, cancelled] = await Promise.all([
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: 'PENDING' } }),
    prisma.appointment.count({ where: { status: 'CONFIRMED' } }),
    prisma.appointment.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.appointment.count({ where: { status: 'COMPLETED' } }),
    prisma.appointment.count({ where: { status: 'CANCELLED' } }),
  ]);

  const topProducers = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    include: { _count: { select: { appointments: true } } },
    orderBy: { appointments: { _count: 'desc' } },
    take: 5,
  });

  // Monthly breakdown — current year
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const monthlyRaw = await prisma.appointment.findMany({
    where: { createdAt: { gte: yearStart } },
    select: { createdAt: true, status: true },
  });
  const monthlyMap: Record<number, { total: number; completed: number; cancelled: number }> = {};
  for (let m = 0; m < 12; m++) monthlyMap[m] = { total: 0, completed: 0, cancelled: 0 };
  for (const a of monthlyRaw) {
    const m = a.createdAt.getMonth();
    monthlyMap[m].total++;
    if (a.status === 'COMPLETED') monthlyMap[m].completed++;
    if (a.status === 'CANCELLED') monthlyMap[m].cancelled++;
  }
  const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

  const stats = [
    { label: 'TOTAL', value: total, color: 'var(--dark)' },
    { label: 'PENDIENTES', value: pending, color: '#c9a84c' },
    { label: 'CONFIRMADAS', value: confirmed, color: '#2e7d4f' },
    { label: 'EN PROCESO', value: inProgress, color: '#1a6890' },
    { label: 'COMPLETADAS', value: completed, color: '#8a7a6a' },
    { label: 'CANCELADAS', value: cancelled, color: '#c0392b' },
  ];

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>DATOS</p>
      <h1 className={`${cormorant.className} text-4xl font-light tracking-wide mb-8`} style={{ color: 'var(--dark)' }}>
        ANALÍTICA
      </h1>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        {stats.map(s => (
          <div key={s.label} className="border rounded-sm p-4" style={{ borderColor: 'var(--border)', backgroundColor: '#ffffff' }}>
            <p className="text-[7px] tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>{s.label}</p>
            <p className={`${cormorant.className} text-4xl font-light`} style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top producers */}
        <div>
          <p className="text-[9px] tracking-[0.4em] mb-4" style={{ color: 'var(--muted)' }}>TOP PRODUCTORES</p>
          <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            {topProducers.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-5 py-3 border-b last:border-b-0"
                style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? '#ffffff' : '#faf8f4' }}
              >
                <div className="flex items-center gap-3">
                  <span className={`${cormorant.className} text-lg font-light w-5`} style={{ color: i === 0 ? 'var(--gold)' : 'var(--border)' }}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{p.name}</p>
                    <p className="text-[9px]" style={{ color: 'var(--muted)' }}>{p.email}</p>
                  </div>
                </div>
                <span className={`${cormorant.className} text-xl font-light`} style={{ color: 'var(--dark)' }}>
                  {p._count.appointments}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly breakdown */}
        <div>
          <p className="text-[9px] tracking-[0.4em] mb-4" style={{ color: 'var(--muted)' }}>
            SOLICITUDES POR MES — {new Date().getFullYear()}
          </p>
          <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            {MONTHS.map((m, i) => {
              const d = monthlyMap[i];
              const maxVal = Math.max(...Object.values(monthlyMap).map(v => v.total), 1);
              return (
                <div
                  key={m}
                  className="flex items-center gap-4 px-5 py-2.5 border-b last:border-b-0"
                  style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? '#ffffff' : '#faf8f4' }}
                >
                  <span className="text-[9px] tracking-[0.2em] w-8 shrink-0" style={{ color: 'var(--muted)' }}>{m}</span>
                  <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${(d.total / maxVal) * 100}%`, backgroundColor: d.total > 0 ? 'var(--gold)' : 'transparent' }}
                    />
                  </div>
                  <span className={`${cormorant.className} text-base font-light w-6 text-right`} style={{ color: d.total > 0 ? 'var(--dark)' : 'var(--border)' }}>
                    {d.total || '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
