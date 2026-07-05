'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cormorant } from '@/app/ui/fonts';
import type { ApptSummary, ProposedAppt } from './calendar-grid';
import type { ServiceConfig } from './calendar-client';

type Props = {
  appointments: ApptSummary[];
  weekStartISO: string;
  serviceConfig: ServiceConfig;
  onResult: (proposed: ProposedAppt[], fitness: number, fitnessUtil: number, fitnessReduction: number, fitnessCompactness: number) => void;
  proposedSchedule: ProposedAppt[] | null;
  fitness: number | null;
  fitnessUtil: number | null;
  fitnessReduction: number | null;
  fitnessCompactness: number | null;
  onClear: () => void;
  onApply: () => Promise<void>;
  applying: boolean;
};

type FitnessBreakdown = { total: number; util: number; reduction: number; compactness: number };

function computeCurrentFitness(appointments: ApptSummary[]): FitnessBreakdown {
  const byDay = new Map<number, Array<{ startSlot: number; slotCount: number }>>();

  for (const appt of appointments) {
    const dow = new Date(appt.scheduledAt).getDay();
    const day = dow === 0 ? 6 : dow - 1;
    if (day > 4) continue;

    const d = new Date(appt.scheduledAt);
    const totalMin = d.getHours() * 60 + d.getMinutes();
    let startSlot: number;
    if (totalMin < 12 * 60) {
      startSlot = Math.floor((totalMin - 9 * 60) / 30);
    } else if (totalMin >= 13 * 60) {
      startSlot = Math.floor((totalMin - 9 * 60 - 60) / 30);
    } else {
      continue;
    }
    if (startSlot < 0 || startSlot >= 16) continue;

    const slotCount = Math.max(1, Math.min(16, Math.ceil(appt.durationMin / 30)));
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({ startSlot, slotCount });
  }

  if (byDay.size === 0) return { total: 0, util: 0, reduction: 0, compactness: 0 };

  let totalSlots = 0;
  let deadSlots = 0;

  for (const appts of byDay.values()) {
    appts.sort((a, b) => a.startSlot - b.startSlot);
    for (const { slotCount } of appts) totalSlots += slotCount;
    for (let i = 1; i < appts.length; i++) {
      const gap = appts[i].startSlot - (appts[i - 1].startSlot + appts[i - 1].slotCount);
      if (gap > 0) deadSlots += gap;
    }
  }

  const usedDays = byDay.size;
  const util      = totalSlots / (usedDays * 16);
  const reduction = (5 - usedDays) / 4;
  const compact   = 1 - deadSlots / (usedDays * 16);

  const u = parseFloat((0.5 * util).toFixed(4));
  const r = parseFloat((0.3 * reduction).toFixed(4));
  const c = parseFloat((0.2 * compact).toFixed(4));
  return { total: parseFloat((u + r + c).toFixed(4)), util: u, reduction: r, compactness: c };
}

const sectionTitle = {
  fontSize: '8px',
  letterSpacing: '0.3em',
  color: 'rgba(26,18,8,0.6)',
  fontWeight: 500,
  textTransform: 'uppercase' as const,
};

const HEX_VERSIONS = ['V.1', 'V.2', 'V.3', 'V.4'];

