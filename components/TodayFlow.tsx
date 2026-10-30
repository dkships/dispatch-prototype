import { useState } from "react";
import {
  DESTINATION_LABEL,
  DRIVERS,
  VEHICLE_LABEL,
  driverById,
  formatRange,
  formatTime,
  type Trip,
} from "@/lib/data";
import type { Eligible } from "@/lib/suggest";
import { formatSeconds, useStopwatch } from "@/lib/useStopwatch";

// The current flow, reproduced click for click from the dispatchers' complaint:
// reassigning a driver takes 14 clicks. Every button here is one of those clicks.
const TOTAL = 14;

const NEED_LABEL = { sedan: "Seated rider", wheelchair: "Wheelchair", stretcher: "Stretcher" } as const;

type Props = {
  trip: Trip;
  context: string;
  eligible: Eligible[];
  onComplete: (driverId: string, clicks: number, seconds: number) => void;
  onCancel: () => void;
};

export function TodayFlow({ trip, context, eligible, onComplete, onCancel }: Props) {
  const [clicks, setClicks] = useState(0);
  const [picked, setPicked] = useState<Eligible | null>(null);
  const { elapsed, read } = useStopwatch();
  const current = driverById(trip.driverId);

  function click() {
    const next = clicks + 1;
    if (next === TOTAL && picked) {
      onComplete(picked.driver.id, TOTAL, read());
      return;
    }
    setClicks(next);
  }

  const step = clicks + 1;

  return (
    // No click-outside-to-close: a stray click mid-recording must not lose the run.
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Reassign ${trip.id}, current flow`}
        className="anim-modal w-full max-w-[560px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
              Current scheduler · Reassign trip
            </div>
            <div className="text-[14px] font-semibold text-slate-900">
              {trip.id} · {DESTINATION_LABEL[trip.destination]}
            </div>
          </div>
          <button type="button" onClick={onCancel} className="text-[13px] text-slate-500 hover:text-slate-900">
            Cancel
          </button>
        </div>

        <div className="flex items-center gap-5 border-b border-slate-200 px-5 py-3">
          <Meter label="Clicks" value={`${clicks} / ${TOTAL}`} />
          <Meter label="Time" value={formatSeconds(elapsed)} />
          <div className="flex flex-1 gap-[3px]" aria-hidden>
            {Array.from({ length: TOTAL }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < clicks ? "bg-slate-700" : "bg-slate-200"}`}
              />
            ))}
          </div>
        </div>

        <div className="min-h-[248px] px-5 py-5">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">
            Step {step} of {TOTAL}
          </div>
          <Step
            index={clicks}
            trip={trip}
            context={context}
            currentName={current.name}
            // The legacy list has no ranking: qualified drivers, alphabetical.
            listed={eligible}
            picked={picked}
            onPick={(c) => {
              setPicked(c);
              click();
            }}
            onClick={click}
          />
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="min-w-[52px] text-[16px] font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

