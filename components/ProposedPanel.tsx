import { useState } from "react";
import { DESTINATION_LABEL, VEHICLE_LABEL, firstName, formatRange, type Trip } from "@/lib/data";
import { OVERRIDE_REASONS, type OverrideReason } from "@/lib/session";
import type { Candidate } from "@/lib/suggest";
import { formatSeconds, useStopwatch } from "@/lib/useStopwatch";

export type ProposedOutcome = {
  driverId: string;
  clicks: number;
  seconds: number;
  accepted: boolean;
  reason?: OverrideReason;
};

type Props = {
  trip: Trip;
  context: string;
  candidates: Candidate[];
  onComplete: (outcome: ProposedOutcome) => void;
  onCancel: () => void;
};

export function ProposedPanel({ trip, context, candidates, onComplete, onCancel }: Props) {
  const [clicks, setClicks] = useState(0);
  const [overriding, setOverriding] = useState(false);
  const [alternate, setAlternate] = useState<Candidate | null>(null);
  const { elapsed, read } = useStopwatch();
  const [suggested, ...rest] = candidates;
  const alternates = rest.slice(0, 2);

  return (
    <aside
      aria-label={`Reassign ${trip.id}, proposed flow`}
      className="anim-panel fixed bottom-0 right-0 top-0 z-30 flex w-[420px] flex-col border-l border-slate-200 bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-5 pb-4 pt-5">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-teal-700">Reassign trip</div>
          <div className="mt-0.5 text-[17px] font-semibold text-slate-900">
            {trip.id} · {DESTINATION_LABEL[trip.destination]}
          </div>
          <div className="mt-0.5 text-[13px] text-slate-500">
            {formatRange(trip.start, trip.end)} · {trip.zone} pickup · {VEHICLE_LABEL[trip.vehicle]}
          </div>
        </div>
        <button type="button" onClick={onCancel} className="text-[13px] text-slate-500 hover:text-slate-900">
          Close
        </button>
      </div>

      <div className="flex items-center gap-5 border-b border-slate-200 bg-slate-50 px-5 py-2.5">
        <Meter label="Clicks" value={String(clicks)} />
        <Meter label="Time" value={formatSeconds(elapsed)} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] text-slate-600">{context}</p>

        {!suggested ? (
          <p className="mt-4 rounded-lg border border-slate-200 p-4 text-[14px] text-slate-700">
            No qualified driver is free for this window. Call in the on-call driver.
          </p>
        ) : (
          <>
            <section className="mt-4 rounded-xl border-2 border-teal-600 bg-teal-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
                  Suggested driver
                </span>
                <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[11px] font-semibold text-white">
                  AI suggestion
                </span>
              </div>
              <div className="mt-2 text-[18px] font-semibold text-slate-900">{suggested.driver.name}</div>
              <div className="text-[13px] text-slate-500">
                {VEHICLE_LABEL[suggested.driver.vehicle]} · {suggested.load}{" "}
                {suggested.load === 1 ? "trip" : "trips"} today
              </div>
              <ul className="mt-3 space-y-1.5">
                {suggested.reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-[14px] text-slate-800">
                    <Check />
                    {reason}
                  </li>
                ))}
              </ul>
              {!overriding && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() =>
                      onComplete({ driverId: suggested.driver.id, clicks: clicks + 1, seconds: read(), accepted: true })
                    }
                    className="flex-1 rounded-lg bg-teal-700 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-teal-800"
                  >
                    Accept (1 click)
                  </button>
                  <button
                    type="button"
                    disabled={alternates.length === 0}
                    onClick={() => {
                      setClicks((c) => c + 1);
                      setOverriding(true);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[14px] font-medium text-slate-700 hover:border-slate-400 disabled:opacity-40"
                  >
                    Choose someone else
                  </button>
                </div>
              )}
            </section>

            {alternates.length > 0 && (
              <section className="mt-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
                  {overriding ? "Pick an alternate" : "Alternates"}
                </div>
                <div className="mt-2 space-y-2">
                  {alternates.map((alt) => {
                    const selected = alternate?.driver.id === alt.driver.id;
                    return (
                      <button
                        key={alt.driver.id}
                        type="button"
                        disabled={!overriding}
                        onClick={() => {
                          setClicks((c) => c + 1);
                          setAlternate(alt);
                        }}
                        className={`block w-full rounded-lg border p-3 text-left transition-colors ${
                          selected
                            ? "border-slate-900 bg-slate-50"
                            : overriding
                              ? "border-slate-300 hover:border-slate-500"
                              : "border-slate-200"
                        } disabled:cursor-default`}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-[14px] font-medium text-slate-900">{alt.driver.name}</span>
                          <span className="text-[12px] text-slate-500">{VEHICLE_LABEL[alt.driver.vehicle]}</span>
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-slate-600">
                          {alt.reasons[0]} · {alt.minutesAway} min away
                        </div>
                        {alt.caveat && <div className="mt-0.5 text-[12.5px] text-slate-500">{alt.caveat}</div>}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {alternate && (
              <section className="mt-5">
                <div className="text-[13px] font-medium text-slate-800">
                  Why not {firstName(suggested.driver)}?
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {OVERRIDE_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() =>
                        onComplete({
                          driverId: alternate.driver.id,
                          clicks: clicks + 1,
                          seconds: read(),
                          accepted: false,
                          reason,
                        })
                      }
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 hover:border-slate-500 hover:bg-slate-50"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[12px] text-slate-500">
                  Picking a reason assigns {alternate.driver.name}.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="min-w-[44px] text-[16px] font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-[3px] h-3.5 w-3.5 flex-none text-teal-700" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
