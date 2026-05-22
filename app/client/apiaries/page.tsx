import { auth } from '@clerk/nextjs/server';
import { cormorant } from '@/app/ui/fonts';
import { prisma } from '@/app/lib/prisma';

export default async function ApiariesPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const appointments = await prisma.appointment.findMany({
    where: { userId, apiarySource: { not: null } },
    select: { apiarySource: true, scheduledAt: true, status: true },
    orderBy: { scheduledAt: 'desc' },
  });

  // Deduplicate by apiarySource
  const apiaryMap = new Map<string, { lastDate: Date; count: number; lastStatus: string }>();
  for (const a of appointments) {
    const name = a.apiarySource!;
    if (!apiaryMap.has(name)) {
      apiaryMap.set(name, { lastDate: a.scheduledAt, count: 0, lastStatus: a.status });
    }
    apiaryMap.get(name)!.count++;
  }

  const apiaries = Array.from(apiaryMap.entries()).map(([name, data]) => ({ name, ...data }));

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>PORTAL DEL PRODUCTOR</p>
      <h1 className={`${cormorant.className} text-4xl font-light tracking-wide mb-1`} style={{ color: 'var(--dark)' }}>
        MIS APIARIOS
      </h1>
      <p className={`${cormorant.className} text-lg italic mb-8`} style={{ color: 'var(--muted)' }}>
        {apiaries.length} apiario{apiaries.length !== 1 ? 's' : ''} con solicitudes registradas.
      </p>

      {apiaries.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-sm" style={{ borderColor: 'var(--border)' }}>
          <p className={`${cormorant.className} text-lg italic`} style={{ color: 'var(--border)' }}>
            Ningún apiario registrado aún. Indica el origen en tu próxima solicitud.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {apiaries.map((a) => (
            <div
              key={a.name}
              className="border rounded-sm p-6"
              style={{ borderColor: 'var(--border)', backgroundColor: '#ffffff' }}
            >
              <p className="text-[8px] tracking-[0.3em] mb-2" style={{ color: 'var(--muted)' }}>APIARIO</p>
              <p className={`${cormorant.className} text-xl font-light leading-snug mb-4`} style={{ color: 'var(--dark)' }}>
                {a.name}
              </p>
              <div className="border-t pt-4 flex justify-between" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-[7px] tracking-[0.25em] mb-1" style={{ color: 'var(--muted)' }}>SOLICITUDES</p>
                  <p className={`${cormorant.className} text-2xl font-light`} style={{ color: 'var(--dark)' }}>{a.count}</p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] tracking-[0.25em] mb-1" style={{ color: 'var(--muted)' }}>ÚLTIMA VISITA</p>
                  <p className="text-[10px] font-light" style={{ color: 'var(--dark)' }}>
                    {a.lastDate.toLocaleDateString('es-AR', { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
