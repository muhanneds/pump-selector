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

## Putting it on the company website

The same URL serves both layouts — there is no separate desktop build to keep in
sync. Below 900px it is the phone app; at 900px and above the shell widens to
1080px, the tab bar moves up under the header as real tabs, and the Selector
splits into form-left / result-right with the result pinned while the form
scrolls. Tender stays a single 760px column, because a full-width line is
unreadable.

**Option 1 — link to it.** Simplest, and the only one that lets visitors install
it on their phone:

```html
<a href="https://muhanneds.github.io/pump-selector/" target="_blank" rel="noopener">
  Open the MSP Pump Selector
</a>
```

**Option 2 — embed it in a page.** GitHub Pages sends no `X-Frame-Options`, so
framing works:

```html
<iframe src="https://muhanneds.github.io/pump-selector/"
        title="MSP Pump Selector"
        style="width:100%; max-width:1080px; height:860px; border:0; border-radius:12px"
        loading="lazy"></iframe>
```

Give the frame at least **900px of width** or it will render the phone layout
inside your page, and around **860px of height** so the result panel is not cut
off. An iframe cannot be installed to a home screen — pair it with Option 1 if
you want visitors to be able to install it.

**Option 3 — host it yourself.** Copy this folder to any HTTPS path on your own
site (e.g. `/tools/pump-selector/`). All paths are relative, so it works from a
subdirectory without changes.

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

- **Motor kW corrected across ~120 models** (Cast Iron, Noryl and Stainless
  Steel 4"/6", plus two 60Hz models) — pulled from a fresh spreadsheet
  export, `data.js` only. Every corrected value now matches its own HP figure
  at the standard 0.746 kW/HP ratio (checked programmatically, zero
  exceptions); previously several were off by roughly 2×. `engine.js` is
  unchanged this round.
  ⚠ **Same recurring defect as last time, caught and fixed again:** the
  export re-introduced the trailing `null` in the *flow* arrays of MSP625
  and MSP8125, which breaks both series' reachability for every realistic
  duty point (see the earlier changelog entry for why). Confirmed nothing
  else in those two series changed — the fix restores them to byte-identical
  values to before. Worth mentioning to whoever regenerates these exports:
  this is the second time this exact cell has come back empty.

- **HP/Length moved to the top-right corner**, on the same line as the model
  name, instead of a line below — mirrors correctly in RTL (moves to the
  top-left). Model name truncates with an ellipsis to make room on long
  codes, verified at 375px with a 12-character code.
- **Added Safety margin to Tender lines** — previously Selector-only. Each
  line now has its own safety margin, correctly feeding into its own design
  head calculation (verified it shifts the selected model, not just cosmetic).

- **Closed line: HP instead of kW, `L=` prefix on length**, and forced to one
  line (`white-space:nowrap` + ellipsis) — same treatment as the model-name
  line above it.
- **Head H can now be entered in feet**, the same click-to-toggle pattern as
  the L/s flow unit, on both Selector and every Tender line, shared and
  persisted. Every stored H and every engine call stays in metres always —
  the pump curves themselves are digitised in metres — the toggle only
  converts the Head H field's own display/input. Achieved head, design head
  and alternate head in the results stay in metres, matching how the flow
  toggle already left the result plate's own numbers untouched. Verified:
  toggling never changes the selected model; typing a new value in feet
  stores the precise metre equivalent; caret-safe on both screens.

- **Closed line cards now also show Motor and Pump Length**, alongside the
  entered Q/H, as a third compact line — only when there's a matched model
  to show it for. Kept caret-safe: the line is created/updated/removed as
  the duty point changes while a card is open and being typed into, without
  ever touching the input element itself.

- **Tender screen revised.** Four changes:
  - **Closed line cards now show what you entered** (`Q=12.00 m³/h · H=50.00 m`)
    instead of the computed result — the model name stays visible, but the
    achieved head/price is only shown once you open the card. Applies to
    every state, including "Out of range" and "No match."
  - **Motor power and Pump Length are now a dedicated two-column row** when a
    card is open, instead of buried in one small mono-font meta line.
  - **Fixed Material/Bore/Freq alignment.** The three `<select>` elements had
    *no CSS at all* — no width, no consistent box — so each one shrank to fit
    its own selected text and the row scattered unevenly across the page.
    They're now styled like every other input in the app and stretch to fill
    even columns.
  - **Flow can now be entered in L/s.** A click-to-toggle unit pill sits next
    to the Flow Q field's unit label, on both the Selector and every Tender
    line — the same choice everywhere, persisted like the language setting.
    Internally every stored value and every call into the engine stays in
    m³/h always; the toggle only converts at the input/display boundary, so
    switching units never changes a computed result, only how the numbers are
    shown. Verified: toggling mid-session doesn't alter the selected model;
    typing a new value in L/s stores the exact m³/h equivalent; toggling back
    shows the precise original number, no rounding drift.

