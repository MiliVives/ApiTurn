'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cormorant } from '@/app/ui/fonts';
import type { ApptSummary, ProposedAppt } from './calendar-grid';

type Props = {
  appointments: ApptSummary[];
  weekStartISO: string;
  onResult: (proposed: ProposedAppt[], fitness: number) => void;
  proposedSchedule: ProposedAppt[] | null;
  fitness: number | null;
  onClear: () => void;
  onApply: () => Promise<void>;
  applying: boolean;
};

const sectionTitle = {
  fontSize: '7px',
  letterSpacing: '0.4em',
  color: 'rgba(138,122,106,0.45)',
  textTransform: 'uppercase' as const,
};

const HEX_VERSIONS = ['V.1', 'V.2', 'V.3', 'V.4', 'V.5', 'V.6'];

export function OptimizerPanel({
  appointments,
  weekStartISO,
  onResult,
  proposedSchedule,
  fitness,
  onClear,
  onApply,
  applying,
}: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVersion, setActiveVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function runOptimizer() {
    setRunning(true);
    setError(null);
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
          })),
          week_start: localWeekStart,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onResult(data.proposed ?? [], data.fitness ?? 0);
    } catch {
      setError('No se pudo conectar con el servicio de optimización.');
    } finally {
      setRunning(false);
    }
  }

  function refreshCalendar() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  const fitnessDisplay = fitness !== null ? `${(fitness * 100).toFixed(1)}%` : '—';
  const movedCount = proposedSchedule?.length ?? 0;

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto" style={{ backgroundColor: '#faf8f4' }}>

      {/* Fitness */}
      <div className="mb-6">
        <p style={sectionTitle} className="mb-3">EFICIENCIA DE APTITUD</p>
        <p
          className="text-5xl font-light tracking-tight"
          style={{
            color: fitness !== null ? 'var(--gold)' : 'var(--border)',
            fontFamily: 'var(--font-cormorant, serif)',
          }}
        >
          {fitnessDisplay}
        </p>
        {fitness !== null && (
          <p className={`${cormorant.className} text-sm italic mt-2 leading-relaxed`} style={{ color: 'var(--muted)' }}>
            Algoritmo genético ha evaluado la distribución semanal.
          </p>
        )}
      </div>

      <div className="border-t mb-5" style={{ borderColor: 'var(--border)' }} />

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
          <p className={`${cormorant.className} text-sm italic mb-4 leading-relaxed`} style={{ color: 'var(--muted)' }}>
            {movedCount} turno{movedCount !== 1 ? 's' : ''} reubicado{movedCount !== 1 ? 's' : ''} en el calendario propuesto.
          </p>
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
  );
}
