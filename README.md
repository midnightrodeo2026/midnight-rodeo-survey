# Midnight Rodeo · Pre-Launch Roster Survey

Roster survey site for the Horde guild **Midnight Rodeo** (WoW Forever).
No build step: plain HTML, CSS and JavaScript.

```
index.html          Landing board, survey, confirmation, Council (leadership) view
styles.css          Theme (blood red / antique gold / charcoal), responsive layout
config.js           <- EDIT THIS: classes, specs, roles, targets, professions, timezones, Supabase keys
store.js            Storage adapters (Supabase / Claude artifact db / local demo)
app.js              UI, validation, summaries, CSV export
logo.webp, logo-sm.webp  Guild crest
supabase-schema.sql Tables + row-level security
```

## Pages

| Hash | What it shows |
|---|---|
| `#home` | Masthead, **Saddle Up** start button, live roster board (responses vs goal, role targets, class tally, latest riders) |
| `#survey` | 7-section survey with progress bar, step navigation, validation, review screen. Drafts autosave in the browser. |
| `#done` | "YOU'RE ON THE BOARD." confirmation ticket |
| `#council` | Leadership only: KPIs, roster gaps, role vs target, class/spec counts (main + flex), professions, availability heatmap in server time, roster preference, interests, commitment, full response table, CSV export, editable targets |

## Updating classes & specs for WoW Forever

Everything lives in `config.js → classes`. Each spec lists the roles it can fill; the survey greys out roles a spec can't do, and the Council view uses the first role for flex math.

```js
{ key: "paladin", name: "Paladin", color: "#F48CBA", enabled: true, specs: [
  { key: "holy", name: "Holy", roles: ["Healer"] }, ... ] }
```

- Rename a spec: change `name` only. Keep `key` stable once responses exist.
- Hide a class: `enabled: false`.
- A hybrid spec: `roles: ["Melee DPS", "Tank"]`.

## Stored record (one per rider)

```json
{
  "v": 1, "submittedAt": "2026-09-24T22:00:00Z",
  "character": "Grimtusk", "discord": "grimtusk",
  "main": { "cls": "warrior", "spec": "protection" }, "role": "Tank",
  "commitment": "locked|strong|flexible|open",
  "flex": { "cls": "druid", "spec": "feral-tank", "role": "Tank" },
  "offspec": "yes|some|no",
  "interests": ["Raiding", "Dungeons"], "roster": "core|regular|casual|bench|pvp|social",
  "tz": "America/Puerto_Rico", "tzOffsetMin": -240,
  "days": ["Mon", "Tue"], "start": "19:00", "end": "23:00",
  "professions": ["Mining", "Blacksmithing"], "profChange": "yes|maybe|no",
  "notes": ""
}
```

Keys (not display names) are stored, so renaming labels never breaks old answers. The public board only ever receives `character, cls, spec, role, submittedAt`.

## Where answers are saved

`store.js` picks the first backend that works:

1. **Supabase** when `config.js → supabase.url / anonKey` are filled. Run `supabase-schema.sql`, add leadership emails to `leaders`. Leaders sign in with an emailed link on `#council`.
2. **Claude artifact storage** when the page runs as a published Claude artifact. Anyone with Contributor access can submit; only Editors/Owner see the Council view.
3. **Demo mode** everywhere else (opening the file locally). Saves only in that browser and shows 12 sample riders so you can see the summaries working.

## Hosting (GitHub Pages)

Push this folder to a repo, enable Pages on the main branch, done. For real shared answers, set up Supabase (free tier is plenty) first.
