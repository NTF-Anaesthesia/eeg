# Workshop tools (blinded reading, TCI pump, case files, quiz)

Part of the BIS to DSA / processed EEG notes. Index: [../NOTES.md](../NOTES.md). Added 25 Nov 2026 for a workshop segment on
reading the DSA and SEF95 with the number hidden. Files: `workshop.js`, `workshop.css`; the index masking lives in each skin.

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
