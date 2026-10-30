// In-memory session metrics for the Wizard-of-Oz test. Nothing is stored or sent
// anywhere: a page refresh (or "Reset demo") starts a clean session.

export type Mode = "today" | "proposed";

export const OVERRIDE_REASONS = [
  "Wrong vehicle",
  "Driver preference",
  "Patient preference",
  "Other",
] as const;
export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

export type Reassignment = {
  mode: Mode;
  tripId: string;
  clicks: number;
  seconds: number;
  // Proposed mode only: whether the suggested driver was accepted.
  accepted?: boolean;
  reason?: OverrideReason;
};

// The success criteria agreed before the test, so the result can't be argued after.
export const BAR = { acceptance: 0.6, secondsSaved: 30 };

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function summarize(log: Reassignment[]) {
  const today = log.filter((r) => r.mode === "today");
  const proposed = log.filter((r) => r.mode === "proposed");
  const accepted = proposed.filter((r) => r.accepted).length;
  const reasons = new Map<OverrideReason, number>();
  for (const r of proposed) if (r.reason) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);

  const todaySeconds = average(today.map((r) => r.seconds));
  const proposedSeconds = average(proposed.map((r) => r.seconds));
  const acceptance = proposed.length ? accepted / proposed.length : null;
  const saved = todaySeconds !== null && proposedSeconds !== null ? todaySeconds - proposedSeconds : null;

  return {
    count: { today: today.length, proposed: proposed.length },
    clicks: { today: average(today.map((r) => r.clicks)), proposed: average(proposed.map((r) => r.clicks)) },
    seconds: { today: todaySeconds, proposed: proposedSeconds },
    accepted,
    acceptance,
    saved,
    reasons: [...reasons.entries()],
    meetsAcceptance: acceptance !== null && acceptance >= BAR.acceptance,
    meetsTime: saved !== null && saved >= BAR.secondsSaved,
  };
}
