# MSP Pump Selector — Internal PWA

A phone-installable version of the Pump Selection workbook: the **Selector**
(single duty-point lookup, mirrors the INPUT sheet) and **Tender** (multi-line
builder, mirrors the TENDER sheet). Covers all 59 series — Cast Iron, Noryl,
and Stainless Steel at 50Hz, plus the 10 Stainless Steel series at 60Hz — with
1,183 individual pump models and the exact same selection logic as the
workbook (same ladders, same interpolation, same alternates).

Works fully offline once installed. No accounts, no app store, no ongoing
cost.

## What's in this folder

```
index.html         the app
styles.css          styling
engine.js           selection logic (ported 1:1 from the Excel formulas)
data.js              the full pump catalogue (59 series / 1,183 models)
app.js               UI logic
manifest.json         PWA install metadata
service-worker.js     offline caching
icons/                app icons
```

## Deploy it (5 minutes, free)

A PWA has to be served over **HTTPS from a real URL** — that's an Android/iOS
requirement for "Add to Home Screen" and offline caching to work at all; it
won't work opening the file directly from your Downloads folder. Easiest free
options:

> **Before you publish, know what you are publishing.** This app ships the
> full catalogue as a plain-text `data.js` — all 1,183 models with heads,
> kW/HP and lengths. Anyone who opens the URL can read it, and so can search
> engines if the URL ever leaks. There is no login. If the catalogue is
> commercially sensitive, use Option C (intranet) instead.

**Option A — GitHub Pages**
1. Create a new repository and upload everything in this folder to it.
2. Repo Settings → Pages → Deploy from branch → `main` → `/ (root)`.
3. GitHub gives you a URL like `https://yourcompany.github.io/pump-selector/`.

> ⚠ **A private repo does not give you a private site.** On GitHub Free and
> Pro, the *repository* can be private but the published Pages site is still
> **public to anyone with the URL**. Access-controlled Pages requires GitHub
> Enterprise Cloud. The URL is unlisted, not protected.

**Option B — Netlify Drop**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag this
   whole folder in.
2. You get a live HTTPS URL immediately. (Free tier, no account required for
   a one-off drop; sign up if you want it to stay editable.)

**Option C — your own web server / company intranet**
Copy the folder as-is to any HTTPS-served static path. No build step, no
server-side code needed.

## Installing it on a phone

Once it's live at a URL:

- **Android (Chrome):** open the link → menu (⋮) → **Add to phone / Install app**.
- **iPhone (Safari):** open the link → Share button → **Add to Home Screen**.

It then behaves like a normal app: its own icon, opens full-screen, works
with the phone offline (e.g. no signal at a well site).

## Updating the data later

If the catalogue changes, regenerate `data.js` from the workbook and replace
that one file — everything else stays the same. Ask Claude to do this next
time the workbook is updated, referencing this app.

## Notes / known limitations carried over from the workbook

- The "Any" bore-size ladder for Stainless Steel has one pre-existing quirk
  inherited from the workbook: MSP610 can never be reached as a primary pick
  under "Any" (it's shadowed by MSP414's wider range). It's still reachable
  under "6"+". Flagging this in case you'd like it changed — it's a one-line
  fix in `engine.js` if so.

## Languages

The interface runs in **English, Turkish, Arabic and Spanish**, picked from the
`EN/TR/AR/ES` selector in the top bar. The choice is remembered per device; on
first run the app follows the phone's own language and falls back to English.

Arabic switches the whole layout to **right-to-left** (`dir="rtl"`). Pump codes,
numbers and unit symbols stay left-to-right inside Arabic text — they are
wrapped in `<bdi>` so `MSP610-07` can never render as `07-MSP610`.

What is **not** translated, by design:
- Model codes and series tags (`MSP610-07`, `MSP 610`) — identical in every market.
- SI unit symbols (`m`, `kW`, `HP`, `mm`, `m³/h`, `L/s`) — international symbols,
  not words.
