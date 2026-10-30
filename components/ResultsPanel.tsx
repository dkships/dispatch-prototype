import { BAR, MODES, summarize, type Reassignment } from "@/lib/session";
import { formatSeconds } from "@/lib/useStopwatch";

type Props = { log: Reassignment[]; open: boolean; onToggle: () => void; offsetRight: number };

const fmt = (v: number | null, f: (n: number) => string) => (v === null ? "–" : f(v));

// "saves 12.3s", or "adds 2.1s" when the faster-looking arm was actually slower.
const delta = (v: number) =>
  Math.abs(v) < 0.05 ? "no difference" : v > 0 ? `saves ${formatSeconds(v)}` : `adds ${formatSeconds(-v)}`;

export function ResultsPanel({ log, open, onToggle, offsetRight }: Props) {
  const s = summarize(log);

  return (
    <section
      aria-label="Test results"
      className="fixed bottom-4 z-20 w-[380px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] transition-[right] duration-200"
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
          {log.length} {log.length === 1 ? "reassignment" : "reassignments"}
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
                {MODES.map((m) => (
                  <th
                    key={m.value}
                    className={`pb-1.5 text-right font-medium ${m.value === "ai" ? "text-teal-700" : ""}`}
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-800">
              <Row label="Reassignments" values={MODES.map((m) => String(s.arms[m.value].count))} />
              <Row
                label="Avg clicks"
                values={MODES.map((m) => fmt(s.arms[m.value].clicks, (n) => n.toFixed(1)))}
              />
              <Row label="Avg time" values={MODES.map((m) => fmt(s.arms[m.value].seconds, formatSeconds))} />
            </tbody>
          </table>

          <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[13px] tabular-nums">
            <Line
              label="UX fix alone"
              value={s.uxSaved === null ? "needs Today + 1-click" : `${delta(s.uxSaved)} vs Today`}
            />
            <Line
              label="AI on top of the fix"
              value={s.aiSaved === null ? "needs 1-click + AI arm" : `${delta(s.aiSaved)} vs 1-click`}
              strong
            />
          </dl>

          <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[13px]">
            <Line
              label="Suggestion accepted"
              value={
                s.acceptance === null
                  ? "–"
                  : `${s.accepted} of ${s.arms.ai.count} (${Math.round(s.acceptance * 100)}%)`
              }
            />
            <Line
              label="Override reasons"
              value={s.reasons.length === 0 ? "None yet" : s.reasons.map(([r, n]) => `${r} (${n})`).join(", ")}
            />
          </dl>

          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="text-[12px] leading-snug text-slate-600">
              Pre-agreed bar: build the real assistant only if dispatchers accept ≥ 60% of suggestions AND the
              suggestion saves ≥ 15s per reassignment over 1-click alone. Otherwise ship 1-click and stop.
            </p>
            <ul className="mt-2 space-y-1">
              <Criterion
                met={s.meetsAcceptance}
                label={
                  s.acceptance === null
                    ? "Acceptance: no 1-click + AI runs yet"
                    : `Acceptance ${Math.round(s.acceptance * 100)}% (bar ${BAR.acceptance * 100}%)`
                }
              />
              <Criterion
                met={s.meetsAiTime}
                label={
                  s.aiSaved === null
                    ? "AI time saved: needs 1-click and 1-click + AI runs"
                    : `AI ${delta(s.aiSaved)} vs 1-click (bar ${BAR.aiSecondsSaved}s)`
                }
              />
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="py-0.5 text-slate-500">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`py-0.5 text-right ${i === values.length - 1 ? "font-medium text-teal-800" : ""}`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${strong ? "font-medium text-slate-900" : "text-slate-800"}`}>{value}</dd>
    </div>
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
