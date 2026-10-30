# Dispatch assistant prototype

**Live: https://dispatch-prototype-mocha.vercel.app**

A clickable Wizard-of-Oz test for non-emergency patient transport dispatch: should we build an AI dispatch assistant, or is the real problem the 14-click reassignment flow?

Three arms, same board and same trips: **Today** (the current 14-click flow), **1-click** (one panel, eligible drivers A–Z, one click assigns), and **1-click + AI** (the same panel led by a suggested driver).
Today vs 1-click measures the UX fix alone; 1-click vs 1-click + AI measures what the suggestion adds on top. Comparing AI against Today would credit the AI with savings the one-click fix delivers by itself.
Pre-agreed bar: build the real assistant only if dispatchers accept at least 60% of suggestions and the suggestion saves at least 15 seconds per reassignment over 1-click alone. Otherwise ship 1-click and stop.

All data is synthetic, generated from a fixed seed in `lib/data.ts`: 12 drivers, 40 trips, 3 double-bookings, 2 sick-call trips. No patient information exists anywhere in it.
The "AI suggestion" is a stub: `suggestDrivers` in `lib/suggest.ts` ranks the eligible drivers with fixed rules (vehicle match, availability, zone distance, current load) and calls no model or API.
No backend, database or auth. "Run again" puts the flagged trips back and keeps the results; "Reset demo" also clears them.

## Run it

```bash
npm install
npm run dev
```

Built by David Kelly ([dmkthinks.org](https://dmkthinks.org)).
