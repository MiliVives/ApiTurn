'use client';

import { useState, useTransition } from 'react';
import { updateRenapaNumber } from '@/app/lib/actions';

const RENAPA_REGEX = /^\d{4}-\d{2}-\d{5}$/;

function isValidRenapa(v: string) {
  return RENAPA_REGEX.test(v.trim());
}

export function RenapaForm({ current }: { current: string | null }) {
  const [editing, setEditing] = useState(!current);
  const [value, setValue] = useState(current ?? '');
  const [isPending, startTransition] = useTransition();

  const trimmed = value.trim();
  const showError = trimmed.length > 0 && !isValidRenapa(trimmed);

  function handleSave() {
    if (!isValidRenapa(trimmed)) return;
    const fd = new FormData();
    fd.append('renapaNumber', trimmed);
    startTransition(async () => {
      await updateRenapaNumber(fd);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>
          {current}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 text-[8px] tracking-[0.3em] px-3 py-1.5 transition-opacity hover:opacity-70"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          EDITAR
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Ej. 2024-01-00001"
          autoFocus
          className="w-full border-b bg-transparent py-2 text-sm font-light outline-none"
          style={{
            borderColor: showError ? '#c0392b' : 'rgba(201,168,76,0.45)',
            color: 'var(--dark)',
          }}
        />
        {showError ? (
          <p className="text-[8px] tracking-[0.2em]" style={{ color: '#c0392b' }}>
            FORMATO INVÁLIDO — ESPERADO: AAAA-PP-NNNNN
          </p>
        ) : (
          <p className="text-[8px] tracking-[0.2em]" style={{ color: 'var(--border)' }}>
            FORMATO: AAAA-PP-NNNNN (ej. 2024-01-00001)
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={!trimmed || !isValidRenapa(trimmed) || isPending}
          className="text-[8px] tracking-[0.35em] px-4 py-2 transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
        >
          {isPending ? 'GUARDANDO...' : 'GUARDAR'}
        </button>
        {current && (
          <button
            onClick={() => { setValue(current); setEditing(false); }}
            className="text-[8px] tracking-[0.3em] transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)' }}
          >
            CANCELAR
          </button>
        )}
      </div>
    </div>
  );
}
