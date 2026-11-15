# RollOnRV v1 — Build Report

**Date:** Sat Nov 14, 2026
**Location:** `~/workspace/rollonrv-app/`
**Status:** v1 free tier built and tested. NOT submitted anywhere.
No App Store / Play Console artifacts created. No deploy to rickdemers.com.

## What was built

Capacitor 8 phone app (same pattern as the Bible study app: single-page
app in `www/`, Capacitor config, local storage). iOS + Android projects
scaffolded and synced. Local-first, offline, no server, no AI.

**Screens (all from the approved mockups, all working):**
- First-run setup — add rig or import CSV; ships empty.
- Home — "Rolling out soon?" trip-ready card, due items in plain words,
  rig numbers, spent this year.
- Logbook — ruled pages grouped by month, DONE stamps, running totals;
  tap a line for the full ledger entry.
- Log a job — photo-first (camera on native, file picker on web),
  parts with part numbers + costs, note, "Mark it done — stamp the page"
  (animated stamp, advances the linked task's next due).
- Checklists — Before You Roll (14 items), Arrival Set-Up, Departure
  Tear-Down, Winterize, De-Winterize. Progress count, rig PSI on the tire
  item, finish stamps DONE. Works with no signal.
- Tires — DOT code → age in plain words, flags at 5 / 7 years, bar to
  the 10-year hard limit, spare gets no pass.
- More — costs by year/category + cost-per-mile, rig edit, CSV
  import/export, premium info drawer (no paywall), about + erase.

**Data model:** rigs → tasks (interval months/miles/gen-hours + next-due
thresholds) → service logs (cost, mileage, gen hours, parts, photos) →
tires (DOT codes) → checklist runs. localStorage key `rollonrv.v1`.

**Decisions made while building:**
- Photos stored as downscaled data URLs with the log entry (max 1024px,
  JPEG 0.8, 12 per entry, ~4.5 MB soft cap with a warning). One code path
  for web + native; native camera via Capacitor Camera plugin.
- Premium is info-only in v1: the More screen lists what's coming later
  with no prices and no buttons. Advertising prices for products that
  don't exist yet would be dishonest; prices stay in the plan file.
- Fonts (Newsreader + Caveat, as in the mockups) are bundled locally in
  `www/fonts/` so the app works fully offline; Georgia/cursive fallbacks.
- Icons/splash are an original hand-drawn mark (cream page, red stamp
  border, serif R) — no stock art, no AI images.
- Setup-form placeholders are generic examples (Tiffin / Allegro), NOT
  Rick's rig. The app ships empty; his rig data is never hard-coded.

## Verification (exact commands, all on this VM)

```sh
cd ~/workspace/rollonrv-app
node --check www/app.js            # app.js syntax OK (1,125 lines)
npm test                            # node tests/test.js
# 50 passed, 0 failed
npx cap add ios                     # [success] ios platform added!
npx cap add android                 # [success] android platform added!
npx cap sync                        # Sync finished; 3 plugins found
#   (camera 8.2.6, filesystem 8.1.5, local-notifications 8.3.1)
npx @capacitor/assets generate      # android: 87, ios: 10, pwa: 7
python3 -m http.server 4173 --directory www
#   curl: index 200 (9,004 B), app.js 200 (67,978 B), styles 200 (10,920 B)
```

**Test harness** (`tests/test.js`, jsdom, clearly fake data only):
first-run setup → add rig → due math (overdue/soon/ok/miles-to-go) →
add task via sheet UI → log a job via sheet UI (stamp, odometer advance)
→ log a job with photo tied to a task (task advances, photo renders) →
pre-trip checklist 14/14 with DONE stamp → DOT age flags (2yr good /
6yr old / 8yr replace / bad code rejected) → cost-per-mile math
($57.50 over 400 mi) → CSV import (3 tasks) + export round-trip +
rejection of a header-less file → save/load round-trip → all five
screens render. Plus static guardrails: no "Keeper", no Schedule/Focus
Mode, no Rig Binder, no store/paywall/subscription code, no AI/Gemini,
no hard-coded real rig, no stock-image references, no seed data.

**Install note:** `npm install` fails on this VM (root + chown blocked by
the sandbox, EPERM on node_modules). `bun install` works (194 packages).
Recorded in README so the next install doesn't re-learn it.

## What was NOT verified / NOT built

- **Native compilation NOT verified** — no Xcode and no Android SDK on
  this VM. `cap add` + `cap sync` succeed and the web assets are copied
  into both native projects, but no IPA/APK was produced. First native
  build happens on a Mac / in CI.
- **Camera capture on a real phone NOT tested** — the code path is
  guarded (Camera plugin when native, file picker otherwise) and the
  downscale degrades gracefully, but only a device test proves it.
- **Local notifications NOT tested on device** — scheduling code is in
  place (date-based dues, next 30 days, 9 AM); in-browser it is a no-op
  and the in-app due list is the reminder there.
- **Premium NOT built** — no store products, no paywall, no ownership
  PDF, no vault, no multi-rig, no backup/sync. Structure is ready (the
  More-screen drawer + plan section 7).
- **No TestFlight, no App Store listing, no submission** — gated on the
  Bible app's Apple 4.3 thread resolving, per the plan.

## What remains (in plan order)

1. Dogfood on Rick's own rig — import his 19 tasks (CSV import is ready),
   use it for real maintenance, fix what's annoying.
2. Premium: ownership PDF, document vault, parts & warranty, multi-rig,
   backup/sync + StoreKit products + sandbox purchase test in TestFlight.
3. TestFlight beta with real RVers, gather + apply feedback.
4. App Store listing + submission — ONLY after the Bible 4.3 thread resolves.

## Import fix (Nov 14, after Rick's first preview try)

His RVKeeper plan export (174 tasks) failed with "Couldn't find a task column" — the file puts two title rows above the header and uses its own column names/dates ("Task Title", "Component", "Interval (Days)", "Oct 12, 2026"). The importer now scans for the header row, matches columns by keyword (specific first), parses "Oct 12, 2026"-style dates, converts interval days to months (90 days = 3 months), and keeps "Last Completed" as lastDoneAt; "Usage-based" rows keep their miles/hours thresholds with no date. Verified against his real file: 174 imported, 0 skipped, spot-checked rows map exactly. Regression tests added (plan-export section, 5 checks) — suite is now **55 passed, 0 failed**.

## Custom checklist items (Nov 14, Rick's idea — "keep the basics")

An "Add your own item" row at the bottom of every checklist run: plain text, checks off like the rest, saves to that list for the next trip, and your own items can be taken back off with an ×. Built-in items are never editable. Per rig, free tier. Load guards old saves that lack the customItems list. Tests added (section 5b, 8 checks) — suite is now **63 passed, 0 failed**.

## Two-tap delete confirm (Nov 14, Rick's catch)

The × on a custom checklist item sat where the thumb already taps, so a mis-tap could wipe an item. First tap now only arms it — the × turns into a red "Delete?" — and the second tap deletes. Tapping any item or adding a new one disarms it. Tests added (arm + still-stored + second-tap) — suite is now **65 passed, 0 failed**.

## DOT code typing fix (Nov 14, Rick's catch)

Typing a DOT code lost focus after every digit — you had to tap the field again for each number. Cause: the field's input handler re-rendered the whole tire sheet on every keystroke, destroying the field you were typing in. Fix: typing now only updates the little age preview under the field in place; the field itself is never rebuilt, so the keyboard stays up and all four digits land in one go. Tests added (section 6b, 4 checks) — suite is now **69 passed, 0 failed**.

## Custom groups inside checklists (Nov 14, Rick's idea)

Inside any checklist run — he asked for it on Before You Roll — an "＋ Add a custom group" button opens a sheet to name a group (as many as you want, per rig, free tier). Each group gets its own items with its own add-item row; group items check off, count toward the total and persist exactly like the built-ins. Same deal on delete: two-tap — first tap arms it ("Delete?"), second tap takes it off — for both items and whole groups. The flat "Your own items" list from earlier today still works alongside. Tests added (section 5c, 11 checks) — suite is now **80 passed, 0 failed**.

## Add-a-group button moved to the top (Nov 14, Rick's catch)

Rick couldn't see the "＋ Add a custom group" button — it sat at the very bottom of the run screen, below all 14 items. Moved it to right under the progress bar at the top, so it's the first thing you see when you open a checklist. No behavior change; tests still **80 passed, 0 failed**.

## Add a task button unreadable in dark mode (Nov 14, Rick's catch)

The "+ Add a task" button on the Logbook screen uses the ink color as its fill — and in dark mode the ink turns cream, while the button text stays white. White on cream, unreadable. Fixed with a dark-mode override: deep navy fill, cream text. Light mode unchanged (navy fill, white text). Static guardrail test added — suite is now **81 passed, 0 failed**.

## Rig silhouettes (Nov 14, Rick's idea)

The home screen now shows a hand-drawn line-art silhouette of your rig's shape — Class A bus box, Class B van, Class C with the bunk over the cab, travel trailer with hitch, fifth wheel with the gooseneck step, truck camper, or a plain box for Other. Pick the type in setup or in "Your rig" and the drawing updates live as you change it. Pure SVG paths, no photos or AI images. Suite is now **86 passed, 0 failed**.

## Light-only colors (Nov 14, Rick's catch)

The preview was following the phone's dark mode, which turned the whole page dark navy with red accents — it looked like the SRM site, not the cream logbook we started with. Locked the preview to the light cream pages (a Day/Night switch can come later, like the Bible study). Suite still **86 passed, 0 failed**.

## Add a custom group moved to the picker (Nov 14, Rick's correction)

Rick wanted the button on the Checklists picker page, not inside a running checklist. Moved: the picker now has "＋ Add a custom group" at the top — tap it, name it, and a whole checklist of his own appears as a card alongside the five built-ins, with Start / Keep going / Start over and a two-tap × to remove it. It starts empty; he fills it in from its run screen with the "Add your own item" row. The button is gone from inside runs; groups made earlier inside a list still show and still work. Suite is now **92 passed, 0 failed**.

## Rig photo (Nov 14, Rick's idea)

Tap the picture on the home screen (or the rig sheet) and it offers camera or photo library — your own rig's photo shows on the home screen instead of the line drawing. The silhouette stays as the fallback until a photo is set, and removing the photo brings it back. Photos are downscaled like log photos and stay on the phone, nothing uploads. Suite is now **100 passed, 0 failed**.

## Night mode button (Nov 14, Rick's idea)

A "🌙 Night mode" button on the More screen (next to Start over) — same pattern as the Bible study. One tap turns the book dark for the night, one tap brings the light cream back. Light stays the default and the phone's dark mode never flips it on its own; the choice is saved per device. The old white-on-cream button bug is fixed inside dark mode too. Suite is now **108 passed, 0 failed**.

## Tied task fills in "What was done" (Nov 14, Rick's catch)

Logging a job from a task made him retype the job name even though the task was already tied. Now the task's name fills the field in automatically — tap "Log this job" and the name is already there, just save. Type only to add detail, and typed wording is never overwritten. Picking a task from the dropdown fills it too, and saving with the field cleared falls back to the task name. Suite is now **119 passed, 0 failed**.

## Due pill ran into the task title (Nov 14, Rick's catch)

On "Change Engine Oil and Filter" the due pill sat on top of the title. Cause: far-out tasks joined date + miles + hours into one long pill ("due Sun, Dec 27, 2026 · 29,444 miles to go"), which squeezed the title to a sliver. Two fixes: the pill now shows the nearest due factor only, like the "due soon" pills already did (full cadence still shows on the task's own sheet), and rows now wrap so a long pill drops to its own line instead of ever colliding with the title. Suite is now **127 passed, 0 failed**.

## "(Type Unknown)" stripped from imported titles (Nov 14, Rick approved)

Six tasks from the plan export carried "(Type Unknown)" twice in the name. The import now strips it on the way in, and books already loaded get the same cleanup the next time they open — "Clean Slide Box and Sweeps (Type Unknown) (Type unknown)" simply reads "Clean Slide Box and Sweeps". The category underneath still says Slideouts. Suite is now **133 passed, 0 failed**.

## Print a checklist or what's due (Nov 14, Rick's idea)

"🖨 Print this list" on a checklist run and "🖨 Print what's due" on the Logbook. A clean paper page: empty boxes to tick with a pen, the tire pressures printed on the tire line, a Notes area with ruled lines, and a "Checked by / Date" sign-off at the bottom. Items already checked on the phone print ticked. Only the page prints — the app, tabs and buttons stay off the paper. Photo auto-read of checkmarks was NOT built (unreliable — a misread mark would put a wrong "done" in the logbook, and it would need the photo to leave the phone); the honest version is print, mark it, snap the finished sheet as proof, tap to confirm. Suite is now **142 passed, 0 failed**. NOTE for the App Store build: window.print() works in the Safari preview; the native build will need a print plugin wired before it ships.

## Search tasks from the Home screen (Nov 14, Rick's idea)

A "🔍 Search tasks…" bar at the top of the Home screen — type a word and the matching tasks appear in a "Found in the book" card; tap a result and its sheet opens, same as tapping it in the logbook. Searches task names, systems and notes. Rick first had it on the Logbook, then redirected it to the Home screen — the Logbook copy was removed. Suite is now **150 passed, 0 failed**.

## "Next up" — three jobs at a time (Nov 14, Rick's idea, better than the other app's Focus Mode)

Rick: the long list overwhelms him. The other app's Focus Mode hides due work behind a black-box pick and a mode switch; ours does it without hiding anything. Home now shows only "Next up" — three jobs, ranked by a plain rule printed on the card: overdue safety first, then overdue, then soonest. Safety means Tires, Chassis Brakes, Safety, Engine, Transmission, Suspension, Chassis, Fuel System, Brakes, Steering. Finish one and the next rolls in; the rest waits in the Logbook with a "N more on the books" line that opens it. Free for everyone — the top three is the list working well, not something to charge for. Suite is now **159 passed, 0 failed**.

## Logbook sorting (Nov 14, Rick's idea)

"On the books" now sorts three ways, with a small Sort row at the top of the page: Due soonest (default — overdue first, then soonest due), System (Engine together, Tires together), Name A–Z. The pick is remembered per device (localStorage `rollonrv-logsort`). Finished-job month pages stay chronological — only the open-tasks list sorts. Suite is now **166 passed, 0 failed**.

## Night button on top of every page (Nov 14, Rick's idea)

The "🌙 Night mode" button moved out of the More screen's About card and now sits at the top-right of every screen — Home, Logbook, Checklists, Tires, More, and the first-run setup page. All six buttons work the same toggle and all six labels stay in step ("🌙 Night mode" / "☀️ Day mode"). Light is still the default; the choice is still saved per device. Suite is now **168 passed, 0 failed**.

## Group headings on System sort (Nov 14, Rick's idea)

Sorting by System now puts a named heading over each group — "Safety · 8", "Slideouts · 6", "Leveling and Support · 11" — with the count, so each system reads as a group instead of just feeling like one. Due and Name sorts stay flat, no headings. "Print what's due" carries the same headings when the book is sorted by System. Suite is now **174 passed, 0 failed**.

## Night button off the titles (Nov 14, Rick's catch — two screenshots)

Parked top-right, the button sat on top of "The Logbook 2026" on Home and "every job," on the Logbook — same collision on every page with a long title. Moved to its own line above the title on all six screens (right-aligned, still at the top of the page), so it can never cover a title again. Suite is now **176 passed, 0 failed**.

## Parts to get — the shopping list (Nov 14, Rick's idea, free)

Rick: "We need a built in shopping list for parts and supplies" — then, on print vs download: "Printable and downloadable. Or it can stay on the app." So all three: the list lives in the app, and print + download are there when he wants them. Free — it's part of doing the job, not an extra; premium parts & warranty tracking (receipts, warranty dates) stays the later premium layer on top of it.

A part belongs to a job — name, part number, quantity — or it's just supplies. Home has a "Parts to get" card (up to three, tap one to open it); the full list is its own screen (reached from the card, no new tab). Tap the box when you've got it; tap the line to change it or add what you paid. A task sheet has "＋ Add a part for this job", pre-linked to that job.

Print: "🖨 Print the list" — a clean paper page, to-get items with empty boxes, bought ones ticked, part numbers and jobs underneath, "Take it to the counter — check off what you find." Download: "⬇ Download the list" — a CSV (Part, Part Number, Quantity, For Job, Bought, Price Paid) via the same download helper as the other exports.

Costs: a bought part's price lands in "What she's cost" for that year, under the job's system ("Parts" with no job), and in cost-per-mile; un-ticking the box takes the money back out. And the same dollars are never counted twice: when the job is logged, bought list parts for that job come along in the log sheet already counted, with a note ("Already in the book — bought for this job, not counted twice") and a hint under the Cost field ("put only the rest here"); the parts total that becomes the job's cost skips them. Suite is now **199 passed, 0 failed**.

Deploy: ?v=24 zip built Nov 14, 23:01 (35,937 bytes); deployed and verified live Nov 14, 23:04 — my own curl HEAD matched local bytes exactly (app.js 112,870; index.html 11,654; styles.css 15,191; HTTP 200). The deploy check caught two things, fixed in ?v=25 below.

## One-time jobs are findable + empty parts list has a way in (Nov 14, two catches from the ?v=24 deploy check)

The deploy verification found a real bug: a task with no due date at all — a one-off job like "fix the cracked vent cover" — was treated as "done" by the status math, so it was invisible everywhere: not in Next up, not in the Logbook, not in search. You could add it and never find it again. Fixed: a one-time job is now "open" until it's been logged once; only then is it done and off the books. It shows in the Logbook and in search (pill reads "One-time — no next due"), ranks last in Next up, and stays off the printed due list — it's not due, so it doesn't belong on that page. Suite is now **207 passed, 0 failed**.

The same check caught a smaller one: with an empty parts list, the Home card's link was blank, so the Parts screen had no visible way in until a part existed. The empty card now says "Open the list to add a part." and that link opens the Parts screen.

Deploy: ?v=25 zip built Nov 14, 23:14 (36,059 bytes); deployed and verified live Nov 14, 23:20 — my own curl HEAD matched local bytes exactly (app.js 113,188; index.html 11,654; styles.css 15,191; HTTP 200). Live at https://rickdemers.com/rollonrv-preview/.

## The download is a page you can read (Nov 14, Rick's catch — screenshot)

Rick downloaded the parts list and Safari opened the CSV as a tiny cramped table — "Down load view kinda hard to read." Right: a CSV is a spreadsheet file, not a reading copy. "⬇ Download the list" now downloads a proper page (rollonrv-parts.html) — big type, the logbook look, tick boxes, To get / Already got — that opens in Safari and reads like the app. The spreadsheet file didn't go away: "Export parts" sits in the More screen's import/export card, next to Export tasks and Export logbook. Print was checked the same night (Rick sent the PDF: "Print looks good"). Suite is now **213 passed, 0 failed**.

Deploy: ?v=26 zip built Nov 14, 23:27 (36,822 bytes); deployed and verified live Nov 14, 23:34 — my own curl HEAD matched local bytes exactly (app.js 115,839; index.html 11,746; styles.css 15,191; HTTP 200).

## Your own checklist words are editable (Nov 14, Rick's idea)

Rick: "Can we make the words your own item's editable" — his own items on a checklist ("Test 2", "Test 3" in his Test list) could only be checked off or deleted, never fixed. Now every item you add carries a small ✎ after its words: tap the words and a sheet opens with the wording ready to change; save it and the list shows the new words. Tapping the words never checks the box — the box is still the box. Built-in lines never change, only your own — flat "Your own items" and the items inside your named groups both. The sheet also offers "Take it off the list" if the item's had its day.

**The heading too** (Rick, same night — "Heading word"): the red script "Your own items" heading itself is now tappable, with its own ✎. Tap it and give that group a name of your own — it prints under the new name too, and the sheet offers "Back to 'Your own items'" if you want the plain name back. Stored per list and rig, so each list can carry its own name. Suite is now **226 passed, 0 failed**.

Deploy: ?v=27 zip built Nov 14, 23:39 (37,268 bytes); deployed and verified live Nov 14, 23:51 — my own curl HEAD matched local bytes exactly (app.js 117,966; index.html 11,746; styles.css 15,301; HTTP 200). Live at https://rickdemers.com/rollonrv-preview/.

## ?v=28 — build number shown, heading editable, download stays in the app

- **Build number in More** (Nov 14 — Safari kept an old version open and the readable download looked "still small"): About now reads "RollOnRV v1.0 · build 28", so a glance tells which build is on the phone. `APP_VERSION` constant in app.js, bumped per release.
- **Download opens in a new tab** (Rick's catch, Nov 14 — "View is gone when you tap down load"): Safari ignores the download attribute for a blob and opens the file IN the tab, pushing the app away. `downloadFile` now sets `target="_blank"` — the file opens in a new tab, the book stays where it was. On a computer the download attribute still saves the file as before. Toast now reads "Opened in a new tab — the app is still here behind it." Suite section 29 (3 checks). **This also explains the "still small" confusion**: his 11:40 PM screenshot showed the CSV table filling the tab — the download had navigated the tab away from the app.

Deploy: ?v=28 zip built Nov 14, 23:53 (38,048 bytes); deployed and verified live Nov 14, 23:57 — my own curl HEAD matched local bytes exactly (app.js 121,179; index.html 11,778; styles.css 15,413; HTTP 200). Suite 229 passed, 0 failed.

## ?v=29 — the picker card follows a renamed heading

Rick renamed the heading inside his Test list to "Test" — the run showed it, but the picker card still read "Your own list · 2 items". The card's second line was baked into `findChecklist` (`sub: "Your own list"`) instead of reading the renamed heading. Now the card's line IS the heading: rename it in the run and the card follows. Deleting a list now also drops its saved heading. Suite section 30 (2 checks). Suite is now **231 passed, 0 failed**.

Deploy: ?v=29 zip built Nov 15, 00:07 (38,139 bytes); deployed and verified live Nov 15, 00:11 — my own curl HEAD matched local bytes exactly (app.js 121,498; index.html 11,778; styles.css 15,413; HTTP 200). Live at https://rickdemers.com/rollonrv-preview/.

## ?v=30 — a task can be fixed after the fact

Rick (Nov 15, 05:16): "Can you thing of anything else we missed or need in RollOn RV" — went through the code instead of guessing. The one real miss: a logged job could be edited or deleted, but a task could not — no way to fix a title, an interval, or a due date; the only path was delete and re-add, which wipes its history. Now the task sheet has an "Edit task" button (openEditTaskSheet, mirrors the add sheet, values pre-filled). Last-done history is never edited here. Imported categories (Slideouts, AC, …) are kept as they are — the edit list offers them alongside the built-in ones, so saving never silently changes a category. Suite section 31 (8 checks). Suite is now **238 passed, 0 failed**.

Deploy: ?v=30 zip built Nov 15, 05:24 (38,519 bytes); deployed and verified live Nov 15, 05:29 — my own curl HEAD matched index.html 11,778 and styles.css 15,413; app.js served with no Content-Length (chunked) but my own GET found openEditTaskSheet in the served file, and the browser saw the "Edit task" button live. Live at https://rickdemers.com/rollonrv-preview/.

## ?v=31 — "The usual jobs" picker (RVKeeper-style starter library)

Rick (Nov 15): "How dose RV keeper pull their task the some how pull a task in from a prebuilt data base with is really nice cuts out a lot of work" — and: "They have all the info added when you choose your type of Rv". RVKeeper ships a curated library keyed by RV type; pick the type and the matching jobs load with intervals set. RollOnRV already had the seed — STARTER_TASKS (8 jobs) sat in the code unused. Now: Logbook → Add a task → "Or start with the usual jobs" opens the picker. Engine oil and generator oil are marked motorized and only show for Class A/B/C; a travel trailer sees the other six. Tap Add per job (nothing bulk-added); a job already in the book shows "In the book ✓" and can't be added twice. Added jobs carry their rhythm; set a due date on the task after, or log it once and the rhythm takes over. Rick: "I suppose if it add a task you don't want it's easier to delete or add" — yes, one tap to delete from the task sheet. Suite section 32 (7 checks). Suite is now **244 passed, 0 failed**.

Deploy: ?v=31 zip built Nov 15, 05:29 (39,231 bytes; app.js 127,592; index.html 11,778; styles.css 15,413) — deploying after ?v=30 landed, so the two deploys don't collide. Verification pending.

Deploy: ?v=31 zip built Nov 15, 05:29 (39,231 bytes); deployed and verified live Nov 15, 05:32 — my own curl HEAD matched local bytes exactly (app.js 127,592; index.html 11,778; styles.css 15,413; HTTP 200) and the served app.js contains openStarterTasksSheet. The browser also saw "Or start with the usual jobs" live in the Logbook and closed the sheet without adding anything. Live at https://rickdemers.com/rollonrv-preview/.

## ?v=32 — a quiet guide pill on the Home screen

Rick (Nov 15): "Also a simple user instruction guide" — "A link to a new page" — "On Home Screen" — "Keeps it clean" — "Not so overwhelming" — "Maybe a pill" — "What ever you want". The guide is a new page on the site (rickdemers.com/rollonrv-guide/): 11 short sections in plain words — set up the rig, start with the usual jobs, add a task, fix a task, log a job, checklists, parts, tires (DOT week + year), what she's cost, your book stays yours, little things (search, sorting, night mode). RollOnRV logbook look (cream, navy, red), site nav on top, prints cleanly (nav and footer hidden). The Home screen carries one small pill at the bottom — "📖 How to use this app" — opening the guide in a new tab; a quiet bordered pill, not a button. Suite section 33 (3 checks). Suite is now **247 passed, 0 failed**.

Deploy: guide page zip built Nov 15, 05:32 (3,642 bytes; index.html 9,681) and ?v=32 zip built Nov 15, 05:32 (39,337 bytes; app.js 127,592; index.html 11,955; styles.css 15,478) — both deploying; verification pending.

Deploy: guide page verified live Nov 15, 05:35 — my own curl returned HTTP 200 and the title "RollOnRV — How to use this app" from https://rickdemers.com/rollonrv-guide/ (9,681 bytes on the server). ?v=32 zip deployed and verified live Nov 15, 05:37 — my own curl HEAD matched local bytes exactly (app.js 127,592; index.html 11,955; styles.css 15,478; HTTP 200) and the served index.html contains the rollonrv-guide pill link. The browser also saw the pill live on the Home screen below "Spent this year". Live at https://rickdemers.com/rollonrv-preview/.

## ?v=33 — the guide link moves up top, matching the photo button

Rick (Nov 15, with screenshots): "Can you make the pill larger or move it to the top next to the a a picture pill make it the same size and color" — the small pill at the bottom of Home was too quiet. Moved it: the guide link now sits in the screen-head, next to "📷 Change photo", as a second `.btn.small.ghost` — same size, same red outline. The bottom pill is gone (the `a.pill` rule in styles.css is now unused and harmless). Suite section 33 rewritten (5 checks). Suite is now **249 passed, 0 failed**.

Deploy: ?v=33 zip built Nov 15, 05:44 (39,335 bytes); deployed and verified live Nov 15, 05:49 — my own curl HEAD matched local bytes exactly (app.js 127,592; index.html 11,996; styles.css 15,478; HTTP 200) and the served index.html references app.js?v=33 and contains the rollonrv-guide link. The browser also saw the link live at the top of Home next to the photo button. Live at https://rickdemers.com/rollonrv-preview/.

## ?v=34 — five rig questions fit the usual jobs to the rig

Rick (Nov 15): RVKeeper customizes tasks by asking questions — roof type, equipment type, manufacturer/model — "it's nice if you don't already have data to import, quick way to build your task". He asked first whether building it is copyright or copying; answered: ideas aren't copyrighted, only their exact words/code/images are, and ours is written fresh with our own questions and tasks. He said yes.

Built: a "What does your rig have?" sheet — five questions (roof: Rubber/Fiberglass/Aluminum; water heater: Tank/Tankless; fridge: Propane/Residential; generator: Built-in/Portable/None; slides: Yes/No), every question offers "Not sure" (never hides a job). Answers live on the rig (`rig.equipment`, back-filled `{}` on load). The usual-jobs picker filters by them: a job with `needs` shows on an exact match, or when the answer is missing/unsure and the job is the usual one (`isDefault`); non-default jobs (tankless descale, portable generator service) only show on an exact match, so an unanswered rig never sees both sides of a pair. Three new starter jobs (library is now 11): Tankless water heater — descale, Fridge burner & flue — clean (default for absorption), Portable generator — service. Answering rubber roof makes the added roof job carry the rubber-roof note (self-leveling sealant). Entry points: a "Fit the jobs to my rig" button at the top of the usual-jobs picker (reads "Fitted to your rig — change answers" once answered), "What my rig has" in More next to Edit rig, and Save lands back in the picker. Skip shows every job. No auto-prompt at setup — the wire() comment's "keep setup honest" restraint stands.

Tests: section 32 counts updated (Class C 9, travel trailer 7 — the fridge job is a default). New section 34 (12 checks): 5 questions, Not sure on each, a fully answered rig sees 6 jobs with the right swaps, answers persist, roof note adapts, Not sure restores the default. Suite is now **261 passed, 0 failed**. Guide page section 2 gained one tip paragraph about the five questions.

Deploy: ?v=34 zip (40,964 bytes) + guide zip (3,388 bytes) deployed in one cPanel session and verified live Nov 15, 06:02 — my own curl HEAD matched local bytes exactly (app.js 132,918; preview index.html 12,088; styles.css 15,478; guide index.html 8,643; HTTP 200); served app.js contains openEquipmentSheet and the served guide mentions the five questions. Live at https://rickdemers.com/rollonrv-preview/.

## ?v=35 — the two pills match, and the rig picture fills the width

Rick (Nov 15, with a screenshot): "Can you make both pill the same size" — then: "Maybe even fill or center Rv picture". Cause found in the CSS: an old `#home-rig-photo-btn{ margin-top:.5rem; }` rule (left over from when the photo button stood alone) pushed Change photo down inside the flex row, so the guide pill stretched taller than it; and the two pills sized to their text, so the longer label made the wider pill. Fix: that margin rule is gone; `.btn` now has one explicit `line-height:1.35` and `display:inline-flex` so a link and a button render identically; the row is `.home-photo-row` with `.btn{ flex:1 1 0; }`, so both pills split the row fifty-fifty — same height, same width. For the picture: went with fill (not center) — `.rig-photo` and the `.rig-art svg` silhouette both went from `max-width:230px` to `max-width:100%`, so the photo spans the Home screen instead of sitting small on the left; the small silhouette variant (`.rig-art--sm`, setup screen) still caps at 190px. Suite section 35 (6 checks: shared row, fifty-fifty, one line-height, no stray margin, photo fills, silhouette fills). Suite is now **267 passed, 0 failed**.

Deploy: ?v=35 zip (41,047 bytes) deployed and verified live Nov 15, 06:09 — my own curl HEAD matched local bytes exactly (app.js 132,918; index.html 12,103; styles.css 15,671; HTTP 200); the served files on disk contain home-photo-row, max-width:100% (photo + silhouette) and line-height:1.35. The browser's screenshot also confirmed the silhouette filling the width and both pills equal. Live at https://rickdemers.com/rollonrv-preview/.

## ?v=36 — Liquid Springs gets its own job

Rick (Nov 15): his rig has Liquid Springs; asked whether the app has maintenance instructions for them — it did not. His imported 174-task list has two generic suspension jobs (Check Axle Alignment, 365d; Inspect Suspension Hardware, 180d) but nothing Liquid Springs-specific, and the starter list had no suspension job at all. He added: lots of RVs are adding them. Intervals taken from LiquidSpring's own operator manual (D11275 Rev W, liquidspring.com — the same regime across their manuals): routine maintenance every 25,000 miles or 6 months maximum; check reservoir fluid level; check fittings for leaks; daily/before-each-shift check that the system is fully operational (green ride-height + ride-mode LEDs lit, red warning LED off, NORMAL ride height). Safety line from the manual: system runs up to 3,500 psi — never feel for a leak with your hands; depressurize before touching any fitting.

Built: new starter job "Liquid Springs — check fluid & fittings" (Engine & Chassis, 6 mo + 25,000 mi, needs {suspension:"liquidspring"} — no default, so it only shows when the rig answers Liquid Springs) with the note in plain words, including the 3,500 psi warning and the before-each-trip light check. Sixth rig question: "Suspension?" (Liquid Springs / Standard). The Add handler now also passes intervalMiles (it only passed months + gen hours before), and the picker rhythm line shows miles ("every 6 mo · 25,000 mi"). Rick's correction: his system does NOT have the level option for when you park — the note says nothing about park leveling, and a test asserts the note has no "park" in it. Suite section 36 (6 checks). Suite is now **273 passed, 0 failed**. Guide section 2 tip now says six questions and lists suspension.

Deploy: ?v=36 zip (41,321 bytes) + guide zip (3,395 bytes) deployed and verified live Nov 15, 06:21 — my own curl HEAD matched local bytes exactly (app.js 133,662; preview index.html 12,103; styles.css 15,671; guide index.html 8,654; HTTP 200); served app.js contains Liquid Springs. Live at https://rickdemers.com/rollonrv-preview/.

## ?v=37 — Leave it to the pro + gas or diesel

Rick (Nov 15): "Do we have a spot in the task to schedule it with a Rv tech or shop. Some items are better left with a pro. One question would also be gas or diesel?" Then: "Maybe a tick bow leave it to the pro" and "They it word add a task that would have you schedule it" (read as: when you add a task it would have you schedule it) — then "Your thoughts". My direct take, given in the reply: yes to the tick box — a pro job should say so on its face, because the worst outcome is starting a job you shouldn't have; the honest scheduling is the due date IS the appointment date plus the shop's name on the task, since the app can't book a shop (no directory, no booking system) and shouldn't pretend it can; gas/diesel is a real split (diesel fuel filter/water separator vs gas spark plugs) and only makes sense on motorhomes.

Built: tasks carry `needsPro` + `proShop`. Add and edit sheets have a "🔧 Leave it to the pro" tick box (toggle button, same pattern as the part sheet's bought toggle) and a "Which shop or tech?" field. The logbook row shows "🔧 Pro"; the task sheet shows "🔧 Leave it to the pro — <shop>". The Liquid Springs starter job comes pre-ticked (needsPro: true) — 3,500 psi hydraulics is not a driveway job. Seventh rig question "Gas or diesel?" with `motorized: true`, so the equipment sheet only asks it on Class A/B/C (a trailer sees six questions; the count in the sheet sub and the picker button is computed from the filtered list). Two new starter jobs, both non-default (only on exact match): "Diesel fuel filter — change" (12 mo; "Change the filter once a year; drain the water separator when the light says so.") and "Spark plugs — change" (60,000 mi; "Per your chassis manual — most gas coaches are 60,000 to 100,000 miles."). CSV export gains Pro + Shop columns; the importer reads them back (headerField: /^pro$/ and /^shop$/). Guide: section 2 tip now says seven questions and lists fuel; section 4 explains the pro tick box and that the due date is the appointment date. Suite section 37 (17 checks). Suite is now **290 passed, 0 failed**.

Deploy: ?v=37 zip (42,024 bytes) + guide zip (3,492 bytes) deployed and verified live Nov 15, 06:27 — my own curl HEAD matched local bytes exactly (app.js 136,477; preview index.html 12,103; styles.css 15,671; guide index.html 8,889; HTTP 200); served app.js contains "Leave it to the pro", "Diesel fuel filter" and "Spark plugs"; guide page contains "seven quick questions". Live at https://rickdemers.com/rollonrv-preview/.

## ?v=38 — My pros, the contact list

Rick (Nov 15): "Thought maybe a contact list for the pros. When you choose the tick box for add a pro it would pull the pro contact info that you already have built or you could add the info into the list from the task. Thoughts" + "Expandable" + "Am I making sense". My take, given in the reply: yes — a tick box that only holds a name is half a feature; when the job is due what you need is the number to call. Keep the list small and his (name, what they do, phone, town), one list for the whole book, tap-to-call from the task, two doors in (from the task or from the list), no directory or ratings. He tapped "Yes — build it as build 38".

Built: `store.pros` (book-level, not per rig), `newPro` {name, specialty, phone, town}. New My pros screen (theme button first in the screen-head, like every screen — section 14's count is now 8) with tap-to-call `tel:` links, reachable from More → My pros and with a ‹ Home back button; `openProSheet` for add/edit with a confirm() delete. Tasks now carry `proId` alongside `proShop`; `proFor(task)` resolves by id, then by name for jobs written before the list existed. The add/edit task sheets' pro area is now a picker: choose a saved pro, or "＋ Add a new pro…" which reveals inline fields (name, what they do, phone, town) that join My pros when the task is saved. The task sheet shows a tap-to-call link via `proLine(task)`. Editing a number in My pros updates every linked job (the link, not a copy). Deleting a pro clears `proId` on its tasks but keeps the name; the call link goes with them. A legacy name-only job opens the edit sheet with the new-pro fields out and the name pre-filled, so one save puts it in the list. CSV Pro/Shop columns unchanged (name only). Guide: new section 12 "Your pros". Suite section 38 (10 checks); section 37's pro flow rewritten for the picker. Suite is now **304 passed, 0 failed**.

Deploy: ?v=38 zip (44,516 bytes) + guide zip (3,703 bytes) deployed and verified live Nov 15, 06:37 — my own curl HEAD matched local bytes exactly (app.js 144,803; preview index.html 13,098; styles.css 15,671; guide index.html 9,515; HTTP 200); served app.js contains "My pros" and the pro picker helpers; preview index.html contains the pros screen; guide page contains "Your pros" section 12. Live at https://rickdemers.com/rollonrv-preview/.

## Build 39 — photo proof on checklist runs, date-stamped (Nov 15, 2026)

Rick (Nov 15, after asking what else was missed): "Yes — build the photo proof" + "You do need this for warranty claims" + "With a date stamp when the photo was taken".

Built: runs carry `proof` (data URL) + `proofAt` (local date, set when the photo is snapped). The run screen has a "Photo proof" section above the finish buttons — "Snap the finished sheet, or the work itself — it rides along with this run, for warranty claims and your own records." Add/replace uses the same camera/photo flow as log entries (native Camera or the photo picker, downscaled to 1024px, storage-room check). The photo shows full-width with "Taken <date>" under it. The picker card shows the most recently finished run as "✓ Finished <date> · 📷 proof taken <date>" with a thumbnail; tapping the line reopens that finished run so a photo can be added later. Removing the photo clears its date; Start over clears checks, photo and date. Guide section 6 now explains the photo proof + date stamp for warranty claims. Suite section 39 (13 checks, incl. the real capture path through the file input — jsdom never loads images, so the test stubs window.Image; verified the stub was the blocker with a standalone jsdom probe: FileReader works, Image never fires). Suite is now **317 passed, 0 failed**.

Deploy: ?v=39 zip (45,417 bytes) + guide zip (3,829 bytes) deployed and verified live Nov 15, 06:51 — my own curl HEAD matched local bytes exactly (app.js 147,878; preview index.html 13,098; styles.css 15,671; guide index.html 9,706; HTTP 200); served app.js contains "Photo proof" (3×), "proofAt" (6×), APP_VERSION = "39"; guide contains "date-stamped" + "warranty claim". Live at https://rickdemers.com/rollonrv-preview/.

## Build 40 — fuel log, document vault, trip journal (Nov 15, 2026)

Rick (Nov 15, after the one-stop-shop ideas): "Yes — build the fuel log" + "And proceed with second and third option" + "I like it" + "Info like that would help with trip planning and budgeting".

Built, all three, free tier:
- **Fuel log.** `store.fuel` {date, odometer, gallons, total} per rig. Fuel screen (theme button first — section 14's count is now 11) with a summary (average MPG, miles, gallons, total spent, avg $/gal) and a newest-first list with per-fill-up MPG. Fill-up sheet shows the price a gallon live as you type; saving a fill-up moves the rig odometer forward like a logged job does. MPG is miles covered over the fill-up's own gallons — fill the tank each time and the math stays honest. Fuel money stays its own line and never lands in "What she's cost" (maintenance money). Home card shows the MPG; CSV export in More.
- **Document vault.** `store.docs` {title, kind, expiresAt, taskId, data (data URL), fileName} per rig. Vault screen sorts papers that run out within 30 days — or already have — first, with a red/amber/green dot. Add a paper picks a file (PDF or photo) via a hidden file input, staged as `vaultPending`, then the sheet (title pre-filled from the filename, kind, expiry, linked job). "See the paper" opens the file in a new tab. A paper can name a job; the task sheet shows "Papers in the vault". Home card flags papers needing attention. Storage-room check on pick (4.5 MB soft limit, same as photos). NOTE: the vault was on the premium list — Rick said proceed, so it is in the free core now; the premium card in More no longer lists the vault (premium keeps the ownership report PDF, parts & warranty tracking, multi-rig, backup).
- **Trip journal.** `store.trips` {name, destination, startDate, endDate, campground, campgroundCost, startOdo, endOdo, notes} per rig. Trip cost = campground + every fill-up dated inside the trip (the fuel counts itself), miles from the odometers. Home card shows the latest trip with its all-in total — the budgeting number. Guide: new sections 13 (Fuel), 14 (Trips), 15 (The vault). Suite sections 40 (fuel, 13 checks), 41 (vault, 11 checks, incl. the real file-pick path), 42 (trips, 8 checks). Suite is now **347 passed, 0 failed**. One test fix during the run: the price-a-gallon check needed a dispatched `input` event after setVal (setVal alone fires no event).

Deploy: ?v=40 zip + guide zip — the preview DID go live (my own curl HEAD: app.js 171,741, Last-Modified 12:56:47 GMT) before Rick corrected course; the guide never started (still 9,706). The browser task was stopped mid-flight at Rick's word and its terminal report confirmed the preview steps had completed and the guide had not started. **CORRECTED the same morning (see Build 41): the vault was pulled out of the free core and saved for premium.** ?v=40 was live on the preview for only a few minutes and was overwritten by ?v=41.

## Build 41 — fuel log + trip journal only; vault saved for premium (Nov 15, 2026)

Rick (Nov 15, 07:00): "I forgot let's save it for premium" — the vault stays premium, as originally decided. The ?v=40 deploy was halted mid-flight (preview already live with the vault, guide untouched); the vault was then removed entirely from the free app: Vault screen, Home vault card, `store.docs`/`DOC_KINDS`/`newDoc`/`docsForRig`/`docStatus`/`taskDocsLine`/`renderVault`/`vaultPending`/`openDocSheet`/`openDataUrl` all out of app.js and index.html, guide section 15 out, test section 41 out, theme-button count back to 10, premium card in More lists the vault again ("the ownership report, the document vault, parts & warranty tracking, more than one rig, and backup"). One suite fix: §9 save/load round-trip failed because load() still back-filled `store.docs` after DEFAULTS dropped it — the back-fill line is gone too. Suite is now **337 passed, 0 failed** (347 − 11 vault checks + 1 fix; fuel §40 and trips §42 unchanged). Selling points, Rick's "What did you think" (Nov 15): lead premium with the vault (expired papers cost real money; warranty claims live or die on the paper), second the ownership report (one clean PDF a buyer trusts, pays for itself at sale); multi-rig is niche, backup is retention not a selling point, parts & warranty tracking is too close to the free parts list to pitch in one line.

Deploy: ?v=41 zip (193,606 bytes) + guide zip (10,678 bytes) deployed and verified live Nov 15, 07:06 — my own curl HEAD matched local bytes exactly (app.js 163,023; preview index.html 14,912; styles.css 15,671; guide index.html 10,678; HTTP 200); served app.js contains APP_VERSION = "41" and "fuelStats" (4×), and contains NO "screen-vault" or "renderVault"; guide runs sections 1–14, ending with "13. Fuel" and "14. Trips", no section 15. Live at https://rickdemers.com/rollonrv-preview/.

## TestFlight setup (Nov 15, 2026)

Rick (Nov 15 ~08:50): "Okay to do TestFlight" — approved after saying No earlier; he is happy with the app. Setup done in the background while he was at church.

Done:
- GitHub repo rickdemers20/RollOnRV created (public, like the Bible repo); v41 pushed (163 files, commit 82bae891).
- Workflow `.github/workflows/build.yml` ("Build RollOnRV app"): bun install (bun.lock is the lockfile — there is no package-lock.json), `npm test`, `cap sync ios`, unsigned Debug build; signed .ipa + TestFlight upload gated on secrets. Run 43727452949: **SUCCESS** — project compiles, 337 tests pass, certificate import works; signed steps skipped (no profile yet).
- `ios/App/ExportOptions.plist` added (method app-store-connect, team FM234R8P73, profile "RollOnRV App" for com.rickdemers.rollonrv).
- Repo secrets set: APPLE_CERT_P12_BASE64 + APPLE_CERT_PASSWORD (same distribution certificate/password as the Bible app, from signing/), APPLE_TEAM_ID, APPLE_API_KEY_ID, APPLE_API_ISSUER_ID (API key "Bible Study Upload").
- One workflow fix (commit 22991ff): Find .ipa / Upload to TestFlight were gated only on the API key, so the first run failed at the upload step with no .ipa present; now gated on profile secret AND API key.

Still needed (browser work):
- App Store Connect app record for RollOnRV — CREATED Nov 15 (browser task; Name "RollOnRV", SKU "RollOnRV1", iOS 1.0, Prepare for Submission). Bundle ID com.rickdemers.rollonrv was not registered — registered first as an explicit App ID.
- Provisioning profile "RollOnRV App" — CREATED Nov 15 (App Store distribution, existing Apple Distribution certificate, expires 2027/11/09, profile ID 39B2H448SW); .mobileprovision downloaded to ~/workspace/browser_downloads/sess-3153267369/ (12,149 bytes).
- API key — NEW key "RollOnRV Upload" created Nov 15 (Key ID 8LBH8J2MFX, Issuer ID 196b8f58-5c33-421b-9cb7-13e3d8554d22, App Manager); .p8 downloaded (257 bytes — the only copy, do not lose it). Old key D8RQ53QR9X ("Bible Study Upload") untouched.
- Add Rick (rickdemers@hotmail.com) as a TestFlight tester for RollOnRV.
- App is version 1.0, build 1 — the first TestFlight upload will be build 1. TestFlight only; do NOT submit for App Store review (Bible app Build 6 4.3 thread still open).

## Build 43 — duplicate jobs cleaned up (Nov 15, 2026)

Rick approved the fix. The plan export had been imported twice, doubling every job to 349; marking one copy done left its twin overdue, so the same job kept coming back. Two changes: (a) import now skips a row whose cleaned title + category already exist for the rig, and counts it as skipped (the import status line already shows the skip count); (b) a one-time cleanup runs when the book loads — it merges exact duplicates (same rig, title, category), keeps the copy with the most work behind it (logs first, then latest done, then latest due), and re-points the dropped copy's logs and parts at the copy that stays, so nothing written up is lost. Same title in a different category is a different job and stays. His book should drop from 349 to 175 (174 imported + 1 starter) the first time v43 loads. Suite section 8c: 6 new checks; the re-import test now expects the new behaviour. Suite now **349 passed, 0 failed**.

TestFlight first build: the v43 workflow run failed at "Archive + export signed .ipa" — the global `PROVISIONING_PROFILE_SPECIFIER="RollOnRV App"` on the xcodebuild command line was also applied to the Swift Package targets (IONCameraLib from the Capacitor Camera plugin), which reject a manually specified profile. Fix (no version change): manual signing now lives in the App target's Release config in the pbxproj (Manual, Apple Distribution, team FM234R8P73, profile "RollOnRV App") and the workflow archive step no longer passes signing flags on the command line, so the package targets build with their default Automatic setting. The export still uses ExportOptions.plist.

## Build 42 — back buttons on every page (Nov 15, 2026)

Rick kept reaching for the browser back button in the Safari preview — which leaves the app, since a single-page app has no history to go back through — and the small "‹ Home" buttons at the top of Parts / My pros / Fuel / Trips were too easy to miss. His way back had been the fixed tab bar at the bottom. Every off-tab screen now has a full-width "‹ Back to Home" button at the bottom of its content too (Parts, My pros, Fuel, Trips); the small top buttons stay. Tab screens (Home, Logbook, Checklists, Tires, More) navigate by the tab bar and need none. Suite section 23: 6 new checks (bottom buttons exist on all four screens; Parts and Trips bottom buttons return Home). Suite now **343 passed, 0 failed**.

## TestFlight upload failure — ITMS-90683, missing photo-library purpose string (Nov 15, 2026)

The v43 build was uploaded twice and Apple accepted both uploads ("UPLOAD SUCCEEDED"), but no build ever appeared in App Store Connect and no Apple email arrived. The buildUploads API showed both uploads FAILED with ITMS-90683: the app references the photo-library API (Capacitor Camera plugin) but Info.plist had no NSPhotoLibraryUsageDescription. Fix (no version change, still 1.0 / build 1): added NSPhotoLibraryUsageDescription and NSCameraUsageDescription to ios/App/App/Info.plist — the camera string is preventive, the app genuinely takes photos (photo proof on checklist runs, rig photo). Re-uploaded as build 1; since no build 1 was ever registered, Apple accepts it again. Result: run 43740133354 succeeded; third upload COMPLETE with no errors, build 1 registered in App Store Connect, processingState VALID, expires 2027-02-13. No Apple email arrived yet.

## Build 44 + 45 — night button under the Dynamic Island; rig photo button dead in the installed app (Nov 15, 2026)

Rick, in the installed TestFlight app (build 1): the "🌙 Night mode" button sits at the very top of every screen, half-hidden under the iPhone Dynamic Island and hard to tap ("It hard to tap" — on all pages). The page uses `viewport-fit=cover`, so content extends into the safe area, but `.screen-head` had only 1.4rem of top padding. Fix (v44): the header now adds `env(safe-area-inset-top)` on top of its padding, and the night button is a full 44px tap target — on every screen, since each screen has the same header.

Same session, second report: "Add photo of your rig won't open in app" — the button did nothing in the installed app (it worked in the Safari preview). Cause: `requestPhoto()` in the native app calls `Camera.getPhoto()`; when that call rejects (plugin not answering, or similar), the `.catch` just cleared the pending callback — no fallback, so the tap looked dead. Fix (v45): a failed native camera call now opens the file picker instead, so a photo is always reachable. A user cancel stays silent — they already said no, so no picker pops up after them. Suite section 43: 3 new checks (native boot exposes hooks, failure falls back to the picker, cancel stays silent). Suite now **352 passed, 0 failed**.

TestFlight build 2: version stays 1.0; build number goes 1 → 2 (`CURRENT_PROJECT_VERSION` in the pbxproj, Debug and Release). The Info.plist purpose strings from the ITMS-90683 fix (NSPhotoLibraryUsageDescription + NSCameraUsageDescription) are unchanged.

TestFlight build 2 outcome (Nov 15, 2026): pushed as commit f31c781c; workflow run 43744659475 SUCCESS. Transporter: "UPLOAD SUCCEEDED with no errors" 18:09:01 UTC. Build 2 (id 34bf585c-34cb-49d9-8350-341cd625d9e9) registered in App Store Connect, processingState VALID, uploaded 18:10:42 UTC, expires 2027-02-13, min iOS 15.0. BuildUpload record COMPLETE with no errors — the ITMS-90683 failure did not recur. No Apple mail about build 2 yet (inbox + junk checked 18:11 UTC; only the build 1 TestFlight invite from 11:36 AM CST is in the mailbox). Still needed (browser step): answer export compliance for build 2 and assign it to the Internal Testers group — a new build needs compliance answered again.

## Build 46 — the guide opens inside the app (Nov 15, 2026)

Rick, in the installed app (build 2): tapping "📖 How to use this app" threw him out to Safari — a plain `target="_blank"` link. Fix (v46): the guide link now opens in the in-app browser sheet via the Capacitor Browser plugin (`@capacitor/browser` 8.0.5, new dependency), with a Done button back to the book. On the web preview the link keeps its normal new-tab behavior, and if the plugin is ever missing the link falls through to the same. Suite section 44: 1 new check. Suite now **353 passed, 0 failed**.

TestFlight build 3: version stays 1.0; build number goes 2 → 3 (`CURRENT_PROJECT_VERSION` in the pbxproj, Debug and Release).

TestFlight build 3 outcome (Nov 15, 2026): pushed as commit c0bb4921; workflow run 43745771240 SUCCESS (353 tests pass; `bunx cap sync ios` found 4 Capacitor plugins for iOS including @capacitor/browser@8.0.5, written into Package.swift). Transporter: "UPLOAD SUCCEEDED with no errors" 18:21:25 UTC, delivery UUID e24032ba-2b9c-4776-8d7f-4aa0dec96987. Build 3 (id e24032ba-2b9c-4776-8d7f-4aa0dec96987) registered in App Store Connect, processingState VALID, uploaded 18:22:02 UTC, expires 2027-02-13, min iOS 15.0. BuildUpload record COMPLETE with no errors — the ITMS-90683 failure did not recur. No Apple mail about build 3 yet (inbox + junk checked 18:25 UTC; the newest RollOnRV mail is the build 2 "now available to test" from 18:13 UTC). Still needed (browser step): answer export compliance for build 3 and assign it to the Internal Testers group — a new build needs compliance answered again.

## Build 47 — picked photo never landed on the rig (Nov 15, 2026)

Rick, in the installed app (build 2): the camera opens and he can pick a photo, but it never appears on the home screen — "opens the camera and the photos but won't add to screen". Cause: the v45 fallback cleared `photoPending` *before* opening the file picker, so when a photo was chosen there was no callback left to hand it to. Fix (v47): only a user cancel clears the pending callback; the fallback keeps it pending, so the chosen photo flows through to the rig (and to checklist photo proof, which shares the same `requestPhoto()`). Also a 6s safety timeout on `downscalePhoto()` so a photo that never decodes can't hang the flow, and a `photoPendingSet` test hook. Suite: new regression check (picker choice after a failed native camera call lands on the screen). Suite now **354 passed, 0 failed**.

TestFlight build 4: version stays 1.0; build number goes 3 → 4 (`CURRENT_PROJECT_VERSION` in the pbxproj, Debug and Release).

TestFlight build 4 outcome (Nov 15, 2026): pushed as commit 565971c6; workflow run 43746972609 SUCCESS (354 tests pass; `bunx cap sync ios` found 4 Capacitor plugins for iOS). Transporter: "UPLOAD SUCCEEDED with no errors" 18:32:53 UTC, delivery UUID 6aedffcf-b013-4d47-8622-89c56a77297f. Build 4 (id 6aedffcf-b013-4d47-8622-89c56a77297f) registered in App Store Connect, processingState VALID (was PROCESSING at first check, flipped within ~4 min), uploaded 18:33:29 UTC, expires 2027-02-13, min iOS 15.0. BuildUpload record COMPLETE with no errors — the ITMS-90683 failure did not recur. No Apple mail about build 4 yet (inbox + junk checked 18:37 UTC; newest RollOnRV mail is the build 3 "now available to test" from 18:27 UTC). Still needed (browser step): answer export compliance for build 4 and assign it to the Internal Testers group — a new build needs compliance answered again.

## Build 48 — the guide is a screen inside the app (Nov 15, 2026)

Rick, in the installed app (build 4): the guide "still links you to Rickdemers.com" — the v46 in-app browser sheet still shows the website, so it still feels like leaving the app. Fix (v48): the guide is now a screen INSIDE the app (all 14 steps, same wording as the website guide, with a Back button to Home). The Home control is now a `<button>`, not an `<a>` — there is no href anywhere on it, so it cannot leave the app. The @capacitor/browser plugin (which never answered on the phone) was removed via npm uninstall. Suite: new checks (guide button is a button not a link, tapping it opens the guide screen, all 14 steps present, Back returns to Home). Suite now **357 passed, 0 failed**.

TestFlight build 5: version stays 1.0; build number goes 4 → 5 (`CURRENT_PROJECT_VERSION` in the pbxproj, Debug and Release).

TestFlight build 5 outcome (Nov 15, 2026): pushed as commit 43b9af00; workflow run 43750242412 SUCCESS (357 tests pass; `bunx cap sync ios` found 3 Capacitor plugins for iOS — Browser is gone). Transporter: "UPLOAD SUCCEEDED with no errors" 19:07:14 UTC. Build 5 (id cbca7e54-4b38-4ba3-bfa9-7522e7195684) registered in App Store Connect, processingState VALID (was PROCESSING at first check, flipped at ~19:10 UTC), uploaded 19:07:49 UTC, expires 2027-02-13, min iOS 15.0. BuildUpload record COMPLETE with no errors — the ITMS-90683 failure did not recur. No Apple mail about build 5 yet (inbox + junk checked 19:10 UTC; newest RollOnRV mail is the build 4 "now available to test" from 18:39 UTC). Still needed (browser step): answer export compliance for build 5 and assign it to the Internal Testers group — a new build needs compliance answered again.

## Build 49 — printing works in the installed app (Nov 15, 2026)

Rick, in the installed app (build 5): "Print this list doesn't work" — tapping it did nothing. Cause: `printSheet()` calls `window.print()`, which is a no-op inside iOS WKWebView (it works in the Safari preview, which is why it was never caught). Fix (v49): in the installed app, `printSheet()` now opens the printable sheet as its own page in Safari (same blob + target=_blank mechanism the parts download already uses), with the print styles inlined and a "To print this sheet: tap Share, then Print." hint at the top that never reaches paper (@media print hides it). On the web preview, printing still calls `window.print()` directly. This covers all three print buttons (checklist "Print this list", Logbook "Print what's due", Parts "Print the list") since they all go through `printSheet()`. Suite section 46: 2 new checks. Suite now **359 passed, 0 failed**.

TestFlight build 6: version stays 1.0; build number goes 5 → 6 (`CURRENT_PROJECT_VERSION` in the pbxproj, Debug and Release).
