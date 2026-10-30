import { VEHICLE_LABEL, formatRange, type Trip } from "@/lib/data";
import type { Eligible } from "@/lib/suggest";
import { useStopwatch } from "@/lib/useStopwatch";
import { NoDriverFree, PanelShell } from "./PanelShell";

type Props = {
  trip: Trip;
  context: string;
  eligible: Eligible[];
  onComplete: (driverId: string, clicks: number, seconds: number) => void;
  onCancel: () => void;
};

// The UX fix on its own: the same panel and the same eligible drivers as the AI
// arm, alphabetical, with no ranking, badge or reasons. One click assigns.
export function OneClickPanel({ trip, context, eligible, onComplete, onCancel }: Props) {
  const { elapsed, read } = useStopwatch();

  return (
    <PanelShell trip={trip} context={context} label="1-click" clicks={0} elapsed={elapsed} onCancel={onCancel}>
      {eligible.length === 0 ? (
        <NoDriverFree />
      ) : (
        <section className="mt-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
            Eligible drivers ({eligible.length}) · A–Z
          </div>
          <p className="mt-1 text-[12.5px] text-slate-500">Right vehicle, free for this trip. Click one to assign.</p>
          <ul className="mt-3 space-y-2">
            {eligible.map((e) => (
              <li key={e.driver.id}>
                <button
                  type="button"
                  onClick={() => onComplete(e.driver.id, 1, read())}
                  className="block w-full rounded-lg border border-slate-300 p-3 text-left transition-colors hover:border-slate-500 hover:bg-slate-50"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] font-medium text-slate-900">{e.driver.name}</span>
                    <span className="text-[12px] text-slate-500">{VEHICLE_LABEL[e.driver.vehicle]}</span>
                  </div>
                  <div className="mt-0.5 text-[12.5px] tabular-nums text-slate-600">
                    Free {formatRange(e.freeFrom, e.freeTo)} · {e.minutesAway} min away
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PanelShell>
  );
}
