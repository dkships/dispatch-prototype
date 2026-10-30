# Dispatch assistant prototype

**Live: https://dispatch-prototype-mocha.vercel.app**

A clickable Wizard-of-Oz test for non-emergency patient transport dispatch: the same driver reassignment done in today's 14-click flow and in a proposed 1-click flow with a suggested driver, with timing and acceptance measured live in the session.
All data is synthetic, generated from a fixed seed in `lib/data.ts`: 12 drivers, 40 trips, 3 double-bookings, 2 sick-call trips. No patient information exists anywhere in it.
The "AI suggestion" is a stub: `lib/suggest.ts` ranks drivers with fixed rules (vehicle match, availability, zone distance, current load) and calls no model or API.
The question it answers before anyone builds a model: do dispatchers accept the suggestion? Pre-agreed bar: build the real assistant if acceptance is at least 60% and it saves at least 30 seconds per reassignment.
No backend, database or auth; refresh or "Reset demo" starts a clean session.

## Run it

```bash
npm install
npm run dev
```

Built by David Kelly ([dmkthinks.org](https://dmkthinks.org)).
