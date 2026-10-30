import { BAR, summarize, type Reassignment } from "@/lib/session";
import { formatSeconds } from "@/lib/useStopwatch";

type Props = { log: Reassignment[]; open: boolean; onToggle: () => void; offsetRight: number };

const fmt = (v: number | null, f: (n: number) => string) => (v === null ? "–" : f(v));

export function ResultsPanel({ log, open, onToggle, offsetRight }: Props) {
  const s = summarize(log);
  const total = s.count.today + s.count.proposed;

  return (
    <section
      aria-label="Test results"
      className="fixed bottom-4 z-20 w-[344px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] transition-[right] duration-200"
      style={{ right: offsetRight + 16 }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="text-[13px] font-semibold text-slate-900">
          Test results <span className="font-normal text-slate-500">· this session</span>
        </span>
        <span className="flex items-center gap-2 text-[12px] text-slate-500">
          {total} {total === 1 ? "reassignment" : "reassignments"}
          <svg
            viewBox="0 0 12 12"
            className={`h-3 w-3 transition-transform ${open ? "" : "rotate-180"}`}
            aria-hidden
          >
            <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <table className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.05em] text-slate-500">
                <th className="pb-1.5 text-left font-medium" />
                <th className="pb-1.5 text-right font-medium">Today</th>
                <th className="pb-1.5 text-right font-medium text-teal-700">Proposed</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              <Row label="Reassignments" today={String(s.count.today)} proposed={String(s.count.proposed)} />
              <Row
                label="Avg clicks"
                today={fmt(s.clicks.today, (n) => n.toFixed(1))}
                proposed={fmt(s.clicks.proposed, (n) => n.toFixed(1))}
              />
              <Row
                label="Avg time"
                today={fmt(s.seconds.today, formatSeconds)}
                proposed={fmt(s.seconds.proposed, formatSeconds)}
              />
            </tbody>
          </table>

          <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-slate-500">Suggestion accepted</dt>
              <dd className="tabular-nums text-slate-800">
                {s.acceptance === null
                  ? "–"
                  : `${s.accepted} of ${s.count.proposed} (${Math.round(s.acceptance * 100)}%)`}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Override reasons</dt>
              <dd className="text-right text-slate-800">
                {s.reasons.length === 0 ? "None yet" : s.reasons.map(([r, n]) => `${r} (${n})`).join(", ")}
              </dd>
            </div>
          </dl>

          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="text-[12px] leading-snug text-slate-600">
              Pre-agreed bar: build the real assistant if acceptance ≥ 60% and time saved ≥ 30s per
              reassignment.
            </p>
            <ul className="mt-2 space-y-1">
              <Criterion
                met={s.meetsAcceptance}
                label={
                  s.acceptance === null
                    ? "Acceptance: no Proposed runs yet"
                    : `Acceptance ${Math.round(s.acceptance * 100)}% (bar ${BAR.acceptance * 100}%)`
                }
              />
              <Criterion
                met={s.meetsTime}
                label={
                  s.saved === null
                    ? "Time saved: needs a run in each mode"
                    : `Time saved ${formatSeconds(s.saved)} (bar ${BAR.secondsSaved}s)`
                }
              />
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, today, proposed }: { label: string; today: string; proposed: string }) {
  return (
    <tr>
      <td className="py-0.5 text-slate-500">{label}</td>
      <td className="py-0.5 text-right">{today}</td>
      <td className="py-0.5 text-right font-medium text-teal-800">{proposed}</td>
    </tr>
  );
}

function Criterion({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[13px] tabular-nums">
      <span
        className={`flex h-4 w-4 flex-none items-center justify-center rounded-full ${
          met ? "bg-emerald-600" : "bg-slate-300"
        }`}
        aria-label={met ? "Met" : "Not met"}
      >
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white" aria-hidden>
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={met ? "text-slate-900" : "text-slate-500"}>{label}</span>
    </li>
  );
}
