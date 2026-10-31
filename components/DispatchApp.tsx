"use client";

import { useEffect, useMemo, useState } from "react";
import {
  INITIAL_TRIPS,
  driverById,
  findConflicts,
  formatRange,
  type Trip,
} from "@/lib/data";
import { MODES, type Mode, type Reassignment } from "@/lib/session";
import { eligibleDrivers, suggestDrivers } from "@/lib/suggest";
import { formatSeconds } from "@/lib/useStopwatch";
import { Board } from "./Board";
import { OneClickPanel } from "./OneClickPanel";
import { PANEL_WIDTH } from "./PanelShell";
import { ProposedPanel, type ProposedOutcome } from "./ProposedPanel";
import { ResultsPanel } from "./ResultsPanel";
import { TodayFlow } from "./TodayFlow";

// What each arm is, in the dispatcher's terms. Shown under the alerts.
const MODE_HINT: Record<Mode, string> = {
  today: "Today: the current scheduler, 14 clicks per reassignment.",
  oneclick: "1-click: every eligible driver in one panel, A–Z. One click assigns.",
  ai: "1-click + AI: the same panel, led by a suggested driver and why.",
};

export function DispatchApp() {
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
  const [mode, setMode] = useState<Mode>("today");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [landedId, setLandedId] = useState<string | null>(null);
  const [log, setLog] = useState<Reassignment[]>([]);
  // The toast carries the trip it reported on, so "Restore this trip" can undo it.
  const [toast, setToast] = useState<{ text: string; tripId: string } | null>(null);
  // Results stay tucked away while a flow is open, then open to show the new numbers.
  const [resultsOpen, setResultsOpen] = useState(false);
  // Bumped on every open so a reopened trip gets a fresh flow, timer and counter.
  const [runKey, setRunKey] = useState(0);

  const conflicts = useMemo(() => findConflicts(trips), [trips]);
  const conflictIds = useMemo(
    () => new Set(conflicts.flatMap((c) => [c.keep.id, c.move.id])),
    [conflicts],
  );
  const stranded = trips.filter((t) => t.needsReassignment);

  // Clicking either half of a double-booking opens the later booking, the one to move.
  const active = trips.find((t) => t.id === activeId) ?? null;
  const activeConflict = conflicts.find((c) => c.move.id === activeId);
  const eligible = useMemo(() => (active ? eligibleDrivers(active, trips) : []), [active, trips]);
  const candidates = useMemo(() => (active ? suggestDrivers(active, trips) : []), [active, trips]);
  const context = !active
    ? ""
    : active.needsReassignment
      ? `${driverById(active.driverId).name} called out sick. This trip has no driver.`
      : activeConflict
        ? `Double-booked: ${driverById(active.driverId).name} also has ${activeConflict.keep.id} (${formatRange(
            activeConflict.keep.start,
            activeConflict.keep.end,
          )}).`
        : "";

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!landedId) return;
    const id = window.setTimeout(() => setLandedId(null), 2400);
    return () => window.clearTimeout(id);
  }, [landedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActiveId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function open(trip: Trip) {
    const conflict = conflicts.find((c) => c.keep.id === trip.id || c.move.id === trip.id);
    const target = conflict ? conflict.move : trip;
    if (!conflict && !trip.needsReassignment) return;
    setActiveId(target.id);
    setResultsOpen(false);
    setRunKey((k) => k + 1);
  }

  // Every arm picks from the same eligible list, so drive time is read from it here.
  function reassign(run: Omit<Reassignment, "minutesAway">, driverId: string) {
    const minutesAway = eligible.find((e) => e.driver.id === driverId)?.minutesAway ?? 0;
    const entry: Reassignment = { ...run, minutesAway };
    setTrips((all) =>
      all.map((t) => (t.id === entry.tripId ? { ...t, driverId, needsReassignment: false } : t)),
    );
    setLog((l) => [...l, entry]);
    setLandedId(entry.tripId);
    setActiveId(null);
    setResultsOpen(true);
    setToast({
      tripId: entry.tripId,
      text: `${entry.tripId} reassigned to ${driverById(driverId).name} in ${entry.clicks} ${
        entry.clicks === 1 ? "click" : "clicks"
      }, ${formatSeconds(entry.seconds)}`,
    });
  }

  // Put one trip back as it started (sick-call or double-booked) so the same
  // problem can be run again in another arm. The log is kept.
  function restoreTrip(tripId: string) {
    const original = INITIAL_TRIPS.find((t) => t.id === tripId);
    if (original) setTrips((all) => all.map((t) => (t.id === tripId ? original : t)));
    setToast(null);
  }

  // Every flagged trip back to its starting state, log kept.
  function runAgain() {
    setTrips(INITIAL_TRIPS);
    setActiveId(null);
    setLandedId(null);
    setToast(null);
  }

  function switchMode(next: Mode) {
    setActiveId(null);
    setMode(next);
  }

  function reset() {
    setTrips(INITIAL_TRIPS);
    setLog([]);
    setActiveId(null);
    setLandedId(null);
    setToast(null);
    setResultsOpen(false);
  }

  const panelOpen = mode !== "today" && active !== null;

  return (
    <div className="min-h-dvh bg-white">
      <div className="border-b border-slate-200 bg-slate-50 py-1.5 text-center text-[12px] text-slate-500">
        Prototype with synthetic data. No patient information.
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-700" aria-hidden>
              <svg viewBox="0 0 16 16" className="h-4 w-4 text-white">
                <path d="M2 11h2.5l1.5-5 2.5 7 1.5-4H14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <div className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">Dispatch board</div>
              <div className="text-[12px] text-slate-500">
                Thursday · {trips.length} trips · 12 drivers
              </div>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label="Reassignment flow"
            className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
          >
            {MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => switchMode(value)}
                className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  mode === value
                    ? value === "ai"
                      ? "bg-teal-700 text-white shadow-sm"
                      : "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runAgain}
              title="Put every flagged trip back and keep the results"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-[13px] text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Run again
            </button>
            <button
              type="button"
              onClick={reset}
              title="Put all trips back and clear the results"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-[13px] text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Reset demo
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 pb-24 pt-4 sm:px-6">
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <Alert
            tone="red"
            title={
              conflicts.length === 0
                ? "No double-bookings"
                : `${conflicts.length} double-${conflicts.length === 1 ? "booking" : "bookings"} detected`
            }
            items={conflicts.map((c) => ({
              key: c.move.id,
              label: `${driverById(c.driverId).name}: ${c.keep.id} overlaps ${c.move.id}`,
              onClick: () => open(c.move),
            }))}
          />
          <Alert
            tone="amber"
            title={
              stranded.length === 0
                ? "No trips waiting for a driver"
                : `${stranded.length} ${stranded.length === 1 ? "trip needs" : "trips need"} reassignment`
            }
            subtitle={stranded.length ? "Driver called out sick" : undefined}
            items={stranded.map((t) => ({
              key: t.id,
              label: `${t.id} · ${formatRange(t.start, t.end)} · ${driverById(t.driverId).name}`,
              onClick: () => open(t),
            }))}
          />
        </div>

        <p className="mb-3 text-[13px] text-slate-600">
          {MODE_HINT[mode]}{" "}
          <span className="text-slate-500">Click a red or amber trip to reassign it.</span>
        </p>

        <Board
          trips={trips}
          conflictIds={conflictIds}
          activeTripId={activeId}
          landedTripId={landedId}
          onSelect={open}
        />

        <footer className="mt-6 text-[13px] text-slate-500">
          Prototype by{" "}
          <a
            href="https://dmkthinks.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-900 underline underline-offset-2 hover:opacity-70"
          >
            David Kelly
          </a>
          . Suggestions come from a rules stub, not a model.
        </footer>
      </main>

      {active && mode === "today" && (
        <TodayFlow
          key={runKey}
          trip={active}
          context={context}
          eligible={eligible}
          onCancel={() => setActiveId(null)}
          onComplete={(driverId, clicks, seconds) =>
            reassign({ mode: "today", tripId: active.id, clicks, seconds }, driverId)
          }
        />
      )}

      {active && mode === "oneclick" && (
        <OneClickPanel
          key={runKey}
          trip={active}
          context={context}
          eligible={eligible}
          onCancel={() => setActiveId(null)}
          onComplete={(driverId, clicks, seconds) =>
            reassign({ mode: "oneclick", tripId: active.id, clicks, seconds }, driverId)
          }
        />
      )}

      {active && mode === "ai" && (
        <ProposedPanel
          key={runKey}
          trip={active}
          context={context}
          candidates={candidates}
          onCancel={() => setActiveId(null)}
          onComplete={(o: ProposedOutcome) =>
            reassign(
              { mode: "ai", tripId: active.id, clicks: o.clicks, seconds: o.seconds, accepted: o.accepted, reason: o.reason },
              o.driverId,
            )
          }
        />
      )}

      <ResultsPanel
        log={log}
        open={resultsOpen}
        onToggle={() => setResultsOpen((o) => !o)}
        offsetRight={panelOpen ? PANEL_WIDTH : 0}
      />

      {toast && (
        <div
          role="status"
          className="anim-toast fixed bottom-4 left-6 z-50 flex items-center gap-4 rounded-lg bg-slate-900 px-4 py-2.5 text-[13px] font-medium text-white shadow-lg"
        >
          {toast.text}
          <button
            type="button"
            onClick={() => restoreTrip(toast.tripId)}
            className="text-teal-300 underline underline-offset-2 hover:text-teal-200"
          >
            Restore this trip
          </button>
        </div>
      )}
    </div>
  );
}

type AlertProps = {
  tone: "red" | "amber";
  title: string;
  subtitle?: string;
  items: { key: string; label: string; onClick: () => void }[];
};

function Alert({ tone, title, subtitle, items }: AlertProps) {
  const done = items.length === 0;
  const box = done
    ? "border-slate-200 bg-slate-50"
    : tone === "red"
      ? "border-red-200 bg-red-50"
      : "border-amber-200 bg-amber-50";
  const heading = done ? "text-slate-600" : tone === "red" ? "text-red-800" : "text-amber-900";
  const chip =
    tone === "red"
      ? "border-red-200 text-red-800 hover:border-red-400"
      : "border-amber-300 text-amber-900 hover:border-amber-500";

  return (
    <section className={`rounded-xl border px-4 py-3 ${box}`}>
      <div className="flex items-baseline gap-2">
        <h2 className={`text-[14px] font-semibold ${heading}`}>{title}</h2>
        {subtitle && <span className="text-[12px] text-amber-800/80">{subtitle}</span>}
      </div>
      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={item.onClick}
                className={`rounded-md border bg-white px-2 py-1 text-[12px] tabular-nums transition-colors ${chip}`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