function Primary({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      autoFocus
      className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-700"
    >
      {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-0.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[13px] text-slate-800">
        {value}
      </div>
    </div>
  );
}

type StepProps = {
  index: number;
  trip: Trip;
  context: string;
  currentName: string;
  listed: Eligible[];
  picked: Eligible | null;
  onPick: (c: Eligible) => void;
  onClick: () => void;
};

function Step({ index, trip, context, currentName, listed, picked, onPick, onClick }: StepProps) {
  const text = "text-[14px] text-slate-700";
  const need = NEED_LABEL[trip.vehicle];

  switch (index) {
    case 0:
      return (
        <>
          <p className={text}>{context}</p>
          <div className="mt-3 rounded border border-slate-200 px-3 py-2 text-[13px] text-slate-700">
            {trip.id} · {DESTINATION_LABEL[trip.destination]} · {formatTime(trip.start)} · {currentName}
          </div>
          <Primary onClick={onClick}>Open trip</Primary>
        </>
      );
    case 1:
      return (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Pickup" value={formatRange(trip.start, trip.end)} />
            <Field label="Zone" value={trip.zone} />
            <Field label="Needs" value={VEHICLE_LABEL[trip.vehicle]} />
            <Field label="Destination" value={DESTINATION_LABEL[trip.destination]} />
            <Field label="Driver" value={currentName} />
          </div>
          <Primary onClick={onClick}>Edit trip</Primary>
        </>
      );
    case 2:
      return (
        <>
          <p className={text}>Editing {trip.id}. The driver field is locked until the current driver is removed.</p>
          <div className="mt-3 max-w-[240px]">
            <Field label="Driver" value={currentName} />
          </div>
          <Primary onClick={onClick}>Unassign driver</Primary>
        </>
      );
    case 3:
      return (
        <>
          <p className={text}>
            Remove {currentName} from {trip.id}? The trip will show as unassigned until a new driver is saved.
          </p>
          <Primary onClick={onClick}>Yes, unassign</Primary>
        </>
      );
    case 4:
      return (
        <>
          <p className={text}>Driver removed. Save the trip before assigning someone new.</p>
          <Primary onClick={onClick}>Save trip</Primary>
        </>
      );
    case 5:
      return (
        <>
          <p className={text}>{trip.id} saved with no driver.</p>
          <Primary onClick={onClick}>Open driver list</Primary>
        </>
      );
    case 6:
      return (
        <>
          <p className={text}>All drivers ({DRIVERS.length}). No availability shown.</p>
          <ul className="mt-3 max-h-[120px] overflow-hidden rounded border border-slate-200 text-[13px]">
            {DRIVERS.map((d) => (
              <li key={d.id} className="flex justify-between border-b border-slate-100 px-3 py-1 text-slate-600 last:border-0">
                <span>{d.name}</span>
                <span className="text-slate-400">{VEHICLE_LABEL[d.vehicle]}</span>
              </li>
            ))}
          </ul>
          <Primary onClick={onClick}>Filter list</Primary>
        </>
      );
    case 7:
      return (
        <>
          <p className={text}>Filter by trip type. This trip needs: {need}.</p>
          <div className="mt-3 flex gap-2">
            {(["sedan", "wheelchair", "stretcher"] as const).map((v) => (
              <button
                key={v}
                type="button"
                disabled={v !== trip.vehicle}
                onClick={onClick}
                autoFocus={v === trip.vehicle}
                className="flex items-center gap-2 rounded border border-slate-300 px-3 py-1.5 text-[13px] text-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="h-3.5 w-3.5 rounded-sm border border-slate-400" />
                {NEED_LABEL[v]}
              </button>
            ))}
          </div>
        </>
      );
    case 8:
      return (
        <>
          <p className={text}>Filter selected: {need}.</p>
          <Primary onClick={onClick}>Apply filters</Primary>
        </>
      );
    case 9:
      return (
        <>
          <p className={text}>
            {listed.length} qualified {listed.length === 1 ? "driver" : "drivers"} found. Showing the first page.
          </p>
          <ul className="mt-3 rounded border border-slate-200 text-[13px]">
            {listed.slice(0, 1).map((c) => (
              <li key={c.driver.id} className="px-3 py-1.5 text-slate-600">
                {c.driver.name}
              </li>
            ))}
          </ul>
          <Primary onClick={onClick}>Load more results</Primary>
        </>
      );
    case 10:
      return (
        <>
          <p className={text}>Select a driver. Availability is checked after you pick.</p>
          {listed.length === 0 ? (
            <p className="mt-3 text-[13px] text-slate-500">No qualified driver is free for this window.</p>
          ) : (
            <ul className="mt-3 overflow-hidden rounded border border-slate-200 text-[13px]">
              {listed.map((c, i) => (
                <li key={c.driver.id}>
                  <button
                    type="button"
                    autoFocus={i === 0}
                    onClick={() => onPick(c)}
                    className="flex w-full justify-between border-b border-slate-100 px-3 py-2 text-left text-slate-800 last:border-0 hover:bg-slate-50"
                  >
                    <span>{c.driver.name}</span>
                    <span className="text-slate-400">
                      {VEHICLE_LABEL[c.driver.vehicle]} · {c.driver.zone}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      );
    case 11:
      return (
        <>
          <p className={text}>Selected: {picked?.driver.name}. Availability not yet checked.</p>
          <Primary onClick={onClick}>Check availability</Primary>
        </>
      );
    case 12:
      return (
        <>
          <p className={text}>
            {picked?.driver.name} is free {picked && formatRange(picked.freeFrom, picked.freeTo)}. No overlap found.
          </p>
          <Primary onClick={onClick}>Confirm assignment</Primary>
        </>
      );
    default:
      return (
        <>
          <p className={text}>Assignment saved. {picked?.driver.name} has not been notified yet.</p>
          <Primary onClick={onClick}>Send dispatch notice</Primary>
        </>
      );
  }
}
