# Workshop tools (blinded reading, TCI pump, case files, quiz, workshop page)

Part of the BIS to DSA / processed EEG notes. Index: [../NOTES.md](../NOTES.md). Added 25 Nov 2026 for a workshop segment on
reading the DSA and SEF95 with the number hidden. Files: `workshop.js`, `pump.js`, `cases.js`, `quiz.js`, `workshop.css`, and for the `/workshop/` page `workshop/index.html`,
`ws-page.js`, `ws-page.css`; the index masking lives in each skin.

## Blinded mode (`?blind=1`)

- The Blind key in the toolbar (eye with a stroke) masks the numeric index on every monitor: BIS on BIS Advance, Medtronic BIS,
  IntelliVue and the Teaching layout, PSi on SedLine. The number shows as `••`; it stays computed underneath.
- Also hidden while masked, because each gives the number away: the BIS/PSi trend lines (BIS Advance, Medtronic, Teaching,
  SedLine's PSi row and gauge needle), the index alarms (out of target range, PSI High/Low, `** BIS High/Low`), the zone pill,
  the "Model BIS" forecast, the drag bubble, the green 40-60 band and the "What to observe" note (it names the state).
- Kept: the DSA, SEF95 and MF lines and numbers, the raw EEG, SQI, EMG, SR and suppression time.
- Reveal shows everything again until pressed again (Mask). Turning Blind off clears Reveal.
- `app.js` holds `blind`, `masked()` and `bisV()` (null while masked, for trend lines); the skins call them only when they draw.
- `?blind=1` opens blinded; the address follows the key (`history.replaceState`), so the current link can be shared.
- Test: `test/workshop-blind.e2e.mjs` (in the Checks workflow).

## TCI pump (`pump.js`)

- Anaesthetic → **TCI pump**: a propofol target-controlled infusion panel replaces the combination choices. Model Eleveld
  (arterial, opioid on), Schnider or Marsh (ke0 0.26/min); Ce (effect-site) or Cp (plasma) target, 0-8 µg/ml; patient sex, age,
  height and weight (locked once drug is given; Reset clears the pump). Readout: Cp, Ce, rate (ml/h at 10 mg/ml), total mg,
  and a 15-minute Cp/Ce chart with the target.
- The PK models, exact solver and Shafer-Gregg controller are a port of NTF-Anaesthesia/anantf-site `apps/tci/src/engine`,
  constants unchanged; pump settings as that emulator's defaults (800 ml/h maximum, a new rate every 10 s, plasma overshoot
  cap 4 x target). Checked against the TypeScript engine: identical Cp and Ce for Eleveld, Schnider (Ce) and Marsh (Cp) runs.
- Into the engine: the predicted propofol Ce is the mix's propofol level (µg/ml, `mixTarget`) and is written straight into both
  engines' effect site, so the model's ke0 is the only propofol lag. Sevoflurane end-tidal % becomes MAC by age (MAC40 1.8%,
  Nickalls & Mapleson 2003) and, with remifentanil (ng/ml), is set as a mix target that follows the engine's own effect-site
  lag and rules (remifentanil blunts the stimulus response).