export function OptimizerPanel({
  appointments,
  weekStartISO,
  serviceConfig,
  onResult,
  proposedSchedule,
  fitness,
  fitnessUtil,
  fitnessReduction,
  fitnessCompactness,
  onClear,
  onApply,
  applying,
}: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVersion, setActiveVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<{ title: string; detail: string } | null>(null);
  const [overflowCount, setOverflowCount] = useState<number>(0);

  const currentFitness = useMemo(() => computeCurrentFitness(appointments), [appointments]);

  async function runOptimizer() {
    setRunning(true);
    setError(null);
    setApiError(null);
    try {
      // Server weekStartISO is UTC midnight; optimizer must start from LOCAL midnight so
      // its "+9h" lands at 09:00 local, matching how appointments are stored (local→UTC).
      const datePart = weekStartISO.split('T')[0];
      const localWeekStart = new Date(datePart + 'T00:00:00').toISOString();

      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointments: appointments.map((a) => ({
            id: a.id,
            duration_min: a.durationMin,
            urgency: a.urgencyLevel,
            scheduled_at: a.scheduledAt,
            created_at: a.createdAt,
            frame_count_1half: a.frameCount1Half ?? 0,
            frame_count_3quarter: a.frameCount3Quarter ?? 0,
            frame_count_std: a.frameCountStd ?? 0,
          })),
          week_start: localWeekStart,
          avg_kg_1half: serviceConfig.avgKgPer1HalfAlza,
          avg_kg_3quarter: serviceConfig.avgKgPer3QuarterAlza,
          avg_kg_std: serviceConfig.avgKgPerStdAlza,
        }),
      });

      if (!res.ok) {
        type ErrBody = { detail?: { message?: string } };
        const errData = await res.json().catch(() => ({}) as ErrBody) as ErrBody;
        let title = `Error ${res.status}`;
        let detail = 'El optimizador encontró un error inesperado. Contacta al administrador si el problema persiste.';
        if (res.status === 503) {
          title = 'Servicio no disponible';
          detail = 'No se pudo conectar con el servicio de optimización. Verifica que el servicio esté activo e intenta de nuevo.';
        } else if (res.status === 400) {
          title = 'Fecha inválida en el cronograma';
          const msg = errData?.detail?.message ?? '';
          detail = `Una o más fechas tienen formato incorrecto${msg ? ': ' + msg : ''}. Revisá los datos del cronograma antes de continuar.`;
        } else if (res.status === 422) {
          title = 'Datos de turnos inválidos';
          detail = 'El servicio rechazó los datos enviados. Revisá que todos los turnos tengan los campos requeridos.';
        }
        setApiError({ title, detail });
        return;
      }

      const data = await res.json();
      setOverflowCount(data.overflow_count ?? 0);
      onResult(data.proposed ?? [], data.fitness ?? 0, data.fitness_util ?? 0, data.fitness_reduction ?? 0, data.fitness_compactness ?? 0);
    } catch {
      setApiError({
        title: 'Sin conexión',
        detail: 'No se pudo comunicar con el servicio de optimización. Verificá tu conexión y que el servicio esté activo.',
      });
    } finally {
      setRunning(false);
    }
  }

  function refreshCalendar() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  const isProposed = fitness !== null;
  const displayFitness = isProposed ? fitness! : currentFitness.total;
  const displayUtil        = isProposed ? fitnessUtil!        : currentFitness.util;
  const displayReduction   = isProposed ? fitnessReduction!   : currentFitness.reduction;
  const displayCompactness = isProposed ? fitnessCompactness! : currentFitness.compactness;
  const movedCount = proposedSchedule?.length ?? 0;

  return (
    <>
    {/* Blocking error modal */}
    {apiError && (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          backgroundColor: 'rgba(26,18,8,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--cream)',
            border: '1px solid var(--border)',
            maxWidth: '400px', width: '90%',
            padding: '36px 32px',
          }}
        >
          <div
            style={{
              width: '32px', height: '32px',
              backgroundColor: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
              fontSize: '15px', fontWeight: 600, color: 'var(--gold)',
            }}
          >
            !
          </div>
          <p
            className={cormorant.className}
            style={{ fontSize: '20px', color: 'var(--dark)', marginBottom: '10px', fontWeight: 500 }}
          >
            {apiError.title}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.75, marginBottom: '28px' }}>
            {apiError.detail}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setApiError(null); void runOptimizer(); }}
              className="transition-opacity hover:opacity-80"
              style={{
                flex: 1, padding: '11px 0',
                fontSize: '9px', letterSpacing: '0.35em',
                backgroundColor: 'var(--dark)', color: 'var(--gold)',
                border: 'none', cursor: 'pointer',
              }}
            >
              REINTENTAR
            </button>
            <button
              onClick={() => setApiError(null)}
              className="transition-opacity hover:opacity-60"
              style={{
                padding: '11px 16px',
                fontSize: '9px', letterSpacing: '0.3em',
                backgroundColor: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              CERRAR
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="flex flex-col h-full p-6 overflow-y-auto" style={{ backgroundColor: '#faf8f4' }}>

      {/* Fitness */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <p style={sectionTitle}>EFICIENCIA DE APTITUD (FITNESS)</p>
          <span
            className="text-[7px] tracking-[0.2em] px-1.5 py-0.5"
            style={{
              backgroundColor: isProposed ? 'rgba(201,168,76,0.12)' : 'rgba(138,122,106,0.1)',
              color: isProposed ? 'var(--gold)' : 'var(--muted)',
              border: `1px solid ${isProposed ? 'rgba(201,168,76,0.3)' : 'rgba(138,122,106,0.2)'}`,
            }}
          >
            {isProposed ? 'PROPUESTA' : 'ACTUAL'}
          </span>
        </div>
        <p
          className="text-5xl font-light tracking-tight"
          style={{
            color: 'var(--gold)',
            fontFamily: 'var(--font-cormorant, serif)',
          }}
        >
          {`${(displayFitness * 100).toFixed(1)}%`}
        </p>
        {currentFitness.total > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {[
              { label: 'Utilización',  value: displayUtil,        weight: '×0.5', maxWeight: 0.5, title: 'Qué tan llenos están los días ocupados' },
              { label: 'Días libres',  value: displayReduction,   weight: '×0.3', maxWeight: 0.3, title: 'Cuántos días quedan sin turnos' },
              { label: 'Compactación', value: displayCompactness, weight: '×0.2', maxWeight: 0.2, title: 'Sin espacios muertos entre turnos' },
            ].map(({ label, value, weight, maxWeight, title }) => (
              <div key={label} title={title}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className={`${cormorant.className} text-xs italic`} style={{ color: 'var(--muted)' }}>{label}</span>
                  <span className="text-[8px] tracking-[0.1em]" style={{ color: 'var(--gold)' }}>
                    {(value * 100).toFixed(1)}% <span style={{ color: 'var(--muted)', opacity: 0.6 }}>{weight}</span>
                  </span>
                </div>
                <div className="w-full h-px" style={{ backgroundColor: 'var(--border)' }}>
                  <div
                    className="h-px transition-all duration-500"
                    style={{ width: `${Math.min(100, value * 100 / maxWeight)}%`, backgroundColor: 'var(--gold)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parameters */}
      <div className="mb-5">
        <p style={sectionTitle} className="mb-4">PARÁMETROS DE OPTIMIZACIÓN</p>
        <div className="flex justify-between items-center mb-2">
          <span className={`${cormorant.className} text-sm font-light italic`} style={{ color: 'var(--dark)' }}>
            Tasa de Mutación
          </span>
          <span className={`${cormorant.className} text-sm font-light`} style={{ color: 'var(--gold)' }}>0.15</span>
        </div>
        <div className="w-full h-px" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-px" style={{ width: '15%', backgroundColor: 'var(--gold)' }} />
        </div>
      </div>

      {/* Hex version grid */}
      <div className="mb-5">
        <p style={sectionTitle} className="mb-3">VERSIÓN DEL MODELO</p>
        <div className="flex flex-wrap gap-2">
          {HEX_VERSIONS.map((v, i) => (
            <button
              key={v}
              onClick={() => setActiveVersion(i)}
              className="flex items-center justify-center transition-all"
              style={{
                width: '40px',
                height: '46px',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                backgroundColor: i === activeVersion ? 'var(--gold)' : 'var(--border)',
                color: i === activeVersion ? 'var(--dark)' : 'var(--muted)',
                fontSize: '8px',
                letterSpacing: '0.1em',
                fontWeight: i === activeVersion ? 600 : 300,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t mb-5" style={{ borderColor: 'var(--border)' }} />

      {/* Metrics */}
      <div className="mb-6">
        <p style={sectionTitle} className="mb-4">MÉTRICAS DEL SISTEMA</p>
        <div className="flex flex-col gap-2.5">
          {[
            { label: 'Generaciones', value: fitness !== null ? '1' : '—' },
            { label: 'Convergencia', value: fitness !== null ? fitness.toFixed(4) : '—' },
            { label: 'Turnos Analizados', value: String(appointments.length) },
            { label: 'Turnos Reubicados', value: proposedSchedule !== null ? String(movedCount) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-baseline">
              <span className={`${cormorant.className} text-sm font-light italic`} style={{ color: 'var(--muted)' }}>
                {label}
              </span>
              <span
                className={`${cormorant.className} text-base font-light`}
                style={{
                  color: label === 'Turnos Analizados' || fitness !== null ? 'var(--dark)' : 'var(--border)',
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Optimizer error */}
      {error && (
        <p className="text-[9px] mb-4" style={{ color: '#c0392b' }}>{error}</p>
      )}

      {/* Proposed schedule info */}
      {proposedSchedule && (
        <>
          <div className="border-t mb-4" style={{ borderColor: 'var(--border)' }} />
          <p className={`${cormorant.className} text-sm italic mb-1 leading-relaxed`} style={{ color: 'var(--muted)' }}>
            {movedCount} turno{movedCount !== 1 ? 's' : ''} reubicado{movedCount !== 1 ? 's' : ''} en el calendario propuesto.
          </p>
          {overflowCount > 0 && (
            <p className="text-[10px] mb-4 leading-relaxed" style={{ color: 'var(--gold)' }}>
              {overflowCount} turno{overflowCount !== 1 ? 's' : ''} programado{overflowCount !== 1 ? 's' : ''} en semana{overflowCount !== 1 ? 's' : ''} siguiente{overflowCount !== 1 ? 's' : ''} por capacidad semanal llena.
            </p>
          )}
          {overflowCount === 0 && <div className="mb-4" />}
        </>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        {proposedSchedule && (
          <>
            <button
              onClick={onApply}
              disabled={applying}
              className="w-full py-3 text-[9px] font-light tracking-[0.4em] transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#2f4858', color: '#ffffff' }}
            >
              {applying ? 'APLICANDO...' : 'APLICAR PROPUESTA'}
            </button>
            <button
              onClick={onClear}
              disabled={applying}
              className="w-full py-2.5 text-[9px] font-light tracking-[0.3em] border transition-opacity hover:opacity-60 disabled:opacity-40"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'transparent' }}
            >
              DESCARTAR
            </button>
          </>
        )}
        <button
          onClick={refreshCalendar}
          disabled={refreshing}
          className="w-full py-2.5 text-[9px] font-light tracking-[0.3em] border transition-opacity hover:opacity-60 disabled:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'transparent' }}
        >
          {refreshing ? 'ACTUALIZANDO...' : 'ACTUALIZAR CALENDARIO'}
        </button>
        <button
          onClick={runOptimizer}
          disabled={running}
          className="w-full py-3 text-[9px] font-light tracking-[0.4em] transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
        >
          {running ? 'OPTIMIZANDO...' : 'EJECUTAR OPTIMIZADOR'}
        </button>
      </div>
    </div>
    </>
  );
}
