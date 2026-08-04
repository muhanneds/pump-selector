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

## Changelog

- **Branding + empty start**: the real MSP mark now appears in the top bar
  (white, so it reads on the navy) and the app icons are generated from the
  logo — brand blue `#0A75BB` droplet on white, with a maskable variant whose
  artwork stays inside the 80% safe zone. The Selector now **starts empty**:
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
