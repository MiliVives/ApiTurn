'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cormorant } from '@/app/ui/fonts';

type ApptSummary = {
  id: string;
  userId: string;
  userName: string;
  scheduledAt: string;
  urgencyLevel: string;
  quantity: number | null;
};

type OptResult = {
  fitness: number;
  generations: number;
  convergence: number;
};

const MOCK_RESULT: OptResult = { fitness: 94.2, generations: 4200, convergence: 0.98 };
const HEX_VERSIONS = ['V.1', 'V.2', 'V.3', 'V.4', 'V.5', 'V.6'];

// Shared styles
const sectionTitle = {
  fontSize: '7px',
  letterSpacing: '0.4em',
  color: 'rgba(138,122,106,0.45)',
  textTransform: 'uppercase' as const,
};

export function OptimizerPanel({ appointments }: { appointments: ApptSummary[] }) {
  const router = useRouter();
  const [result, setResult] = useState<OptResult | null>(null);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVersion, setActiveVersion] = useState(0);

  async function runOptimizer() {
    setRunning(true);
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointments }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ fitness: data.fitness ?? MOCK_RESULT.fitness, generations: data.generations ?? MOCK_RESULT.generations, convergence: data.convergence ?? MOCK_RESULT.convergence });
      } else {
        setResult(MOCK_RESULT);
      }
    } catch {
      setResult(MOCK_RESULT);
    } finally {
      setRunning(false);
    }
  }

  function refreshCalendar() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto" style={{ backgroundColor: '#faf8f4' }}>

      {/* Fitness */}
      <div className="mb-6">
        <p style={sectionTitle} className="mb-3">EFICIENCIA DE APTITUD</p>
        <p
          className="text-5xl font-light tracking-tight"
          style={{ color: result ? 'var(--gold)' : 'var(--border)', fontFamily: 'var(--font-cormorant, serif)' }}
        >
          {result ? `${result.fitness}%` : '—'}
        </p>
        {result && (
          <p className={`${cormorant.className} text-sm italic mt-2 leading-relaxed`} style={{ color: 'var(--muted)' }}>
            Algoritmo genético ha priorizado extracción por urgencia y cercanía de apiario.
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
            { label: 'Generaciones', value: result ? result.generations.toLocaleString() : '—' },
            { label: 'Convergencia', value: result ? String(result.convergence) : '—' },
            { label: 'Turnos Analizados', value: String(appointments.length) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-baseline">
              <span className={`${cormorant.className} text-sm font-light italic`} style={{ color: 'var(--muted)' }}>
                {label}
              </span>
              <span className={`${cormorant.className} text-base font-light`} style={{ color: result || label === 'Turnos Analizados' ? 'var(--dark)' : 'var(--border)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
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
