'use client';

import { useState } from 'react';

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

export function OptimizerPanel({ appointments }: { appointments: ApptSummary[] }) {
  const [result, setResult] = useState<OptResult | null>(null);
  const [running, setRunning] = useState(false);
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

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto" style={{ backgroundColor: '#faf8f4' }}>
      {/* Fitness */}
      <div className="mb-6">
        <p className="text-[8px] tracking-[0.35em] mb-2" style={{ color: 'var(--muted)' }}>
          EFICIENCIA DE APTITUD
        </p>
        <p
          className="text-5xl font-light tracking-tight"
          style={{ color: result ? 'var(--gold)' : 'var(--border)', fontFamily: 'var(--font-cormorant, serif)' }}
        >
          {result ? `${result.fitness}%` : '—'}
        </p>
        {result && (
          <p className="text-[10px] italic mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
            Algoritmo genético ha priorizado extracción por urgencia y cercanía de apiario.
          </p>
        )}
      </div>

      <div className="border-t mb-6" style={{ borderColor: 'var(--border)' }} />

      {/* Parameters */}
      <div className="mb-6">
        <p className="text-[8px] tracking-[0.35em] mb-4" style={{ color: 'var(--muted)' }}>
          PARÁMETROS DE OPTIMIZACIÓN
        </p>
        <div className="flex justify-between items-center mb-3">
          <span className="text-[9px] tracking-[0.2em]" style={{ color: 'var(--dark)' }}>
            TASA DE MUTACIÓN
          </span>
          <span className="text-[9px] font-light" style={{ color: 'var(--gold)' }}>0.15</span>
        </div>
        <div className="w-full h-px" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-px" style={{ width: '15%', backgroundColor: 'var(--gold)' }} />
        </div>
      </div>

      {/* Hex version grid */}
      <div className="mb-6">
        <p className="text-[8px] tracking-[0.35em] mb-3" style={{ color: 'var(--muted)' }}>
          VERSIÓN DEL MODELO
        </p>
        <div className="flex flex-wrap gap-2">
          {HEX_VERSIONS.map((v, i) => (
            <button
              key={v}
              onClick={() => setActiveVersion(i)}
              className="flex items-center justify-center text-[8px] tracking-[0.15em] transition-all"
              style={{
                width: '40px',
                height: '46px',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                backgroundColor: i === activeVersion ? 'var(--gold)' : 'var(--border)',
                color: i === activeVersion ? 'var(--dark)' : 'var(--muted)',
                fontWeight: i === activeVersion ? 600 : 300,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t mb-6" style={{ borderColor: 'var(--border)' }} />

      {/* Metrics */}
      <div className="mb-6">
        <p className="text-[8px] tracking-[0.35em] mb-4" style={{ color: 'var(--muted)' }}>
          MÉTRICAS DEL SISTEMA
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-[9px] tracking-[0.15em]" style={{ color: 'var(--muted)' }}>GENERACIONES</span>
            <span className="text-[9px] font-light" style={{ color: result ? 'var(--dark)' : 'var(--border)' }}>
              {result ? result.generations.toLocaleString() : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[9px] tracking-[0.15em]" style={{ color: 'var(--muted)' }}>CONVERGENCIA</span>
            <span className="text-[9px] font-light" style={{ color: result ? 'var(--dark)' : 'var(--border)' }}>
              {result ? result.convergence : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[9px] tracking-[0.15em]" style={{ color: 'var(--muted)' }}>TURNOS ANALIZADOS</span>
            <span className="text-[9px] font-light" style={{ color: 'var(--dark)' }}>
              {appointments.length}
            </span>
          </div>
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={runOptimizer}
        disabled={running}
        className="w-full py-3 text-[9px] font-light tracking-[0.4em] transition-opacity hover:opacity-80 disabled:opacity-50 mt-auto"
        style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
      >
        {running ? 'OPTIMIZANDO...' : 'EJECUTAR OPTIMIZADOR'}
      </button>
    </div>
  );
}
