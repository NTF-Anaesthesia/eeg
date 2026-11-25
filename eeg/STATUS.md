# BIS to DSA status

Short and current. Lasting rules go in `NOTES.md`. Update with `/save-state`.

Last updated: 2026-11-25. Live at eeg.anantf.com (anantf.com/eeg/ and /bis/ forward here). Nothing in flight.

## Now

Each session keeps its own line in `status/<session>.md`. Read them before starting; edit only yours.

## Waiting on the owner

Clinical read-through of the wording and BIS ranges, and a check of each skin against a real unit: ask the owner. Known
gaps per skin are in `docs/skin-medtronic.md`, "The three monitor skins at a glance".

## Next (ideas, not agreed)

1. More states: nitrous oxide, opioid-heavy, hypothermia.
2. DSATrainer-inspired additions, built our own (CSA and power-spectrum panels, ECG R-wave bleed-through case, multitaper
   option, burst-suppression parameters).
3. IntelliVue: alarm sounds, SQI triangle / EMG bar (Release L+).

## Recently done

- Workshop page uses the BIS Advance, NUHS page style, bigger header and font, neutral quiz names (25 Nov 2026;
  `docs/workshop.md`): the owner's change the same day; the generic monitor is gone. Quiz case menu shows Case A-D until the
  reveal; added-drug event lines say "Drug given.".
- Unbranded workshop page at eeg.anantf.com/workshop/ and ketamine and dexmedetomidine lines on the TCI pump (25 Nov 2026;
  `docs/workshop.md`): a generic monitor (DSA with SEF95, real-time EEG, SQI/EMG/SR, masked index, unilateral or bilateral),
  cases, quiz and pump with no device branding; ketamine (Domino) and dex (Hannivoort) bolus/load and infusions with Ce; new
  `propdex` case. Clinical read-through of the doses, assumed ke0 values and the Ce-to-effect mapping: ask the owner.
- Raw EEG strip at real time at any sim speed (25 Nov 2026; `docs/workshop.md`): cases at 5x no longer race the trace; the DSA,
  trends and index still run at 5x.
- Workshop tools for a blinded DSA and SEF95 reading session (25 Nov 2026; `docs/workshop.md`; #4-#7): blinded mode
  (`?blind=1`, Reveal), a built-in propofol TCI pump ported from the anantf-site TCI emulator (Eleveld, Schnider, Marsh; with
  sevoflurane, ketamine and remifentanil), three scripted cases (`?case=tci|sevo|propket`), a checkpoint quiz with a score
  (`&quiz=1`) and text NTFGH / NUHS banners (`?workshop=1`). Clinical read-through of the case and quiz notes: ask the owner.

- Awake DSA no longer all blue (eye-movement delta, frontal theta, beta band); SedLine control dock no longer
  overlaps on laptops (19 Oct 2026; `docs/processed-eeg-redesign.md`).

- Philips IntelliVue screen, case timeline (jump 1, 5, 15 min; tap the bar), Medtronic and Advance DSA colours, SedLine
  EEG flicker fix, device cases around each monitor (#585, #588, #591, #595; 15 Oct 2026).
- Medtronic BIS Advance and Masimo SedLine screens rebuilt as near-clones; fidelity pass on the Medtronic screen; final
  integration with all checks green (14 Oct 2026). What is cloned, inferred or unknown per skin: `docs/skin-medtronic.md`.
- Two-sided screens with a right-hemisphere engine, effect-site lag, relaxant and remifentanil rules, new scenarios, a
  "What the trials say" table, graphs-blank-on-phones fix (#495), first version (12-14 Oct 2026).
