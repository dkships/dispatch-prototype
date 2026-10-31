import {
  DAY_END,
  DAY_START,
  DESTINATION_LABEL,
  DESTINATION_SHORT,
  DRIVERS,
  VEHICLE_LABEL,
  formatRange,
  formatTime,
  type Driver,
  type Trip,
} from "@/lib/data";

type Props = {
  trips: Trip[];
  conflictIds: Set<string>;
  activeTripId: string | null;
  landedTripId: string | null;
  onSelect: (trip: Trip) => void;
};

const SPAN = DAY_END - DAY_START;
const HOURS = Array.from({ length: SPAN / 60 + 1 }, (_, i) => DAY_START + i * 60);
const pct = (minutes: number) => `${((minutes - DAY_START) / SPAN) * 100}%`;

// Double-booked trips share a row, so overlapping blocks are split into two lanes.
function lanesFor(trips: Trip[]) {
  const lanes = new Map<string, number>();
  const laneEnds: number[] = [];
  for (const trip of [...trips].sort((a, b) => a.start - b.start)) {
    let lane = laneEnds.findIndex((end) => end <= trip.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = trip.end;
    lanes.set(trip.id, lane);
  }
  return { lanes, count: Math.max(1, laneEnds.length) };
}

export function Board({ trips, conflictIds, activeTripId, landedTripId, onSelect }: Props) {
  return (
    // The timeline needs room to read; on narrow screens it scrolls inside its frame.
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="min-w-[960px]">
        <div className="grid grid-cols-[236px_1fr] border-b border-slate-200 bg-slate-50/80">
          <div className="px-4 py-2 text-[12px] font-medium text-slate-500">
            Driver
          </div>
          <div className="relative h-8">
            {HOURS.map((m, i) => (
              <span
                key={m}
                className="absolute top-1/2 whitespace-nowrap text-[11px] tabular-nums text-slate-500"
                style={{
                  left: pct(m),
                  transform: `translate(${i === 0 ? "4px" : i === HOURS.length - 1 ? "calc(-100% - 4px)" : "-50%"}, -50%)`,
                }}
              >
                {formatTime(m).replace(":00", "")}
              </span>
            ))}
          </div>
        </div>

        {DRIVERS.map((driver) => (
          <Row
            key={driver.id}
            driver={driver}
            trips={trips.filter((t) => t.driverId === driver.id)}
            conflictIds={conflictIds}
            activeTripId={activeTripId}
            landedTripId={landedTripId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  driver,
  trips,
  conflictIds,
  activeTripId,
  landedTripId,
  onSelect,
}: { driver: Driver; trips: Trip[] } & Omit<Props, "trips">) {
  const { lanes, count } = lanesFor(trips);
  const certs = driver.certs.length ? driver.certs.join(", ") : "none";

  return (
    <div
      className={`grid grid-cols-[236px_1fr] border-b border-slate-100 last:border-b-0 ${
        driver.outSick ? "bg-amber-50/40" : ""
      }`}
    >
      <div
        className="flex flex-col justify-center gap-0.5 border-r border-slate-100 px-4"
        title={`Certifications: ${certs}. Shift ${formatRange(driver.shiftStart, driver.shiftEnd)}.`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[13px] font-medium ${driver.outSick ? "text-slate-500" : "text-slate-900"}`}>
            {driver.name}
          </span>
          {driver.outSick && (
            <span className="rounded-full bg-amber-100 px-1.5 py-px text-[11px] font-semibold text-amber-800">
              Out sick
            </span>
          )}
        </div>
        <span className="text-[12px] text-slate-500">
          {VEHICLE_LABEL[driver.vehicle]} · {driver.zone} · {trips.length} {trips.length === 1 ? "trip" : "trips"}
        </span>
      </div>

      <div className="relative h-[52px]">
        <div className="off-shift absolute inset-y-0 left-0" style={{ width: pct(driver.shiftStart) }} />
        <div
          className="off-shift absolute inset-y-0 right-0"
          style={{ left: pct(driver.shiftEnd) }}
        />
        {HOURS.slice(1, -1).map((m) => (
          <div key={m} className="absolute inset-y-0 w-px bg-slate-100" style={{ left: pct(m) }} />
        ))}

        {trips.map((trip) => {
          const lane = lanes.get(trip.id) ?? 0;
          const conflict = conflictIds.has(trip.id);
          const stranded = trip.needsReassignment;
          const actionable = conflict || stranded;
          const tone = conflict
            ? "border-red-400 bg-red-50 text-red-900 hover:bg-red-100"
            : stranded
              ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
              : trip.id === landedTripId
                ? "border-teal-600 bg-teal-50 text-teal-900"
                : "border-slate-200 bg-slate-50 text-slate-700";
          const laneHeight = (52 - 8 - (count - 1) * 2) / count;

          return (
            <button
              key={trip.id}
              type="button"
              disabled={!actionable}
              onClick={() => onSelect(trip)}
              title={`${trip.id} · ${DESTINATION_LABEL[trip.destination]} · ${formatRange(trip.start, trip.end)} · ${trip.zone} pickup · needs ${VEHICLE_LABEL[trip.vehicle].toLowerCase()}`}
              className={`absolute flex min-w-0 items-center overflow-hidden rounded-md border px-1.5 text-left leading-tight transition-colors ${tone} ${
                actionable ? "cursor-pointer" : "cursor-default"
              } ${trip.id === activeTripId ? "ring-2 ring-slate-900 ring-offset-1" : ""} ${
                trip.id === landedTripId ? "anim-landed" : ""
              }`}
              style={{
                left: `calc(${pct(trip.start)} + 1px)`,
                width: `calc(${((trip.end - trip.start) / SPAN) * 100}% - 2px)`,
                top: 4 + lane * (laneHeight + 2),
                height: laneHeight,
              }}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[11px] font-semibold tabular-nums">{trip.id}</span>
                {count === 1 && (
                  <span className="truncate text-[10.5px] opacity-75">{DESTINATION_SHORT[trip.destination]}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
