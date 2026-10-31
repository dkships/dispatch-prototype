import { DESTINATION_LABEL, VEHICLE_LABEL, formatRange, type Trip } from "@/lib/data";
import { formatSeconds } from "@/lib/useStopwatch";

export const PANEL_WIDTH = 420;

type Props = {
  trip: Trip;
  context: string;
  label: string;
  clicks: number;
  elapsed: number;
  onCancel: () => void;
  children: React.ReactNode;
};

// The side panel both 1-click arms share, so the only difference a dispatcher
// sees between them is the content: a plain list, or a suggestion.
export function PanelShell({ trip, context, label, clicks, elapsed, onCancel, children }: Props) {
  return (
    <aside
      aria-label={`Reassign ${trip.id}, ${label}`}
      className="anim-panel fixed bottom-0 right-0 top-0 z-30 flex max-w-full flex-col border-l border-slate-200 bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.08)]"
      style={{ width: PANEL_WIDTH }}
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-5 pb-4 pt-5">
        <div>
          <div className="text-[12px] font-medium text-teal-700">
            Reassign trip · {label}
          </div>
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
        {children}
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

export function NoDriverFree() {
  return (
    <p className="mt-4 rounded-lg border border-slate-200 p-4 text-[14px] text-slate-700">
      No qualified driver is free for this window. Call in the on-call driver.
    </p>
  );
}
