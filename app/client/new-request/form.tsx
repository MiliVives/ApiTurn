'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cormorant } from '@/app/ui/fonts';
import { createAppointmentRequest } from '@/app/lib/actions';
import { formatDuration, estimateDuration, WORK_START_HOUR, WORK_END_HOUR } from '@/app/lib/scheduling';

const HONEY_VARIETIES = [
  { id: 'abrepuno',           label: 'Abrepuño',                sub: 'SILVESTRE' },
  { id: 'abrepuno-famarilla', label: 'Abrepuño y Flor Amarilla',sub: 'BIFLORAL' },
  { id: 'alfalfa',            label: 'Alfalfa',                 sub: 'CULTIVO' },
  { id: 'alfalfa-girasol',    label: 'Alfalfa y Girasol',       sub: 'BIFLORAL' },
  { id: 'calden',             label: 'Calden',                  sub: 'SILVESTRE' },
  { id: 'flor-amarilla',      label: 'Flor Amarilla',           sub: 'SILVESTRE' },
  { id: 'girasol',            label: 'Girasol',                 sub: 'CULTIVO' },
  { id: 'monte',              label: 'Monte',                   sub: 'SILVESTRE' },
  { id: 'nabo',               label: 'Nabo',                    sub: 'CULTIVO' },
  { id: 'variada',            label: 'Variada',                 sub: 'POLIFLORAL' },
  { id: 'vicia',              label: 'Vicia',                   sub: 'CULTIVO' },
  { id: 'vicia-abrepuno',     label: 'Vicia y Abrepuño',        sub: 'BIFLORAL' },
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
  return d === 0 ? 6 : d - 1;
}

const MONTH_NAMES_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="block h-px w-4 shrink-0" style={{ backgroundColor: 'var(--gold)' }} />
      <p className="text-[9px] tracking-[0.4em] font-medium" style={{ color: 'var(--gold)' }}>
        {children}
      </p>
    </div>
  );
}