- Add-on lines, always shown under the propofol line and usable during a case (25 Nov 2026, a workshop colleague's request):
  - **Ketamine**: a bolus in mg/kg (given over 30 s) plus an infusion in mg/kg/h. PK: Domino EF et al., Clin Pharmacol Ther
    1984;36:645-53, as tabulated in Absalom et al. 2007 (V1 0.063 L/kg; k10 0.4381, k12 0.5921, k13 0.590, k21 0.247,
    k31 0.0146 /min). ke0 0.5/min is our assumption (the model has none).
  - **Dexmedetomidine**: an optional load in µg/kg over 10 min plus an infusion in µg/kg/h. PK: Hannivoort LN et al.,
    Anesthesiology 2015;123:357-67 (V1 1.78, V2 30.3, V3 52.0 L x W/70; CL 0.686 x (W/70)^0.75 L/min; Q2 2.98, Q3 0.602
    L/min, allometric). ke0 0.12/min is our assumption.
  - Each line shows its Ce, the total given and a 15-minute Ce chart. Same exact 3-compartment solver as the propofol models.
  - Into the engine (a teaching approximation, not a validated concentration-effect model): engine level = min(1, Ce / 2),
    so 2 µg/ml ketamine or 2 ng/ml dexmedetomidine is the engine's full single-drug signature. The level is the mix's
    ketamine or dex and is written straight into both engines' effect site, so the PK ke0 is the only lag.
  - Emerge stops both infusions and any dose still running. A 2 mg/kg ketamine bolus peaks near 5.5 µg/ml (level capped at 1).
- Induce sets Ce 3.5; Emerge sets every target to zero (propofol then falls by the model). Choosing another agent or a
  combination turns the pump off; manual depth works as before. The timeline saves and restores the pump; drug marks on the
  bar follow pump settings, not every step.
- Speed (25 Nov 2026, the owner's "9x doesn't speed up the induction"): the pump steps in sim time, so it already scaled
  (time to BIS < 60 after a Ce 6 µg/ml target: 116 s at 1x, 13 s wall at 9x). What feels slow is Eleveld's own effect site
  (arterial ke0 0.146/min, t1/2 about 4.7 min): in Ce mode the pump overshoots the plasma (a target of 6.3 in a 40-year-old,
  170 cm, 70 kg man gives 264 mg over 130 s and a Cp peak near 24 µg/ml, inside the 4x cap) and Ce still takes about 4 min to
  reach the target. These numbers match the anantf-site emulator's `simulate` for the same patient. After the target goes to
  zero, Cp falls fast and Ce slowly, also as in that model.
- Engine sensitivity: the pump's Ce enters the engine at depth 0.155 per µg/ml, the same scale as the main page; the patient's
  age changes only the PK, not the EEG. Suppression starts near Ce 5.2 µg/ml (depth 0.8) and is heavy by 6.3 (depth 0.98),
  whatever the pump patient's age. Possible in a young adult at that level, but on the sensitive side; left as it is (it is the engine's tuned
  scale, `test/engine.check.mjs`). Clinical read-through: ask the owner.
- A manual pump change (target, sevoflurane, remifentanil; and the add-on lines when no case runs) clears the caption, so an
  old Induce or Emerge caption never sits beside a new target.
- Test: `test/workshop-pump.e2e.mjs`; speed and captions: `test/speed.e2e.mjs`.

## Case files (`cases.js`, `?case=<id>`)

- A **Case** menu in a strip above the monitor, or `?case=tci|sevo|propket` (add `&blind=1` for blinded reading). A case runs
  a 5-minute awake pre-roll, starts a fresh timeline, sets the pump for its synthetic patient and plays at 5x; the timeline
  works inside it. Choosing no case stops it. 5x stays: a 30-minute case then plays in about 6 minutes.
- The raw EEG strip always sweeps at real time (25 mm/s morphology) on every screen and both hemispheres, whatever the speed;
  the DSA, trends, SEF95, the index and the clock run at the sim speed. At 1x the strip is the engine's own signal (`SIG`); at
  any other speed a display engine follows the live engine's drug, depth and state each frame and makes one frame's worth of
  real-time samples into `DSIG`, with its own burst, blink and diathermy timers so they keep their real length. `SIG` is
  never decimated. Check: `test/workshop-realtime.e2e.mjs`.
- Steps run on the story mechanism (`runStory`): `steps` on the story object, plus `pump` (pump targets), `act` (relaxant on or
  reversed with the page's own relaxant modes) and `ev`, a neutral event line shown instead of the caption while blinded (no
  drug names or units, so it gives away neither the answer nor the agent; an added drug is just "Drug given.").
- `tci` Propofol TCI (Eleveld, Ce 4 then 3.5 µg/ml): awake, induction, relaxant, maintenance, skin incision (alpha dropout, then
  18-Hz activity and SEF95 rising), treatment (remifentanil 3 ng/ml, Ce 4), maintenance, emergence.
- `sevo` Sevoflurane (end-tidal 2.4% induction, 1.8% maintenance, about 1 MAC at 45 years): the same phases.
- `propket` Propofol + ketamine: maintenance, then ketamine on the pump's ketamine line (0.5 mg/kg bolus plus 0.5 mg/kg/h,
  stopped later) at an unchanged propofol target raises BIS and SEF95 and weakens alpha; it wears off before emergence.
- `propdex` Propofol + dexmedetomidine (Ce 3.5, then 2.5 µg/ml): dex 1 µg/kg over 10 min plus 0.5 µg/kg/h; slow activity and
  spindles build and alpha weakens over the load; the propofol target is lowered, then everything stops for emergence.
- In both combination cases the propofol TCI line stays live, and the ketamine and dex lines can be changed during the case.
- Expected directions (checked by `test/workshop-cases.e2e.mjs`): maintenance BIS 40-60; incision alpha dip, then SEF95 and BIS
  up; treatment brings them back; ketamine raises BIS and SEF95 with weaker alpha; emergence BIS above 75-80.
- The arousal patterns are the engine's existing stimulus rules, a teaching approximation; the cases are synthetic, not timings
  or doses to copy.

## Quiz and workshop banners (`quiz.js`, `&quiz=1`, `?workshop=1`)

