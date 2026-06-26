'use client';

import { useState } from 'react';
import Link from 'next/link';

type Appt = {
  id: string;
  scheduledAt: string;
  honeyVariety: string | null;
  apiarySource: string | null;
  loteNumber: string | null;
  user: { name: string };
};

const COMPLETED_COLOR = '#2471a3';

export function FinalizadosSection({ appointments }: { appointments: Appt[] }) {
  const [query, setQuery]       = useState('');
  const [searching, setSearching] = useState(false);

  const filtered = query.trim()
    ? appointments.filter(a =>
        a.user.name.toLowerCase().includes(query.toLowerCase()) ||
        (a.honeyVariety ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (a.apiarySource ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (a.loteNumber ?? '').toLowerCase().includes(query.toLowerCase()),
      )
    : appointments;

  function toggleSearch() {
    if (searching) { setQuery(''); }
    setSearching(s => !s);
  }

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold tracking-[0.3em]" style={{ color: 'var(--dark)' }}>
          FINALIZADOS
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSearch}
            className="transition-opacity hover:opacity-60"
            style={{ color: searching ? 'var(--dark)' : 'var(--muted)' }}
            aria-label="Buscar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-[9px] tracking-[0.1em]" style={{ color: 'var(--muted)' }}>
            {filtered.length}{query ? ` / ${appointments.length}` : ''}
          </span>
        </div>
      </div>

      {/* Expandable search input */}
      {searching && (
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Productor, variedad, apiario, lote..."
          className="w-full px-3 py-2 mb-3 border rounded-sm text-[10px] tracking-[0.05em] outline-none placeholder:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--dark)', backgroundColor: 'white' }}
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-[10px] tracking-[0.2em] py-6 text-center" style={{ color: 'var(--border)' }}>
          SIN RESULTADOS
        </p>
      ) : (
        <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {filtered.map(a => (
            <Link
              key={a.id}
              href={`/worker/appointments/${a.id}`}
              className="flex items-center gap-4 px-5 py-4 border-b transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-20 shrink-0">
                <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>
                  {new Date(a.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-[9px]" style={{ color: 'var(--muted)' }}>
                  {new Date(a.scheduledAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: 'var(--dark)' }}>
                  {a.user.name}
                </p>
                {a.honeyVariety && (
                  <p className="text-[10px] italic truncate" style={{ color: 'var(--muted)' }}>
                    {a.honeyVariety}
                  </p>
                )}
              </div>
              {a.apiarySource && (
                <div className="shrink-0 hidden sm:block max-w-[200px]">
                  <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>
                    {a.apiarySource}
                  </p>
                </div>
              )}
              {a.loteNumber && (
                <div className="shrink-0 hidden md:block">
                  <p className="text-[9px] tracking-[0.15em]" style={{ color: 'var(--muted)' }}>
                    LOTE {a.loteNumber}
                  </p>
                </div>
              )}
              <div className="shrink-0">
                <span
                  className="text-[8px] tracking-[0.2em] px-2 py-0.5 rounded-sm"
                  style={{ backgroundColor: `${COMPLETED_COLOR}15`, color: COMPLETED_COLOR, border: `1px solid ${COMPLETED_COLOR}35` }}
                >
                  FINALIZADO
                </span>
              </div>
              <div className="shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" style={{ color: 'var(--muted)' }}>
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
