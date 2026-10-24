# eeg

The Processed EEG (BIS to DSA) simulator: induce and wake a synthetic patient and watch five processed-EEG monitor skins
respond. For anaesthesia residents. Teaching only: it never gives advice for a real patient, and every patient is synthetic.

Live at https://eeg.anantf.com (unlisted). Part of the NTF anaesthesia apps (https://anantf.com).

- `eeg/`: the app (static site, no build step) with its docs, status notes and tests.
- `bis/`: forwards the old BIS address (`/bis/`) to the app.
- `worker/`, `wrangler.jsonc`: the Cloudflare Worker `eeg` that serves `eeg/` at eeg.anantf.com (no preview links).
- `tools/`: `check.mjs` (repo checks and Worker tests), `vendor/axe.min.js` (accessibility checks used by the tests).

Checks: `node tools/check.mjs`, `node eeg/test/engine.check.mjs`, and the browser suites listed in `.github/workflows/checks.yml`.
