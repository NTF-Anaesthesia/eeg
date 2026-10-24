# Status

Times are SGT. App status: `eeg/STATUS.md`.

## Now

- Split out of the NTF anaesthesia site repo on 24 Oct 2026. Repo checks, engine check and browser suites pass; the Worker is ready to deploy (cut-over moves eeg.anantf.com to it).

## Waiting on the owner

- Nothing yet.

## Next

1. Cut-over: deploy the Worker, check https://eeg.anantf.com/ and https://eeg.anantf.com/bis/.
2. Then `anantf.com/eeg/` and `/bis/` forward here (stub pages in the site repo).

## Recently done

- 24 Oct 2026: app copied here from the site repo (no history), own Worker, checks and docs.

## Decisions (dated, one line each)

- 24 Oct 2026: `eeg` (with `bis/`) gets its own repo and Worker (`eeg`) at eeg.anantf.com; the page's site chrome, fonts and icons moved into `eeg/assets/`, `eeg/fonts/`, `eeg/icons/` so it serves from its own folder.
- 24 Oct 2026: the Hind fonts also stay in the site repo's `eeg/fonts/` because the TCI pump loads them from there.
