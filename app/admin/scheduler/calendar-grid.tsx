'use client';

const DAY_LABELS   = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const HOUR_MARKS   = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const HOUR_HEIGHT  = 80;   // px per hour
const WORK_START_H = 9;
const TOTAL_HEIGHT = (18 - WORK_START_H) * HOUR_HEIGHT;  // 648 px

const LUNCH_TOP    = (12 - WORK_START_H) * HOUR_HEIGHT;  // 216 px
const LUNCH_HEIGHT = HOUR_HEIGHT;                          // 72 px

export type ApptSummary = {
  id: string;
  userId: string;
  userName: string;
  honeyVariety: string | null;
  scheduledAt: string;
  createdAt: string;
  urgencyLevel: string;
  quantity: number | null;
  durationMin: number;
  frameCount1Half: number | null;
  frameCount3Quarter: number | null;
  frameCountStd: number | null;
};

export type ProposedAppt = {
  id: string;
  suggestedDate: string;
};

type Props = {
  appointments: ApptSummary[];
  proposedSchedule: ProposedAppt[] | null;
  dayDates: string[];
};

function dayIdxOf(iso: string): number {
  const dow = new Date(iso).getDay();
  return dow === 0 ? 6 : dow - 1;
}

function topPx(iso: string): number {
  const d = new Date(iso);
  return Math.max(0, (d.getHours() - WORK_START_H + d.getMinutes() / 60) * HOUR_HEIGHT);
}