- The **Quiz** key in the case strip (or `&quiz=1`) runs the chosen case blinded, with the pump panel and the anaesthetic
  choice hidden. At each checkpoint (three a case, in `QUIZ`) the case pauses and a card asks: depth or phase (awake or
  lightly sedated / general anaesthesia / too deep / lightening or emerging), most likely agent (propofol / sevoflurane /
  propofol with ketamine / propofol with dexmedetomidine) and whether an arousal response is present. Check answers marks each, shows the hidden BIS and SEF95
  and a teaching note; Continue resumes. The case ends with "You scored n of 9" and Play again. Turning the quiz on mid-case
  restarts the case; checkpoints the timeline jumps past are skipped (the latest is asked). In the quiz the case menu shows
  neutral names (Case A to D, in menu order) so it gives no drug away; the real names show after Check answers (until
  Continue) and when the case ends. After Check answers the pump
  panel (all three drug lines) shows until Continue.
- Teaching notes are general and hedged in the page's style: DSA patterns are clues, not tests; the arousal sequence is not
  specific; a high index with ketamine need not mean emergence. Propofol and sevoflurane are told apart only by the theta clue.
- `?workshop=1` adds a header row to the strip: NTFGH and NUHS as text name badges (full names on hover), and the session
  title. No logo files and no invented logos. The strip is hidden in full screen, so pick the case first; the quiz card still
  floats there.
- Deep links (the `/bis/` forwarder keeps the query):
  - `https://eeg.anantf.com/?workshop=1&case=tci&quiz=1` (blinded propofol TCI case with the quiz)
  - `https://eeg.anantf.com/?case=propket&blind=1` (blinded, no quiz); `?case=sevo&quiz=1`
- Test: `test/workshop-quiz.e2e.mjs`.

## Workshop page (`/workshop/`, 25 Nov 2026)

- eeg.anantf.com/workshop/ (`workshop/index.html`, generated from the main page's monitor section; `ws-page.js`,
  `ws-page.css`): the same engine, pump, cases and quiz as the main page, inside this repo so engine fixes reach both.
- Monitor: the main page's **BIS Advance** screen, fixed. The owner changed this the same day ("should be BIS Advance"):
  his colleague asked for the BIS Advance. A first version that day had a generic, unbranded monitor instead; it was removed.
  No skin picker; the Medtronic-style screen is left out of the page and the SedLine and IntelliVue screens are never built.
  Unilateral / Bilateral is the Advance's own 2- or 4-channel sensor view (`?bi=1` opens bilateral). BIS is masked by
  default (Reveal in the toolbar; `?blind=0` opens unmasked).
- Page style: NUHS (owner, 25 Nov 2026: "We can change the theme to the NUHS theme"), from his unofficial NUHS style guide
  (modelled on nuhs.edu.sg): navy #002f6c main colour, the four-quarter top stripe (orange #e57200, red #e4002b, blue
  #178fd7, navy), Open Sans (self-hosted, OFL), square blocks, 5px radius on buttons and inputs, a navy 3px focus ring. The
  values are copied into `ws-page.css`, which maps the shared page variables onto them (`demo.css` and `workshop.css` now use
  those variables, same values on the main page). No NUHS logo. The BIS Advance screen keeps its own device look.
