'use client';

import { useState } from 'react';
import { CalendarGrid, type ApptSummary, type ProposedAppt } from './calendar-grid';
import { OptimizerPanel } from './optimizer-panel';

type Props = {
  appointments: ApptSummary[];
  weekStartISO: string;
  dayDates: string[];
};

export function CalendarClient({ appointments, weekStartISO, dayDates }: Props) {
  const [proposed, setProposed] = useState<ProposedAppt[] | null>(null);
  const [fitness, setFitness] = useState<number | null>(null);

  function handleResult(p: ProposedAppt[], f: number) {
    setProposed(p);
    setFitness(f);
  }

  function handleClear() {
    setProposed(null);
    setFitness(null);
  }

  return (
    <div className="flex h-full">
      {/* Calendar column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <CalendarGrid
          appointments={appointments}
          proposedSchedule={proposed}
          dayDates={dayDates}
        />
      </div>

      {/* Optimizer panel */}
      <div
        className="hidden lg:flex flex-col border-l h-full"
        style={{ width: '280px', flexShrink: 0, borderColor: 'var(--border)' }}
      >
        <OptimizerPanel
          appointments={appointments}
          weekStartISO={weekStartISO}
          onResult={handleResult}
          proposedSchedule={proposed}
          fitness={fitness}
          onClear={handleClear}
        />
      </div>
    </div>
  );
}
