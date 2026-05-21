'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cormorant } from '@/app/ui/fonts';
import { createAppointmentRequest } from '@/app/lib/actions';

const HONEY_VARIETIES = [
  { id: 'polifloral', label: 'Wildflower', sub: 'POLIFLORAL' },
  { id: 'manuka', label: 'Manuka', sub: 'MONOFLORAL' },
  { id: 'citrico', label: 'Orange Blossom', sub: 'CÍTRICO' },
  { id: 'ligero', label: 'Clover', sub: 'LIGERO' },
  { id: 'oscuro', label: 'Buckwheat', sub: 'OSCURO' },
  { id: 'premium', label: 'Acacia', sub: 'PREMIUM' },
];

const URGENCY_OPTIONS = [
  { value: 'STANDARD', label: 'ESTÁNDAR' },
  { value: 'PRIORITY', label: 'PRIORIDAD' },
  { value: 'IMMEDIATE', label: 'INMEDIATA' },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0
}

const MONTH_NAMES_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

export default function NewRequestPage() {
  const router = useRouter();
  const today = new Date();

  const [apiarySource, setApiarySource] = useState('');
  const [honeyVariety, setHoneyVariety] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState('STANDARD');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [submitting, setSubmitting] = useState(false);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  async function handleSubmit() {
    if (!selectedDate || !honeyVariety || !apiarySource) return;
    setSubmitting(true);

    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(8, 0, 0, 0);

    const fd = new FormData();
    fd.append('honeyVariety', honeyVariety);
    fd.append('quantity', String(quantity));
    fd.append('urgencyLevel', urgency);
    fd.append('apiarySource', apiarySource);
    fd.append('notes', notes);
    fd.append('scheduledAt', scheduledAt.toISOString());

    try {
      await createAppointmentRequest(fd);
    } catch {
      // redirect throws internally in Next.js, that's expected
    }
    router.push('/client');
  }

  return (
    <div className="p-8 md:p-10">
      <p className="text-[9px] tracking-[0.4em] mb-2" style={{ color: 'var(--muted)' }}>
        NUEVA SOLICITUD
      </p>
      <h1
        className={`${cormorant.className} text-4xl font-light tracking-wide mb-8`}
        style={{ color: 'var(--dark)' }}
      >
        SOLICITAR EXTRACCIÓN
      </h1>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left: form fields */}
        <div className="flex-1 flex flex-col gap-8">

          {/* Apiary source */}
          <div>
            <p className="text-[9px] tracking-[0.4em] mb-3" style={{ color: 'var(--muted)' }}>
              APIARIO DE ORIGEN
            </p>
            <input
              type="text"
              value={apiarySource}
              onChange={e => setApiarySource(e.target.value)}
              placeholder="Ej. Apiario La Esperanza, Campo Norte..."
              className="w-full border-b bg-transparent py-2 text-sm font-light outline-none"
              style={{ borderColor: 'var(--border)', color: 'var(--dark)' }}
            />
          </div>

          {/* Honey variety grid */}
          <div>
            <p className="text-[9px] tracking-[0.4em] mb-3" style={{ color: 'var(--muted)' }}>
              VARIEDAD DE MIEL
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HONEY_VARIETIES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setHoneyVariety(v.label)}
                  className="border rounded-sm p-3 text-left transition-all"
                  style={{
                    borderColor: honeyVariety === v.label ? 'var(--gold)' : 'var(--border)',
                    backgroundColor: honeyVariety === v.label ? 'rgba(201,168,76,0.06)' : 'transparent',
                  }}
                >
                  <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{v.label}</p>
                  <p className="text-[8px] tracking-[0.25em] mt-0.5" style={{ color: 'var(--muted)' }}>{v.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity stepper */}
          <div>
            <p className="text-[9px] tracking-[0.4em] mb-3" style={{ color: 'var(--muted)' }}>
              CANTIDAD DE COLMENAS
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 border flex items-center justify-center text-sm transition-opacity hover:opacity-60"
                style={{ borderColor: 'var(--border)', color: 'var(--dark)' }}
              >
                −
              </button>
              <span className="text-2xl font-light w-8 text-center" style={{ color: 'var(--dark)' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 border flex items-center justify-center text-sm transition-opacity hover:opacity-60"
                style={{ borderColor: 'var(--border)', color: 'var(--dark)' }}
              >
                +
              </button>
              <span className="text-[9px] tracking-[0.2em] ml-2" style={{ color: 'var(--muted)' }}>
                PESO EST. ~{quantity * 20}kg
              </span>
            </div>
          </div>

          {/* Urgency toggle */}
          <div>
            <p className="text-[9px] tracking-[0.4em] mb-3" style={{ color: 'var(--muted)' }}>
              NIVEL DE URGENCIA
            </p>
            <div className="flex border rounded-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUrgency(opt.value)}
                  className="flex-1 py-2 text-[9px] tracking-[0.25em] transition-all"
                  style={{
                    backgroundColor: urgency === opt.value ? 'var(--dark)' : 'transparent',
                    color: urgency === opt.value ? 'var(--gold)' : 'var(--muted)',
                    borderRight: opt.value !== 'IMMEDIATE' ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Special instructions */}
          <div>
            <p className="text-[9px] tracking-[0.4em] mb-3" style={{ color: 'var(--muted)' }}>
              INSTRUCCIONES ESPECIALES
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Acceso al campo, condiciones especiales, observaciones..."
              className="w-full border bg-transparent p-3 text-sm font-light outline-none resize-none"
              style={{ borderColor: 'var(--border)', color: 'var(--dark)' }}
            />
          </div>
        </div>

        {/* Right: date picker + submit */}
        <div className="lg:w-72 flex flex-col gap-6">
          <div>
            <p className="text-[9px] tracking-[0.4em] mb-4" style={{ color: 'var(--muted)' }}>
              FECHA SOLICITADA
            </p>

            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={prevMonth} className="text-[9px] tracking-[0.2em] transition-opacity hover:opacity-60" style={{ color: 'var(--muted)' }}>
                ←
              </button>
              <span className="text-[9px] tracking-[0.3em]" style={{ color: 'var(--dark)' }}>
                {MONTH_NAMES_ES[calMonth]} {calYear}
              </span>
              <button type="button" onClick={nextMonth} className="text-[9px] tracking-[0.2em] transition-opacity hover:opacity-60" style={{ color: 'var(--muted)' }}>
                →
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-center text-[8px] tracking-[0.1em] py-1" style={{ color: 'var(--muted)' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const d = new Date(calYear, calMonth, day);
                const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === calMonth && selectedDate?.getFullYear() === calYear;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPast}
                    onClick={() => setSelectedDate(d)}
                    className="aspect-square flex items-center justify-center text-[10px] rounded-sm transition-all"
                    style={{
                      backgroundColor: isSelected ? 'var(--dark)' : 'transparent',
                      color: isSelected ? 'var(--gold)' : isPast ? 'var(--border)' : 'var(--dark)',
                      cursor: isPast ? 'default' : 'pointer',
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <p className="mt-4 text-[9px] tracking-[0.2em]" style={{ color: 'var(--gold)' }}>
                SELECCIONADO: {selectedDate.toLocaleDateString('es-AR', { dateStyle: 'long' }).toUpperCase()}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedDate || !honeyVariety || !apiarySource}
            className="w-full py-3 text-[9px] font-light tracking-[0.4em] transition-opacity hover:opacity-80 disabled:opacity-40 mt-auto"
            style={{ backgroundColor: 'var(--dark)', color: 'var(--gold)' }}
          >
            {submitting ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}
          </button>
        </div>
      </div>
    </div>
  );
}
