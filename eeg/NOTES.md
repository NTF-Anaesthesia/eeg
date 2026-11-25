# BIS to DSA notes

Lasting decisions for `eeg/` (the Processed EEG simulator at anantf.com/eeg/). Status and next steps: `STATUS.md`.
These notes were split by topic into `docs/` (nothing was dropped). Read the file for the part you are changing.

| Topic | File |
|---|---|
| Purpose, audience, look, address, how `app.js` works | [docs/purpose-and-how-it-works.md](docs/purpose-and-how-it-works.md) |
| Engine: drug mix, muscle relaxant, "Tuning targets" (`test/engine.check.mjs`), case story, clinical wording and evidence, effect site and timers, lessons, content, block readout | [docs/engine-and-wording.md](docs/engine-and-wording.md) |
| Medtronic BIS skin (default), "The three monitor skins at a glance", fidelity pass | [docs/skin-medtronic.md](docs/skin-medtronic.md) |
| Two-sided screens and the functional menu | [docs/screens-and-menu.md](docs/screens-and-menu.md) |
| Medtronic BIS Advance skin | [docs/skin-advance.md](docs/skin-advance.md) |
| Masimo SedLine skin and its fidelity passes | [docs/skin-sedline.md](docs/skin-sedline.md) |
| Tests, phone feedback, Philips IntelliVue skin, case timeline | [docs/tests-feedback-philips-timeline.md](docs/tests-feedback-philips-timeline.md) |
| Processed EEG redesign, 16-17 Oct 2026 (teaching layout, learning examples, fullscreen) | [docs/processed-eeg-redesign.md](docs/processed-eeg-redesign.md) |
| Workshop tools, 25 Nov 2026: blinded mode, TCI pump (with ketamine and dexmedetomidine lines), case files, quiz and banners; the `/workshop/` page (BIS Advance, NUHS style, iPads, its own home-screen app); deep links | [docs/workshop.md](docs/workshop.md) |

Always true: synthetic EEG only, no data stored, no reference images or manual text in the repo (fonts are bundled with
their licences). Home-screen apps: `/workshop/` is its own installable app (manifest `id` "/workshop/", scope `./`, a
service worker scoped to `workshop/` only). A future main-page manifest must use a different `id` (for example "/") and a
scope that does not swallow `/workshop/` (not "/" with a worker that controls it). Run the checks in `.github/workflows/checks.yml` (repo root) after changing the engine or a skin.
