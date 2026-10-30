// In-memory session metrics for the Wizard-of-Oz test. Nothing is stored or sent
// anywhere: a page refresh (or "Reset demo") starts a clean session.
//
// Three arms, so the AI's value is measured on its own: Today vs 1-click is the
// UX fix; 1-click vs 1-click + AI is what the suggestion adds on top of it.

export type Mode = "today" | "oneclick" | "ai";

export const MODES: { value: Mode; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "oneclick", label: "1-click" },
  { value: "ai", label: "1-click + AI" },
];

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
  // AI arm only: whether the suggested driver was accepted.
  accepted?: boolean;
  reason?: OverrideReason;
};

// The success criteria agreed before the test, so the result can't be argued after.
export const BAR = { acceptance: 0.6, aiSecondsSaved: 15 };

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

const diff = (a: number | null, b: number | null) => (a !== null && b !== null ? a - b : null);

export function summarize(log: Reassignment[]) {
  const arms = Object.fromEntries(
    MODES.map(({ value }) => {
      const runs = log.filter((r) => r.mode === value);
      return [
        value,
        {
          count: runs.length,
          clicks: average(runs.map((r) => r.clicks)),
          seconds: average(runs.map((r) => r.seconds)),
        },
      ];
    }),
  ) as Record<Mode, { count: number; clicks: number | null; seconds: number | null }>;

  const aiRuns = log.filter((r) => r.mode === "ai");
  const accepted = aiRuns.filter((r) => r.accepted).length;
  const acceptance = aiRuns.length ? accepted / aiRuns.length : null;
  const reasons = new Map<OverrideReason, number>();
  for (const r of aiRuns) if (r.reason) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);

  const uxSaved = diff(arms.today.seconds, arms.oneclick.seconds);
  const aiSaved = diff(arms.oneclick.seconds, arms.ai.seconds);

  return {
    arms,
    accepted,
    acceptance,
    uxSaved,
    aiSaved,
    reasons: [...reasons.entries()],
    meetsAcceptance: acceptance !== null && acceptance >= BAR.acceptance,
    meetsAiTime: aiSaved !== null && aiSaved >= BAR.aiSecondsSaved,
  };
}
