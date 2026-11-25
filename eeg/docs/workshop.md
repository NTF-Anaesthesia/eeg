# Workshop tools (blinded reading, TCI pump, case files, quiz)

Part of the BIS to DSA / processed EEG notes. Index: [../NOTES.md](../NOTES.md). Added 25 Nov 2026 for a workshop segment on
reading the DSA and SEF95 with the number hidden. Files: `workshop.js`, `pump.js`, `cases.js`, `workshop.css`; the index masking lives in each skin.

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
  Nickalls & Mapleson 2003) and, with ketamine (relative 0-1, not a dose) and remifentanil (ng/ml), is set as a mix target that
  follows the engine's own effect-site lag and rules (remifentanil blunts the stimulus response).
- Induce sets Ce 3.5; Emerge sets every target to zero (propofol then falls by the model). Choosing another agent or a
  combination turns the pump off; manual depth works as before. The timeline saves and restores the pump; drug marks on the
  bar follow pump settings, not every step.
- Test: `test/workshop-pump.e2e.mjs`.

## Case files (`cases.js`, `?case=<id>`)

- A **Case** menu in a strip above the monitor, or `?case=tci|sevo|propket` (add `&blind=1` for blinded reading). A case runs
  a 5-minute awake pre-roll, starts a fresh timeline, sets the pump for its synthetic patient and plays at 5x; the timeline
  works inside it. Choosing no case stops it.
- Steps run on the story mechanism (`runStory`): `steps` on the story object, plus `pump` (pump targets), `act` (relaxant on or
  reversed with the page's own relaxant modes) and `ev`, a neutral event line shown instead of the caption while blinded.
- `tci` Propofol TCI (Eleveld, Ce 4 then 3.5 µg/ml): awake, induction, relaxant, maintenance, skin incision (alpha dropout, then
  18-Hz activity and SEF95 rising), treatment (remifentanil 3 ng/ml, Ce 4), maintenance, emergence.
- `sevo` Sevoflurane (end-tidal 2.4% induction, 1.8% maintenance, about 1 MAC at 45 years): the same phases.
- `propket` Propofol + ketamine: maintenance, then ketamine (relative 0.6) at an unchanged propofol target raises BIS (about 45
  to 60-65) and SEF95 and weakens alpha; it wears off over minutes before emergence.
- Expected directions (checked by `test/workshop-cases.e2e.mjs`): maintenance BIS 40-60; incision alpha dip, then SEF95 and BIS
  up; treatment brings them back; ketamine raises BIS and SEF95 with weaker alpha; emergence BIS above 75-80.
- The arousal patterns are the engine's existing stimulus rules, a teaching approximation; the cases are synthetic, not timings
  or doses to copy.
