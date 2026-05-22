import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#c9a84c', CONFIRMED: '#2e7d4f', IN_PROGRESS: '#1a6890',
  COMPLETED: '#8a7a6a', CANCELLED: '#c0392b', NO_SHOW: '#e67e22',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'PENDIENTE', CONFIRMED: 'CONFIRMADO', IN_PROGRESS: 'EN PROCESO',
  COMPLETED: 'COMPLETADO', CANCELLED: 'CANCELADO', NO_SHOW: 'AUSENTE',
};

export default async function ProducersPage() {
  const producers = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    include: {
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, scheduledAt: true, honeyVariety: true },
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
          className="grid text-[8px] tracking-[0.3em] px-5 py-3 border-b"
          style={{ gridTemplateColumns: '2fr 2fr 1fr 2fr 1.5fr', borderColor: 'var(--border)', backgroundColor: '#faf8f4', color: 'var(--muted)' }}
        >
          <span>PRODUCTOR</span>
          <span>CORREO</span>
          <span>SOLICITUDES</span>
          <span>ÚLTIMA SOLICITUD</span>
          <span>ESTADO</span>
        </div>

        {producers.map((p, i) => {
          const last = p.appointments[0];
          return (
            <div
              key={p.id}
              className="grid items-center px-5 py-4 border-b last:border-b-0"
              style={{ gridTemplateColumns: '2fr 2fr 1fr 2fr 1.5fr', borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? '#ffffff' : '#fdf9f4' }}
            >
              <div>
                <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{p.name}</p>
                <p className="text-[8px] tracking-[0.1em] mt-0.5" style={{ color: 'rgba(138,122,106,0.6)' }}>
                  ...{p.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <p className="text-[10px] font-light" style={{ color: 'var(--muted)' }}>{p.email}</p>
              <p className="text-[12px] font-light" style={{ color: 'var(--dark)', fontFamily: 'serif' }}>
                {p._count.appointments}
              </p>
              <div>
                {last ? (
                  <>
                    <p className="text-[10px] font-light" style={{ color: 'var(--dark)' }}>
                      {last.scheduledAt.toLocaleDateString('es-AR', { dateStyle: 'medium' })}
                    </p>
                    {last.honeyVariety && (
                      <p className="text-[9px] italic mt-0.5" style={{ color: 'var(--muted)' }}>{last.honeyVariety}</p>
                    )}
                  </>
                ) : (
                  <p className="text-[9px]" style={{ color: 'var(--border)' }}>—</p>
                )}
              </div>
              <div>
                {last ? (
                  <span
                    className="text-[8px] tracking-[0.2em] px-2 py-1 rounded-sm"
                    style={{
                      backgroundColor: `${STATUS_COLORS[last.status]}15`,
                      color: STATUS_COLORS[last.status],
                      border: `1px solid ${STATUS_COLORS[last.status]}35`,
                    }}
                  >
                    {STATUS_LABELS[last.status]}
                  </span>
                ) : (
                  <span className="text-[9px]" style={{ color: 'var(--border)' }}>SIN SOLICITUDES</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
