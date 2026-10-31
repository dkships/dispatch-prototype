# Dispatch assistant prototype

**Live: https://dispatch-prototype-mocha.vercel.app**

A clickable Wizard-of-Oz test for non-emergency patient transport dispatch: should we build an AI dispatch assistant, or is the real problem the 14-click reassignment flow?

Three arms, same board and same trips: **Today** (the current 14-click flow), **1-click** (one panel, eligible drivers A–Z, one click assigns), and **1-click + AI** (the same panel led by a suggested driver).
Today vs 1-click measures the UX fix alone; 1-click vs 1-click + AI measures what the suggestion adds on top. Comparing AI against Today would credit the AI with savings the one-click fix delivers by itself.

## The bar, agreed before the test

Build the real assistant only if dispatchers accept at least 60% of suggestions **and** the drivers picked in the 1-click + AI arm are, on average, no farther from pickup than the drivers dispatchers pick themselves in 1-click. Otherwise ship 1-click and stop.
Time to reassign is still measured and shown for every arm, but it is not part of the bar.
The results panel gives no verdict until both 1-click arms have 10 reassignments, so a single accepted suggestion can't read as 100% acceptance.
The thresholds live in `BAR` in `lib/session.ts`.

## Running the test with dispatchers

- **Who:** five dispatchers, one week, on a copy of real shifts (this build uses synthetic ones).
- **Order:** rotate which arm each dispatcher starts with. The same five trips repeat across arms, so whichever arm goes later benefits from familiarity. One warm-up run in each arm, not counted, reduces this further.
- **Record:** time per reassignment, clicks, acceptance, override reasons and drive time to pickup, all shown in the results panel. Results are in-memory only, so copy them down before refreshing.

## What this doesn't test

- **Why quality, not time.** Both 1-click arms take one click, so the suggestion can only save scanning time across a short list; a time bar would mostly measure list length. The quality bar asks whether the suggestion picks drivers at least as close as a dispatcher's own scan, and acceptance asks whether they trust it.
- **Calendar crashes**, the dispatchers' other complaint, are out of scope. That is a reliability fix, not something to prototype.
- **Model quality.** The "AI suggestion" is a stub: `suggestDrivers` in `lib/suggest.ts` ranks the eligible drivers with fixed rules (vehicle match, availability, zone distance, current load) and calls no model or API. The test measures whether dispatchers want a suggestion, not whether a model can produce a good one.

## Data

All data is synthetic, generated from a fixed seed in `lib/data.ts`: 12 drivers, 40 trips, 3 double-bookings, 2 sick-call trips. No patient information exists anywhere in it.
No backend, database or auth. "Run again" puts the flagged trips back and keeps the results; "Reset demo" also clears them.

## Run it

Requires Node 20.9 or later.

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
```

Built by David Kelly ([dmkthinks.org](https://dmkthinks.org)).