- Frequencies (`50Hz`, `60Hz`).
- The values the engine keys on: material names, size codes, series tags. Only
  their **labels** are translated, so selection logic is completely unaffected —
  verified that all four languages return the same model for the same duty point.

To add a language: add an entry to `LANGS` and a matching block to `STRINGS` in
`i18n.js`, then add an `<option>` to the picker in `index.html`. Every language
must define the same key set; missing keys fall back to English rather than
showing a blank.

## Changelog

- **Fixed digits entering backwards**: typing `50` produced `05`. The screen
  re-rendered on every keystroke, which destroyed and rebuilt the `<input>`;
  the caret-restore that followed cannot work on `<input type="number">`,
  because the spec makes `selectionStart` null and `setSelectionRange()` throw
  `InvalidStateError` — so the caret silently reset to position 0 and each new
  digit landed in front. The computed output is now split from the form
  (`renderResultsHTML` / `renderHintHTML`, `lineOutputs`), so typing refreshes
  only the results and never touches the input. Fixed on both the Selector and
  the Tender screens.
- **"Length" is now "Pump Length"** in all four languages.
- **Top-bar title dropped the "Selector" word** — the tab name already appears
  directly beneath it. Reads "MSP Pump / Selector", and in Spanish the shorter
  title no longer needs to ellipsise.

- **Four languages (EN/TR/AR/ES)**: added `i18n.js` with a `t()` / `tn()`
  lookup (55 keys per language) and a language picker in the top bar. Arabic
  brings full RTL: mirrored layout, `<bdi>` isolation for technical strings, no
  uppercase/letter-spacing (Arabic has no capitals), and logical margins so
  units sit correctly in both directions. The top bar's title now shrinks with
  an ellipsis — Spanish is long enough to have overlapped the controls
  otherwise. Selection logic untouched and confirmed identical across all four.

- **Whole logo, right side of the top bar**: the bar shows the **complete**
  logo — droplet, `msp` wordmark and "Pumps & Motors" tagline — not just the
  droplet, in white at 30x59px on the right, with the frequency pill to its
  left. Verified at 375px phone width: title 18–170, pill 236–286, logo
  298–357, no overlap and no horizontal scroll.
  The **app icons are the droplet only** and are deliberately different: the
  full logo is ~2:1, so squeezing it into a square icon shrinks it until the
  tagline is unreadable at 48px. Mark-only fills the square properly. Icons
  and bar are both generated from the customer's glossy master
  (`icons/msp-logo-source.png`, from a 4096px transparent PNG).
  Gloss is flattened to white in both places — metallic gradients are not
  resolvable at 30px on navy, nor at 48px as an icon.
- **Branding + empty start**: the real MSP mark now appears in the top bar
  (white, so it reads on the navy) and the app icons are generated from the
  logo — a white droplet on navy `#1B3A6B`, matching the app's theme colour,
  with a maskable variant whose artwork stays inside the 80% safe zone
  (verified: 184.2px corner radius against a 204.8px safe radius).
  The mark is tall and narrow, so it is scaled by height rather than fitted
  to a square box — box-fitting left it filling only ~31% of the icon width
  and it washed out at 48px. The Selector now **starts empty**:
  no material, bore, frequency, Q or H is preselected, and no model is shown
  until all five are set. The plate lists what is still missing. Selection
  logic is unchanged — verified that a completed duty point returns exactly
  the same models as before (Stainless/6"+/50Hz, Q=12, H=50 → MSP610-07;
  same input at 60Hz → MP617-04).
  Selector state key bumped to `msp_selector_state_v2` and the service worker
  cache to `msp-pump-selector-v2`, so existing installs pick the change up
  instead of restoring an old preselected state.
- **Previous update**: pulled in the corrected 60Hz catalogue — fixes the
  MP8125-06-TT data point (was 127, now 227, in line with its neighbors) and
  normalizes model naming across MP646/660/877/895/8125/8160/10215 to a
  consistent `-NN` stage format, so "Stages" now displays correctly for
  every 60Hz model instead of showing "—" for trim variants.
