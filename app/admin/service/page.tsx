import { prisma } from '@/app/lib/prisma';
import { cormorant } from '@/app/ui/fonts';
import { updateServiceConfig } from '@/app/lib/actions';

function NumInput({
  name,
  label,
  hint,
  defaultValue,
  step = '0.01',
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: number | null | undefined;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-[8px] tracking-[0.3em] mb-1.5" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue ?? ''}
        step={step}
        min="0"
        placeholder="—"
        className="w-full px-3 py-2 border text-[11px] font-light outline-none focus:border-[var(--gold)] transition-colors"
        style={{ borderColor: 'var(--border)', color: 'var(--dark)', backgroundColor: '#faf8f4' }}
      />
      {hint && (
        <p className="text-[8px] mt-1 font-light" style={{ color: 'var(--muted)', opacity: 0.7 }}>{hint}</p>
      )}
    </div>
  );
}

export default async function ServiceConfigPage() {
  const service = await prisma.service.findFirst({ where: { isActive: true } });
  if (!service) return <div className="p-8">No hay servicio activo.</div>;

  return (
    <div className="p-8 md:p-10 max-w-2xl">
      <p className="text-[9px] tracking-[0.4em] mb-1" style={{ color: 'var(--muted)' }}>CONFIGURACIÓN</p>
      <h1
        className={`${cormorant.className} text-4xl font-light tracking-wide mb-2`}
        style={{ color: 'var(--dark)' }}
      >
        Servicio
      </h1>
      <p className={`${cormorant.className} text-base font-light italic mb-10`} style={{ color: 'var(--muted)' }}>
        {service.name}
      </p>

      <form action={updateServiceConfig} className="flex flex-col gap-10">
        <input type="hidden" name="serviceId" value={service.id} />

        {/* Tarifas */}
        <section>
          <p className="text-[8px] tracking-[0.3em] mb-5" style={{ color: 'var(--muted)' }}>TARIFAS</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumInput
              name="baseFeeARS"
              label="ARANCEL BASE (ARS)"
              hint="Cargo fijo por turno"
              defaultValue={service.baseFeeARS}
            />
            <NumInput
              name="perKgFeeARS"
              label="POR KG (ARS)"
              hint="Por kg de miel neta procesada"
              defaultValue={service.perKgFeeARS}
            />
            <NumInput
              name="drumRentalFeeARS"
              label="ALQUILER TAMBOR (ARS)"
              hint="Por tambor cuando el productor no trae los propios"
              defaultValue={service.drumRentalFeeARS}
            />
          </div>
        </section>

        <div className="border-t" style={{ borderColor: 'var(--border)' }} />

        {/* Pesos promedio por tipo de alza */}
        <section>
          <p className="text-[8px] tracking-[0.3em] mb-1" style={{ color: 'var(--muted)' }}>PESOS PROMEDIO POR ALZA (KG)</p>
          <p className="text-[9px] font-light mb-5 leading-relaxed" style={{ color: 'var(--muted)', opacity: 0.75 }}>
            Peso promedio de miel por alza llena de cada tipo. Se usa para estimar la producción antes de la extracción.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumInput
              name="avgKgPer1HalfAlza"
              label="ALZA 1/2 (KG)"
              hint="Ej. 15"
              defaultValue={service.avgKgPer1HalfAlza}
              step="0.5"
            />
            <NumInput
              name="avgKgPer3QuarterAlza"
              label="ALZA 3/4 (KG)"
              hint="Ej. 22"
              defaultValue={service.avgKgPer3QuarterAlza}
              step="0.5"
            />
            <NumInput
              name="avgKgPerStdAlza"
              label="ALZA STD (KG)"
              hint="Ej. 30"
              defaultValue={service.avgKgPerStdAlza}
              step="0.5"
            />
          </div>
        </section>

        <div>
          <button
            type="submit"
            className="text-[9px] tracking-[0.4em] px-6 py-3 transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
          >
            GUARDAR CAMBIOS
          </button>
        </div>
      </form>
    </div>
  );
}