- Header strip (always on, kept in full screen): the NTF Anaesthesia logo, NTFGH and NUHS large and bold, the session title.
  Base font 19 px and larger controls for a projector ("can we also make the font and the page logo bigger"). Contrast at AA
  or better (text #333 and navy on white; muted #5b6169 6:1; control borders 3.7:1).
- Always on: the case picker, the Quiz key and the pump panel (on from the start).
- Full screen (1920x1080): header strip and case bar on top, the Advance on the left, the dock (playback, case caption, pump)
  on the right; no page scroll (the dock scrolls on its own). `demo.js` fits the monitor beside a `--fit-side` column.
- Phone: one column, as the main page.
- Links: `https://eeg.anantf.com/workshop/?case=propket&bi=1`, `?case=propdex&quiz=1`, `?case=tci&quiz=1`.
- Test: `test/workshop-page.e2e.mjs` (Advance only, no other monitor names in the page, masked BIS and Reveal, bilateral,
  header size, case and quiz with neutral names, ketamine bolus raises Ce, projector without page scroll, phone).

## Workshop page on iPads (25 Nov 2026)

The colleague runs the session with participants on iPads ("Also can remove the educational material at bottom - I will try
to run it with iPads for the participants").

- Only the simulator: header strip, case bar and Quiz, the BIS Advance and the pump. The teaching panels, the pump note and
  the long footer are gone; the footer is one line ("Not for clinical use or dosing"). Quiz answer notes stay.
- Landscape (any width from 640 px, so iPad and phone): the controls sit in a side column beside the monitor (colleague:
  "When I use landscape - can the toggle buttons be on the side instead of at the bottom?"); the monitor takes the rest of
  the row. `ws-page.css` sets `--fit-desk:1` so `demo.js` fits the monitor beside `--fit-side` below 1101 px too. Touch
  screens get a narrower column (330 px; 290 px on a phone) and a smaller header. Portrait: stacked, the monitor full width.
- Touch: every control outside the device screen is at least 44 px; inputs use 16 px text (no iOS zoom); `touch-action:
  manipulation` stops double-tap zoom; controls are not text-selectable; the sliders are 44 px high. The full-screen key
  falls back to the page's own focus mode where the browser has no real full screen (iPhone Safari).
- Alpha dropout key (colleague: "Actually burst suppression no need cos I can just increase depth and it will happen. But
  can have the alpha dropout."): runs the main page's alpha stimulus; off while a quiz checkpoint is open or a stimulus runs.
- Home-screen app "EEG Workshop": `workshop/manifest.webmanifest` (`id` "/workshop/", `start_url` and `scope` `./`, so it
  works at /workshop/ and /eeg/workshop/; standalone, any orientation, NUHS navy), its own icons (`workshop/icons/`, a white
  EEG trace and "W" on navy with the NUHS stripe), iOS meta (title, apple-touch-icon). The browser's install prompt is
  cancelled (AGENTS.md); on an iPad: Safari, Share, Add to Home Screen. It does not overlap a main-page install (see NOTES).
- Offline: `workshop/sw.js`, scoped to `workshop/` only, precaches the page, scripts, styles, fonts and icons
  (`VERSION` 'workshop-1') and fetches network first (4 s timeout), falling back to the cache, so it keeps working on weak
  venue Wi-Fi after one online visit. A deploy is picked up on the next online load; bump `VERSION` only to drop old caches.
- `tools/gen-workshop.py` regenerates `workshop/index.html` from the main page and rewrites the worker's shell list
  (between `// shell:start` and `// shell:end`). Run it after changing the main page's monitor section or file names.
- Tests: `test/workshop-ipad.e2e.mjs` (WebKit with touch at 820x1180, 1180x820, 1024x1366, 1366x1024 and 844x390: no
  sideways scroll, side column or stacked, 44 px targets, taps on the channels, Reveal, the Advance menu, Cp/Ce, Alpha
  dropout, Give ketamine, Quiz; a slider drag; focus mode; the manifest). It needs Playwright's WebKit, which does not run
  natively on Ubuntu 26.04 (libicu76): use the `mcr.microsoft.com/playwright:v1.56.1-noble` image locally; CI installs it.
  The slider drag is a mouse drag: Playwright cannot replay a real iOS finger drag on a range input.
  `test/workshop-page.e2e.mjs` checks the manifest, that the worker controls `/workshop/` but not the main page, and that
  the page and a `?case=` link load offline.

## Speed keys (25 Nov 2026)

- The owner found the speed slider did nothing on /workshop/: the main page's speed popover (`demo.js`) opened above the
  dock, which scrolls in the side column and clipped it, so taps never reached the slider. He asked for keys instead ("It
  should increase the speed of everything, except of course the EEG itself. I don't need a slider that is so precise, it
  can just be like six buttons").
- `ws-page.js` puts a row of six keys under the pause and clock row: 1x 3x 5x 10x 30x 60x (`aria-pressed`, 44 px), calling
  `setSpeed`; the popover is hidden on this page only (the main page keeps its slider). Cases start at 5x.
- Speed is the sim clock: engine, DSA, index, SEF, trends, pump and PK, Induce and Emerge, the case script, the timeline
  clock and quiz checkpoints all run on it; the raw EEG sweeps at real time. Quiz checkpoints are now checked every frame
  (`quiz.js`), so at 60x a question opens within about a sim second of its time.
- 60x on an iPad-class CPU: in Chromium with a 4x CPU throttle the sim clock holds 60x (60.1-60.3x); frames drop to about
  27-33 per second (p95 33-67 ms, a rare 117 ms frame, over the 100 ms step cap). At 6x throttle it still runs at 55-57x.
- Measured (wall time to BIS under 60, held 10 sim s; 1x / 10x / 60x): Induce (pump to 3.5) 136-139 s / 14.2-14.4 s /
  2.5-2.6 s; pump target 6 117-121 s / 11.4-11.8 s / 2.0 s.
- Test: `test/workshop-speed.e2e.mjs` clicks the real keys (layout at iPad and phone sizes, timings, DSA columns per second
  scale with speed while the raw EEG feed stays at 128 samples a second, 60x under a 4x throttle).

