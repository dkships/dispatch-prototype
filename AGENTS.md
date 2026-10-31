<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This project

A Wizard-of-Oz test for a dispatch product case: does an AI driver suggestion add anything over a plain 1-click reassignment? See `README.md` for the arms and the bar.

Check every change with `npm run lint` and `npm run build`. There are no tests.

Keep these true; the experiment depends on them:

- All three arms reassign from `eligibleDrivers` in `lib/suggest.ts`. Only `suggestDrivers` adds ranking and reasons, so 1-click and 1-click + AI differ only by the suggestion.
- `suggestDrivers` stays a deterministic rules stub. No model, API or network call.
- Data stays synthetic and seeded in `lib/data.ts`. Never add patient names or other patient details.
- The bar (`BAR` in `lib/session.ts`) is fixed before the test. Change it only when the README changes with it.
