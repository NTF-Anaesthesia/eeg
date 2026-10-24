# Notes

Lasting rules, owner preferences and lessons (never task chatter), and how to test.

- The app's own notes are in `eeg/NOTES.md` and `eeg/docs/`.
- Test: `node tools/check.mjs` (repo checks, Worker tests), `node eeg/test/engine.check.mjs`, and the browser suites in
  `.github/workflows/checks.yml` against `python3 -m http.server 8080` in the repo root. In cloud sessions set
  `PLAYWRIGHT_PATH=/opt/node22/lib/node_modules/playwright/index.mjs` and `CHROMIUM_PATH=/opt/pw-browsers/chromium`; do
  not run `playwright install`. `eeg/test/e2e.mjs` (old skin test) is not in the CI list and currently fails on a missing "vista" skin.
- The browser tests need `tools/vendor/axe.min.js` (axe-core); keep it.
- The Worker serves only `eeg/` and `bis/` (`worker/routes.js`); markdown, tools and the Worker itself are never served
  (`.assetsignore`). Check a change locally with `npx wrangler@4 dev --local --port 8799` (kill it by PID).
- `/bis/` forwards to `/` on eeg.anantf.com (and to `../eeg/` on a plain static server, which the demo test relies on).
- Service worker: none. If one is ever added, its VERSION must start with `eeg-` (`tools/check.mjs` enforces it).
