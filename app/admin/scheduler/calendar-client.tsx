'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarGrid, type ApptSummary, type ProposedAppt } from './calendar-grid';
import { OptimizerPanel } from './optimizer-panel';
import { applyOptimizedSchedule } from '@/app/lib/actions';

type Props = {
  appointments: ApptSummary[];
  weekStartISO: string;
  dayDates: string[];
};

export function CalendarClient({ appointments, weekStartISO, dayDates }: Props) {
  const router = useRouter();
  const [liveAppointments, setLiveAppointments] = useState<ApptSummary[]>(appointments);
  const [proposed, setProposed] = useState<ProposedAppt[] | null>(null);
  const [fitness, setFitness] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Sync live appointments when server data refreshes after router.refresh()
  useEffect(() => {
    setLiveAppointments(appointments);
  }, [appointments]);

  function handleResult(p: ProposedAppt[], f: number) {
    setProposed(p);
    setFitness(f);
  }

  function handleClear() {
    setProposed(null);
    setFitness(null);
  }

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleApply() {
    if (!proposed || applying) return;
    setApplying(true);

    // Optimistic update — reflect new times immediately
    const dateMap = new Map(proposed.map(p => [p.id, p.suggestedDate]));
    setLiveAppointments(prev =>
      prev.map(a => dateMap.has(a.id) ? { ...a, scheduledAt: dateMap.get(a.id)! } : a),
    );
    handleClear();

    try {
      await applyOptimizedSchedule(proposed);
      showToast('success', 'El calendario fue actualizado exitosamente.');
      router.refresh();
    } catch {
      // Rollback on failure
      setLiveAppointments(appointments);
      showToast('error', 'No se pudo aplicar el calendario. Intentá de nuevo.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '1.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            padding: '0.6rem 1.5rem',
            borderRadius: '2px',
            backgroundColor: toast.type === 'success' ? 'var(--dark)' : '#a93226',
            color: toast.type === 'success' ? 'var(--gold)' : '#fff',
            fontSize: '9px',
            letterSpacing: '0.3em',
            fontWeight: 500,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.msg.toUpperCase()}
        </div>
      )}

      <div className="flex h-full">
        <div className="flex-1 flex flex-col overflow-hidden">
          <CalendarGrid
            appointments={liveAppointments}
            proposedSchedule={proposed}
            dayDates={dayDates}
          />
        </div>

        <div
          className="hidden lg:flex flex-col border-l h-full"
          style={{ width: '280px', flexShrink: 0, borderColor: 'var(--border)' }}
        >
          <OptimizerPanel
            appointments={liveAppointments}
            weekStartISO={weekStartISO}
            onResult={handleResult}
            proposedSchedule={proposed}
            fitness={fitness}
            onClear={handleClear}
            onApply={handleApply}
            applying={applying}
          />
        </div>
      </div>
    </>
  );
}
