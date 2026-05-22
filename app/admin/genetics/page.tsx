import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';

const VARIETY_SUBTITLES: Record<string, string> = {
  'Wildflower': 'POLIFLORAL',
  'Manuka': 'MONOFLORAL',
  'Orange Blossom': 'CÍTRICO',
  'Clover': 'LIGERO',
  'Buckwheat': 'OSCURO',
  'Acacia': 'PREMIUM',
};

export default async function GeneticsPage() {
  const grouped = await prisma.appointment.groupBy({
    by: ['honeyVariety'],
    where: { honeyVariety: { not: null } },
    _count: { honeyVariety: true },
    _sum: { quantity: true },
    _avg: { quantity: true },
    orderBy: { _count: { honeyVariety: 'desc' } },
  });

  const total = grouped.reduce((s, g) => s + g._count.honeyVariety, 0);

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>INVESTIGACIÓN</p>
      <h1 className={`${cormorant.className} text-4xl font-light tracking-wide mb-1`} style={{ color: 'var(--dark)' }}>
        GENÉTICA
      </h1>
      <p className={`${cormorant.className} text-lg italic mb-8`} style={{ color: 'var(--muted)' }}>
        Distribución por variedad de miel — {total} extracciones totales.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {grouped.map((g, i) => {
          const variety = g.honeyVariety ?? 'Sin variedad';
          const pct = total > 0 ? Math.round((g._count.honeyVariety / total) * 100) : 0;
          return (
            <div
              key={variety}
              className="border rounded-sm p-5"
              style={{ borderColor: 'var(--border)', backgroundColor: '#ffffff' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className={`${cormorant.className} text-xl font-light`} style={{ color: 'var(--dark)' }}>
                    {variety}
                  </p>
                  <p className="text-[8px] tracking-[0.25em] mt-0.5" style={{ color: 'var(--muted)' }}>
                    {VARIETY_SUBTITLES[variety] ?? 'VARIETAL'}
                  </p>
                </div>
                <span
                  className={`${cormorant.className} text-2xl font-light`}
                  style={{ color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}
                >
                  {pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-px mb-4" style={{ backgroundColor: 'var(--border)' }}>
                <div className="h-px" style={{ width: `${pct}%`, backgroundColor: i === 0 ? 'var(--gold)' : 'var(--border)' }} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'SOLICITUDES', value: g._count.honeyVariety },
                  { label: 'TOTAL COLM.', value: g._sum.quantity ?? 0 },
                  { label: 'PROM. COLM.', value: g._avg.quantity ? Math.round(g._avg.quantity) : '—' },
                  { label: 'PESO EST.', value: `~${(g._sum.quantity ?? 0) * 20}kg` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[7px] tracking-[0.25em] mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                    <p className={`${cormorant.className} text-base font-light`} style={{ color: 'var(--dark)' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
