import { auth } from '@clerk/nextjs/server';
import { cormorant } from '@/app/ui/fonts';
import { prisma } from '@/app/lib/prisma';

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'COMPLETADO', CANCELLED: 'CANCELADO', NO_SHOW: 'AUSENTE',
};
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#8a7a6a', CANCELLED: '#c0392b', NO_SHOW: '#e67e22',
};

export default async function HistoryPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const appointments = await prisma.appointment.findMany({
    where: { userId, status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } },
    orderBy: { scheduledAt: 'desc' },
  });

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>PORTAL DEL PRODUCTOR</p>
      <h1 className={`${cormorant.className} text-4xl font-light tracking-wide mb-1`} style={{ color: 'var(--dark)' }}>
        HISTORIAL
      </h1>
      <p className={`${cormorant.className} text-lg italic mb-8`} style={{ color: 'var(--muted)' }}>
        {appointments.length} extraccion{appointments.length !== 1 ? 'es' : ''} en tu historial.
      </p>

      {appointments.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-sm" style={{ borderColor: 'var(--border)' }}>
          <p className={`${cormorant.className} text-lg italic`} style={{ color: 'var(--border)' }}>
            No hay extracciones completadas aún.
          </p>
        </div>
      ) : (
        <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div
            className="grid text-[8px] tracking-[0.3em] px-5 py-3 border-b"
            style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.5fr', borderColor: 'var(--border)', backgroundColor: '#faf8f4', color: 'var(--muted)' }}
          >
            <span>FECHA</span><span>VARIEDAD</span><span>COLMENAS</span><span>APIARIO</span><span>ESTADO</span>
          </div>
          {appointments.map((a, i) => (
            <div
              key={a.id}
              className="grid items-center px-5 py-4 border-b last:border-b-0"
              style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.5fr', borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? '#ffffff' : '#fdf9f4' }}
            >
              <div>
                <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>
                  {a.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'medium' })}
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {a.scheduledAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <p className="text-[10px] italic font-light" style={{ color: 'var(--dark)' }}>{a.honeyVariety ?? '—'}</p>
              <p className={`${cormorant.className} text-base font-light`} style={{ color: 'var(--dark)' }}>{a.quantity ?? '—'}</p>
              <p className="text-[10px] font-light" style={{ color: 'var(--muted)' }}>{a.apiarySource ?? '—'}</p>
              <span
                className="text-[8px] tracking-[0.2em] px-2 py-1 rounded-sm w-fit"
                style={{
                  backgroundColor: `${STATUS_COLORS[a.status]}15`,
                  color: STATUS_COLORS[a.status],
                  border: `1px solid ${STATUS_COLORS[a.status]}35`,
                }}
              >
                {STATUS_LABELS[a.status] ?? a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
