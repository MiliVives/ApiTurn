import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';

const URGENCY_COLORS: Record<string, string> = {
  STANDARD: '#8a7a6a', PRIORITY: '#c9a84c', IMMEDIATE: '#c0392b',
};
const URGENCY_LABELS: Record<string, string> = {
  STANDARD: 'ESTÁNDAR', PRIORITY: 'PRIORIDAD', IMMEDIATE: 'INMEDIATA',
};

export default async function LogisticsPage() {
  const now = new Date();
  const in30 = new Date(now);
  in30.setDate(now.getDate() + 30);

  const appointments = await prisma.appointment.findMany({
    where: { status: { in: ['CONFIRMED', 'PENDING'] }, scheduledAt: { gte: now, lte: in30 } },
    include: { user: true },
    orderBy: { scheduledAt: 'asc' },
  });

  // Group by date string
  const grouped = new Map<string, typeof appointments>();
  for (const a of appointments) {
    const key = a.scheduledAt.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  }

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>GESTIÓN</p>
      <h1 className={`${cormorant.className} text-4xl font-light tracking-wide mb-1`} style={{ color: 'var(--dark)' }}>
        LOGÍSTICA
      </h1>
      <p className={`${cormorant.className} text-lg italic mb-8`} style={{ color: 'var(--muted)' }}>
        Próximos 30 días — {appointments.length} extracciones programadas.
      </p>

      {appointments.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-sm" style={{ borderColor: 'var(--border)' }}>
          <p className={`${cormorant.className} text-lg italic`} style={{ color: 'var(--border)' }}>Sin extracciones programadas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Array.from(grouped.entries()).map(([date, appts]) => (
            <div key={date}>
              <p className="text-[9px] tracking-[0.35em] mb-3 capitalize" style={{ color: 'var(--muted)' }}>
                {date.toUpperCase()}
              </p>
              <div className="flex flex-col gap-2">
                {appts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between flex-wrap gap-3 border rounded-sm px-5 py-3"
                    style={{ borderColor: 'var(--border)', backgroundColor: '#ffffff' }}
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-[10px] tracking-[0.1em] w-12 shrink-0" style={{ color: 'var(--gold)' }}>
                        {a.scheduledAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div>
                        <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{a.user.name}</p>
                        <p className="text-[9px] italic" style={{ color: 'var(--muted)' }}>
                          {a.apiarySource ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {a.honeyVariety && (
                        <p className="text-[9px] tracking-[0.1em]" style={{ color: 'var(--muted)' }}>{a.honeyVariety}</p>
                      )}
                      {a.quantity && (
                        <p className="text-[9px] tracking-[0.1em]" style={{ color: 'var(--dark)' }}>
                          {a.quantity} colm. · ~{a.quantity * 20}kg
                        </p>
                      )}
                      <span
                        className="text-[8px] tracking-[0.2em] px-2 py-1 rounded-sm"
                        style={{
                          backgroundColor: `${URGENCY_COLORS[a.urgencyLevel]}15`,
                          color: URGENCY_COLORS[a.urgencyLevel],
                          border: `1px solid ${URGENCY_COLORS[a.urgencyLevel]}35`,
                        }}
                      >
                        {URGENCY_LABELS[a.urgencyLevel]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
