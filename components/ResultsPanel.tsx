import { BAR, MODES, summarize, type Reassignment, type Verdict } from "@/lib/session";
import { formatSeconds } from "@/lib/useStopwatch";

type Props = { log: Reassignment[]; open: boolean; onToggle: () => void; offsetRight: number };

const fmt = (v: number | null, f: (n: number) => string) => (v === null ? "–" : f(v));

// "saves 12.3s", or "adds 2.1s" when the faster-looking arm was actually slower.
const delta = (v: number) =>
  Math.abs(v) < 0.05 ? "no difference" : v > 0 ? `saves ${formatSeconds(v)}` : `adds ${formatSeconds(-v)}`;

const VERDICT: Record<Verdict, { title: string; body: string; tone: string }> = {
  "too-few-runs": {
    title: "No verdict yet",
    body: `Needs ${BAR.minRuns} reassignments in each 1-click arm before the bar applies.`,
    tone: "border-slate-200 bg-slate-50 text-slate-900",
  },
  build: {
    title: "Build the assistant",
    body: "Dispatchers trust the suggestion and it saves real time over 1-click alone.",
    tone: "border-teal-700 bg-teal-700 text-white",
  },
  "ship-one-click": {
    title: "Ship 1-click and stop",
    body: "The suggestion didn't clear the bar. The UX fix is the product.",
    tone: "border-slate-900 bg-slate-900 text-white",
  },
};

export function ResultsPanel({ log, open, onToggle, offsetRight }: Props) {
  const s = summarize(log);
  const verdict = VERDICT[s.verdict];
  const pending = !s.enoughRuns;

  return (
    <section
      aria-label="Test results"
      className="fixed bottom-4 z-20 w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] transition-[right] duration-200"
      style={{ right: offsetRight + 16 }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="text-[13px] font-semibold text-slate-900">
          Test results <span className="font-normal text-slate-500">this session</span>
        </span>
        <span className="flex items-center gap-2 text-[12px] text-slate-500">
          {open ? `${log.length} ${log.length === 1 ? "reassignment" : "reassignments"}` : verdict.title}
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
        <div className="max-h-[calc(100dvh-96px)] overflow-y-auto border-t border-slate-100 px-4 pb-4 pt-3">
          <div className={`rounded-lg border p-3 ${verdict.tone}`} aria-live="polite">
            <div className="text-[15px] font-semibold">{verdict.title}</div>
            <p className={`mt-0.5 text-[12.5px] leading-snug ${pending ? "text-slate-600" : "opacity-85"}`}>
              {verdict.body}
            </p>
            {pending && (
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <Progress label="1-click" count={s.arms.oneclick.count} />
                <Progress label="1-click + AI" count={s.arms.ai.count} />
              </div>
            )}
          </div>

          <table className="mt-4 w-full text-[13px] tabular-nums">
            <thead>
              <tr className="text-[12px] text-slate-500">
                <th className="pb-1.5 text-left font-normal">
                  <span className="sr-only">Measure</span>
                </th>
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
              <Row
                label="Avg drive to pickup"
                values={MODES.map((m) => fmt(s.arms[m.value].minutesAway, (n) => `${n.toFixed(1)} min`))}
              />
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

          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-[12px] leading-snug text-slate-500">
              Bar agreed before the test: build the real assistant only if both are met.
            </p>
            <ul className="mt-2 space-y-1.5">
              <Criterion
                state={pending ? "pending" : s.meetsAcceptance ? "met" : "missed"}
                label={`${BAR.acceptance * 100}% or more of suggestions accepted`}
                value={s.acceptance === null ? "–" : `${Math.round(s.acceptance * 100)}%`}
              />
              <Criterion
                state={pending ? "pending" : s.meetsAiTime ? "met" : "missed"}
                label={`Saves ${BAR.aiSecondsSaved}s or more over 1-click`}
                value={s.aiSaved === null ? "–" : `${s.aiSaved >= 0 ? "" : "−"}${formatSeconds(Math.abs(s.aiSaved))}`}
              />
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function Progress({ label, count }: { label: string; count: number }) {
  const done = Math.min(count, BAR.minRuns);
  return (
    <div>
      <div className="flex justify-between text-[12px] tabular-nums text-slate-600">
        <span>{label}</span>
        <span>
          {done} of {BAR.minRuns}
        </span>
      </div>
      <div
        className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label={`${label} runs`}
        aria-valuemin={0}
        aria-valuemax={BAR.minRuns}
        aria-valuenow={done}
      >
        <div className="h-full rounded-full bg-slate-700" style={{ width: `${(done / BAR.minRuns) * 100}%` }} />
      </div>
    </div>
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

const CRITERION = {
  met: { mark: "bg-emerald-600 text-white", text: "text-slate-900", sr: "Met" },
  missed: { mark: "bg-slate-200 text-slate-600", text: "text-slate-900", sr: "Missed" },
  pending: { mark: "border border-dashed border-slate-400 text-transparent", text: "text-slate-500", sr: "Not enough runs" },
} as const;

function Criterion({ state, label, value }: { state: keyof typeof CRITERION; label: string; value: string }) {
  const c = CRITERION[state];
  return (
    <li className="flex items-center gap-2 text-[13px] tabular-nums">
      <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full ${c.mark}`}>
        <span className="sr-only">{c.sr}: </span>
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" aria-hidden>
          {state === "missed" ? (
            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          ) : (
            <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </span>
      <span className={`flex-1 ${c.text}`}>{label}</span>
      <span className={c.text}>{value}</span>
    </li>
  );
}