- **New Noryl 6"+ series, "Any" ladder redesign, data corrections.** Source:
  a fresh export to `Desktop\projects\MSP_Pump_Selector_NoPricing`.
  - Added **MNP612** as a new primary pick, Q up to 12 m³/h, ahead of MNP618
    in the 6"+ ladder. Its own flow/head curve and the five downstream Noryl
    cutoffs (618/628/638/645/660) all widened to match.
  - **"Any" is no longer a mechanical concatenation** of the 4"-only and 6"+
    ladders. It's now its own hand-built ladder that skips MNP415/MSP414
    entirely, because under the old concatenation they sat just above the
    first 6" rung and made the recommended bore zigzag 4"→6"→4"→6" as flow
    increased. Both stay fully reachable via the dedicated 4"-only bore
    choice — confirmed neither is ever returned as a primary pick under
    "Any" anymore, in any language, and both still work under "4\" only".
  - Cast Iron's top cutoff (MCP11400) tightened from 420 to 414 m³/h.
  - `MCP 643-32` had a `null` pump length in the data; now correctly 4020 mm.
  - ⚠ **Caught and fixed before deploying:** the export also appended a
    **trailing `null` to the *flow* arrays** (not just heads) of MSP625 and
    MSP8125 — every model in both series, same single incomplete edit. That's
    a different kind of null than the ones the app already handles: a null
    inside `heads` correctly means "this stage doesn't reach this flow," but
    a null as the *last flow value* breaks the range check `Q > flows[n-1]` —
    JS compares `null` as `0`, so it evaluated true for almost any real Q,
    making both series return no match for **every realistic duty point**,
    including Q in (110, 135] where MSP8125 is a genuine primary pick, not
    just an alternate. Dropped that trailing null from both series' flow and
    head arrays rather than deploy it — confirmed byte-identical to their
    pre-update values, and confirmed every other series matches the new
    export exactly, so nothing else was touched by this fix. Worth flagging
    to whoever maintains the spreadsheet: looks like an in-progress edit
    (a new column started, never filled in) rather than an intentional cut.

- **Updated Cast Iron selection ladder** (pulled from a fresh spreadsheet
  export, `engine.js` only — `data.js` is byte-identical to before). Replaces
  the old min/max band list, where earlier bands could shadow later ones from
  ever being reached, with a single ascending-cutoff ladder built from the
  5"/6", 7"/8" and 9"/10" bore families, so where families overlap in flow the
  bigger bore wins as primary. 60Hz cutoffs also revised. Confirmed the new
  ladder is genuinely in effect (Cast Iron at Q=90 m³/h now returns MCP790-03,
  not the old MCP766) and that Stainless Steel results are unaffected (Q=12,
  H=50 still returns MSP610-07 at 50Hz and MP617-04 at 60Hz).
  ⚠ One thing worth checking against the spreadsheet: the source changelog
  for this export says "MCP690 retired from the active ladder," but the
  ladder array itself still lists it — reachable as primary for a narrow
  window, Q > 100 up to 105 m³/h. Ported the code as delivered; flagging the
  mismatch between that claim and what the ladder actually does in case it
  wasn't intentional.

- **Redesigned the desktop layout.** The first pass just widened the phone
  screen, which read as a phone UI stretched across a monitor — the reported
  complaint. It's now designed for the width: gradient header with a teal
  accent line, tabs as an underlined strip, the result panel rendered as an
  instrument panel (44px model number, vertical rules between Motor/HP/Pump
  Length like a spec sheet), the whole shell floated as a card on a grey page
  background with a real shadow, and visible focus rings for keyboard users.
  Still nothing below 900px touched — confirmed the phone build's shadow,
  background and topbar gradient are all still `none`.

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