function heightPx(durationMin: number): number {
  return Math.max(20, (durationMin / 60) * HOUR_HEIGHT);
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarGrid({ appointments, proposedSchedule, dayDates }: Props) {
  // Day → appointments
  const byDay: Record<number, ApptSummary[]> = {};
  for (let d = 0; d < 7; d++) byDay[d] = [];
  for (const appt of appointments) {
    byDay[dayIdxOf(appt.scheduledAt)].push(appt);
  }

  // Day → proposed appointments (only those that actually move)
  const proposedByDay: Record<number, ApptSummary[]> = {};
  const movedIds = new Set<string>();

  if (proposedSchedule) {
    for (let d = 0; d < 7; d++) proposedByDay[d] = [];
    const apptById = new Map(appointments.map(a => [a.id, a]));

    for (const p of proposedSchedule) {
      const orig = apptById.get(p.id);
      if (!orig) continue;
      const origDay = dayIdxOf(orig.scheduledAt);
      const newDay  = dayIdxOf(p.suggestedDate);
      const origTop = topPx(orig.scheduledAt);
      const newTop  = topPx(p.suggestedDate);
      if (origDay !== newDay || Math.abs(origTop - newTop) > 1) {
        movedIds.add(p.id);
        proposedByDay[newDay].push({ ...orig, scheduledAt: p.suggestedDate });
      }
    }
  }

  const dayDatesObj = dayDates.map(d => new Date(d));

  return (
    <div className="flex-1 overflow-auto">

      {/* Sticky day-header row */}
      <div
        className="sticky top-0 z-10 grid border-b"
        style={{
          gridTemplateColumns: '48px repeat(7, 1fr)',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--cream)',
        }}
      >
        <div />
        {DAY_LABELS.map((label, i) => (
          <div key={label} className="py-3 text-center border-l" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[8px] tracking-[0.3em]" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="text-[12px] font-light mt-0.5" style={{ color: 'var(--dark)' }}>
              {dayDatesObj[i].getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>

        {/* Hour labels gutter */}
        <div className="relative border-r flex-shrink-0" style={{ height: TOTAL_HEIGHT, borderColor: 'var(--border)' }}>
          {HOUR_MARKS.map(h => (
            <div
              key={h}
              className="absolute right-1.5"
              style={{
                // 09:00 pinned near top; all others centered vertically on their gridline
                top: h === 9 ? 2 : (h - WORK_START_H) * HOUR_HEIGHT,
                transform: h === 9 ? 'none' : 'translateY(-50%)',
                lineHeight: 1,
              }}
            >
              <span className="text-[8px] tracking-[0.1em]" style={{ color: 'var(--muted)' }}>
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {Array.from({ length: 7 }, (_, dayIdx) => {
          const baseAppts     = byDay[dayIdx] ?? [];
          const proposedAppts = proposedSchedule ? (proposedByDay[dayIdx] ?? []) : [];

          return (
            <div
              key={dayIdx}
              className="border-l relative"
              style={{ height: TOTAL_HEIGHT, borderColor: 'var(--border)' }}
            >
              {/* Hour gridlines */}
              {HOUR_MARKS.map(h => (
                <div
                  key={h}
                  className="absolute w-full border-t pointer-events-none"
                  style={{ top: (h - WORK_START_H) * HOUR_HEIGHT, borderColor: 'var(--border)', zIndex: 0 }}
                />
              ))}

              {/* Lunch break band */}
              <div
                className="absolute w-full pointer-events-none"
                style={{
                  top: LUNCH_TOP,
                  height: LUNCH_HEIGHT,
                  backgroundColor: 'rgba(138,122,106,0.07)',
                  borderTop: '1px dashed rgba(208,200,188,0.6)',
                  borderBottom: '1px dashed rgba(208,200,188,0.6)',
                  zIndex: 0,
                }}
              />

              {/* Current appointments */}
              {baseAppts.map(appt => {
                const tp = topPx(appt.scheduledAt);
                return (
                  <div
                    key={appt.id}
                    className="group absolute"
                    style={{ top: tp + 1, height: heightPx(appt.durationMin) - 2, left: 2, right: 2, zIndex: 1 }}
                  >
                    <div
                      className="rounded-sm px-1.5 pt-1 overflow-hidden h-full"
                      style={{
                        opacity: proposedSchedule && movedIds.has(appt.id) ? 0.15 : 1,
                        backgroundColor: 'rgba(201,168,76,0.08)',
                        border: '1px solid var(--border)',
                        borderLeft: '2px solid var(--gold)',
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <p className="text-[9px] font-medium leading-tight truncate" style={{ color: 'var(--dark)' }}>
                        {appt.userName}
                      </p>
                      {appt.honeyVariety && heightPx(appt.durationMin) > 38 && (
                        <p className="text-[8px] italic mt-0.5 leading-tight truncate" style={{ color: 'var(--muted)' }}>
                          {appt.honeyVariety}
                        </p>
                      )}
                    </div>
                    <div
                      className="hidden group-hover:block absolute left-0 pointer-events-none z-50"
                      style={{
                        ...(tp < 26 ? { top: 'calc(100% + 3px)' } : { bottom: 'calc(100% + 3px)' }),
                        backgroundColor: 'var(--dark)',
                        color: 'var(--cream)',
                        fontSize: '8px',
                        letterSpacing: '0.15em',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtDuration(appt.durationMin)}
                    </div>
                  </div>
                );
              })}

              {/* Proposed appointments overlay */}
              {proposedAppts.map(appt => {
                const tp = topPx(appt.scheduledAt);
                return (
                  <div
                    key={`proposed-${appt.id}`}
                    className="group absolute"
                    style={{ top: tp + 2, height: heightPx(appt.durationMin) - 4, left: 4, right: 4, zIndex: 2 }}
                  >
                    <div
                      className="rounded-sm px-1.5 pt-1 overflow-hidden h-full"
                      style={{
                        backgroundColor: 'rgba(47,72,88,0.18)',
                        border: '1px solid rgba(47,72,88,0.5)',
                        borderLeft: '3px solid #2f4858',
                      }}
                    >
                      <p className="text-[9px] font-semibold leading-tight truncate" style={{ color: '#2f4858' }}>
                        {appt.userName}
                      </p>
                      {appt.honeyVariety && heightPx(appt.durationMin) > 38 && (
                        <p className="text-[8px] italic mt-0.5 leading-tight truncate" style={{ color: 'rgba(47,72,88,0.7)' }}>
                          {appt.honeyVariety}
                        </p>
                      )}
                    </div>
                    <div
                      className="hidden group-hover:block absolute left-0 pointer-events-none z-50"
                      style={{
                        ...(tp < 26 ? { top: 'calc(100% + 3px)' } : { bottom: 'calc(100% + 3px)' }),
                        backgroundColor: '#2f4858',
                        color: '#fff',
                        fontSize: '8px',
                        letterSpacing: '0.15em',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtDuration(appt.durationMin)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {proposedSchedule && (
        <div className="flex items-center gap-6 px-5 py-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: 'rgba(201,168,76,0.4)', border: '1px solid var(--gold)' }} />
            <span className="text-[10px] tracking-[0.2em]" style={{ color: 'var(--muted)' }}>ACTUAL</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: 'rgba(47,72,88,0.2)', border: '1px solid #2f4858' }} />
            <span className="text-[10px] tracking-[0.2em]" style={{ color: 'var(--muted)' }}>PROPUESTO</span>
          </div>
        </div>
      )}
    </div>
  );
}