export function NewRequestForm() {
  const router = useRouter();
  const today = new Date();

  const [apiarySource, setApiarySource] = useState('');
  const [pastApiaries, setPastApiaries] = useState<string[]>([]);
  const [honeyVariety, setHoneyVariety] = useState('');
  const [customVariety, setCustomVariety] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [totalEmptyKg, setTotalEmptyKg] = useState('');
  const [totalFilledKg, setTotalFilledKg] = useState('');
  const [urgency, setUrgency] = useState('STANDARD');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [submitting, setSubmitting] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user/apiaries').then(r => r.json()).then(setPastApiaries).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setSelectedSlot(null);
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const t = setTimeout(async () => {
      setSlotsLoading(true);
      try {
        const res = await fetch(`/api/availability?date=${dateStr}&quantity=${quantity}`);
        const data = await res.json();
        setAvailableSlots(data.slots ?? []);
        setEstimatedDuration(data.durationMin ?? null);
      } finally {
        setSlotsLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [selectedDate, quantity]);

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
    if (!selectedDate || !selectedSlot || !honeyVariety || !apiarySource) return;
    setSubmitting(true);

    const scheduledAt = new Date(selectedDate);
    const [hh, mm] = selectedSlot.split(':').map(Number);
    scheduledAt.setHours(hh, mm, 0, 0);

    const fd = new FormData();
    fd.append('honeyVariety', honeyVariety);
    fd.append('quantity', String(quantity));
    if (totalEmptyKg)  fd.append('totalEmptyKg',  totalEmptyKg);
    if (totalFilledKg) fd.append('totalFilledKg', totalFilledKg);
    fd.append('urgencyLevel', urgency);
    fd.append('apiarySource', apiarySource);
    fd.append('notes', notes);
    fd.append('scheduledAt', scheduledAt.toISOString());

    try {
      await createAppointmentRequest(fd);
    } catch {
      // Next.js redirect throws internally — expected
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
        <div className="flex-1 flex flex-col">

          <div className="pb-8 border-b" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
            <SectionLabel>APIARIO DE ORIGEN</SectionLabel>
            <input
              type="text"
              list="past-apiaries"
              value={apiarySource}
              onChange={e => setApiarySource(e.target.value)}
              placeholder="Ej. Apiario La Esperanza, Campo Norte..."
              className="w-full border-b bg-transparent py-2 text-sm font-light outline-none"
              style={{ borderColor: 'rgba(201,168,76,0.35)', color: 'var(--dark)' }}
            />
            {pastApiaries.length > 0 && (
              <datalist id="past-apiaries">
                {pastApiaries.map(a => <option key={a} value={a} />)}
              </datalist>
            )}
          </div>

          <div className="py-8 border-b" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
            <SectionLabel>VARIEDAD DE MIEL</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HONEY_VARIETIES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setHoneyVariety(v.label); setShowCustom(false); setCustomVariety(''); }}
                  className="border rounded-sm p-3 text-left transition-all"
                  style={{
                    borderColor: !showCustom && honeyVariety === v.label ? '#005b4d' : 'var(--border)',
                    backgroundColor: !showCustom && honeyVariety === v.label ? 'rgba(0,91,77,0.07)' : 'transparent',
                  }}
                >
                  <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>{v.label}</p>
                  <p className="text-[8px] tracking-[0.25em] mt-0.5" style={{ color: 'var(--muted)' }}>{v.sub}</p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setShowCustom(true); setHoneyVariety(customVariety); }}
                className="col-span-2 sm:col-span-3 border rounded-sm p-3 text-left transition-all"
                style={{
                  borderColor: showCustom ? '#005b4d' : 'var(--border)',
                  backgroundColor: showCustom ? 'rgba(0,91,77,0.07)' : 'transparent',
                  borderStyle: 'dashed',
                }}
              >
                <p className="text-[11px] font-light" style={{ color: 'var(--dark)' }}>+ Otra floración</p>
                <p className="text-[8px] tracking-[0.25em] mt-0.5" style={{ color: 'var(--muted)' }}>NO LISTADA</p>
              </button>
            </div>
            {showCustom && (
              <input
                type="text"
                value={customVariety}
                onChange={e => { setCustomVariety(e.target.value); setHoneyVariety(e.target.value); }}
                placeholder="Ej. Eucalipto, Jarilla, Monte-Jarilla..."
                autoFocus
                className="mt-2 w-full border-b bg-transparent py-2 text-sm font-light outline-none"
                style={{ borderColor: 'var(--gold)', color: 'var(--dark)' }}
              />
            )}
          </div>

          <div className="py-8 border-b" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
            <SectionLabel>CANTIDAD DE ALZAS</SectionLabel>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 border flex items-center justify-center text-sm transition-opacity hover:opacity-60"
                style={{ borderColor: 'var(--border)', color: 'var(--dark)' }}
              >−</button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-2xl font-light w-12 text-center bg-transparent outline-none border-b"
                style={{ color: 'var(--dark)', borderColor: 'rgba(201,168,76,0.35)' }}
              />
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 border flex items-center justify-center text-sm transition-opacity hover:opacity-60"
                style={{ borderColor: 'var(--border)', color: 'var(--dark)' }}
              >+</button>
            </div>

            {(() => {
              const workMinPerDay = (WORK_END_HOUR - WORK_START_HOUR) * 60;
              const dur = estimateDuration(quantity);
              if (dur <= workMinPerDay) return null;
              const minDays = Math.ceil(dur / workMinPerDay);
              return (
                <p className="mt-3 text-[8px] tracking-[0.15em] leading-relaxed" style={{ color: '#9a6e00' }}>
                  * Esta extracción tomará más de un día. Tiempo estimado: {minDays} a {minDays + 1} días laborales.
                </p>
              );
            })()}

            <div className="mt-4 flex flex-col gap-3">
              <p className="text-[9px] tracking-[0.3em]" style={{ color: 'var(--border)' }}>
                PESO TOTAL DE ALZAS (OPCIONAL)
              </p>
              <div className="flex gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" step="0.1" value={totalFilledKg}
                    onChange={e => setTotalFilledKg(e.target.value)} placeholder="—"
                    className="w-20 border-b bg-transparent py-1.5 text-sm font-light outline-none text-center"
                    style={{ borderColor: 'rgba(201,168,76,0.35)', color: 'var(--dark)' }}
                  />
                  <span className="text-[9px] tracking-[0.2em]" style={{ color: 'var(--muted)' }}>KG LLENAS</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" step="0.1" value={totalEmptyKg}
                    onChange={e => setTotalEmptyKg(e.target.value)} placeholder="—"
                    className="w-20 border-b bg-transparent py-1.5 text-sm font-light outline-none text-center"
                    style={{ borderColor: 'rgba(201,168,76,0.35)', color: 'var(--dark)' }}
                  />
                  <span className="text-[9px] tracking-[0.2em]" style={{ color: 'var(--muted)' }}>KG VACÍAS</span>
                </div>
              </div>
              {(() => {
                const filled = parseFloat(totalFilledKg);
                const empty  = parseFloat(totalEmptyKg);
                if (totalFilledKg === '' || totalEmptyKg === '' || isNaN(filled) || isNaN(empty) || filled <= empty) return null;
                return (
                  <span className="text-[9px] tracking-[0.2em]" style={{ color: 'var(--gold)' }}>
                    MIEL NETA ~{(filled - empty).toFixed(1)} kg
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="py-8 border-b" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
            <SectionLabel>NIVEL DE URGENCIA</SectionLabel>
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

          <div className="pt-8">
            <SectionLabel>INSTRUCCIONES ESPECIALES</SectionLabel>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Acceso al campo, condiciones especiales, observaciones..."
              className="w-full border bg-transparent p-3 text-sm font-light outline-none resize-none"
              style={{ borderColor: 'rgba(201,168,76,0.3)', color: 'var(--dark)' }}
            />
          </div>
        </div>

        {/* Right: calendar + slots + submit */}
        <div className="lg:w-72 flex flex-col gap-6">
          <div>
            <SectionLabel>FECHA SOLICITADA</SectionLabel>

            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={prevMonth} className="text-[9px] tracking-[0.2em] transition-opacity hover:opacity-60" style={{ color: 'var(--muted)' }}>←</button>
              <span className="text-[9px] tracking-[0.3em]" style={{ color: 'var(--dark)' }}>
                {MONTH_NAMES_ES[calMonth]} {calYear}
              </span>
              <button type="button" onClick={nextMonth} className="text-[9px] tracking-[0.2em] transition-opacity hover:opacity-60" style={{ color: 'var(--muted)' }}>→</button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-center text-[8px] tracking-[0.1em] py-1" style={{ color: 'var(--muted)' }}>{d}</div>
              ))}
            </div>

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
                  >{day}</button>
                );
              })}
            </div>

            {selectedDate && (
              <p className="mt-4 text-[9px] tracking-[0.2em]" style={{ color: 'var(--gold)' }}>
                SELECCIONADO: {selectedDate.toLocaleDateString('es-AR', { dateStyle: 'long' }).toUpperCase()}
              </p>
            )}
          </div>

          {selectedDate && (
            <div>
              <SectionLabel>TURNO TENTATIVO</SectionLabel>
              {estimatedDuration !== null && (
                <p className="text-[8px] tracking-[0.2em] -mt-2 mb-3" style={{ color: 'var(--muted)' }}>
                  EST. {formatDuration(estimatedDuration)}
                </p>
              )}
              {slotsLoading ? (
                <p className="text-[9px] tracking-[0.25em]" style={{ color: 'var(--border)' }}>CONSULTANDO...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-[9px] tracking-[0.2em] leading-relaxed" style={{ color: 'var(--muted)' }}>
                  SIN TURNOS DISPONIBLES<br />ELEGÍ OTRA FECHA
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className="px-3 py-1.5 border text-[9px] tracking-[0.2em] transition-all"
                      style={{
                        borderColor: selectedSlot === slot ? '#005b4d' : 'var(--border)',
                        backgroundColor: selectedSlot === slot ? 'rgba(0,91,77,0.1)' : 'transparent',
                        color: selectedSlot === slot ? '#005b4d' : 'var(--dark)',
                      }}
                    >{slot}</button>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[8px] leading-relaxed" style={{ color: 'var(--border)' }}>
                * El turno es tentativo. El administrador podrá reorganizarlo.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedDate || !selectedSlot || !honeyVariety || !apiarySource}
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
