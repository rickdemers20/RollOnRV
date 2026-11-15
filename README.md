# RollOnRV — Your Rig's Logbook

A sellable RV maintenance app. Warm paper-logbook feel (cream pages,
handwriting headings, DONE stamps), trip-ready home screen. Local-first,
offline, no account, no server, no AI. Free tier complete (v1).

**Status:** v1 built and tested. NOT submitted anywhere. Do not submit to
the App Store until the Bible app's Apple Guideline 4.3 thread resolves.

## What v1 does (free tier)

- **First-run setup** — add your rig (year/make/model/nickname/type,
  odometer, generator hours, tire pressures) or import a task list from a
  CSV. The app ships empty; there is no seed data.
- **Home, trip-ready** — "Rolling out soon?" hands you the pre-trip
  walk-around; due items in plain words ("549 miles to go", "due in
  3 days"); rig numbers; spent this year.
- **Logbook** — ruled pages by month, every job as a line with date,
  mileage, cost, and a DONE stamp. Tap a line for the full ledger entry.
- **Photo-first service log** — the camera opens first; snap the receipt,
  part label, or odometer. Parts with part numbers and costs; a note to
  your future self; "Mark it done — stamp the page."
- **Checklists** — Before You Roll (pre-trip), Arrival Set-Up, Departure
  Tear-Down, Winterize, De-Winterize. Big rows, progress count, rig's own
  tire pressures on the item itself. Works with no signal.
- **Tires by DOT age** — enter each DOT code once; flags at 5 years
  ("getting old") and 7 ("replace"), bar toward the 10-year hard limit.
- **Costs** — totals by year and category, cost per mile.
- **Reminders** — due by date, mileage, and generator hours; snooze a
  week; local notifications on native (date-based, next 30 days).
- **CSV import/export** — import a task list (flexible headers: task,
  category, due date, due mileage, due gen hours, every-months, note);
  export tasks and the full logbook.

## Premium (NOT in v1 — structure only)

Ownership PDF report, document vault, parts & warranty tracking,
multi-rig, backup/sync. Decided prices: $3.99/mo or $29.99/yr, lifetime
$79.99. The code has a single `PREMIUM` info section (More screen) and no
paywalls, no store products, no subscription code. Premium is added in a
later step, after dogfooding.

## Run / preview

```sh
# Web preview (any static server):
python3 -m http.server 4173 --directory www
# open http://localhost:4173

# Tests (jsdom harness, fake data only):
bun install   # first time; npm install fails on this VM (chown blocked)
npm test      # or: node tests/test.js
```

## Native (Capacitor 8)

```sh
npx cap sync        # copies www/ into ios/ and android/
npx cap open ios    # needs a Mac + Xcode
npx cap open android # needs Android Studio / SDK
```

iOS and Android projects are scaffolded (`ios/`, `android/`) and synced.
Plugins registered: Camera, Filesystem, LocalNotifications. Native
compilation was NOT verified on this VM (no Xcode, no Android SDK) — that
happens on a Mac / in CI before TestFlight.

## Data

Everything lives on the device in localStorage under `rollonrv.v1`
(rigs → tasks → service logs → tires → checklist runs). Photos are
downscaled (max 1024px, JPEG ~0.8) and stored with the log entry; the app
warns before localStorage gets full. No account, no cloud, no tracking.

## Layout

```
capacitor.config.json   appId com.rickdemers.rollonrv, webDir www
www/                    index.html, styles.css, app.js, manifest.json, fonts/
resources/              icon.svg / splash.svg (original mark)
ios/ android/           Capacitor native projects (synced)
tests/                  test.js (jsdom harness) + sample-tasks.csv (fake data)
BUILD_REPORT.md         what was built, verified, and what remains
```

## What to avoid (standing rules)

- No "Keeper", no auto-researched plans, no Schedule/Focus Mode, no
  "Rig Binder", no Essentials/Pro split, no RVKeeper copy of any kind.
- No AI-generated truck/RV images, no stock photos, no copyrighted text.
- Never hard-code Rick's rig (2021 Newmar Bay Star 3626, 24,451 mi,
  284 gen hrs) — the app ships empty; he enters his own rig at first run.
