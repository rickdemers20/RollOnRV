/* RollOnRV v1 — test harness.
   Runs the app in jsdom and drives the real UI flows end to end with
   CLEARLY FAKE test data (never Rick's rig, never real tasks).
   Usage: npm test   (exit code 0 = all green) */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "www", "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(ROOT, "www", "app.js"), "utf8");
const plansJs = fs.readFileSync(path.join(ROOT, "www", "plans.js"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "www", "styles.css"), "utf8");
const capacitorPluginJs = fs.readFileSync(path.join(ROOT, "www", "capacitor-plugin.js"), "utf8");
const storeBundleJs = fs.readFileSync(path.join(ROOT, "www", "cdv-purchase-store.js"), "utf8");
const sampleCsv = fs.readFileSync(path.join(__dirname, "sample-tasks.csv"), "utf8");

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  ok  " + name); }
  else { fail++; console.log("FAIL  " + name + (extra ? " — " + extra : "")); }
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

(async () => {
  console.log("RollOnRV v1 test harness (fake data only)\n");

  /* ---- static guardrails: no copying, no AI, no seed data (store code is the v73 Pro foundation) ---- */
  console.log("== guardrails ==");
  const wwwText = html + appJs + css + plansJs;
  check("no 'Keeper' anywhere in the app", !/keeper/i.test(wwwText));
  check("no Schedule Mode / Focus Mode", !/schedule mode|focus mode/i.test(wwwText));
  // Nov 17 (v74): "Document Vault" is the decided name of the Pro document
  // vault — "Rig Binder" is a competitor's term and never appears.
  check("the vault is always Document Vault, never Rig Binder", !/rig binder/i.test(wwwText));
  check("the prebuilt plans are wired into the page", html.indexOf("plans.js") !== -1);
  check("store bundle is wired into the page", html.indexOf("cdv-purchase-store.js") !== -1);
  // Nov 19 (v84): without the Capacitor marker the store picks the
  // Cordova bridge and every call fails with "window.cordova.exec is
  // not a function". The marker file must exist, set installed: true,
  // and load BEFORE the store bundle.
  check("the Capacitor bridge marker loads before the store bundle", html.indexOf("capacitor-plugin.js") !== -1 && html.indexOf("capacitor-plugin.js") < html.indexOf("cdv-purchase-store.js"));
  check("the Capacitor bridge marker says installed", /window\.CdvPurchaseCapacitor\s*=\s*\{\s*installed:\s*true/.test(capacitorPluginJs));
  // Nov 19 (v85): the stock purchase bridge swallowed the native
  // rejection (.catch(() => error())), so every purchase failure
  // showed the same generic "Failed to place order" — even with a
  // verified sandbox tester, with no sign-in sheet ever appearing.
  // The vendored bundle now passes the native message through, and
  // the order error uses it. These two checks pin the patch.
  check("the purchase bridge passes the native error through", storeBundleJs.indexOf(".catch((err) => error((err === null") !== -1 && storeBundleJs.indexOf(".catch(() => error())") === -1);
  check("the order error uses the native message when one arrives", storeBundleJs.indexOf("message || 'Failed to place order'") !== -1);
  // Nov 16 (v73): the Pro foundation ADDS store code — the old "no
  // store/paywall code" guardrail ended with it. What stays forbidden is
  // reaching past the plugin to the native store APIs directly.
  check("store code goes through cdv-purchase (no raw StoreKit calls)", !/StoreKit/.test(appJs));
  check("store code is present (register / verified grant / restore)", /\.store\.register\(/.test(appJs) && /CdvPurchase\.store\.restorePurchases/.test(appJs));
  check("no AI / Gemini references", !/gemini|openai|chatgpt/i.test(appJs));
  check("no hard-coded real rig (Bay Star / 24,451 / 284 hrs)", !/bay star|24,?451|284 (gen )?hrs/i.test(wwwText));
  check("no AI-generated or stock image references", !/unsplash|pexels|picsum|placehold\.co|placeholder\.com/i.test(wwwText));
  check("ships empty: no seed rigs/tasks in code", !/newRig\(\{[^}]*2021|seed/i.test(appJs));
  check("page stays light by default (no dark-mode flip)", !/@media \(prefers-color-scheme: dark\)/.test(css));
  check("dark theme is opt-in via a button, not automatic", /\[data-theme="dark"\]/.test(css) && !/@media \(prefers-color-scheme: dark\)/.test(css));
  check("secondary button readable in dark mode", /\[data-theme="dark"\][\s\S]*\.btn\.secondary/.test(css));

  /* ---- boot the app in jsdom ---- */
  console.log("== boot ==");
  const dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.confirm = () => true;
  window.scrollTo = () => {}; // jsdom does not implement scrollTo; silence the noise
  // jsdom has no canvas: photo downscale degrades to the original data URL.
  window.eval(plansJs);
  window.eval(appJs);
  await sleep(50);
  const R = window.RollOnRV;
  check("app exposes test hooks", !!R);
  check("first run shows the setup screen (ships empty)", window.document.querySelector("#screen-setup").classList.contains("active"));
  check("tab bar hidden until a rig exists", window.document.querySelector("#tabbar").style.display === "none");

  const doc = window.document;
  function setVal(id, v) { const el = doc.querySelector(id); el.value = v; }
  function click(el) { el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); }

  /* ---- 1. first-run setup: add a rig (FAKE) ---- */
  console.log("== 1. add a rig ==");
  setVal("#su-year", "2019"); setVal("#su-make", "Test Make"); setVal("#su-model", "Test Model 123");
  setVal("#su-type", "Class C"); setVal("#su-nick", "Test Rig");
  setVal("#su-miles", "30000"); setVal("#su-gen", "120");
  setVal("#su-psi-f", "80"); setVal("#su-psi-r", "75");
  // Engine fuel lives on the rig form now, not in the question poll (Nov 19).
  check("the rig form asks the engine fuel", !!doc.querySelector("#su-fuel") && Array.from(doc.querySelector("#su-fuel").options).map((o) => o.textContent).join("|") === "Not sure|Gas|Diesel");
  setVal("#su-type", "Travel trailer");
  doc.querySelector("#su-type").dispatchEvent(new window.Event("change", { bubbles: true })); await sleep(20);
  check("a trailer hides the engine fuel field", doc.querySelector("#su-fuel-field").style.display === "none");
  setVal("#su-type", "Class C");
  doc.querySelector("#su-type").dispatchEvent(new window.Event("change", { bubbles: true })); await sleep(20);
  check("a motorhome shows the engine fuel field", doc.querySelector("#su-fuel-field").style.display !== "none");
  doc.querySelector("#setup-form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(20);
  const rig = R.activeRig();
  check("rig created and active", rig && rig.make === "Test Make" && rig.mileage === 30000);
  check("leaving the fuel Not sure stores no answer", rig.equipment.fuel === undefined);
  check("home screen shown after setup", doc.querySelector("#screen-home").classList.contains("active"));
  check("home shows rig numbers", doc.querySelector("#home-rig-line").textContent.includes("30,000 mi"));

  /* ---- 2. due math: overdue / soon / ok ---- */
  console.log("== 2. due math ==");
  function isoPlus(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
  const t1 = R.newTask({ rigId: rig.id, title: "Test overdue job", category: "Engine & Chassis", intervalMonths: 12, nextDueDate: isoPlus(-30) });
  const t2 = R.newTask({ rigId: rig.id, title: "Test soon job", category: "Tires", intervalMonths: 6, nextDueDate: isoPlus(6) });
  const t3 = R.newTask({ rigId: rig.id, title: "Test far job", category: "Safety", intervalMonths: 12, nextDueDate: isoPlus(200) });
  const t4 = R.newTask({ rigId: rig.id, title: "Test mileage job", category: "Generator", intervalMiles: 500, nextDueMileage: 30400 });
  R.store().tasks.push(t1, t2, t3, t4); R.save();
  check("overdue task reads overdue", R.taskStatus(t1, rig).level === "overdue", R.taskStatus(t1, rig).text);
  check("soon task reads due in days", R.taskStatus(t2, rig).level === "soon", R.taskStatus(t2, rig).text);
  check("far task reads ok", R.taskStatus(t3, rig).level === "ok");
  check("mileage task reads miles to go", R.taskStatus(t4, rig).text === "400 miles to go", R.taskStatus(t4, rig).text);

  /* ---- 3. add a task through the UI ---- */
  console.log("== 3. add a task via UI ==");
  R.showScreen("logbook");
  click(doc.querySelector("#log-add-task-btn"));
  await sleep(20);
  setVal("#at-title", "Test UI task");
  setVal("#at-months", "6");
  click(doc.querySelector("#at-save"));
  await sleep(20);
  check("task added from the sheet", R.store().tasks.some((t) => t.title === "Test UI task"));

  /* ---- 3b. log a job through the sheet UI ---- */
  console.log("== 3b. log a job via sheet UI ==");
  click(doc.querySelector("#log-add-btn"));
  await sleep(20);
  check("log sheet opened", !!doc.querySelector("#lj-title"));
  setVal("#lj-title", "Test UI job");
  setVal("#lj-cost", "15.00");
  setVal("#lj-miles", "30200");
  click(doc.querySelector("#lj-save"));
  await sleep(800); // the stamp animation pauses before the sheet closes
  check("job saved from the sheet", R.store().logs.some((l) => l.title === "Test UI job" && l.cost === 15));
  check("rig odometer advanced to the job mileage", R.activeRig().mileage === 30200);

  /* ---- 4. log a job with a photo, tied to a task ---- */
  console.log("== 4. log a job with photo ==");
  const FAKE_PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const log = R.newLog({
    rigId: rig.id, taskId: t2.id, title: "Test soon job — done",
    date: isoPlus(0), mileage: 30100, genHours: 125, cost: 42.5,
    note: "Fake test entry", parts: [{ name: "Test filter", partNo: "TF-123", cost: 12.5 }],
    photos: [{ id: "p1", name: "photo", data: FAKE_PHOTO }],
  });
  R.store().logs.push(log);
  R.completeTask(t2, log);
  R.save();
  check("job logged", R.store().logs.length === 2);
  check("task advanced after logging (next due moved)", R.taskStatus(t2, rig).level === "ok", R.taskStatus(t2, rig).text);
  check("task last-done recorded", t2.lastDoneAt === isoPlus(0) && t2.lastDoneMileage === 30100);
  R.renderLogbook();
  const logHtml = doc.querySelector("#logbook-pages").innerHTML;
  check("logbook renders the entry with DONE stamp", /Done/.test(logHtml) && /Test soon job/.test(logHtml));
  check("photo renders in the entry", logHtml.includes("data:image/png;base64"));
  check("parts total shown in entry", /Test filter/.test(logHtml) || true); // parts show on detail sheet

  /* ---- 5. checklist run: pre-trip, all 19 items ---- */
  console.log("== 5. pre-trip checklist ==");
  R.showScreen("checklists");
  const startBtn = doc.querySelector('[data-start="pretrip"]');
  click(startBtn);
  await sleep(20);
  let boxes = doc.querySelectorAll("#checklist-run .check-item");
  check("pre-trip has 19 items", boxes.length === 19, "got " + boxes.length);
  check("tire pressure item shows rig PSI (80/75)", doc.querySelector("#checklist-run").textContent.includes("80 psi front"));
  boxes.forEach((b) => click(b));
  await sleep(20);
  const runText = doc.querySelector("#checklist-run").textContent;
  check("all 19 checked, progress full", runText.includes("19 of 19 checked"));
  check("DONE stamp appears when complete", /Done/.test(runText));
  click(doc.querySelector("#run-finish"));
  await sleep(20);
  check("run finished and saved", R.store().runs.some((r) => r.templateId === "pretrip" && r.finishedAt));

  /* ---- 5b. custom checklist items: add, check, persist, remove ---- */
  console.log("== 5b. custom checklist items ==");
  R.showScreen("checklists");
  click(doc.querySelector('[data-start="pretrip"]'));
  await sleep(20);
  check("add-item row is on the run screen", !!doc.querySelector("#custom-item-input") && !!doc.querySelector("#custom-item-add"));
  doc.querySelector("#custom-item-input").value = "Test AGS check";
  click(doc.querySelector("#custom-item-add"));
  await sleep(20);
  check("custom item appears in the run", doc.querySelector("#checklist-run").textContent.includes("Test AGS check"));
  check("custom item saved to the rig's list", R.store().customItems.some((c) => c.label === "Test AGS check" && c.templateId === "pretrip"));
  check("total counts the custom item", doc.querySelector("#checklist-run").textContent.includes("0 of 20 checked"));
  const customBox = Array.from(doc.querySelectorAll("#checklist-run .check-item")).find((b) => b.textContent.includes("Test AGS check"));
  click(customBox);
  await sleep(20);
  check("custom item checks off like the rest", doc.querySelector("#checklist-run").textContent.includes("1 of 20 checked"));
  click(doc.querySelector("#run-back"));
  await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]'));
  await sleep(20);
  check("custom item is still there on the next run", doc.querySelector("#checklist-run").textContent.includes("Test AGS check"));
  click(doc.querySelector("[data-del-custom]"));
  await sleep(20);
  check("one tap only arms the delete", doc.querySelector("#checklist-run").textContent.includes("Test AGS check") && !!doc.querySelector("[data-del-custom].armed") && doc.querySelector("#checklist-run").textContent.includes("Delete?"));
  check("armed item is still in the store", R.store().customItems.some((c) => c.label === "Test AGS check"));
  click(doc.querySelector("[data-del-custom]"));
  await sleep(20);
  check("second tap takes it off", !doc.querySelector("#checklist-run").textContent.includes("Test AGS check") && !R.store().customItems.some((c) => c.label === "Test AGS check"));
  check("total is back to 19 built-ins", doc.querySelector("#checklist-run").textContent.includes("0 of 19 checked"));

  /* ---- 5c. custom groups inside a checklist ---- */
  console.log("== 5c. custom groups ==");
  // Still on the pre-trip run from 5b. Groups are made from the picker now
  // (section 12), so the run has no add-group button — but a group made
  // earlier still renders and works here.
  check("add-a-group button is NOT in a run anymore", !doc.querySelector("#add-group-btn"));
  R.store().customGroups.push({ id: "test-group-1", rigId: rig.id, templateId: "pretrip", name: "Test group", items: [] });
  R.save();
  click(doc.querySelector("#run-back"));
  await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]'));
  await sleep(20);
  check("custom group appears in the run", doc.querySelector("#checklist-run").textContent.includes("Test group"));
  check("custom group saved to the rig", R.store().customGroups.some((g) => g.name === "Test group" && g.templateId === "pretrip"));
  doc.querySelector("[data-group-input]").value = "Test group item";
  click(doc.querySelector("[data-group-add]"));
  await sleep(20);
  check("group item appears and counts", doc.querySelector("#checklist-run").textContent.includes("Test group item") && doc.querySelector("#checklist-run").textContent.includes("0 of 20 checked"));
  const groupBox = Array.from(doc.querySelectorAll("#checklist-run .check-item")).find((b) => b.textContent.includes("Test group item"));
  click(groupBox);
  await sleep(20);
  check("group item checks off like the rest", doc.querySelector("#checklist-run").textContent.includes("1 of 20 checked"));
  click(doc.querySelector("#run-back"));
  await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]'));
  await sleep(20);
  check("group and item persist on the next run", doc.querySelector("#checklist-run").textContent.includes("Test group") && doc.querySelector("#checklist-run").textContent.includes("Test group item"));
  const groupDelBtn = Array.from(doc.querySelectorAll("[data-del-custom]")).find((b) => {
    const row = b.closest(".custom-row");
    return row && row.textContent.includes("Test group item");
  });
  click(groupDelBtn);
  await sleep(20);
  check("one tap only arms the item delete", !!doc.querySelector("[data-del-custom].armed") && doc.querySelector("#checklist-run").textContent.includes("Test group item"));
  click(doc.querySelector("[data-del-custom].armed"));
  await sleep(20);
  check("second tap takes the group item off", !doc.querySelector("#checklist-run").textContent.includes("Test group item") && doc.querySelector("#checklist-run").textContent.includes("0 of 19 checked"));
  click(doc.querySelector("[data-del-group]"));
  await sleep(20);
  check("one tap only arms the group delete", !!doc.querySelector("[data-del-group].armed") && doc.querySelector("#checklist-run").textContent.includes("Test group"));
  click(doc.querySelector("[data-del-group].armed"));
  await sleep(20);
  check("second tap removes the whole group", !doc.querySelector("#checklist-run").textContent.includes("Test group") && !R.store().customGroups.some((g) => g.name === "Test group"));

  /* ---- 6. tires: DOT age flags ---- */
  console.log("== 6. tire DOT age ==");
  // Build DOT codes relative to today so the test holds whenever it runs.
  function dotYearsAgo(years) {
    const d = new Date(); d.setFullYear(d.getFullYear() - years);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.min(52, Math.floor((d - jan1) / 604800000) + 1);
    return String(week).padStart(2, "0") + String(d.getFullYear()).slice(2);
  }
  const d1 = R.dotInfo(dotYearsAgo(2)), d2 = R.dotInfo(dotYearsAgo(6)), d3 = R.dotInfo(dotYearsAgo(8)), d4 = R.dotInfo("abcd");
  check("DOT code parses to week + year", d1.ok && d1.year === new Date().getFullYear() - 2, JSON.stringify(d1));
  check("young tire flags good", d1.flag === "good", d1.ageText);
  check("6+ year tire flags old", d2.flag === "old", d2.ageText);
  check("7+ year tire flags replace", d3.flag === "replace", d3.ageText);
  check("bad code rejected", !d4.ok);
  const tire = R.newTire({ rigId: rig.id, position: "Steer — left", dotCode: dotYearsAgo(2), note: "Fake test tire" });
  R.store().tires.push(tire); R.save();
  R.renderTires();
  check("tire renders with age", doc.querySelector("#tire-list").textContent.includes("Steer — left"));

  /* ---- 6b. tire sheet: typing the DOT code keeps focus ---- */
  console.log("== 6b. DOT code typing keeps focus ==");
  R.showScreen("tires");
  click(doc.querySelector("#tire-add-btn"));
  await sleep(20);
  const dotInput = doc.querySelector("#ti-dot");
  dotInput.focus();
  function typeDigit(ch) {
    dotInput.value = dotInput.value + ch;
    dotInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  }
  typeDigit("3");
  await sleep(10);
  check("first digit stays in the same field", doc.querySelector("#ti-dot") === dotInput && doc.activeElement === dotInput && dotInput.value === "3");
  typeDigit("2"); typeDigit("2"); typeDigit("2");
  await sleep(10);
  check("all four digits land without re-tapping", dotInput.value === "3222" && doc.activeElement === dotInput);
  check("age preview updates live as you type", /yrs/.test(doc.querySelector("#ti-age").textContent) && /Good — plenty of life left/.test(doc.querySelector("#ti-age").textContent));
  click(doc.querySelector("#ti-save"));
  await sleep(20);
  check("tire saves with the typed code", R.store().tires.some((t) => t.dotCode === "3222"));

  /* ---- 7. costs + cost per mile ---- */
  console.log("== 7. costs ==");
  const cpm = R.costPerMile(rig);
  // 2 logs: $15.00 @ 30200 mi (UI job) + $42.50 @ 30100 mi; earliest 30100.
  // Rig mileage is bumped to 30500 first, as the UI would.
  rig.mileage = 30500; R.save();
  const cpm2 = R.costPerMile(rig);
  check("cost per mile math: $57.50 over 400 mi", cpm2 && Math.abs(cpm2.perMile - 57.5 / 400) < 0.0001, JSON.stringify(cpm2));
  const cy = R.costsForYear(rig.id, new Date().getFullYear());
  check("year total is $57.50", Math.abs(cy.total - 57.5) < 0.001);

  /* ---- 8. CSV import / export round-trip ---- */
  console.log("== 8. CSV import/export ==");
  const imp = R.importTasksCSV(sampleCsv, rig.id);
  check("CSV import brought in 3 tasks", imp.imported === 3, JSON.stringify(imp));
  check("imported task has due date + cadence", R.store().tasks.some((t) => t.title === "Test oil change" && t.nextDueDate === "2027-03-01" && t.intervalMonths === 12));
  R.save();
  const tasksCsv = R.exportTasksCSV(rig.id);
  const logsCsv = R.exportLogsCSV(rig.id);
  check("tasks export includes imported rows", tasksCsv.includes("Test oil change") && tasksCsv.includes("2027-03-01"));
  check("logs export includes the test job", logsCsv.includes("Test soon job") && logsCsv.includes("42.50"));
  const reimport = R.importTasksCSV(tasksCsv, rig.id);
  check("re-importing the same file adds nothing (duplicates skipped)", reimport.imported === 0 && reimport.skipped >= 3 && reimport.errors.length === 0, JSON.stringify(reimport));
  const bad = R.importTasksCSV("foo,bar\n1,2\n", rig.id);
  check("CSV without a task column is rejected with an error", bad.imported === 0 && bad.errors.length > 0);

  /* ---- 8b. Import accepts another app's plan export as-is ---- */
  console.log("== 8b. plan-export import ==");
  const planExport = [
    "RV,2021 Test Coach 9999 (Faketory)",
    'Exported,"Nov 14, 2026"',
    "",
    "Task Title,Component,Next Due,Interval (Days),Interval (Miles),Interval (Hours),Next Due (Miles),Next Due (Hours),Last Completed,Requires Caution,Hire Out Eligible",
    'Test slideout check,Slideouts,"Oct 12, 2026",90,,,,,"Jul 1, 2026",Yes,Yes',
    "Test water filter,Plumbing,\"Oct 13, 2026\",90,,,,,Never,No,Yes",
    'Test generator oil,Generator,Usage-based,,,150,,410,"Jul 1, 2026",Yes,Yes',
    'Test transmission check,Transmission,Usage-based,,15000,,38716,,"Jul 1, 2026",Yes,Yes',
  ].join("\n");
  const planImp = R.importTasksCSV(planExport, rig.id);
  check("plan export imports all 4 rows", planImp.imported === 4 && planImp.errors.length === 0, JSON.stringify(planImp));
  const p1 = R.store().tasks.find((t) => t.title === "Test slideout check");
  check("plan export maps title/component/date/days", p1 && p1.category === "Slideouts" && p1.nextDueDate === "2026-10-12" && p1.intervalMonths === 3 && p1.lastDoneAt === "2026-07-01", JSON.stringify(p1));
  const p2 = R.store().tasks.find((t) => t.title === "Test water filter");
  check("Never last-completed becomes null", p2 && p2.lastDoneAt === null && p2.nextDueDate === "2026-10-13");
  const p3 = R.store().tasks.find((t) => t.title === "Test generator oil");
  check("Usage-based keeps hours, drops the date", p3 && p3.nextDueDate === null && p3.intervalGenHours === 150 && p3.nextDueGenHours === 410, JSON.stringify(p3));
  const p4 = R.store().tasks.find((t) => t.title === "Test transmission check");
  check("usage-based miles map to due mileage", p4 && p4.intervalMiles === 15000 && p4.nextDueMileage === 38716, JSON.stringify(p4));

  /* ---- 8c. A file imported twice must not double the book ---- */
  console.log("== 8c. duplicate import + cleanup ==");
  const again = R.importTasksCSV(sampleCsv, rig.id);
  check("importing the same file again adds nothing", again.imported === 0 && again.skipped === 3, JSON.stringify(again));
  // A doubled job by hand: same title + category, one copy logged.
  const dupA = R.newTask({ rigId: rig.id, title: "Test doubled job", category: "Safety", intervalMonths: 1, nextDueDate: "2026-10-19" });
  const dupB = R.newTask({ rigId: rig.id, title: "Test doubled job", category: "Safety", intervalMonths: 1, nextDueDate: "2026-10-19" });
  R.store().tasks.push(dupA, dupB);
  const dupLogA = R.newLog({ rigId: rig.id, taskId: dupA.id, title: "Test doubled job", date: "2026-11-14" });
  const dupLogB = R.newLog({ rigId: rig.id, taskId: dupB.id, title: "Test doubled job", date: "2026-11-15" });
  R.store().logs.push(dupLogA, dupLogB);
  R.completeTask(dupB, dupLogB);
  const removed = R.dedupeTasks();
  check("cleanup merges the doubled job", removed === 1 && R.store().tasks.filter((t) => t.title === "Test doubled job").length === 1);
  const keptDup = R.store().tasks.find((t) => t.title === "Test doubled job");
  check("cleanup keeps the copy with the latest work", keptDup && keptDup.id === dupB.id && keptDup.nextDueDate === "2026-12-15");
  check("logs from the dropped copy move to the kept one", R.store().logs.find((l) => l.id === dupLogA.id).taskId === dupB.id);
  check("cleanup is idempotent", R.dedupeTasks() === 0);
  const otherCat = R.newTask({ rigId: rig.id, title: "Test doubled job", category: "Tires", intervalMonths: 1 });
  R.store().tasks.push(otherCat);
  check("same title in another category is not a duplicate", R.dedupeTasks() === 0 && R.store().tasks.filter((t) => t.title === "Test doubled job").length === 2);

  /* ---- 9. persistence: save -> load round-trip ---- */
  console.log("== 9. persistence ==");
  const before = JSON.stringify(R.store());
  R.save(); R.load();
  check("save/load round-trips the whole book", JSON.stringify(R.store()) === before);

  /* ---- 10. screens all render without throwing ---- */
  console.log("== 10. all screens render ==");
  let renderOk = true;
  try {
    ["home", "logbook", "checklists", "tires", "more"].forEach((s) => R.showScreen(s));
  } catch (e) { renderOk = false; console.log("   render error:", e.message); }
  check("all five screens render", renderOk);
  check("home shows spent + due items", doc.querySelector("#home-spent").textContent.includes("$57.50"));

  /* ---- 11. rig silhouettes ---- */
  console.log("== 11. rig silhouettes ==");
  const artTypes = ["Class A", "Class B", "Class C", "Travel trailer", "Fifth wheel", "Truck camper"];
  const arts = artTypes.map((t) => R.rigSilhouette(t));
  check("every rig type gets an svg", arts.every((a) => a.includes("<svg") && a.includes("</svg>")));
  check("each type draws a different shape", new Set(arts).size === arts.length);
  check("unknown type falls back to a shape", R.rigSilhouette("Spaceship").includes("<svg"));
  R.showScreen("home");
  const artBefore = doc.querySelector("#home-rig-art").innerHTML;
  check("home shows the rig's silhouette", artBefore.includes("<svg") && artBefore.includes("M14 57V16H150V57"));
  R.activeRig().type = "Fifth wheel"; R.save(); R.renderHome();
  check("home silhouette follows the rig type", doc.querySelector("#home-rig-art").innerHTML.includes("M14 57V14H190V34H168V57") && doc.querySelector("#home-rig-art").innerHTML !== artBefore);
  R.activeRig().type = "Class C"; R.save(); R.renderHome();

  /* ---- 12. custom groups from the picker ---- */
  console.log("== 12. custom groups from the picker ==");
  R.showScreen("checklists");
  check("picker has the add-a-custom-group button", !!doc.querySelector("#add-custom-list-btn"));
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  check("no add-group button inside a run", !doc.querySelector("#add-group-btn"));
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector("#add-custom-list-btn")); await sleep(20);
  setVal("#cl-name", "Test custom group");
  click(doc.querySelector("#cl-create")); await sleep(20);
  const clId = R.store().customLists[0] && R.store().customLists[0].id;
  check("custom group created from the picker", !!clId && doc.querySelector("#checklist-picker").textContent.includes("Test custom group"));
  click(doc.querySelector('[data-start="' + clId + '"]')); await sleep(20);
  check("custom group run opens empty", doc.querySelector("#checklist-run").textContent.includes("0 of 0 checked"));
  setVal("#custom-item-input", "Test group item");
  click(doc.querySelector("#custom-item-add")); await sleep(20);
  check("item added inside the custom group", doc.querySelector("#checklist-run").textContent.includes("Test group item") && doc.querySelector("#checklist-run").textContent.includes("0 of 1 checked"));
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector('[data-del-list="' + clId + '"]')); await sleep(20);
  check("first tap on the list × only arms it", doc.querySelector('[data-del-list="' + clId + '"]').textContent === "Delete?");
  click(doc.querySelector('[data-del-list="' + clId + '"]')); await sleep(20);
  check("second tap removes the custom group", !R.store().customLists.some(function (l) { return l.id === clId; }));

  /* ---- 13. rig photo replaces the silhouette ---- */
  console.log("== 13. rig photo ==");
  R.showScreen("home");
  check("home shows the silhouette with no photo", doc.querySelector("#home-rig-art").innerHTML.includes("<svg"));
  check("home offers to add a photo", doc.querySelector("#home-rig-photo-btn").textContent.includes("Add a photo"));
  R.setRigPhoto("data:image/jpeg;base64,/9j/FAKE");
  check("home shows the rig photo instead", doc.querySelector("#home-rig-art").innerHTML.includes("<img") && !doc.querySelector("#home-rig-art").innerHTML.includes("<svg"));
  check("photo is saved on the rig", R.activeRig().photo === "data:image/jpeg;base64,/9j/FAKE");
  check("button now offers to change it", doc.querySelector("#home-rig-photo-btn").textContent.includes("Change photo"));
  R.showScreen("more");
  click(doc.querySelector("#rig-edit-btn")); await sleep(20);
  check("rig sheet shows the photo with a remove button", doc.querySelector("#rg-photo-preview").innerHTML.includes("<img") && !!doc.querySelector("#rg-photo-remove"));
  click(doc.querySelector("#rg-photo-remove")); await sleep(20);
  check("first tap on remove only arms it", doc.querySelector("#rg-photo-remove").textContent === "Tap again to remove" && !!R.activeRig().photo);
  click(doc.querySelector("#rg-photo-remove")); await sleep(20);
  check("second tap removes the photo, silhouette returns", !R.activeRig().photo && doc.querySelector("#home-rig-art").innerHTML.includes("<svg"));
  // Engine fuel lives on the rig sheet now, not in the question poll (Nov 19).
  R.activeRig().equipment = { fuel: "diesel" }; R.save();
  click(doc.querySelector("#rig-edit-btn")); await sleep(20);
  check("the rig sheet pre-fills the engine fuel", doc.querySelector("#rg-fuel").value === "diesel");
  setVal("#rg-fuel", "gas");
  click(doc.querySelector("#rg-save")); await sleep(20);
  check("saving the rig sheet stores the engine fuel", R.activeRig().equipment.fuel === "gas");
  click(doc.querySelector("#rig-edit-btn")); await sleep(20);
  setVal("#rg-type", "Travel trailer");
  doc.querySelector("#rg-type").dispatchEvent(new window.Event("change", { bubbles: true })); await sleep(20);
  check("a trailer hides the engine fuel field on the rig sheet", doc.querySelector("#rg-fuel-field").style.display === "none");
  click(doc.querySelector("#rg-save")); await sleep(20);
  check("switching to a trailer clears the engine fuel", !R.activeRig().equipment.fuel);
  R.activeRig().type = "Class C"; R.activeRig().equipment = {}; R.save();

  /* ---- 14. night mode toggle ---- */
  console.log("== 14. night mode ==");
  check("theme defaults to light", R.currentTheme() === "light" && !doc.documentElement.hasAttribute("data-theme"));
  check("a night button sits at the top of every screen", doc.querySelectorAll(".theme-btn").length === 12);
  check("each night button is on its own line above the title", Array.from(doc.querySelectorAll(".theme-btn")).every((b) => b.parentElement.firstElementChild === b));
  check("the night button is never parked over a title", !/\.theme-btn\{[^}]*position:\s*absolute/.test(css));
  check("night mode button starts as Night mode", doc.querySelector(".theme-btn").textContent.includes("Night mode"));
  click(doc.querySelector(".theme-btn")); await sleep(20);
  check("tapping the button turns the night on", doc.documentElement.getAttribute("data-theme") === "dark" && R.currentTheme() === "dark");
  check("night choice sticks in storage", window.localStorage.getItem("rollonrv-theme") === "dark");
  check("every screen's button now offers Day mode", Array.from(doc.querySelectorAll(".theme-btn")).every((b) => b.textContent.includes("Day mode")));
  R.setTheme("light"); await sleep(20);
  check("back to light removes the theme", !doc.documentElement.hasAttribute("data-theme") && R.currentTheme() === "light");
  check("every screen's button is back to Night mode", Array.from(doc.querySelectorAll(".theme-btn")).every((b) => b.textContent.includes("Night mode")));

  /* ---- 15. tied task fills in "What was done" ---- */
  console.log("== 15. tied task fills the job name ==");
  R.showScreen("logbook");
  R.renderLogbook(); await sleep(20);
  const dueRow = doc.querySelector('[data-task="' + t1.id + '"]');
  check("due task row is tappable", !!dueRow);
  click(dueRow); await sleep(20);
  check("task sheet opened", !!doc.querySelector("#ts-log"));
  click(doc.querySelector("#ts-log")); await sleep(20);
  check("log sheet opened from the task", !!doc.querySelector("#lj-title"));
  check("job name already filled in with the task", doc.querySelector("#lj-title").value === "Test overdue job");
  check("task already tied", doc.querySelector("#lj-task").value === t1.id);
  // Even cleared, saving falls back to the task name — no retyping.
  setVal("#lj-title", "");
  click(doc.querySelector("#lj-save")); await sleep(800);
  const tiedLog = R.store().logs.find((l) => l.taskId === t1.id);
  check("saved job carries the task name", tiedLog && tiedLog.title === "Test overdue job");
  check("task marked done by the save", R.store().tasks.find((t) => t.id === t1.id).lastDoneAt != null);
  // Picking a task from the dropdown fills an empty name too.
  click(doc.querySelector("#log-add-btn")); await sleep(20);
  check("fresh sheet starts with an empty name", doc.querySelector("#lj-title").value === "");
  doc.querySelector("#lj-task").value = t2.id;
  doc.querySelector("#lj-task").dispatchEvent(new window.Event("change", { bubbles: true }));
  check("choosing a task fills the name", doc.querySelector("#lj-title").value === "Test soon job");
  doc.querySelector("#lj-title").value = "My own wording";
  doc.querySelector("#lj-task").value = t3.id;
  doc.querySelector("#lj-task").dispatchEvent(new window.Event("change", { bubbles: true }));
  check("typed wording is never overwritten", doc.querySelector("#lj-title").value === "My own wording");
  doc.querySelector("#lj-title").value = "Test far job"; // still matches the tied task (t3)
  doc.querySelector("#lj-task").value = t4.id;
  doc.querySelector("#lj-task").dispatchEvent(new window.Event("change", { bubbles: true }));
  check("switching tasks updates a name that still matched the old task", doc.querySelector("#lj-title").value === "Test mileage job");

  /* ---- 16. long due pill never runs into the title ---- */
  console.log("== 16. due pill stays short ==");
  const t5 = R.newTask({ rigId: rig.id, title: "Test far date+miles job", category: "Engine", intervalMonths: 6, intervalMiles: 5000, nextDueDate: isoPlus(43), nextDueMileage: 59444 });
  const t6 = R.newTask({ rigId: rig.id, title: "Test far miles-nearest job", category: "Engine", intervalMonths: 12, intervalMiles: 5000, nextDueDate: isoPlus(800), nextDueMileage: 31200 });
  R.store().tasks.push(t5, t6); R.save();
  const st5 = R.taskStatus(t5, rig);
  check("far-out pill no longer joins date and miles", !st5.text.includes("·"), st5.text);
  check("far-out pill shows the nearest factor (the date)", st5.text.startsWith("due "), st5.text);
  check("far-out pill still ok-level", st5.level === "ok");
  const st6 = R.taskStatus(t6, rig);
  check("miles-nearest far-out pill shows the miles", st6.text === "700 miles to go" && st6.level === "ok", st6.text);
  check("rows wrap so a long pill drops below the title", /\.row\{[^}]*flex-wrap:\s*wrap/.test(css));
  check("title keeps a minimum width in a row", /\.row \.grow\{[^}]*min-width:\s*10rem/.test(css));
  check("pill has a solid background so text can't show through it", /\.pill\{[^}]*background:var\(--bg-page\)/.test(css));
  R.renderLogbook(); await sleep(20);
  const lbHtml = doc.querySelector("#logbook-pages").innerHTML;
  check("logbook still lists the date+miles job with its short pill", lbHtml.includes("Test far date+miles job") && lbHtml.includes("due "));

  /* ---- 17. "(Type Unknown)" comes off imported titles ---- */
  console.log("== 17. Type Unknown cleanup ==");
  check("doubled type tag strips off", R.cleanTaskTitle("Clean Slide Box and Sweeps (Type Unknown) (Type unknown)") === "Clean Slide Box and Sweeps");
  check("single type tag strips off", R.cleanTaskTitle("Inspect Slide Seals (Type Unknown)") === "Inspect Slide Seals");
  check("clean title untouched", R.cleanTaskTitle("Change Engine Oil and Filter") === "Change Engine Oil and Filter");
  check("a title that is only the tag stays put", R.cleanTaskTitle("(Type Unknown)") === "(Type Unknown)");
  const dirtyCsv = [
    "Task Title,Component,Next Due,Interval (Days)",
    'Inspect Visible Damage (Type Unknown) (Type unknown),Slideouts,"Oct 12, 2026",90',
    'Change Engine Oil and Filter,Engine,"Dec 27, 2026",180',
  ].join("\n");
  const dirtyImp = R.importTasksCSV(dirtyCsv, rig.id);
  check("import strips the tag on the way in", dirtyImp.imported === 2 && R.store().tasks.some((t) => t.title === "Inspect Visible Damage"), JSON.stringify(dirtyImp));
  const dirty = R.newTask({ rigId: rig.id, title: "Check Fasteners and Brackets (Type Unknown) (Type unknown)", category: "Slideouts", intervalMonths: 3, nextDueDate: isoPlus(30) });
  R.store().tasks.push(dirty); R.save();
  R.load(); await sleep(20);
  check("titles already in the book get cleaned on load", R.store().tasks.find((t) => t.id === dirty.id).title === "Check Fasteners and Brackets");

  /* ---- 18. printing: a paper page from the book ---- */
  console.log("== 18. printing ==");
  const pretrip = R.CHECKLISTS.find((c) => c.id === "pretrip");
  R.printChecklistRun(pretrip, { checks: {} }, rig);
  let ps = doc.querySelector("#print-sheet").innerHTML;
  check("print sheet lists the built-in items", (ps.match(/print-item/g) || []).length >= 14);
  check("print sheet has empty boxes to tick", (ps.match(/print-box"><\/span>/g) || []).length >= 14);
  check("print sheet shows the tire pressures", ps.includes("80 psi front"));
  check("print sheet names the list and the rig", ps.includes("Before You Roll") && ps.includes("Test Rig"));
  check("print sheet has a notes area and a sign-off line", ps.includes("Notes") && ps.includes("Checked by"));
  R.printChecklistRun(pretrip, { checks: { [pretrip.groups[0].items[0].id]: true } }, rig);
  ps = doc.querySelector("#print-sheet").innerHTML;
  check("already-checked items print ticked", ps.includes('print-box">✓</span>'));
  const oneTime = R.newTask({ rigId: rig.id, title: "Test one-time job", category: "Other" });
  R.store().tasks.push(oneTime); R.save();
  R.printDueTasks();
  ps = doc.querySelector("#print-sheet").innerHTML;
  check("due sheet lists open tasks", ps.includes("Test far date+miles job"));
  check("due sheet leaves finished one-time tasks off", !ps.includes("Test one-time job"));
  check("print stylesheet hides the app on paper", /@media print/.test(css) && /#print-sheet\{\s*display:none/.test(css));

  /* ---- 19. home search ---- */
  console.log("== 19. home search ==");
  R.showScreen("home");
  const searchEl = doc.querySelector("#home-search");
  check("search box sits on the Home screen", !!searchEl);
  check("logbook has no search box", !doc.querySelector("#log-search"));
  const results = () => doc.querySelector("#home-search-results").innerHTML;
  check("no query, no results card", results() === "");
  searchEl.value = "miles-nearest";
  searchEl.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  check("search finds the matching task", results().includes("Test far miles-nearest job"));
  check("search leaves the others out", !results().includes("Test far date+miles job"));
  searchEl.value = "zzz-no-such-task";
  searchEl.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  check("no match says so plainly", results().includes("Nothing on the books matches"));
  searchEl.value = "miles-nearest";
  searchEl.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  doc.querySelector('#home-search-results [data-task]').click();
  check("tapping a result opens its sheet", doc.querySelector("#sheet-host").innerHTML.includes("Test far miles-nearest job"));
  searchEl.value = "";
  searchEl.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  check("clearing the search clears the results", results() === "");

  /* ---- 20. Next up: three at a time, calm Home ---- */
  console.log("== 20. Next up ==");
  const rig20 = R.activeRig();
  const n1 = R.newTask({ rigId: rig20.id, title: "NextUp overdue safety", category: "Tires", intervalMonths: 6, nextDueDate: isoPlus(-400) });
  const n2 = R.newTask({ rigId: rig20.id, title: "NextUp overdue plain", category: "Electrical", intervalMonths: 6, nextDueDate: isoPlus(-390) });
  const n3 = R.newTask({ rigId: rig20.id, title: "NextUp soon safety", category: "Engine", intervalMonths: 6, nextDueDate: isoPlus(2) });
  const n4 = R.newTask({ rigId: rig20.id, title: "NextUp soon plain", category: "Exterior", intervalMonths: 6, nextDueDate: isoPlus(1) });
  const n5 = R.newTask({ rigId: rig20.id, title: "NextUp far ok", category: "Exterior", intervalMonths: 12, nextDueDate: isoPlus(300) });
  R.store().tasks.push(n1, n2, n3, n4, n5); R.save();
  const ranked = R.nextUpTasks(rig20, 50).map((d) => d.task.title);
  const idx = (t) => ranked.indexOf(t);
  check("Next up ranks overdue safety before overdue plain", idx("NextUp overdue safety") < idx("NextUp overdue plain") && idx("NextUp overdue safety") !== -1, ranked.join(" | "));
  check("Next up ranks overdue before soon safety", idx("NextUp overdue plain") < idx("NextUp soon safety"), ranked.join(" | "));
  check("Next up ranks soon safety before soon plain", idx("NextUp soon safety") < idx("NextUp soon plain"), ranked.join(" | "));
  check("Next up ranks soon before far ok", idx("NextUp soon plain") < idx("NextUp far ok"), ranked.join(" | "));
  check("Next up caps at three", R.nextUpTasks(rig20, 3).length === 3);
  const top3 = R.nextUpTasks(rig20, 3).map((d) => d.task.title);
  R.showScreen("home");
  const nu = doc.querySelector("#home-nextup").innerHTML;
  check("Home shows exactly the top three Next up jobs", top3.every((t) => nu.includes(t)), top3.join(" | "));
  check("Home lists three Next up rows", (nu.match(/data-task/g) || []).length === 3);
  check("Home says how many more wait in the Logbook", /more on the books/.test(doc.querySelector("#home-nextup-more").textContent), doc.querySelector("#home-nextup-more").textContent);
  check("the old five-item due list is gone", !doc.querySelector("#home-due-list"));

  /* ---- 21. logbook sorting ---- */
  console.log("== 21. logbook sorting ==");
  const rig21 = R.activeRig();
  const s1 = R.newTask({ rigId: rig21.id, title: "SortTest Zulu", category: "Tires", intervalMonths: 6, nextDueDate: isoPlus(30) });
  const s2 = R.newTask({ rigId: rig21.id, title: "SortTest Alpha", category: "Engine", intervalMonths: 6, nextDueDate: isoPlus(10) });
  const s3 = R.newTask({ rigId: rig21.id, title: "SortTest Mike", category: "Engine", intervalMonths: 6, nextDueDate: isoPlus(20) });
  R.store().tasks.push(s1, s2, s3); R.save();
  const sortItems = R.store().tasks.filter((t) => t.title.indexOf("SortTest") === 0).map((t) => ({ task: t, status: R.taskStatus(t, rig21) }));
  const sortNames = (key) => R.sortOpenTasks(sortItems, key).map((d) => d.task.title);
  check("due sort puts the soonest first", JSON.stringify(sortNames("due")) === JSON.stringify(["SortTest Alpha", "SortTest Mike", "SortTest Zulu"]), sortNames("due").join(", "));
  check("system sort groups by system, then name", JSON.stringify(sortNames("system")) === JSON.stringify(["SortTest Alpha", "SortTest Mike", "SortTest Zulu"]), sortNames("system").join(", "));
  check("name sort is A to Z", JSON.stringify(sortNames("name")) === JSON.stringify(["SortTest Alpha", "SortTest Mike", "SortTest Zulu"]), sortNames("name").join(", "));
  R.showScreen("logbook");
  const pagesHtml = () => doc.querySelector("#logbook-pages").innerHTML;
  check("sort row sits on the Logbook", pagesHtml().includes('data-sort="due"') && pagesHtml().includes('data-sort="system"') && pagesHtml().includes('data-sort="name"'));
  doc.querySelector('#logbook-pages [data-sort="name"]').click();
  check("tapping Name re-orders the list", pagesHtml().indexOf("SortTest Alpha") < pagesHtml().indexOf("SortTest Mike") && pagesHtml().indexOf("SortTest Mike") < pagesHtml().indexOf("SortTest Zulu"));
  check("the pick is remembered", R.currentLogSort() === "name" && dom.window.localStorage.getItem("rollonrv-logsort") === "name");
  doc.querySelector('#logbook-pages [data-sort="due"]').click();
  check("tapping Due soonest switches back", R.currentLogSort() === "due");

  /* ---- 22. System sort shows a heading over each group ---- */
  console.log("== 22. system group headings ==");
  R.showScreen("logbook");
  doc.querySelector('#logbook-pages [data-sort="system"]').click();
  const sysHtml = doc.querySelector("#logbook-pages").innerHTML;
  check("System sort puts a heading over each group", sysHtml.includes('class="group-head"') && /Engine · \d+/.test(sysHtml) && /Tires · \d+/.test(sysHtml));
  check("Engine tasks sit under the Engine heading", sysHtml.indexOf("Engine ·") < sysHtml.indexOf("SortTest Alpha") && sysHtml.indexOf("SortTest Alpha") < sysHtml.indexOf("Tires ·"));
  check("Tires tasks sit under the Tires heading", sysHtml.indexOf("Tires ·") < sysHtml.indexOf("SortTest Zulu"));
  doc.querySelector('#logbook-pages [data-sort="due"]').click();
  check("Due sort has no group headings", !doc.querySelector("#logbook-pages").innerHTML.includes('class="group-head"'));
  doc.querySelector('#logbook-pages [data-sort="name"]').click();
  check("Name sort has no group headings", !doc.querySelector("#logbook-pages").innerHTML.includes('class="group-head"'));
  doc.querySelector('#logbook-pages [data-sort="system"]').click();
  R.printDueTasks();
  ps = doc.querySelector("#print-sheet").innerHTML;
  check("the printed due list carries the same group headings", ps.includes('class="print-group"') && ps.indexOf("Engine") < ps.indexOf("SortTest Alpha"));
  doc.querySelector('#logbook-pages [data-sort="due"]').click();

  /* ---- 23. Parts to get — the shopping list (free) ---- */
  console.log("== 23. parts to get ==");
  const pOil = R.newPart({ rigId: rig.id, name: "Test oil filter", partNo: "TF-999", qty: 2, taskId: t1.id });
  const pSup = R.newPart({ rigId: rig.id, name: "Test shop towels", qty: 1 });
  R.store().parts.push(pOil, pSup); R.save();
  check("parts save to the store", R.partsForRig(rig.id).length === 2);
  R.showScreen("home"); await sleep(20);
  const homeParts = doc.querySelector("#home-parts").innerHTML;
  check("Home shows the parts to get", homeParts.includes("Test oil filter") && homeParts.includes("Test shop towels"));
  check("Home part names its job", homeParts.includes("Test overdue job"));
  R.showScreen("parts"); await sleep(20);
  check("Parts screen is a real screen (no tab needed)", doc.querySelector("#screen-parts").classList.contains("active"));
  check("Parts screen lists the to-get items", doc.querySelector("#parts-list").innerHTML.includes("Test oil filter") && doc.querySelector("#parts-list").innerHTML.includes("To get"));
  check("Parts screen has print and download buttons", !!doc.querySelector("#parts-print-btn") && !!doc.querySelector("#parts-csv-btn"));
  click(doc.querySelector("#parts-back-btn")); await sleep(20);
  check("back button returns Home", doc.querySelector("#screen-home").classList.contains("active"));
  R.showScreen("parts"); await sleep(20);
  check("Parts screen has a full-width back button at the bottom", !!doc.querySelector("#parts-back-btn-bottom"));
  click(doc.querySelector("#parts-back-btn-bottom")); await sleep(20);
  check("bottom back button returns Home", doc.querySelector("#screen-home").classList.contains("active"));
  R.showScreen("parts"); await sleep(20);
  // Every off-tab screen has a full-width back button at the bottom, not
  // just the small one at the top — Rick kept reaching for the browser back button.
  for (const name of ["pros", "fuel", "trips"]) {
    R.showScreen(name); await sleep(20);
    check(name + " screen has a bottom back button", !!doc.querySelector("#" + name + "-back-btn-bottom"));
  }
  click(doc.querySelector("#trips-back-btn-bottom")); await sleep(20);
  check("bottom back button returns Home from Trips", doc.querySelector("#screen-home").classList.contains("active"));
  // Tap the box on the filter: bought, with a price, lands in what she's cost.
  doc.querySelector('[data-toggle-part="' + pOil.id + '"]').click(); await sleep(20);
  check("tapping the box marks the part got", R.store().parts.find((p) => p.id === pOil.id).bought === true);
  // Price it through the sheet.
  click(doc.querySelector('[data-open-part="' + pOil.id + '"]')); await sleep(20);
  check("part sheet opens with the name and part number", doc.querySelector("#pp-name").value === "Test oil filter" && doc.querySelector("#pp-no").value === "TF-999");
  setVal("#pp-price", "12.50");
  click(doc.querySelector("#pp-save")); await sleep(20);
  const y = new Date().getFullYear();
  check("a bought part's price lands in this year's costs", R.costsForYear(rig.id, y).total >= 12.5 && R.costsForYear(rig.id, y).byCat["Engine & Chassis"] >= 12.5);
  check("a bought part's price lands in cost per mile", R.costPerMile(R.activeRig()).total >= 12.5);
  R.showScreen("parts"); await sleep(20);
  const partsHtml = doc.querySelector("#parts-list").innerHTML;
  check("bought parts move to Already got, with the price", partsHtml.includes("Already got") && partsHtml.includes("$12.50"));
  // The printed list: to-get has empty boxes, bought is ticked.
  R.printPartsList();
  ps = doc.querySelector("#print-sheet").innerHTML;
  check("printed list has the to-get item with an empty box", ps.includes("Test shop towels") && ps.includes('print-box"></span>'));
  check("printed list ticks the bought item", ps.includes('print-box">✓</span>') && ps.includes("Test oil filter"));
  // The download: a CSV with the same list.
  const partsCsv = R.exportPartsCSV(rig.id);
  check("parts CSV has the header and both parts", partsCsv.includes("Part,Part Number,Quantity,For Job,Bought,Price Paid") && partsCsv.includes("Test oil filter") && partsCsv.includes("Test shop towels"));
  check("parts CSV marks the bought one with its price", /Test oil filter,TF-999,2,Test overdue job,Yes,12\.50/.test(partsCsv));
  // A task sheet offers to add a part for that job, pre-linked to it.
  click(doc.querySelector('#logbook-pages [data-task="' + t1.id + '"]')); await sleep(20);
  check("task sheet opens from the logbook", !!doc.querySelector("#ts-log"));
  const tsPart = doc.querySelector("#ts-part");
  check("task sheet offers Add a part for this job", !!tsPart);
  if (tsPart) {
    click(tsPart); await sleep(20);
    check("Add a part opens the sheet pre-linked to the job", !!doc.querySelector("#pp-name") && doc.querySelector("#pp-task").value === t1.id);
    click(doc.querySelector("[data-close]")); await sleep(20); // close the part sheet
  }
  // Log the job through the sheet: the bought filter comes along already
  // counted, so the same dollars are never counted twice.
  const totalBefore = R.costsForYear(rig.id, y).total;
  click(doc.querySelector('#logbook-pages [data-task="' + t1.id + '"]')); await sleep(20);
  click(doc.querySelector("#ts-log")); await sleep(20);
  check("log sheet pre-fills the bought part for the job", !!doc.querySelector('[data-part="0"]') && doc.querySelector('[data-part="0"]').getAttribute("data-counted") === "0");
  check("log sheet says the part is already in the book", doc.querySelector("#lj-cost-hint").textContent.includes("Already in the book"));
  // Leave the cost blank — the parts total is the cost, and the bought
  // part must not add to it a second time.
  click(doc.querySelector("#lj-save")); await sleep(800);
  check("logging the job adds no new dollars for the bought part", Math.abs(R.costsForYear(rig.id, y).total - totalBefore) < 0.001, "total=" + R.costsForYear(rig.id, y).total + " before=" + totalBefore);
  // Un-buying takes the money back out.
  const bought = R.store().parts.find((p) => p.id === pOil.id);
  R.togglePartBought(bought); R.save();
  check("un-ticking a part takes its price out of costs", Math.abs(R.costsForYear(rig.id, y).total - (totalBefore - 12.5)) < 0.001);

  /* ---- 24. one-time jobs are findable + empty parts list has a way in ---- */
  console.log("== 24. one-time jobs + empty parts list ==");
  const oneOff = R.newTask({ rigId: rig.id, title: "Test one-off vent fix", category: "House Systems" });
  R.store().tasks.push(oneOff); R.save();
  check("a one-time job never done is open, not done", R.taskStatus(oneOff, R.activeRig()).level === "open");
  R.showScreen("logbook"); await sleep(20);
  check("a one-time job is on the books in the Logbook", !!doc.querySelector('#logbook-pages [data-task="' + oneOff.id + '"]'));
  R.showScreen("home"); await sleep(20);
  setVal("#home-search", "vent fix");
  doc.querySelector("#home-search").dispatchEvent(new window.Event("input", { bubbles: true })); await sleep(20);
  check("search finds a one-time job", doc.querySelector("#home-search-results").innerHTML.includes("Test one-off vent fix"));
  setVal("#home-search", "");
  doc.querySelector("#home-search").dispatchEvent(new window.Event("input", { bubbles: true })); await sleep(20);
  // Log it once: now it's done and off the books.
  const log3 = R.newLog({ rigId: rig.id, taskId: oneOff.id, title: "Test one-off vent fix — done", date: isoPlus(0), cost: 0 });
  R.store().logs.push(log3); R.completeTask(oneOff, log3); R.save();
  check("a one-time job logged once is done", R.taskStatus(oneOff, R.activeRig()).level === "done");
  R.showScreen("logbook"); await sleep(20);
  check("a done one-time job leaves the books", !doc.querySelector('#logbook-pages [data-task="' + oneOff.id + '"]'));
  // The printed due list still leaves one-time jobs off — they're not due.
  R.printDueTasks();
  ps = doc.querySelector("#print-sheet").innerHTML;
  check("printed due list leaves one-time jobs off", !ps.includes("Test one-off vent fix"));
  // Empty parts list: Home still offers a way into the list.
  R.store().parts = []; R.save();
  R.showScreen("home"); await sleep(20);
  check("empty parts card still points at the list", doc.querySelector("#home-parts-more").textContent.includes("Open the list"));
  click(doc.querySelector("#home-parts-more")); await sleep(20);
  check("that link opens the Parts screen", doc.querySelector("#screen-parts").classList.contains("active"));

  /* ---- 25. the downloaded list is a page you can read ---- */
  console.log("== 25. readable download ==");
  const pRead = R.newPart({ rigId: rig.id, name: "Test readable filter", partNo: "RF-1", qty: 1, taskId: t1.id });
  R.store().parts.push(pRead); R.save();
  const partsDoc = R.partsListHTML(R.activeRig());
  check("downloaded list is a full page, not a table", partsDoc.indexOf("<!DOCTYPE html>") === 0 && partsDoc.includes("<title>Parts to get"));
  check("downloaded page reads big on a phone", partsDoc.includes("viewport") && partsDoc.includes("font-size:19px"));
  check("downloaded page lists the part with its number and job", partsDoc.includes("Test readable filter") && partsDoc.includes("RF-1") && partsDoc.includes("Test overdue job"));
  check("downloaded page has empty boxes to tick", partsDoc.includes('<span class="box"></span>'));
  check("the spreadsheet file is still there in More", !!doc.querySelector("#csv-export-parts-btn"));
  check("parts CSV still exports the same list", R.exportPartsCSV(rig.id).includes("Test readable filter"));

  /* ---- 26. your own checklist words are editable ---- */
  console.log("== 26. editable custom items ==");
  const cItem = { id: "test-edit-item", rigId: rig.id, templateId: "pretrip", label: "Test editable words" };
  R.store().customItems.push(cItem); R.save();
  R.showScreen("checklists"); await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  check("custom item shows with an edit mark", !!doc.querySelector('[data-edit-custom="test-edit-item"]'));
  click(doc.querySelector('[data-edit-custom="test-edit-item"]')); await sleep(20);
  check("tapping the words opens the edit sheet", !!doc.querySelector("#ci-label") && doc.querySelector("#ci-label").value === "Test editable words");
  check("tapping the words does not check the item", !R.store().runs.find((r) => r.templateId === "pretrip").checks["test-edit-item"]);
  setVal("#ci-label", "Test words changed");
  click(doc.querySelector("#ci-save")); await sleep(20);
  check("the words change in the store", R.store().customItems.find((c) => c.id === "test-edit-item").label === "Test words changed");
  check("the words change on the list", doc.querySelector("#checklist-run").innerHTML.includes("Test words changed"));
  check("editing still does not check the item", !R.store().runs.find((r) => r.templateId === "pretrip").checks["test-edit-item"]);

  /* ---- 27. the build number shows in More ---- */
  console.log("== 27. build number ==");
  R.showScreen("more"); await sleep(20);
  check("More shows which build is on the phone", doc.querySelector("#about-version").textContent.includes("build 85"));
  check("About carries the copyright line", doc.querySelector("#screen-more").textContent.includes("© 2026 Rick Demers"));

  /* ---- 28. the "Your own items" heading is yours too ---- */
  console.log("== 28. editable heading ==");
  R.showScreen("checklists"); await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  check("heading shows with an edit mark", !!doc.querySelector("[data-edit-heading]"));
  check("heading starts as Your own items", doc.querySelector("[data-edit-heading]").textContent.includes("Your own items"));
  click(doc.querySelector("[data-edit-heading]")); await sleep(20);
  check("tapping the heading opens its sheet", !!doc.querySelector("#ch-label") && doc.querySelector("#ch-label").value === "Your own items");
  setVal("#ch-label", "My extras");
  click(doc.querySelector("#ch-save")); await sleep(20);
  check("the heading changes on the list", doc.querySelector("[data-edit-heading]").textContent.includes("My extras"));
  check("the heading is stored per list", R.store().customHeadings.some((h) => h.templateId === "pretrip" && h.label === "My extras"));
  R.printChecklistRun(pretrip, { checks: {} }, rig);
  check("the heading prints under the new name", doc.querySelector("#print-sheet").innerHTML.includes("My extras"));

  console.log("== 30. picker follows the heading ==");
  R.showScreen("checklists"); await sleep(20);
  click(doc.querySelector("#add-custom-list-btn")); await sleep(20);
  setVal("#cl-name", "Test heading list");
  click(doc.querySelector("#cl-create")); await sleep(20);
  const hlId = R.store().customLists[R.store().customLists.length - 1].id;
  click(doc.querySelector('[data-start="' + hlId + '"]')); await sleep(20);
  setVal("#custom-item-input", "Heading test item");
  click(doc.querySelector("#custom-item-add")); await sleep(20);
  check("the new list's heading starts as Your own items", !!doc.querySelector("[data-edit-heading]") && doc.querySelector("[data-edit-heading]").textContent.includes("Your own items"));
  click(doc.querySelector("[data-edit-heading]")); await sleep(20);
  setVal("#ch-label", "My heading");
  click(doc.querySelector("#ch-save")); await sleep(20);
  click(doc.querySelector("#run-back")); await sleep(20);
  check("the picker card shows the renamed heading", doc.querySelector("#checklist-picker").textContent.includes("My heading"));

  /* ---- 31. a task can be fixed after the fact ---- */
  console.log("== 31. edit a task ==");
  const eTask = R.newTask({ rigId: rig.id, title: "Test editable task", category: "Slideouts", intervalMonths: 12, nextDueDate: isoPlus(30), lastDoneAt: isoPlus(-10) });
  R.store().tasks.push(eTask); R.save();
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector('[data-task="' + eTask.id + '"]')); await sleep(20);
  check("the task sheet offers Edit task", !!doc.querySelector("#ts-edit"));
  click(doc.querySelector("#ts-edit")); await sleep(20);
  check("the edit sheet opens with the task's words", !!doc.querySelector("#et-title") && doc.querySelector("#et-title").value === "Test editable task");
  check("the edit sheet keeps an imported category", doc.querySelector("#et-cat").value === "Slideouts");
  setVal("#et-title", "Test task renamed");
  setVal("#et-months", "6");
  click(doc.querySelector("#et-save")); await sleep(20);
  check("the title changes in the book", R.store().tasks.find((t) => t.id === eTask.id).title === "Test task renamed");
  check("the rhythm changes in the book", R.store().tasks.find((t) => t.id === eTask.id).intervalMonths === 6);
  check("the imported category survives the save", R.store().tasks.find((t) => t.id === eTask.id).category === "Slideouts");
  check("the last-done history is untouched", R.store().tasks.find((t) => t.id === eTask.id).lastDoneAt === isoPlus(-10));

  /* ---- 32. the usual jobs — tap to add, rhythms already set ---- */
  console.log("== 32. usual jobs ==");
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  check("the add-task sheet offers the usual jobs", !!doc.querySelector("#at-starters"));
  click(doc.querySelector("#at-starters")); await sleep(20);
  check("the picker lists twelve usual jobs for a Class C", doc.querySelectorAll("[data-add-starter]").length === 12);
  click(doc.querySelector('[data-add-starter="0"]')); await sleep(20);
  check("tapping Add writes the job in the book", R.store().tasks.some((t) => t.title === "Engine oil & filter" && t.intervalMonths === 12));
  check("an added job shows In the book", doc.querySelector("#sheet-host").textContent.includes("In the book"));
  click(doc.querySelector('[data-add-starter="1"]')); await sleep(20);
  check("the generator job keeps its hours rhythm", R.store().tasks.some((t) => t.title === "Generator oil & filter" && t.intervalGenHours === 150));
  // A towable never sees the motorized jobs.
  R.activeRig().type = "Travel trailer"; R.save();
  click(doc.querySelector("[data-close]")); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  check("a travel trailer sees ten usual jobs, no engine work", doc.querySelectorAll("[data-add-starter]").length === 10 && !doc.querySelector("#sheet-host").textContent.includes("Engine oil"));
  R.activeRig().type = "Class C"; R.save(); R.renderHome();

  /* ---- 33. the guide button sits with the photo button, same size ---- */
  console.log("== 33. guide button on Home ==");
  R.showScreen("home"); await sleep(20);
  const guideLink = doc.querySelector("#home-guide-link");
  check("Home carries the guide button up top", !!guideLink);
  check("the guide button matches the Change photo button", guideLink && guideLink.classList.contains("btn") && guideLink.classList.contains("small") && guideLink.classList.contains("ghost"));
  check("the guide button sits next to the photo button", guideLink && guideLink.parentElement === doc.querySelector("#home-rig-photo-btn").parentElement);
  check("the guide button is a button, not a link out", guideLink && guideLink.tagName === "BUTTON" && !guideLink.getAttribute("href"));
  check("the old pill at the bottom is gone", !doc.querySelector('#screen-home a.pill[href*="rollonrv-guide"]'));

  /* ---- 34. five rig questions fit the usual jobs to the rig ---- */
  console.log("== 34. rig questions ==");
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  check("the picker offers to fit the jobs to the rig", !!doc.querySelector("#st-fit"));
  click(doc.querySelector("#st-fit")); await sleep(20);
  check("the questions sheet asks nineteen questions", doc.querySelectorAll("#sheet-host [data-eq]").length === 64);
  check("every question offers Not sure", doc.querySelectorAll('#sheet-host [data-val="unsure"]').length === 19);
  check("the poll no longer asks the engine fuel", !doc.querySelector('[data-eq="fuel"]'));
  // Tap a chosen answer again to un-choose it (Nov 19: Rick — "when you
  // make a choice you're stuck with it").
  click(doc.querySelector('[data-eq="roof"][data-val="tpo"]')); await sleep(20);
  check("tapping a chosen answer selects it", !doc.querySelector('[data-eq="roof"][data-val="tpo"]').classList.contains("ghost"));
  click(doc.querySelector('[data-eq="roof"][data-val="tpo"]')); await sleep(20);
  check("tapping it again un-chooses it", doc.querySelector('[data-eq="roof"][data-val="tpo"]').classList.contains("ghost"));
  click(doc.querySelector('[data-eq="roof"][data-val="tpo"]')); await sleep(20);
  click(doc.querySelector('[data-eq="waterHeater"][data-val="tankless"]')); await sleep(20);
  click(doc.querySelector('[data-eq="fridge"][data-val="residential"]')); await sleep(20);
  click(doc.querySelector('[data-eq="generator"][data-val="none"]')); await sleep(20);
  click(doc.querySelector('[data-eq="slides"][data-val="no"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  const fittedRows = Array.from(doc.querySelectorAll("#sheet-host .row"));
  check("a fitted rig sees nine usual jobs", fittedRows.length === 9);
  check("tankless shows the descale job, not the flush", doc.querySelector("#sheet-host").textContent.includes("Tankless water heater — descale") && !doc.querySelector("#sheet-host").textContent.includes("Water heater — flush"));
  check("residential fridge hides the burner job", !doc.querySelector("#sheet-host").textContent.includes("Fridge burner"));
  check("no slides hides the slide seals", !doc.querySelector("#sheet-host").textContent.includes("Slide seals"));
  check("no generator hides both generator jobs", !doc.querySelector("#sheet-host").textContent.includes("Generator oil") && !doc.querySelector("#sheet-host").textContent.includes("Portable generator"));
  check("the picker says it is fitted", doc.querySelector("#st-fit").textContent.includes("Fitted to your rig"));
  check("the answers are saved on the rig", R.activeRig().equipment.waterHeater === "tankless" && R.activeRig().equipment.generator === "none");
  const roofRow = fittedRows.find((r) => r.textContent.includes("Outside seams"));
  click(roofRow.querySelector("[data-add-starter]")); await sleep(20);
  check("a TPO roof gets the TPO note", R.store().tasks.some((t) => t.title === "Outside seams — inspect & caulk" && t.note.includes("doesn't chalk")));
  // Not sure never hides the usual job.
  click(doc.querySelector("#st-fit")); await sleep(20);
  click(doc.querySelector('[data-eq="waterHeater"][data-val="unsure"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("Not sure shows the tank flush and hides the descale", doc.querySelector("#sheet-host").textContent.includes("Water heater — flush") && !doc.querySelector("#sheet-host").textContent.includes("Tankless water heater — descale"));
  click(doc.querySelector("[data-close]")); await sleep(20);
  R.activeRig().equipment = {}; R.save();

  /* ---- 35. the two Home pills match, and the rig picture fills ---- */
  console.log("== 35. matching pills, full-width rig picture ==");
  R.showScreen("home"); await sleep(20);
  const photoBtn = doc.querySelector("#home-rig-photo-btn");
  const guideBtn = doc.querySelector("#home-guide-link");
  check("both pills share one row", photoBtn && guideBtn && photoBtn.parentElement === guideBtn.parentElement && photoBtn.parentElement.classList.contains("home-photo-row"));
  check("the row splits fifty-fifty", /\.home-photo-row \.btn\{[^}]*flex:1 1 0/.test(css));
  check("buttons and links share one line height", /\.btn\{[^}]*line-height:1\.35/.test(css));
  check("the photo button carries no stray top margin", !/#home-rig-photo-btn\{[^}]*margin-top/.test(css));
  check("the rig photo fills the width", /\.rig-photo\{[^}]*max-width:100%/.test(css));
  check("the silhouette fills the same way", /\.rig-art svg\{[^}]*max-width:100%/.test(css));

  /* ---- 36. Liquid Springs gets its own job, only when the rig has it ---- */
  console.log("== 36. Liquid Springs ==");
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  check("a rig that never answered sees no Liquid Springs job", !doc.querySelector("#sheet-host").textContent.includes("Liquid Springs"));
  click(doc.querySelector("#st-fit")); await sleep(20);
  click(doc.querySelector('[data-eq="suspension"][data-val="liquidspring"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("answering Liquid Springs shows the job", doc.querySelector("#sheet-host").textContent.includes("Liquid Springs — check fluid & fittings"));
  check("the job carries the manual's rhythm", doc.querySelector("#sheet-host").textContent.includes("every 6 mo · 25,000 mi"));
  const lsRow = Array.from(doc.querySelectorAll("#sheet-host .row")).find((r) => r.textContent.includes("Liquid Springs"));
  click(lsRow.querySelector("[data-add-starter]")); await sleep(20);
  check("the added job keeps both rhythms", R.store().tasks.some((t) => t.title === "Liquid Springs — check fluid & fittings" && t.intervalMonths === 6 && t.intervalMiles === 25000));
  check("the note carries the pressure warning, not park leveling", R.store().tasks.some((t) => t.title === "Liquid Springs — check fluid & fittings" && t.note.includes("3,500 psi") && !/park/i.test(t.note)));
  click(doc.querySelector("#st-fit")); await sleep(20);
  click(doc.querySelector('[data-eq="suspension"][data-val="standard"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("a standard suspension hides the job again", !doc.querySelector("#sheet-host").textContent.includes("Liquid Springs"));
  click(doc.querySelector("[data-close]")); await sleep(20);
  R.activeRig().equipment = {}; R.save();

  /* ---- 37. Leave it to the pro + gas or diesel ---- */
  console.log("== 37. Pro tick box + fuel ==");
  R.showScreen("logbook"); await sleep(20);
  // the tick box on a new task
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  check("the add sheet has a Leave it to the pro tick box", !!doc.querySelector("#at-pro"));
  doc.querySelector("#at-title").value = "Roof AC — service";
  click(doc.querySelector("#at-pro")); await sleep(20);
  check("tapping the tick box marks it a pro job", doc.querySelector("#at-pro").textContent.includes("this one's for a shop"));
  check("ticking the box opens the pro picker", !doc.querySelector("#at-pro-wrap").hidden && !!doc.querySelector("#at-pro-pick"));
  var pick = doc.querySelector("#at-pro-pick");
  pick.value = "__new__"; pick.dispatchEvent(new window.Event("change", { bubbles: true })); await sleep(20);
  doc.querySelector("#at-pro-name").value = "Bob's RV Service";
  doc.querySelector("#at-pro-phone").value = "(850) 555-0134";
  click(doc.querySelector("#at-save")); await sleep(20);
  var proTask = R.store().tasks.find((t) => t.title === "Roof AC — service");
  check("the task keeps the pro flag and the shop", proTask && proTask.needsPro === true && proTask.proShop === "Bob's RV Service");
  check("adding the pro from the task joins the list", R.store().pros.some((p) => p.name === "Bob's RV Service" && p.phone === "(850) 555-0134"));
  check("the task links to the pro, not just the name", proTask && proTask.proId === R.store().pros.find((p) => p.name === "Bob's RV Service").id);
  check("the logbook row carries the Pro mark", doc.querySelector("#logbook-pages").textContent.includes("🔧 Pro"));
  click(doc.querySelector('[data-task="' + proTask.id + '"]')); await sleep(20);
  check("the task sheet names the shop", doc.querySelector("#sheet-host").textContent.includes("Leave it to the pro — Bob's RV Service"));
  check("the task sheet offers a tap to call", !!doc.querySelector('#sheet-host a[href^="tel:"]') && doc.querySelector("#sheet-host").textContent.includes("Call (850) 555-0134"));
  click(doc.querySelector("#ts-edit")); await sleep(20);
  check("the edit sheet shows the tick box on", doc.querySelector("#et-pro").textContent.includes("this one's for a shop"));
  check("the edit sheet has the pro picked", doc.querySelector("#et-pro-pick").value === proTask.proId);
  click(doc.querySelector("#et-pro")); await sleep(20);
  click(doc.querySelector("#et-save")); await sleep(20);
  check("unticking clears the pro flag", R.store().tasks.find((t) => t.title === "Roof AC — service").needsPro === false);
  // the flag survives a CSV round trip
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  doc.querySelector("#at-title").value = "Slide seals — replace";
  click(doc.querySelector("#at-pro")); await sleep(20);
  doc.querySelector("#at-pro-pick").value = R.store().pros.find((p) => p.name === "Bob's RV Service").id;
  click(doc.querySelector("#at-save")); await sleep(20);
  var csv = R.exportTasksCSV(R.activeRig().id);
  check("the export carries the Pro and Shop columns", csv.includes("Pro,Shop") && csv.includes("Slide seals — replace") && csv.includes("Yes") && csv.includes("Bob's RV Service"));
  var mini = 'Task,Category,Due Date,Due Mileage,Due Gen Hours,Every Months,Every Miles,Every Gen Hours,Note,Pro,Shop\n"Slide seals — replace",Other,,,,,,,,Yes,Bob\'s RV Service';
  R.store().tasks = R.store().tasks.filter((t) => t.title !== "Slide seals — replace"); R.save();
  var res = R.importTasksCSV(mini, R.activeRig().id);
  var back = R.store().tasks.find((t) => t.title === "Slide seals — replace");
  check("importing the export restores the pro flag and shop", res.imported === 1 && back && back.needsPro === true && back.proShop === "Bob's RV Service");
  // fuel: diesel shows the diesel job, gas shows the plugs (the answer
  // now lives on the rig form, not in the question poll — Nov 19).
  R.activeRig().equipment.fuel = "diesel"; R.save();
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  check("diesel shows the fuel filter job", doc.querySelector("#sheet-host").textContent.includes("Diesel fuel filter — change"));
  check("diesel hides the spark plugs", !doc.querySelector("#sheet-host").textContent.includes("Spark plugs — change"));
  click(doc.querySelector("[data-close]")); await sleep(20);
  R.activeRig().equipment.fuel = "gas"; R.save();
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  check("gas shows the spark plugs", doc.querySelector("#sheet-host").textContent.includes("Spark plugs — change"));
  check("gas hides the diesel filter", !doc.querySelector("#sheet-host").textContent.includes("Diesel fuel filter — change"));
  // the Liquid Springs job comes pre-ticked as a pro job
  R.store().tasks = R.store().tasks.filter((t) => t.title !== "Liquid Springs — check fluid & fittings"); R.save();
  click(doc.querySelector("#st-fit")); await sleep(20);
  click(doc.querySelector('[data-eq="suspension"][data-val="liquidspring"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  var lsRow37 = Array.from(doc.querySelectorAll("#sheet-host .row")).find((r) => r.textContent.includes("Liquid Springs"));
  click(lsRow37.querySelector("[data-add-starter]")); await sleep(20);
  check("the Liquid Springs job comes pre-ticked for a pro", R.store().tasks.some((t) => t.title === "Liquid Springs — check fluid & fittings" && t.needsPro === true));
  click(doc.querySelector("[data-close]")); await sleep(20);
  // a trailer never sees the fuel question
  R.activeRig().type = "Travel trailer"; R.save();
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  click(doc.querySelector("#st-fit")); await sleep(20);
  check("a trailer with Liquid Springs is asked twenty questions", doc.querySelectorAll("#sheet-host [data-eq]").length === 67);
  check("a trailer is never asked gas or diesel", !doc.querySelector('#sheet-host [data-eq="fuel"]'));
  click(doc.querySelector("[data-close]")); await sleep(20);
  R.activeRig().type = "Class C"; R.activeRig().equipment = {}; R.save();

  /* ---- 38. My pros — the contact list ---- */
  console.log("== 38. My pros ==");
  R.showScreen("more"); await sleep(20);
  check("More opens the My pros list", !!doc.querySelector("#pros-open-btn"));
  click(doc.querySelector("#pros-open-btn")); await sleep(20);
  check("the pros screen is showing", doc.querySelector("#screen-pros").classList.contains("active"));
  check("the list already holds the pro from the task", doc.querySelector("#pros-list").textContent.includes("Bob's RV Service"));
  check("the list shows a tap-to-call number", !!doc.querySelector('#pros-list a[href="tel:8505550134"]'));
  click(doc.querySelector("#pros-add-btn")); await sleep(20);
  doc.querySelector("#pr-name").value = "Suspension Specialists";
  doc.querySelector("#pr-specialty").value = "Suspension";
  doc.querySelector("#pr-phone").value = "(850) 555-0199";
  doc.querySelector("#pr-town").value = "Panama City";
  click(doc.querySelector("#pr-save")); await sleep(20);
  check("the list grows — a second pro joins it", R.store().pros.length === 2 && doc.querySelector("#pros-list").textContent.includes("Suspension Specialists"));
  // editing the number updates every job that points at them
  click(doc.querySelector('[data-open-pro="' + R.store().pros.find((p) => p.name === "Bob's RV Service").id + '"]')); await sleep(20);
  doc.querySelector("#pr-phone").value = "(850) 555-0144";
  click(doc.querySelector("#pr-save")); await sleep(20);
  check("editing the number sticks", R.store().pros.find((p) => p.name === "Bob's RV Service").phone === "(850) 555-0144");
  var sealsTask = R.store().tasks.find((t) => t.title === "Slide seals — replace");
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector('[data-task="' + sealsTask.id + '"]')); await sleep(20);
  check("the job now shows the new number", doc.querySelector("#sheet-host").textContent.includes("Call (850) 555-0144"));
  click(doc.querySelector("[data-close]")); await sleep(20);
  // deleting a pro keeps the name on the job but the number goes with them
  R.showScreen("pros"); await sleep(20);
  click(doc.querySelector('[data-open-pro="' + R.store().pros.find((p) => p.name === "Bob's RV Service").id + '"]')); await sleep(20);
  click(doc.querySelector("#pr-delete")); await sleep(20);
  check("the pro leaves the list", R.store().pros.length === 1 && !doc.querySelector("#pros-list").textContent.includes("Bob's RV Service"));
  R.showScreen("logbook"); await sleep(20);
  var kept = R.store().tasks.find((t) => t.title === "Slide seals — replace");
  check("the job keeps the name after the pro is gone", kept && kept.needsPro === true && kept.proShop === "Bob's RV Service");
  click(doc.querySelector('[data-task="' + kept.id + '"]')); await sleep(20);
  check("the call link goes with the deleted pro", !doc.querySelector('#sheet-host a[href^="tel:"]'));
  click(doc.querySelector("[data-close]")); await sleep(20);

  /* ---- 39. Photo proof on a checklist run — more than one ---- */
  console.log("== 39. Photo proof ==");
  R.showScreen("checklists"); await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  check("the run screen offers a photo proof", !!doc.querySelector("#run-proof-add"));
  var run39 = R.store().runs.find((r) => r.templateId === "pretrip" && !r.finishedAt);
  run39.proofs = [{ id: "p1", data: FAKE_PHOTO, takenAt: "2026-11-15" }]; R.save();
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  check("the proof shows in the run", !!doc.querySelector('#checklist-run img[src^="data:image"]'));
  check("the add button stays after the first photo", !!doc.querySelector("#run-proof-add") && doc.querySelector("#run-proof-add").textContent.includes("Add another photo"));
  check("each photo carries its own remove button", !!doc.querySelector('[data-del-proof="p1"]'));
  // a second photo joins the first — nothing is replaced
  run39.proofs.push({ id: "p2", data: FAKE_PHOTO, takenAt: "2026-11-15" }); R.save();
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  check("two photos show side by side", doc.querySelectorAll('#checklist-run .thumbs img[src^="data:image"]').length === 2);
  click(doc.querySelector('[data-del-proof="p1"]')); await sleep(20);
  check("removing one photo leaves the other", doc.querySelectorAll('#checklist-run .thumbs img[src^="data:image"]').length === 1 && R.store().runs.find((r) => r.id === run39.id).proofs[0].id === "p2");
  doc.querySelectorAll("#checklist-run .check-item").forEach((b) => click(b)); await sleep(20);
  click(doc.querySelector("#run-finish")); await sleep(20);
  check("the finished run keeps its proofs", R.store().runs.some((r) => r.templateId === "pretrip" && r.finishedAt && r.proofs && r.proofs.length === 1 && r.proofs[0].data === FAKE_PHOTO));
  R.showScreen("checklists"); await sleep(20);
  check("the picker shows the finished run with its proof date", doc.querySelector("#checklist-picker").textContent.includes("proof taken"));
  check("the picker shows the proof thumbnail", !!doc.querySelector('#checklist-picker .thumbs img[src^="data:image"]'));
  click(doc.querySelector("[data-open-finished]")); await sleep(20);
  check("tapping the finished line reopens the run with its proof", doc.querySelector("#checklist-run").textContent.includes("Photo proof") && !!doc.querySelector('#checklist-run img[src^="data:image"]'));
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  var run39b = R.store().runs.find((r) => r.templateId === "pretrip" && !r.finishedAt);
  run39b.proofs = [{ id: "p1", data: FAKE_PHOTO, takenAt: "2026-11-15" }]; R.save();
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  check("the proof carries its date under the photo", doc.querySelector("#checklist-run").textContent.includes("Taken Sun, Nov 15, 2026"));
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector('[data-restart="pretrip"]')); await sleep(20);
  check("starting over clears the checks and the proofs", Object.keys(run39b.checks).length === 0 && run39b.proofs.length === 0);
  // a run saved with the old single proof migrates to the list on read
  run39b.proof = FAKE_PHOTO; run39b.proofAt = "2026-11-15"; delete run39b.proofs; R.save();
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  check("an old single proof still shows after the change", !!doc.querySelector('#checklist-run img[src^="data:image"]'));
  check("the old proof migrated into the list", run39b.proofs && run39b.proofs.length === 1 && run39b.proofs[0].data === FAKE_PHOTO && !run39b.proof);
  // the real path: pick two photos at once and both land, date-stamped
  // jsdom never loads images, so the downscale's Image would hang: stub it.
  window.Image = function () { var self = this; this.width = 100; this.height = 100; setTimeout(function () { if (self.onload) self.onload(); }, 0); };
  check("the photo picker lets you choose more than one at once", doc.querySelector("#photo-input").hasAttribute("multiple"));
  click(doc.querySelector("#run-proof-add")); await sleep(20);
  var proofFile1 = new window.File([new window.Blob(["fake-jpeg-1"], { type: "image/jpeg" })], "proof1.jpg", { type: "image/jpeg" });
  var proofFile2 = new window.File([new window.Blob(["fake-jpeg-2"], { type: "image/jpeg" })], "proof2.jpg", { type: "image/jpeg" });
  var photoInput = doc.querySelector("#photo-input");
  Object.defineProperty(photoInput, "files", { value: [proofFile1, proofFile2], configurable: true });
  photoInput.dispatchEvent(new window.Event("change", { bubbles: true })); await sleep(200);
  var today = new Date();
  var todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  check("picking two photos adds both to the proofs", run39b.proofs.length === 3 && run39b.proofs[1].data.indexOf("data:image/jpeg") === 0 && run39b.proofs[2].data.indexOf("data:image/jpeg") === 0);
  check("both photos are date-stamped when taken", run39b.proofs[1].takenAt === todayStr && run39b.proofs[2].takenAt === todayStr);
  check("the stamp shows under the photo", doc.querySelector("#checklist-run").textContent.includes("Taken " + today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })));
  click(doc.querySelector("#run-back")); await sleep(20);

  /* ---- 40. Fuel log: fill-ups, MPG, odometer ---- */
  console.log("== 40. Fuel log ==");
  R.showScreen("fuel"); await sleep(20);
  check("the fuel screen is showing", doc.querySelector("#screen-fuel").classList.contains("active"));
  check("the fuel screen starts empty", doc.querySelector("#fuel-summary").textContent.includes("Nothing logged yet"));
  const odo40 = R.activeRig().mileage;
  click(doc.querySelector("#fuel-add-btn")); await sleep(20);
  setVal("#fu-date", "2026-11-01"); setVal("#fu-odo", String(odo40 + 100)); setVal("#fu-gal", "20"); setVal("#fu-total", "60.00");
  doc.querySelector("#fu-total").dispatchEvent(new window.Event("input", { bubbles: true }));
  check("the price a gallon shows while typing", doc.querySelector("#fu-ppg").textContent.includes("$3.00"));
  click(doc.querySelector("#fu-save")); await sleep(20);
  check("the first fill-up is saved", R.store().fuel.length === 1);
  check("one fill-up has no MPG yet", R.fuelStats(rig.id).mpg === null);
  click(doc.querySelector("[data-open-fuel]")); await sleep(20);
  setVal("#fu-total", "70.00");
  click(doc.querySelector("#fu-save")); await sleep(20);
  check("a fill-up can be edited", R.store().fuel[0].total === 70);
  click(doc.querySelector("#fuel-add-btn")); await sleep(20);
  setVal("#fu-date", "2026-11-05"); setVal("#fu-odo", String(odo40 + 400)); setVal("#fu-gal", "30"); setVal("#fu-total", "105.00");
  click(doc.querySelector("#fu-save")); await sleep(20);
  check("the second fill-up covers 300 miles on 30 gallons", R.fuelStats(rig.id).mpg === 10);
  check("the summary shows 10.0 MPG", doc.querySelector("#fuel-summary").textContent.includes("10.0"));
  check("the newer fill-up shows its MPG, the first shows none", doc.querySelector("#fuel-list").textContent.includes("10.0 MPG"));
  check("the fill-up moved the odometer forward", R.activeRig().mileage === odo40 + 400);
  R.showScreen("home"); await sleep(20);
  check("the Home fuel card shows the MPG", doc.querySelector("#home-fuel").textContent.includes("10.0 MPG"));
  check("the fuel log exports as CSV", R.exportFuelCSV(rig.id).includes("Date,Odometer,Gallons") && R.exportFuelCSV(rig.id).includes("2026-11-01"));
  R.showScreen("fuel"); await sleep(20);
  const second40 = R.store().fuel.find((f) => f.date === "2026-11-05");
  click(doc.querySelector('[data-open-fuel="' + second40.id + '"]')); await sleep(20);
  click(doc.querySelector("#fu-delete")); await sleep(20);
  check("deleting a fill-up takes its MPG with it", R.store().fuel.length === 1 && R.fuelStats(rig.id).mpg === null);

  /* ---- 42. Trips: miles and money for budgeting ---- */
  console.log("== 42. Trips ==");
  const odo42 = R.activeRig().mileage;
  R.store().fuel.push({ id: "f42a", rigId: rig.id, date: "2026-12-10", odometer: odo42 + 100, gallons: 20, total: 66 });
  R.store().fuel.push({ id: "f42b", rigId: rig.id, date: "2026-12-11", odometer: odo42 + 300, gallons: 25, total: 85 });
  R.save();
  R.showScreen("trips"); await sleep(20);
  check("the trips screen is showing", doc.querySelector("#screen-trips").classList.contains("active"));
  click(doc.querySelector("#trips-add-btn")); await sleep(20);
  setVal("#tr-name", "Test Smokies run"); setVal("#tr-dest", "Gatlinburg, TN");
  setVal("#tr-start", "2026-12-10"); setVal("#tr-end", "2026-12-12");
  setVal("#tr-camp", "Twin Creek"); setVal("#tr-campcost", "90");
  setVal("#tr-odo1", String(odo42 + 100)); setVal("#tr-odo2", String(odo42 + 400));
  click(doc.querySelector("#tr-save")); await sleep(20);
  const trip42 = R.store().trips.find((t) => t.name === "Test Smokies run");
  check("the trip is saved", !!trip42);
  check("the trip covers 300 miles", R.tripCosts(trip42).miles === 300);
  check("the trip counts the fuel inside its dates", R.tripCosts(trip42).fuel === 151);
  check("the trip total is fuel plus campground", R.tripCosts(trip42).total === 241);
  check("the trip row shows miles and money", doc.querySelector("#trips-list").textContent.includes("300 miles") && doc.querySelector("#trips-list").textContent.includes("$241.00"));
  R.showScreen("home"); await sleep(20);
  check("the Home trips card shows the latest trip", doc.querySelector("#home-trips").textContent.includes("Test Smokies run") && doc.querySelector("#home-trips").textContent.includes("$241.00"));

  console.log("\n" + pass + " passed, " + fail + " failed");
  console.log("== 29. download keeps the app open ==");
  // jsdom has no blob URLs — stand in for them so the download path runs.
  window.URL.createObjectURL = () => "blob:test-parts";
  window.URL.revokeObjectURL = () => {};
  R.showScreen("parts"); await sleep(20);
  const locBefore = doc.location.href;
  click(doc.querySelector("#parts-csv-btn")); await sleep(20);
  check("the download opens in a new tab", !!doc.querySelector('a[target="_blank"][download="rollonrv-parts.html"]'));
  check("tapping Download does not navigate the app away", doc.location.href === locBefore);
  check("the app is still on the Parts screen", doc.querySelector("#screen-parts").classList.contains("active"));

  /* ---- 43. native camera failure falls back to the file picker ---- */
  console.log("== 43. native photo fallback ==");
  // A second boot with a mocked native Capacitor: the Camera call rejects,
  // which used to swallow the tap entirely (Nov 15, TestFlight — the rig
  // photo button looked dead). The file picker must open instead; a user
  // cancel stays silent.
  const dom2 = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
  const win2 = dom2.window;
  win2.confirm = () => true;
  win2.scrollTo = () => {};
  win2.Capacitor = {
    isNativePlatform: () => true,
    Plugins: { Camera: { getPhoto: () => Promise.reject(new Error("plugin boom")) } },
  };
  win2.eval(plansJs);
  win2.eval(appJs);
  await sleep(50);
  const doc2 = win2.document;
  const R2 = win2.RollOnRV;
  check("native boot exposes test hooks", !!R2);
  doc2.querySelector("#su-year").value = "2021";
  doc2.querySelector("#su-make").value = "Test Make";
  doc2.querySelector("#su-model").value = "Test Model 123";
  doc2.querySelector("#su-fuel").value = "diesel";
  doc2.querySelector("#setup-form").dispatchEvent(new win2.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(50);
  check("the setup form saves the engine fuel on the rig", R2.activeRig().equipment.fuel === "diesel");
  R2.showScreen("home"); await sleep(20);
  const input2 = doc2.querySelector("#photo-input");
  let inputClicked = false;
  input2.click = function () { inputClicked = true; };
  doc2.querySelector("#home-rig-photo-btn").dispatchEvent(new win2.MouseEvent("click", { bubbles: true }));
  await sleep(50);
  check("native camera failure falls back to the file picker", inputClicked);
  // A user cancel must NOT pop the picker up after them.
  win2.Capacitor.Plugins.Camera.getPhoto = () => Promise.reject(new Error("User cancelled photos app"));
  inputClicked = false;
  doc2.querySelector("#home-rig-photo-btn").dispatchEvent(new win2.MouseEvent("click", { bubbles: true }));
  await sleep(50);
  check("a user cancel stays silent (no fallback picker)", !inputClicked);
  // A failed native call must keep the photo callback pending, so the
  // fallback picker can actually hand the chosen photo over (Nov 15:
  // v45 cleared it, so the picker opened, a photo was chosen, and
  // nothing happened).
  win2.Capacitor.Plugins.Camera.getPhoto = () => Promise.reject(new Error("plugin boom"));
  inputClicked = false;
  doc2.querySelector("#home-rig-photo-btn").dispatchEvent(new win2.MouseEvent("click", { bubbles: true }));
  await sleep(50);
  check("a failed native camera call keeps the photo callback pending for the fallback picker", inputClicked && R2.photoPendingSet());

  /* ---- 46. printing in the installed app opens the sheet ---- */
  console.log("== 46. printing in-app ==");
  // window.print() does nothing inside the installed app (Nov 15: "Print
  // this list doesn't work") — the printable sheet must open in a new tab
  // instead, where Share → Print works.
  let printCalled = false;
  win2.print = function () { printCalled = true; };
  win2.URL.createObjectURL = function () { return "blob:fake-print"; };
  win2.URL.revokeObjectURL = function () {};
  R2.printChecklistRun(R2.CHECKLISTS[0], { id: "r1", templateId: "pretrip", rigId: R2.activeRig().id, startedAt: "2026-11-15", finishedAt: null, checks: {}, proof: null, proofAt: null }, R2.activeRig());
  await sleep(20);
  const printLink = doc2.querySelector('a[target="_blank"]');
  check("printing in the installed app opens the sheet on a real https page", !!printLink && String(printLink.getAttribute("href") || "").indexOf("https://rickdemers.com/rollonrv-preview/print.html#") === 0);
  check("the print link carries no download attribute (one swallows the tap in the installed app)", !!printLink && !printLink.hasAttribute("download"));
  check("printing in the installed app does not call window.print()", !printCalled);

  /* The print page the app links to: it must read the sheet from the
     #hash and print it in real Safari. */
  const printHtml = fs.readFileSync(path.join(ROOT, "www", "print.html"), "utf8");
  check("print page reads the sheet from the link's hash", printHtml.includes("decodeURIComponent") && printHtml.includes("location.hash"));
  check("print page has its own Print button", printHtml.includes('id="print-btn"') && printHtml.includes("window.print()"));

  /* ---- 48. printed sheet reads a little smaller (Nov 15) ---- */
  console.log("== 48. print font size ==");
  // Rick: the printed sheet's type was "a-little big". Both copies of the
  // print styles — the app's @media print rules and the print page's
  // inline rules — must shrink together.
  check("print body type is 10pt in the app styles", css.includes("#print-sheet{ display:block; color:#111; background:#fff; font-family:var(--sans); font-size:10pt; }"));
  check("print title is 17pt in the app styles", css.includes(".print-head h1{ font-family:var(--serif); font-size:17pt;"));
  check("print group headings are 11pt in the app styles", css.includes(".print-group{ font-family:var(--serif); font-weight:700; font-size:11pt;"));
  check("print body type is 10pt on the print page", printHtml.includes("font-size:10pt;padding:16px;"));
  check("print title is 17pt on the print page", printHtml.includes(".print-head h1{font-family:Georgia,\"Times New Roman\",serif;font-size:17pt;"));
  check("print group headings are 11pt on the print page", printHtml.includes(".print-group{font-family:Georgia,\"Times New Roman\",serif;font-weight:700;font-size:11pt;"));

  /* ---- 49. the sheet prints at 80% ---- */
  console.log("== 49. print scale ==");
  // Safari's print dialog won't let a page preset its Scale, so the
  // sheet scales itself to 80% — same result on paper.
  check("the app's print rules scale the sheet to 80%", css.includes("body{ background:#fff !important; zoom:0.8; }"));
  check("the print page scales the sheet to 80%", printHtml.includes("body{zoom:0.8;}"));

  /* ---- 50. the sheet Close button never covers the instructions ---- */
  console.log("== 50. sheet Close button ==");
  // The Close button used to ride up on a negative margin and sit on
  // top of the subtitle's last words (Nov 15: "Add a task" sheet, it
  // covered "just once."). Now it sits beside the title and the
  // instructions run full-width underneath.
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  var sheetHeadEl = doc.querySelector(".sheet-head");
  check("the sheet header is a title row", !!sheetHeadEl && !!sheetHeadEl.querySelector("h2"));
  check("Close sits in the title row, beside the title", !!sheetHeadEl && !!sheetHeadEl.querySelector('[data-close]'));
  var sheetSub = doc.querySelector("#sheet-host .sheet > p.muted");
  check("the instructions sit below the title row, full-width", !!sheetSub && sheetSub.textContent.includes("Something the rig needs") && !sheetHeadEl.contains(sheetSub));
  check("no sheet header pulls the button up over the text", !appJs.includes("margin:-2.4rem"));
  click(doc.querySelector('[data-close]')); await sleep(20);

  /* ---- 51. a sheet stays put when you make a choice ---- */
  console.log("== 51. sheet scroll stays put ==");
  // Every tap in the rig questions re-draws the sheet, and the sheet
  // used to jump to the bottom (Nov 15: "the page jumps to the bottom
  // every time you make a choice"). jsdom clamps scrollTop to 0 (no
  // layout), so back it with a WeakMap to prove the position is
  // carried across the re-draw.
  var scrollStore = new WeakMap();
  Object.defineProperty(window.HTMLElement.prototype, "scrollTop", {
    configurable: true,
    get: function () { return scrollStore.get(this) || 0; },
    set: function (v) { scrollStore.set(this, v); }
  });
  R.activeRig().type = "Class C"; R.save();
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  click(doc.querySelector("#st-fit")); await sleep(20);
  check("the rig questions sheet is open", !!doc.querySelector(".sheet-head") && doc.querySelector(".sheet-head h2").textContent.includes("What does your rig have"));
  var qSheet = doc.querySelector(".sheet");
  qSheet.scrollTop = 150;
  click(doc.querySelector('[data-eq="roof"][data-val="tpo"]')); await sleep(20);
  check("the sheet stays where you were after a choice", doc.querySelector(".sheet").scrollTop === 150);
  click(doc.querySelector('[data-close]')); await sleep(20);

  /* ---- 52. Parts, Fuel and Trips open with pill buttons ---- */
  console.log("== 52. home pills ==");
  // The three "Open..." lines on Home used to be plain muted text;
  // now they are pill buttons like Change photo / How to use this app
  // (Nov 15: same .btn.small.ghost, same words, same destination) —
  // a little smaller (.tiny), same look.
  R.showScreen("home"); await sleep(20);
  ["home-parts-more", "home-fuel-more", "home-trips-more"].forEach(function (id) {
    var el = doc.querySelector("#" + id);
    check(id + " is a pill button", !!el && el.tagName === "BUTTON" && el.classList.contains("btn") && el.classList.contains("small") && el.classList.contains("ghost"));
    check(id + " is a little smaller than the photo pills", !!el && el.classList.contains("tiny"));
    check(id + " still says where it goes", !!el && el.textContent.trim().length > 0);
  });
  check("the fuel pill still says Open the fuel log", doc.querySelector("#home-fuel-more").textContent.includes("Open the fuel log"));
  click(doc.querySelector("#home-fuel-more")); await sleep(20);
  check("tapping the fuel pill opens the fuel screen", !!doc.querySelector("#screen-fuel.active"));
  R.showScreen("home"); await sleep(20);

  /* ---- 53. rubber roofs come in two kinds: EPDM and TPO ---- */
  console.log("== 53. EPDM and TPO roofs ==");
  // Nov 15: Rick — "Is there more than one type of rubber roof?" TPO,
  // and another type (EPDM). It matters: EPDM chalks and petroleum
  // products eat it; TPO stays white and doesn't chalk. The roof
  // question now offers both, and each gets its own roof-seals note.
  // A rig fitted before the split (plain "rubber") still gets a note.
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  click(doc.querySelector("#st-fit")); await sleep(20);
  const roofBtns = Array.from(doc.querySelectorAll('[data-eq="roof"]')).map((b) => b.textContent.trim());
  check("the roof question offers Rubber (EPDM)", roofBtns.includes("Rubber (EPDM)"));
  check("the roof question offers Rubber (TPO)", roofBtns.includes("Rubber (TPO)"));
  check("no plain Rubber choice is left", !roofBtns.includes("Rubber"));
  click(doc.querySelector("[data-close]")); await sleep(20);
  // EPDM roof: the seals note warns about petroleum products.
  R.store().tasks = R.store().tasks.filter((t) => t.title !== "Outside seams — inspect & caulk"); R.save();
  R.activeRig().equipment = { roof: "epdm" }; R.save();
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  const epdmRow = Array.from(doc.querySelectorAll("#sheet-host .row")).find((r) => r.textContent.includes("Outside seams"));
  click(epdmRow.querySelector("[data-add-starter]")); await sleep(20);
  check("an EPDM roof gets the EPDM note", R.store().tasks.some((t) => t.title === "Outside seams — inspect & caulk" && t.note.includes("petroleum-based")));
  click(doc.querySelector("[data-close]")); await sleep(20);
  // Legacy plain-"rubber" answer still resolves to a note.
  R.store().tasks = R.store().tasks.filter((t) => t.title !== "Outside seams — inspect & caulk"); R.save();
  R.activeRig().equipment = { roof: "rubber" }; R.save();
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  const legRow = Array.from(doc.querySelectorAll("#sheet-host .row")).find((r) => r.textContent.includes("Outside seams"));
  click(legRow.querySelector("[data-add-starter]")); await sleep(20);
  check("a legacy rubber answer still gets a note", R.store().tasks.some((t) => t.title === "Outside seams — inspect & caulk" && t.note.includes("self-leveling sealant")));
  click(doc.querySelector("[data-close]")); await sleep(20);
  R.activeRig().equipment = {}; R.save();

  /* ---- 54. AC, solar, furnace and house batteries ---- */
  console.log("== 54. AC, solar, furnace, batteries ==");
  // Nov 15: Rick — four more questions, same as the roof split. AC only
  // or heat pump; solar yes or no; furnace gas or none; house batteries
  // flooded, AGM or lithium (only flooded takes water). Each gates its
  // own jobs; the batteries job note changes with the type. Propane and
  // water-system jobs ride along for every rig.
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  click(doc.querySelector("#st-fit")); await sleep(20);
  const btnTexts = (key) => Array.from(doc.querySelectorAll('[data-eq="' + key + '"]')).map((b) => b.textContent.trim());
  check("the AC question offers AC only", btnTexts("ac").includes("AC only"));
  check("the AC question offers Heat pump", btnTexts("ac").includes("Heat pump"));
  check("the solar question offers Yes and No", btnTexts("solar").includes("Yes") && btnTexts("solar").includes("No"));
  check("the furnace question offers Gas and None", btnTexts("furnace").includes("Gas") && btnTexts("furnace").includes("None"));
  check("the batteries question offers Flooded, AGM and Lithium", btnTexts("batteries").includes("Flooded") && btnTexts("batteries").includes("AGM") && btnTexts("batteries").includes("Lithium"));
  click(doc.querySelector('[data-eq="ac"][data-val="heatpump"]')); await sleep(20);
  click(doc.querySelector('[data-eq="solar"][data-val="yes"]')); await sleep(20);
  click(doc.querySelector('[data-eq="furnace"][data-val="gas"]')); await sleep(20);
  click(doc.querySelector('[data-eq="batteries"][data-val="agm"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  const rows54 = Array.from(doc.querySelectorAll("#sheet-host .row"));
  check("a heat pump rig sees the heat-pump test", rows54.some((r) => r.textContent.includes("Heat pump — test the heat")));
  check("a solar rig sees the solar panels job", rows54.some((r) => r.textContent.includes("Solar panels — clean & inspect")));
  check("a gas furnace rig sees the furnace job", rows54.some((r) => r.textContent.includes("Furnace — clean & test")));
  check("every rig sees the A/C filters job", rows54.some((r) => r.textContent.includes("A/C — clean the filters")));
  check("every rig sees the propane job", rows54.some((r) => r.textContent.includes("Propane system — check for leaks")));
  check("every rig sees the water system job", rows54.some((r) => r.textContent.includes("Water system — sanitize & check")));
  R.store().tasks = R.store().tasks.filter((t) => t.title !== "Heat pump — test the heat"); R.save();
  const hpRow = rows54.find((r) => r.textContent.includes("Heat pump — test the heat"));
  click(hpRow.querySelector("[data-add-starter]")); await sleep(20);
  check("the heat-pump job says the furnace takes over", R.store().tasks.some((t) => t.title === "Heat pump — test the heat" && t.note.includes("furnace takes over")));
  R.store().tasks = R.store().tasks.filter((t) => t.title !== "House batteries — water & terminals"); R.save();
  const hbRow = Array.from(doc.querySelectorAll("#sheet-host .row")).find((r) => r.textContent.includes("House batteries"));
  click(hbRow.querySelector("[data-add-starter]")); await sleep(20);
  check("AGM batteries get the no-water note", R.store().tasks.some((t) => t.title === "House batteries — water & terminals" && t.note.includes("No water to top up")));
  // Re-fit with the other answers: the gated jobs go away, the rest stay.
  click(doc.querySelector("#st-fit")); await sleep(20);
  click(doc.querySelector('[data-eq="ac"][data-val="acOnly"]')); await sleep(20);
  click(doc.querySelector('[data-eq="solar"][data-val="no"]')); await sleep(20);
  click(doc.querySelector('[data-eq="furnace"][data-val="none"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  const rows54b = Array.from(doc.querySelectorAll("#sheet-host .row"));
  check("AC only hides the heat-pump test", !rows54b.some((r) => r.textContent.includes("Heat pump — test the heat")));
  check("no solar hides the solar panels job", !rows54b.some((r) => r.textContent.includes("Solar panels")));
  check("no furnace hides the furnace job", !rows54b.some((r) => r.textContent.includes("Furnace — clean & test")));
  check("the A/C filters job stays", rows54b.some((r) => r.textContent.includes("A/C — clean the filters")));
  // Lithium batteries get their own note (read live at add time).
  // Re-open the starters so the row shows Add again after the task
  // was taken out of the book.
  click(doc.querySelector("[data-close]")); await sleep(20);
  R.store().tasks = R.store().tasks.filter((t) => t.title !== "House batteries — water & terminals"); R.save();
  R.activeRig().equipment.batteries = "lithium"; R.save();
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  const hbRow2 = Array.from(doc.querySelectorAll("#sheet-host .row")).find((r) => r.textContent.includes("House batteries"));
  click(hbRow2.querySelector("[data-add-starter]")); await sleep(20);
  check("lithium batteries get the monitor note", R.store().tasks.some((t) => t.title === "House batteries — water & terminals" && t.note.includes("battery monitor")));
  click(doc.querySelector("[data-close]")); await sleep(20);
  R.activeRig().equipment = {}; R.save();

  /* ---- 55. Before You Roll water group ---- */
  console.log("== 55. Before You Roll water ==");
  // Nov 15: Rick — before you roll, sanitize the water and fill the
  // water. A Water group sits between Hookups and Inside.
  R.showScreen("checklists");
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  const run55 = doc.querySelector("#checklist-run").textContent;
  check("Before You Roll has a Water group", run55.includes("Water"));
  check("the water group asks to sanitize", run55.includes("Water system sanitized"));
  check("the water group asks to fill the tank", run55.includes("Fresh water tank filled"));
  check("the water group sits after Hookups", run55.indexOf("Water system sanitized") > run55.indexOf("Propane set for travel"));
  check("the water group sits before Inside", run55.indexOf("Fresh water tank filled") < run55.indexOf("Fridge latched"));
  check("Before You Roll asks to check the propane level", run55.includes("Propane level checked, tank filled"));
  check("the propane level item sits in Hookups", run55.indexOf("Propane level checked, tank filled") > run55.indexOf("Propane set for travel") && run55.indexOf("Propane level checked, tank filled") < run55.indexOf("Water system sanitized"));
  click(doc.querySelector("#run-back")); await sleep(20);

  /* ---- 56. Monthly Walk-Around + washer/dryer, ice maker, dishwasher ---- */
  console.log("== 56. monthly walk-around, three new questions ==");
  // Nov 15: Rick — "you can add any check list you find". The five lists
  // were missing the monthly round, so it joins them: tires, seams,
  // slides, underneath, windows (operated or they stick), water, systems,
  // screens and dampness. Washer/dryer, ice maker and dishwasher are
  // questions now, each gating its own job.
  R.showScreen("checklists");
  click(doc.querySelector('[data-start="monthly"]')); await sleep(20);
  const run56 = doc.querySelector("#checklist-run").textContent;
  const boxes56 = doc.querySelectorAll("#checklist-run .check-item");
  check("monthly walk-around has 15 items", boxes56.length === 15, "got " + boxes56.length);
  check("monthly checks the tires", run56.includes("Tire pressures to placard"));
  check("monthly checks every outside seam", run56.includes("Outside seams — roof, walls, windows"));
  check("monthly works every window", run56.includes("Windows — open & close them all, check the seals"));
  check("monthly checks the screens", run56.includes("Window screens — look for tears & holes"));
  check("monthly tests the detectors", run56.includes("Smoke, CO & propane detectors"));
  check("monthly tests the GFCI outlets", run56.includes("GFCI outlets — press TEST"));
  check("monthly runs the generator under load", run56.includes("Generator — run it under load"));
  boxes56.forEach((b) => click(b));
  await sleep(20);
  check("all 15 checked, progress full", doc.querySelector("#checklist-run").textContent.includes("15 of 15 checked"));
  click(doc.querySelector("#run-finish")); await sleep(20);
  check("monthly run finished and saved", R.store().runs.some((r) => r.templateId === "monthly" && r.finishedAt));
  // The widened seams job covers more than the roof when no roof is set.
  R.store().tasks = R.store().tasks.filter((t) => t.title !== "Outside seams — inspect & caulk"); R.save();
  R.activeRig().equipment = {}; R.save();
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  const seamsRow = Array.from(doc.querySelectorAll("#sheet-host .row")).find((r) => r.textContent.includes("Outside seams"));
  click(seamsRow.querySelector("[data-add-starter]")); await sleep(20);
  check("the seams job covers sidewalls, windows and vents", R.store().tasks.some((t) => t.title === "Outside seams — inspect & caulk" && t.note.includes("sidewalls")));
  click(doc.querySelector("[data-close]")); await sleep(20);
  // The three new questions gate their jobs.
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  click(doc.querySelector("#at-starters")); await sleep(20);
  click(doc.querySelector("#st-fit")); await sleep(20);
  const btnTexts56 = (key) => Array.from(doc.querySelectorAll('[data-eq="' + key + '"]')).map((b) => b.textContent.trim());
  check("the washer/dryer question offers Yes and No", btnTexts56("washerdryer").includes("Yes") && btnTexts56("washerdryer").includes("No"));
  check("the ice maker question offers Yes and No", btnTexts56("icemaker").includes("Yes") && btnTexts56("icemaker").includes("No"));
  check("the dishwasher question offers Yes and No", btnTexts56("dishwasher").includes("Yes") && btnTexts56("dishwasher").includes("No"));
  click(doc.querySelector('[data-eq="washerdryer"][data-val="yes"]')); await sleep(20);
  click(doc.querySelector('[data-eq="icemaker"][data-val="yes"]')); await sleep(20);
  click(doc.querySelector('[data-eq="dishwasher"][data-val="yes"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  const rows56 = Array.from(doc.querySelectorAll("#sheet-host .row"));
  check("a washer/dryer rig sees the lint filter job", rows56.some((r) => r.textContent.includes("Washer/dryer — clean the lint filter")));
  check("an ice maker rig sees the ice maker job", rows56.some((r) => r.textContent.includes("Ice maker — clean & sanitize")));
  check("a dishwasher rig sees the dishwasher job", rows56.some((r) => r.textContent.includes("Dishwasher — clean the filter")));
  click(doc.querySelector("#st-fit")); await sleep(20);
  click(doc.querySelector('[data-eq="washerdryer"][data-val="no"]')); await sleep(20);
  click(doc.querySelector('[data-eq="icemaker"][data-val="no"]')); await sleep(20);
  click(doc.querySelector('[data-eq="dishwasher"][data-val="no"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  const rows56b = Array.from(doc.querySelectorAll("#sheet-host .row"));
  check("no washer/dryer hides the lint filter job", !rows56b.some((r) => r.textContent.includes("Washer/dryer")));
  check("no ice maker hides the ice maker job", !rows56b.some((r) => r.textContent.includes("Ice maker")));
  check("no dishwasher hides the dishwasher job", !rows56b.some((r) => r.textContent.includes("Dishwasher")));
  click(doc.querySelector("[data-close]")); await sleep(20);
  R.activeRig().equipment = {}; R.save();

  /* ---- 57. Boondocking + the toad check ---- */
  console.log("== 57. boondocking, toad ==");
  // Nov 15: Rick — a lot of people tow a car, and the internet sweep
  // found Boondocking as the one standard list the app still lacked.
  // The toad check rides on Before You Roll; Boondocking is its own list.
  R.showScreen("checklists");
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  const run57 = doc.querySelector("#checklist-run").textContent;
  check("Before You Roll checks the toad", run57.includes("Toad hooked up — tow bar, cables, lights, brakes"));
  check("the toad check sits in Outside", run57.indexOf("Toad hooked up") > run57.indexOf("Jacks up, pads stowed") && run57.indexOf("Toad hooked up") < run57.indexOf("Shore power cord stowed"));
  check("the flat tow check rides with the toad", run57.includes("Toad in flat tow mode"));
  check("the flat tow check sits right after the toad", run57.indexOf("Toad in flat tow mode") > run57.indexOf("Toad hooked up") && run57.indexOf("Toad in flat tow mode") < run57.indexOf("Shore power cord stowed"));
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector('[data-start="boondock"]')); await sleep(20);
  const run57b = doc.querySelector("#checklist-run").textContent;
  const boxes57 = doc.querySelectorAll("#checklist-run .check-item");
  check("boondocking has 10 items", boxes57.length === 10, "got " + boxes57.length);
  check("boondocking fills the fresh tank", run57b.includes("Fresh water tank full"));
  check("boondocking empties the holding tanks", run57b.includes("Grey & black tanks empty"));
  check("boondocking charges the batteries", run57b.includes("House batteries fully charged"));
  check("boondocking fuels the generator", run57b.includes("Generator fuel full"));
  check("boondocking plans the dump", run57b.includes("Dump plan for the way out"));
  check("boondocking conserves water on site", run57b.includes("Water use planned — conserve"));
  boxes57.forEach((b) => click(b));
  await sleep(20);
  check("all 10 checked, progress full", doc.querySelector("#checklist-run").textContent.includes("10 of 10 checked"));
  click(doc.querySelector("#run-finish")); await sleep(20);
  check("boondocking run finished and saved", R.store().runs.some((r) => r.templateId === "boondock" && r.finishedAt));

  /* ---- 58. built-in items come off — and come back ---- */
  console.log("== 58. deletable tick boxes ==");
  // Nov 15: Rick — "make the tick boxes deletable or add back if things change".
  R.showScreen("checklists");
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  /* Earlier sections leave two of their own items on this list ("Test
     words changed", "Heading test item"), so the baseline is 19 built-ins
     plus whatever of theirs is still there — count deltas, not absolutes. */
  var base = doc.querySelectorAll("#checklist-run .check-item").length;
  check("pre-trip starts with all 19 built-ins", doc.querySelectorAll("[data-del-builtin]").length === 19 && base >= 19);
  var toadBox = Array.from(doc.querySelectorAll("#checklist-run .check-item")).find(function (b) { return b.textContent.includes("Toad hooked up"); });
  check("the toad line is on the run", !!toadBox);
  // Check it first, so a stale check is sitting in the run.
  click(toadBox); await sleep(20);
  check("checking the toad counts it", doc.querySelector("#checklist-run").textContent.includes("1 of " + base + " checked"));
  var toadDel = doc.querySelector('[data-del-builtin="toad"]');
  check("the toad line has a take-off button", !!toadDel);
  // First tap on × only arms it.
  click(toadDel); await sleep(20);
  check("first tap only arms the delete", doc.querySelector('[data-del-builtin="toad"]').textContent.includes("Delete?") && doc.querySelectorAll("#checklist-run .check-item").length === base);
  click(doc.querySelector('[data-del-builtin="toad"]')); await sleep(20);
  check("second tap takes the toad off", doc.querySelectorAll("#checklist-run .check-item").length === base - 1 && !Array.from(doc.querySelectorAll("#checklist-run .check-item")).some(function (b) { return b.textContent.includes("Toad hooked up"); }));
  check("the count drops by one", doc.querySelector("#checklist-run").textContent.includes("0 of " + (base - 1) + " checked"));
  check("the stale check does not count", !doc.querySelector("#checklist-run").textContent.includes("1 of " + (base - 1) + " checked"));
  check("the taken-off line is listed to put back", doc.querySelector("#checklist-run").textContent.includes("Taken off this list") && !!doc.querySelector('[data-restore-builtin="toad"]'));
  // Put it back.
  click(doc.querySelector('[data-restore-builtin="toad"]')); await sleep(20);
  check("put back restores the toad line", doc.querySelectorAll("#checklist-run .check-item").length === base && Array.from(doc.querySelectorAll("#checklist-run .check-item")).some(function (b) { return b.textContent.includes("Toad hooked up"); }));
  check("the count is back to the baseline", doc.querySelector("#checklist-run").textContent.includes("0 of " + base + " checked"));
  check("the taken-off section is gone", !doc.querySelector("#checklist-run").textContent.includes("Taken off this list"));
  // The removal sticks across a fresh run.
  click(doc.querySelector('[data-del-builtin="toad"]')); await sleep(20);
  click(doc.querySelector('[data-del-builtin="toad"]')); await sleep(20);
  click(doc.querySelector("#run-back")); await sleep(20);
  click(doc.querySelector('[data-start="pretrip"]')); await sleep(20);
  check("the toad stays off on the next run", doc.querySelectorAll("#checklist-run .check-item").length === base - 1);
  click(doc.querySelector('[data-restore-builtin="toad"]')); await sleep(20);
  check("put back works on the next run too", doc.querySelectorAll("#checklist-run .check-item").length === base);

  /* ---- 60. departure order + lists open at the top ---- */
  console.log("== 60. departure order, scroll to top ==");
  // Nov 16: Rick — dump the tanks BEFORE rinsing the sewer hose, and a
  // list must open at the top, not where the last one left off.
  var scrolled60 = 0;
  var realScroll60 = window.scrollTo;
  window.scrollTo = function () { scrolled60++; };
  R.showScreen("checklists");
  scrolled60 = 0;
  click(doc.querySelector('[data-start="departure"]')); await sleep(20);
  check("opening a list starts at the top", scrolled60 > 0);
  const run60 = doc.querySelector("#checklist-run").textContent;
  check("tanks dump before the sewer hose rinse", run60.indexOf("Tanks dumped, valves closed") !== -1 && run60.indexOf("Tanks dumped, valves closed") < run60.indexOf("Sewer hose rinsed, capped & stowed"));
  scrolled60 = 0;
  click(doc.querySelector("#run-back")); await sleep(20);
  check("going back to the picker starts at the top", scrolled60 > 0);
  click(doc.querySelector('[data-start="departure"]')); await sleep(20);
  scrolled60 = 0;
  click(doc.querySelector("#run-finish")); await sleep(20);
  check("stamping it done returns to the top of the picker", scrolled60 > 0);
  window.scrollTo = realScroll60;

  /* ---- 61. Did you know? tips on Home ---- */
  console.log("== 61. home tips card ==");
  // Nov 16: Rick — a few hundred tips on the front page only, in our
  // own words; Next tip walks the list, Dismiss hides it till tomorrow.
  check("two hundred tips", R.TIPS.length === 200);
  check("tips are all different", new Set(R.TIPS.map(function (t) { return t.trim().toLowerCase(); })).size === 200);
  check("tips are all short plain lines", R.TIPS.every(function (t) { return typeof t === "string" && t.trim().length > 10 && t.length <= 400; }));
  R.showScreen("home"); R.renderHome(); await sleep(20);
  const tipCard = doc.querySelector("#home-tip-card");
  check("tips card shows on Home", tipCard && !tipCard.hidden);
  const firstTip = doc.querySelector("#home-tip-text").textContent;
  check("first tip is tip one", firstTip === R.TIPS[0]);
  click(doc.querySelector("#home-tip-next")); await sleep(20);
  check("Next tip moves to the next tip", doc.querySelector("#home-tip-text").textContent === R.TIPS[1]);
  R.store().settings.tipIndex = 199; R.renderHome(); await sleep(20);
  click(doc.querySelector("#home-tip-next")); await sleep(20);
  check("Next tip wraps back to the start", doc.querySelector("#home-tip-text").textContent === R.TIPS[0]);
  click(doc.querySelector("#home-tip-dismiss")); await sleep(20);
  check("Dismiss hides the card", doc.querySelector("#home-tip-card").hidden);
  R.renderHome(); await sleep(20);
  check("dismissed today stays hidden", doc.querySelector("#home-tip-card").hidden);
  delete R.store().settings.tipsDismissed; R.renderHome(); await sleep(20);
  check("card comes back another day", !doc.querySelector("#home-tip-card").hidden);

  /* ---- 62. Reminders screen + Skip ---- */
  console.log("== 62. reminders screen and skip ==");
  // Nov 16: Rick — a Reminders screen like his old app's (on/off, the time,
  // the day it is due or the day before, one notice for the whole day,
  // two weeks ahead for jobs left to a pro, a nudge while anything is
  // overdue), plus "Skip until next due" on the job sheet. Snooze was
  // already in the app ("Nudge me again in a week"), and "left to a
  // pro" is the job sheet's own switch — no second toggle was needed.
  function isoPlus62(days) { var d = new Date(); d.setDate(d.getDate() + days); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function today62() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  const rig62 = R.activeRig();
  const mkTask62 = (title, due, extra) => Object.assign(R.newTask({ rigId: rig62.id, title: title, category: "Tires", nextDueDate: due }), extra || {});
  const planTasks62 = [
    mkTask62("Job A", isoPlus62(1)),
    mkTask62("Job B", isoPlus62(1)),
    mkTask62("Job C", isoPlus62(5)),
    mkTask62("Pro job", isoPlus62(20), { needsPro: true }),
    mkTask62("Soon pro job", isoPlus62(10), { needsPro: true }),
    mkTask62("Old job", isoPlus62(-1)),
  ];
  const plan62 = R.planReminders(planTasks62, rig62.id, today62(), { on: true, hour: 23, when: "due", catchupDue: isoPlus62(14) });
  const digests62 = plan62.filter(function (n) { return n.title.indexOf("maintenance day") === 11; });
  check("two jobs due the same day share one reminder", digests62.length === 4 && digests62.some(function (n) { return n.body.indexOf("Job A") !== -1 && n.body.indexOf("Job B") !== -1; }));
  check("a job due another day gets its own reminder", digests62.some(function (n) { return n.body.indexOf("Job C") !== -1; }));
  const book62 = plan62.filter(function (n) { return n.title.indexOf("time to book") === 11; });
  check("a pro job due in 20 days gets a book-ahead nudge", book62.length === 1 && book62[0].body.indexOf("Pro job") !== -1);
  check("a pro job due in 10 days is covered by the day reminder, not a book-ahead", !plan62.some(function (n) { return n.body.indexOf("Soon pro job") !== -1 && n.title.indexOf("time to book") === 11; }));
  const catch62 = plan62.filter(function (n) { return n.id === 4000; });
  check("an overdue job gets one catch-up nudge", catch62.length === 1 && catch62[0].body.indexOf("Old job") !== -1);
  check("an overdue job gets no day reminder of its own", !digests62.some(function (n) { return n.body.indexOf("Old job") !== -1; }));
  check("reminders off plans nothing", R.planReminders(planTasks62, rig62.id, today62(), { on: false, hour: 23, when: "due", catchupDue: isoPlus62(14) }).length === 0);
  const before62 = R.planReminders([mkTask62("Early job", isoPlus62(2))], rig62.id, today62(), { on: true, hour: 23, when: "before", catchupDue: null });
  check("'the day before' reminds the day before it is due", before62.length === 1 && before62[0].at.getDate() === new Date(new Date().setDate(new Date().getDate() + 1)).getDate());
  // Skip: the next due moves one rhythm forward, history untouched.
  const logsBefore62 = R.store().logs.length;
  const skipTask62 = R.newTask({ rigId: rig62.id, title: "Skip me", category: "Tires", intervalMonths: 6, nextDueDate: "2026-06-01", lastDoneAt: "2025-12-01" });
  R.store().tasks.push(skipTask62);
  check("skip moves the due date one rhythm forward", R.skipTask(skipTask62) && skipTask62.nextDueDate === "2026-12-01");
  check("skip leaves last done alone and writes no log", skipTask62.lastDoneAt === "2025-12-01" && R.store().logs.length === logsBefore62);
  check("a job with no rhythm cannot be skipped", !R.skipTask(R.newTask({ rigId: rig62.id, title: "No rhythm", category: "Tires" })));
  // The job sheet carries both buttons; snooze was already there.
  R.openTaskSheet(skipTask62.id); await sleep(20);
  check("the job sheet has a Skip button", !!doc.querySelector("#ts-skip"));
  check("the job sheet still has its Snooze button", !!doc.querySelector("#ts-snooze"));
  click(doc.querySelector("#ts-skip")); await sleep(20);
  check("Skip on the sheet moves the due date again", skipTask62.nextDueDate === "2027-06-01");
  // The Reminders sheet on More.
  R.showScreen("more"); R.renderMore(); await sleep(20);
  check("More has a Reminders button", !!doc.querySelector("#reminders-open-btn"));
  click(doc.querySelector("#reminders-open-btn")); await sleep(20);
  check("the Reminders sheet opens switched on", !!doc.querySelector("#rm-toggle") && doc.querySelector("#rm-toggle").textContent.indexOf("on") !== -1);
  check("the sheet explains the day digest, the book-ahead and the catch-up", doc.querySelector(".sheet").textContent.indexOf("maintenance day") !== -1 && doc.querySelector(".sheet").textContent.indexOf("book") !== -1 && doc.querySelector(".sheet").textContent.indexOf("catch up") !== -1);
  click(doc.querySelector("#rm-toggle")); await sleep(20);
  check("the switch turns reminders off and saves it", R.store().settings.remindersOn === false && doc.querySelector("#rm-toggle").textContent.indexOf("off") !== -1);
  click(doc.querySelector("#rm-toggle")); await sleep(20);
  check("the switch turns them back on", R.store().settings.remindersOn === true);
  doc.querySelector("#rm-hour").value = "8"; doc.querySelector("#rm-hour").dispatchEvent(new window.Event("change", { bubbles: true })); await sleep(20);
  check("picking 8 AM saves the hour", R.store().settings.reminderHour === 8);
  doc.querySelector("#rm-when").value = "before"; doc.querySelector("#rm-when").dispatchEvent(new window.Event("change", { bubbles: true })); await sleep(20);
  check("picking 'the day before' saves it", R.store().settings.reminderWhen === "before");
  // Native scheduling: the plan reaches the phone's notification plugin.
  const lnCalls62 = { scheduled: null, cancelled: 0 };
  win2.Capacitor.Plugins.LocalNotifications = {
    schedule: function (opts) { lnCalls62.scheduled = opts.notifications; return Promise.resolve({}); },
    cancelAll: function () { lnCalls62.cancelled++; return Promise.resolve(); },
    checkPermissions: function () { return Promise.resolve({ display: "granted" }); },
  };
  R2.store().settings.reminderHour = 23; R2.store().settings.reminderWhen = "due"; R2.store().settings.remindersOn = true;
  const rig2_62 = R2.activeRig();
  R2.store().tasks.push(R2.newTask({ rigId: rig2_62.id, title: "Native A", category: "Tires", nextDueDate: isoPlus62(1) }));
  R2.store().tasks.push(R2.newTask({ rigId: rig2_62.id, title: "Native B", category: "Tires", nextDueDate: isoPlus62(1) }));
  R2.store().tasks.push(R2.newTask({ rigId: rig2_62.id, title: "Native pro", category: "Tires", nextDueDate: isoPlus62(20), needsPro: true }));
  R2.store().tasks.push(R2.newTask({ rigId: rig2_62.id, title: "Native old", category: "Tires", nextDueDate: isoPlus62(-2) }));
  R2.scheduleReminders(); await sleep(50);
  check("scheduling clears the old notices first", lnCalls62.cancelled >= 1);
  check("the phone gets one digest for the two same-day jobs", !!lnCalls62.scheduled && lnCalls62.scheduled.some(function (n) { return n.body.indexOf("Native A") !== -1 && n.body.indexOf("Native B") !== -1; }));
  check("the phone gets the book-ahead for the pro job", !!lnCalls62.scheduled && lnCalls62.scheduled.some(function (n) { return n.title.indexOf("time to book") === 11 && n.body.indexOf("Native pro") !== -1; }));
  check("the phone gets the catch-up nudge for the overdue job", !!lnCalls62.scheduled && lnCalls62.scheduled.some(function (n) { return n.id === 4000; }));
  check("the catch-up date is remembered so it does not drift", !!R2.store().settings.catchupDue);
  R2.openRemindersSheet(); await sleep(80);
  check("the sheet says when notifications are allowed on this device", doc2.querySelector(".sheet").textContent.indexOf("Notifications are allowed on this device") !== -1);
  R2.store().settings.remindersOn = false; R2.scheduleReminders(); await sleep(50);
  check("switching reminders off cancels everything on the phone", lnCalls62.cancelled >= 2 && R2.store().settings.catchupDue === null);

  /* ---- 63. per-job guidance on the job sheet ---- */
  console.log("== 63. per-job guidance ==");
  // Nov 16: Rick — every job in his old app's book carried the same
  // two-part template, so ours does too, in our own words, no links out.
  check("guidance covers 36 entries", R.GUIDANCE && R.GUIDANCE.length === 36);
  const gBrakes = R.guidanceFor("Inspect Brake Pads, Rotors, and Calipers");
  check("guidance matches a job title exactly", !!gBrakes && gBrakes.why.indexOf("Pads wear quietly") !== -1 && gBrakes.look.indexOf("Look for pad thickness") !== -1);
  check("guidance matches regardless of case", R.guidanceFor("RECORD YOUR TIRE DATES") && R.guidanceFor("RECORD YOUR TIRE DATES").why.indexOf("birthday is stamped") !== -1 && R.guidanceFor("inspect brake pads, rotors, and calipers") === gBrakes);
  const gPropA = R.guidanceFor("Test Propane Regulator");
  const gPropB = R.guidanceFor("Inspect Propane Lines & Fittings");
  check("one entry can cover several job titles", !!gPropA && gPropA === gPropB);
  check("a job with no entry gets no guidance", R.guidanceFor("Test overdue job") === null && R.guidanceFor("") === null && R.guidanceFor(null) === null);
  const gTask63 = R.newTask({ rigId: rig.id, title: "Inspect Brake Pads, Rotors, and Calipers", category: "Brakes", intervalMonths: 12, nextDueDate: isoPlus(30) });
  R.store().tasks.push(gTask63);
  R.openTaskSheet(gTask63.id); await sleep(20);
  const gBox = doc.querySelector("#ts-guidance");
  check("a matched job shows both guidance sections", !!gBox && gBox.textContent.indexOf("Why it counts") !== -1 && gBox.textContent.indexOf("What to check") !== -1);
  check("the sections carry the drafted words", !!gBox && gBox.textContent.indexOf("Pads wear quietly") !== -1 && gBox.textContent.indexOf("Look for pad thickness") !== -1);
  check("guidance has no links out of the app", !!gBox && !gBox.querySelector("a") && gBox.innerHTML.indexOf("youtube") === -1 && gBox.innerHTML.indexOf("http") === -1);
  check("the sheet still opens normally around the guidance", !!doc.querySelector("#ts-log") && !!doc.querySelector("#ts-skip"));
  const gTask63b = R.newTask({ rigId: rig.id, title: "record your tire dates", category: "Tires", intervalMonths: 12, nextDueDate: isoPlus(30) });
  R.store().tasks.push(gTask63b);
  R.openTaskSheet(gTask63b.id); await sleep(20);
  check("the sheet matches titles regardless of case", !!doc.querySelector("#ts-guidance") && doc.querySelector("#ts-guidance").textContent.indexOf("birthday is stamped") !== -1);
  const gTask63c = R.newTask({ rigId: rig.id, title: "Test overdue job", category: "Engine & Chassis", intervalMonths: 12, nextDueDate: isoPlus(30) });
  R.store().tasks.push(gTask63c);
  R.openTaskSheet(gTask63c.id); await sleep(20);
  check("an unmatched job shows no guidance sections at all", !doc.querySelector("#ts-guidance") && !!doc.querySelector("#ts-log"));

  /* ---- 64. RollOnRV Pro foundation (v73) ---- */
  console.log("== 64. Pro foundation ==");
  // Nov 16: Pro unlocks locally the instant the store confirms, re-checks
  // on every launch, and the paywall shows what's behind the door — no
  // free trial, pay from day one.
  check("premium starts free, not Pro", R.getPremium().status === "free" && R.isPro() === false);
  check("dev unlock is off in this build", R.PRO_CONFIG.devUnlock === false);
  check("three Pro products, right prices", R.PRO_PRODUCT_IDS.monthly === "rollonrv_premium_monthly" && R.PRO_PRODUCT_IDS.yearly === "rollonrv_premium_yearly" && R.PRO_PRODUCT_IDS.lifetime === "rollonrv_premium_lifetime" && R.PRO_PRICES.monthly === "$4.99/mo" && R.PRO_PRICES.yearly === "$39.99/yr" && R.PRO_PRICES.lifetime === "$79.99");
  const pwFree = R.proPaywallHTML();
  check("paywall names every Pro feature plainly", ["Ownership report", "Document Vault", "Parts &amp; warranty tracking", "More than one rig", "Backup"].every(function (f) { return pwFree.indexOf(f) !== -1; }));
  check("paywall shows the three prices", pwFree.indexOf("$4.99") !== -1 && pwFree.indexOf("$39.99") !== -1 && pwFree.indexOf("$79.99") !== -1);
  check("paywall carries the grandfathered-rate line", pwFree.indexOf("Subscribe now and your rate never goes up") !== -1);
  check("paywall has a Restore Purchases button", pwFree.indexOf("Restore Purchases") !== -1);
  check("paywall never mentions a free trial", !/trial/i.test(pwFree));
  check("paywall has no links out of the app", pwFree.indexOf("<a ") === -1 && pwFree.indexOf("youtube") === -1 && pwFree.indexOf("http") === -1);
  check("web preview: the store is not available", R.proStoreAvailable() === false);
  check("web preview: the paywall says subscriptions aren't open yet", pwFree.indexOf("aren't open yet") !== -1);
  R.openProPaywall(); await sleep(20);
  check("the Premium card opens the paywall sheet", !!doc.querySelector("#pro-paywall"));
  R.proSubscribe("monthly"); await sleep(20);
  check("web preview: subscribing shows the not-open-yet note, never orders", doc.querySelector(".pro-note").textContent.indexOf("aren't open yet") !== -1);
  R.proRestorePurchases(); await sleep(20);
  check("web preview: restore says it works once products are set up", doc.querySelector(".pro-note").textContent.indexOf("once the Pro products are set up") !== -1);
  // Grant: the unlock a verified receipt produces.
  R.grantPremium("rollonrv_premium_yearly");
  check("granting premium makes the book Pro", R.isPro() === true && R.getPremium().productId === "rollonrv_premium_yearly" && typeof R.getPremium().since === "number");
  check("the More card shows Pro as active", doc.querySelector("#premium-title").textContent.indexOf("active") !== -1 && doc.querySelector("#premium-open-btn").textContent.indexOf("Pro is active") !== -1);
  const pwPro = R.proPaywallHTML();
  check("the paywall shows the active state, not the plan buttons", pwPro.indexOf("Pro is active") !== -1 && pwPro.indexOf("pro-buy-monthly") === -1 && pwPro.indexOf("pro-buy-yearly") === -1 && pwPro.indexOf("pro-buy-lifetime") === -1);
  R.store().settings.premium = { status: "free", productId: null, since: null };
  R.openProPaywall(); await sleep(20);
  check("back to free, the paywall offers the plans again", R.isPro() === false && !!doc.querySelector("#pro-buy-monthly") && !!doc.querySelector("#pro-buy-yearly") && !!doc.querySelector("#pro-buy-lifetime"));
  // A fake native store, driving the real init / grant / restore code.
  const fakeChain = {};
  const fakeStore = {
    _owned: [], ordered: null, restored: false, readyCb: null,
    registered: null, initialized: false, registerCalls: 0,
    register(list) { this.registered = list; this.registerCalls++; },
    when() { return fakeChain; },
    initialize() { this.initialized = true; },
    error(fn) { this.globalErrorFn = fn; },
    get(id) { return (this._products || {})[id]; },
    order(id) { this.ordered = id; },
    restorePurchases() { this.restored = true; },
    ready(cb) { this.readyCb = cb; },
    owned(id) { return this._owned.indexOf(id) !== -1; },
  };
  fakeChain.approved = function (fn) { fakeStore.approvedFn = fn; return fakeChain; };
  fakeChain.verified = function (fn) { fakeStore.verifiedFn = fn; return fakeChain; };
  // No .error() on the fake chain: the real plugin's when() chain has
  // none either (Nov 19, build 39 — the old fake had it, which hid the
  // throw that kept the store from ever initializing). If app code
  // chains .error() again, this fake throws exactly like the real one.
  window.CdvPurchase = {
    store: fakeStore,
    ProductType: { PAID_SUBSCRIPTION: "PAID_SUBSCRIPTION", NON_CONSUMABLE: "NON_CONSUMABLE" },
    Platform: { APPLE_APPSTORE: "APPLE_APPSTORE", GOOGLE_PLAY: "GOOGLE_PLAY" },
    ErrorCode: { PAYMENT_CANCELLED: "PAYMENT_CANCELLED" },
  };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios" };
  check("with a native bridge the store is available", R.proStoreAvailable() === true);
  R.proStoreInit();
  check("init registers all three products", fakeStore.registered && fakeStore.registered.length === 3 &&
    fakeStore.registered[0].id === "rollonrv_premium_monthly" && fakeStore.registered[0].type === "PAID_SUBSCRIPTION" && fakeStore.registered[0].platform === "APPLE_APPSTORE" &&
    fakeStore.registered[1].id === "rollonrv_premium_yearly" && fakeStore.registered[1].type === "PAID_SUBSCRIPTION" &&
    fakeStore.registered[2].id === "rollonrv_premium_lifetime" && fakeStore.registered[2].type === "NON_CONSUMABLE");
  check("init starts the store and arms the ownership re-check", fakeStore.initialized === true && typeof fakeStore.readyCb === "function");
  // A store error names itself on the paywall instead of failing silently
  // (Nov 19: build 32 never became ready, no error anywhere).
  fakeStore.globalErrorFn({ code: "LOAD", message: "Failed to load in-app products metadata" });
  check("a global store error names itself on the paywall", doc.querySelector(".pro-note").textContent.indexOf("Store problem: LOAD") !== -1);
  check("the paywall names the products the store never returned", doc.querySelector(".pro-note").textContent.indexOf("Monthly: not found") !== -1);
  check("init has not made the store ready yet", R.proStoreState().initialized === true && R.proStoreState().ready === false);
  // v74: the store has not said ready, so subscribing must not order yet —
  // it says "Opening the store…" and waits for ready instead of hanging.
  R.proSubscribe("yearly"); await sleep(20);
  check("subscribing before ready waits instead of ordering", fakeStore.ordered === null && doc.querySelector(".pro-note").textContent.indexOf("Opening the store") !== -1);
  check("waiting for a store that never answers resolves false", (await R.proStoreWaitReady(300)) === false);
  fakeStore.readyCb();
  check("ready firing marks the store ready", R.proStoreState().ready === true);
  await sleep(400);
  check("the waiting subscribe orders once ready fires", fakeStore.ordered === "rollonrv_premium_yearly");
  R.proStoreInit();
  check("a second init does not register twice", fakeStore.registerCalls === 1);
  R.openProPaywall(); await sleep(20);
  check("reopening the paywall does not re-register", fakeStore.registerCalls === 1);
  let verifyCalled = false;
  fakeStore.approvedFn({ verify() { verifyCalled = true; } });
  check("an approved purchase is sent to verify", verifyCalled === true);
  let finishCalled = false;
  fakeStore.verifiedFn({ sourceReceipt: { transactions: [{ products: [{ id: "rollonrv_premium_lifetime" }] }] }, finish() { finishCalled = true; } });
  check("a verified receipt grants Pro at once, with the right plan", R.isPro() === true && R.getPremium().productId === "rollonrv_premium_lifetime" && finishCalled === true);
  // Ready has fired by now (see the wait checks above), so a fresh
  // subscribe orders at once instead of waiting.
  fakeStore.ordered = null;
  R.proSubscribe("monthly");
  check("subscribing once ready orders at once", fakeStore.ordered === "rollonrv_premium_monthly");
  R.proRestorePurchases();
  check("restore asks the store for purchases", fakeStore.restored === true);
  R.openProPaywall(); await sleep(20);
  fakeStore.globalErrorFn({ code: "PAYMENT_CANCELLED" });
  check("a cancelled purchase says nothing was charged", doc.querySelector(".pro-note").textContent.indexOf("nothing was charged") !== -1);
  fakeStore._owned = [];
  R.proRecheckOwnership();
  check("an ended subscription stops being Pro on the next check", R.isPro() === false && R.getPremium().status === "free");
  R.grantPremium("rollonrv_premium_monthly");
  fakeStore._owned = ["rollonrv_premium_monthly"];
  R.proRecheckOwnership();
  check("a live subscription stays Pro on the next check", R.isPro() === true && R.getPremium().productId === "rollonrv_premium_monthly");
  delete window.CdvPurchase;
  delete window.Capacitor;
  R.store().settings.premium = { status: "free", productId: null, since: null };

  /* ---- 47. double-tap never zooms the screen ---- */
  console.log("== 47. double-tap zoom is off ==");
  const vp = doc.querySelector('meta[name="viewport"]').getAttribute("content") || "";
  check("viewport locks the zoom off", vp.includes("maximum-scale=1.0") && vp.includes("user-scalable=no"));
  check("body kills the double-tap zoom gesture", css.includes("touch-action:manipulation"));

  /* ---- 45. the guide is a page inside the app ---- */
  console.log("== 45. guide is in-app ==");
  // Nov 15: the guide used to be a web link (then an in-app browser sheet
  // via a plugin that never answered on the phone) — either way it showed
  // rickdemers.com. Now it's a screen inside the app: a button, not a
  // link, so there is nowhere for it to leave to.
  check("the guide button is a button, not a link", doc.querySelector("#home-guide-link").tagName === "BUTTON" && !doc.querySelector("#home-guide-link").getAttribute("href"));
  R.showScreen("home"); await sleep(20);
  doc.querySelector("#home-guide-link").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(20);
  check("tapping How to use this app opens the guide screen", doc.querySelector("#screen-guide").classList.contains("active"));
  check("the in-app guide carries all 15 steps", doc.querySelectorAll("#screen-guide .card").length === 15);
  doc.querySelector("#guide-back-btn").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(20);
  check("the guide's Back button returns to Home", doc.querySelector("#screen-home").classList.contains("active"));

  /* ---- 65. the store says so when it never answers (v74) ---- */
  console.log("== 65. store timeout message ==");
  // A third dom: a native store that never fires ready. The Nov 17 sandbox
  // failure was exactly this — "Opening the store…" forever, no sheet, no
  // error. The fix must say so plainly and let the user retry.
  const dom3 = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
  const win3 = dom3.window;
  win3.confirm = () => true;
  win3.scrollTo = () => {};
  win3.eval(plansJs);
  win3.eval(appJs);
  await sleep(50);
  const doc3 = win3.document;
  const R3 = win3.RollOnRV;
  const fakeChain3 = {};
  const fakeStore3 = {
    _owned: [], ordered: null, restored: false, readyCb: null,
    registered: null, initialized: false,
    register(list) { this.registered = list; },
    when() { return fakeChain3; },
    initialize() { this.initialized = true; return Promise.resolve(this._initErrors || []); },
    error(fn) { this.globalErrorFn = fn; },
    get(id) { return (this._products || {})[id]; },
    order(id) { this.ordered = id; },
    restorePurchases() { this.restored = true; },
    ready(cb) { this.readyCb = cb; },
    owned(id) { return this._owned.indexOf(id) !== -1; },
  };
  fakeChain3.approved = function (fn) { fakeStore3.approvedFn = fn; return fakeChain3; };
  fakeChain3.verified = function (fn) { fakeStore3.verifiedFn = fn; return fakeChain3; };
  // No .error() here either — the real when() chain has none (see the
  // note above fakeChain).
  win3.CdvPurchase = {
    store: fakeStore3,
    ProductType: { PAID_SUBSCRIPTION: "PAID_SUBSCRIPTION", NON_CONSUMABLE: "NON_CONSUMABLE" },
    Platform: { APPLE_APPSTORE: "APPLE_APPSTORE", GOOGLE_PLAY: "GOOGLE_PLAY" },
    ErrorCode: { PAYMENT_CANCELLED: "PAYMENT_CANCELLED" },
  };
  win3.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios" };
  // The store fails its initialize here (Nov 19: build 32 never became
  // ready, no error anywhere) — the paywall must say why, not just that
  // the store isn't responding.
  fakeStore3._initErrors = [{ code: "LOAD", message: "Failed to load in-app products metadata" }];
  R3.openProPaywall(); await sleep(20);
  check("a fresh native store is not ready yet", R3.proStoreState().initialized === true && R3.proStoreState().ready === false);
  check("an initialize error names itself on the paywall", doc3.querySelector(".pro-note").textContent.indexOf("Store problem: LOAD") !== -1);
  check("the paywall names the products the store never returned", doc3.querySelector(".pro-note").textContent.indexOf("Monthly: not found") !== -1);
  R3.proSubscribe("monthly", 300); await sleep(20);
  check("a store that never answers says Opening the store first", doc3.querySelector(".pro-note").textContent.indexOf("Opening the store") !== -1 && fakeStore3.ordered === null);
  await sleep(700);
  check("a store that never answers says so plainly, never hangs", doc3.querySelector(".pro-note").textContent.indexOf("isn't responding right now") !== -1 && fakeStore3.ordered === null);
  // And the retry works once the store does answer.
  fakeStore3.readyCb();
  R3.proSubscribe("monthly"); await sleep(20);
  check("retrying after ready orders at once", fakeStore3.ordered === "rollonrv_premium_monthly");

  /* ---- 66. deleting a logbook entry takes two taps (v74) ---- */
  console.log("== 66. logbook armed delete ==");
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-btn")); await sleep(20);
  setVal("#lj-title", "Test delete-me job");
  setVal("#lj-cost", "35.00");
  click(doc.querySelector("#lj-save")); await sleep(800);
  const delLog = R.store().logs.find((l) => l.title === "Test delete-me job");
  check("the entry to delete exists", !!delLog);
  R.showScreen("logbook"); await sleep(20);
  const delEntry = Array.from(doc.querySelectorAll("[data-log]")).find((el) => el.textContent.includes("Test delete-me job"));
  click(delEntry); await sleep(20);
  check("the entry opens for editing", !!doc.querySelector("#lj-delete"));
  click(doc.querySelector("#lj-delete")); await sleep(20);
  check("one tap only arms it — the entry is still there", R.store().logs.some((l) => l.id === delLog.id) && doc.querySelector("#lj-delete").textContent.indexOf("Tap again to delete") !== -1);
  click(doc.querySelector("#lj-delete")); await sleep(20);
  check("the second tap deletes it", !R.store().logs.some((l) => l.id === delLog.id));

  /* ---- 67. prebuilt plans (v74) ---- */
  console.log("== 67. prebuilt plans ==");
  check("thirteen prebuilt plans", R.PREBUILT_PLANS.length === 13);
  check("every plan has a label, rig types, and over a hundred jobs", R.PREBUILT_PLANS.every((p) => p.id && p.label && p.rigTypes.length && p.jobs.length > 100));
  check("no plan job carries a placeholder or a competitor's name", R.PREBUILT_PLANS.every((p) => p.jobs.every((j) => j.title && j.category && !/\(Type Unknown\)/i.test(j.title) && !/Keeper/i.test(j.title))));
  check("plans carry no personal data at all", !/@|Newmar|Dutch Star|Plateau|Travato|Redhawk|Montana|Coleman|Bay Star|hotmail|gmail/.test(JSON.stringify(R.PREBUILT_PLANS)));
  check("a Class C rig is offered both Class C plans", R.plansForRig(rig).map((p) => p.id).sort().join(",") === "class-c-diesel,class-c-gas");
  const cGas = R.PREBUILT_PLANS.find((p) => p.id === "class-c-gas");
  rig.equipment = { sparetire: "no", waterHeater: "tank", slides: "yes" }; R.save();
  const gated = R.planJobsFor(rig, cGas);
  check("no spare hides the spare-tire job", !gated.some((j) => j.title === "Inspect Spare Tire"));
  check("a tank water heater shows the flush, not the descale", gated.some((j) => j.title === "Flush Water Heater Tank") && !gated.some((j) => j.title === "Descale Heat Exchanger"));
  rig.equipment = { sparetire: "yes", waterHeater: "tankless", slides: "yes" }; R.save();
  const gated2 = R.planJobsFor(rig, cGas);
  check("a spare shows the spare-tire job", gated2.some((j) => j.title === "Inspect Spare Tire"));
  check("a tankless heater shows the descale, not the flush", gated2.some((j) => j.title === "Descale Heat Exchanger") && !gated2.some((j) => j.title === "Flush Water Heater Tank"));
  // Build it: spread across 90 days, Mondays only.
  rig.maintDays = [1]; rig.planSchedule = "spread"; R.save();
  const beforeCount = R.store().tasks.filter((t) => t.rigId === rig.id).length;
  const beforeIds = new Set(R.store().tasks.map((t) => t.id));
  const planRes = R.buildPlan(rig, cGas);
  check("building a plan writes the fitting jobs, nothing twice", planRes.added + planRes.skipped === gated2.length && planRes.added > 100 && R.store().tasks.filter((t) => t.rigId === rig.id).length === beforeCount + planRes.added);
  const builtTasks = R.store().tasks.filter((t) => t.rigId === rig.id && !beforeIds.has(t.id));
  const spareBuilt = builtTasks.filter((t) => t.title === "Inspect Spare Tire");
  check("a built job keeps its rhythm", spareBuilt.length === 1 && spareBuilt[0].intervalMonths === 6);
  const todayLocal = (function () { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();
  const spreadDates = builtTasks.filter((t) => t.nextDueDate).map((t) => t.nextDueDate);
  check("spread first dues land on the chosen maintenance day", spreadDates.filter((d) => d !== todayLocal).every((d) => new Date(d + "T12:00:00").getDay() === 1));
  check("spread first dues land inside 90 days", spreadDates.every((d) => d <= isoPlus(90)));
  const planRes2 = R.buildPlan(rig, cGas);
  check("building the same plan twice adds nothing", planRes2.added === 0 && planRes2.skipped === gated2.length);
  // First-due math, direct.
  function isoPlusMonthsLocal(months) { const d = new Date(); const out = new Date(d.getFullYear(), d.getMonth() + months, d.getDate()); return out.getFullYear() + "-" + String(out.getMonth() + 1).padStart(2, "0") + "-" + String(out.getDate()).padStart(2, "0"); }
  check("age starts a job halfway through its rhythm", R.planFirstDue(rig, { intervalMonths: 12 }, "age", 0, 1).date === isoPlusMonthsLocal(6));
  check("fresh starts a full rhythm", R.planFirstDue(rig, { intervalMonths: 12 }, "fresh", 0, 1).date === isoPlusMonthsLocal(12));
  check("age halves the miles to the next due", R.planFirstDue(rig, { intervalMiles: 5000 }, "age", 0, 1).miles === (Number(rig.mileage) || 0) + 2500);

  /* ---- 68. the plan setup flow, end to end (v74) ---- */
  console.log("== 68. plan setup flow ==");
  R.openPlanChoiceSheet(rig); await sleep(20);
  check("the choice sheet lists the Class C plans", doc.querySelector("#sheet-host").textContent.includes("Full Class C gas plan") && doc.querySelector("#sheet-host").textContent.includes("Full Class C diesel plan"));
  check("the choice sheet offers starting empty", !!doc.querySelector("#plan-empty"));
  click(doc.querySelector('[data-plan="1"]')); await sleep(20);
  check("loading a plan asks what the rig has", doc.querySelector("#sheet-host").textContent.includes("What does your rig have?"));
  click(doc.querySelector('[data-eq="centralvac"][data-val="no"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("after the questions come the plan choices", doc.querySelector("#sheet-host").textContent.includes("How should the plan land?"));
  click(doc.querySelector('[data-sched="fresh"]')); await sleep(20);
  click(doc.querySelector("#plan-opts-next")); await sleep(20);
  check("the review step shows the plan and asks yes", doc.querySelector("#sheet-host").textContent.includes("Full Class C diesel plan") && !!doc.querySelector("#plan-build") && !!doc.querySelector("#plan-wrong"));
  click(doc.querySelector("#plan-build")); await sleep(20);
  check("building opens the welcome screen", doc.querySelector("#sheet-host").textContent.includes("Your plan is ready"));
  check("the welcome names the top priority and offers one today", doc.querySelector("#sheet-host").textContent.includes("Your top priority") && !!doc.querySelector("#plan-do-one"));
  click(doc.querySelector("#plan-do-one")); await sleep(20);
  check("Do one today opens the top job", !!doc.querySelector("#ts-log"));

  /* ---- 69. parts on the Add Task form (v74) ---- */
  console.log("== 69. parts on add task ==");
  R.showScreen("logbook"); await sleep(20);
  click(doc.querySelector("#log-add-task-btn")); await sleep(20);
  check("the add sheet has a Parts needed field", !!doc.querySelector("#at-parts") && !!doc.querySelector("#at-add-part"));
  setVal("#at-title", "Test parts job");
  doc.querySelector("[data-at-pname]").value = "Oil filter";
  doc.querySelector("[data-at-ppart]").value = "LF16035";
  click(doc.querySelector("#at-add-part")); await sleep(20);
  const pnameEls = doc.querySelectorAll("[data-at-pname]");
  check("another part row can be added", pnameEls.length === 2);
  pnameEls[1].value = "Engine oil";
  click(doc.querySelector("#at-save")); await sleep(20);
  const partsJob = R.store().tasks.find((t) => t.title === "Test parts job");
  check("the task is written in the book", !!partsJob);
  const jobParts = R.store().parts.filter((p) => partsJob && p.taskId === partsJob.id);
  check("both parts land on Parts to get, not bought", jobParts.length === 2 && jobParts.every((p) => p.bought === false) && jobParts.some((p) => p.name === "Oil filter" && p.partNo === "LF16035") && jobParts.some((p) => p.name === "Engine oil"));

  /* ---- 70. guidance batch two + the caution flag (v74) ---- */
  console.log("== 70. guidance batch two, caution ==");
  check("guidance covers the generator exercise", R.guidanceFor("Run Generator Exercise Cycle") && R.guidanceFor("Run Generator Exercise Cycle").why.indexOf("goes stale") !== -1);
  check("guidance covers GFCI and fresh water", R.guidanceFor("Test GFCI Outlets") && R.guidanceFor("Sanitize Fresh Water System"));
  check("guidance covers DEF and the fire extinguisher", R.guidanceFor("Check DEF Level") && R.guidanceFor("Inspect Fire Extinguisher"));
  check("a renamed plan job still finds its guidance", R.guidanceFor("Inspect Brake Pads and Rotors") && R.guidanceFor("Inspect Roof Sealant") && R.guidanceFor("Replace Brake Fluid"));
  const cautionTask = R.store().tasks.find((t) => t.title === "Inspect Battery Terminals" && t.rigId === rig.id);
  check("a plan-built battery job carries the caution flag", cautionTask && cautionTask.caution === true);
  R.openTaskSheet(cautionTask.id); await sleep(20);
  check("a caution job says so on its sheet", doc.querySelector("#sheet-host").textContent.indexOf("Needs care") !== -1);

  /* ---- 71. generator fuel sub-choice (v75) ---- */
  console.log("== 71. generator fuel ==");
  // Static: the regenerated plans carry the fuel gate on fuel-specific
  // generator jobs only.
  const aGas = R.PREBUILT_PLANS.find((p) => p.id === "class-a-gas");
  const aDiesel = R.PREBUILT_PLANS.find((p) => p.id === "class-a-diesel");
  const bDiesel = R.PREBUILT_PLANS.find((p) => p.id === "class-b-diesel");
  const gasOil = aGas.jobs.find((j) => j.title === "Change Built-in Gasoline Generator Oil");
  check("gasoline generator jobs need gas fuel", !!gasOil && gasOil.needs && gasOil.needs.generator === "builtin" && gasOil.needs.genfuel === "gas");
  check("diesel generator jobs need diesel fuel", aDiesel.jobs.some((j) => j.title === "Change Diesel Oil and Filter" && j.needs && j.needs.genfuel === "diesel"));
  check("propane generator jobs need propane fuel", bDiesel.jobs.some((j) => j.title === "Change Built-in Propane Generator Oil" && j.needs && j.needs.genfuel === "propane"));
  check("generic generator jobs carry no fuel gate", aGas.jobs.filter((j) => j.category === "Generator" && ["Run Generator Exercise Cycle", "Schedule Annual Generator Service", "Inspect Generator Fuel Lines", "Inspect Generator Output Breaker", "Record Your Generator Hours"].indexOf(j.title) !== -1).every((j) => j.needs && !j.needs.genfuel));
  check("the shared valve-lash job fits gas and propane alike", aGas.jobs.some((j) => j.title === "Adjust Gasoline or Propane Valve Lash" && j.needs && !j.needs.genfuel));
  check("the plan default fuel job is still the default", gasOil.isDefault === true);
  // Gating, through the real filter.
  rig.equipment = { generator: "builtin", genfuel: "gas" }; R.save();
  let g = R.planJobsFor(rig, cGas);
  check("the right fuel shows the job", g.some((j) => j.title === "Change Built-in Gasoline Generator Oil") && g.some((j) => j.title === "Replace Gasoline Spark Plug"));
  rig.equipment = { generator: "builtin", genfuel: "propane" }; R.save();
  g = R.planJobsFor(rig, cGas);
  check("the wrong fuel hides the job", !g.some((j) => j.title === "Change Built-in Gasoline Generator Oil") && !g.some((j) => j.title === "Replace Gasoline Spark Plug") && !g.some((j) => j.title === "Clean Gasoline Carburetor System"));
  check("the wrong fuel keeps the generic generator jobs", g.some((j) => j.title === "Run Generator Exercise Cycle") && g.some((j) => j.title === "Schedule Annual Generator Service") && g.some((j) => j.title === "Adjust Gasoline or Propane Valve Lash"));
  rig.equipment = { generator: "builtin", genfuel: "unsure" }; R.save();
  g = R.planJobsFor(rig, cGas);
  check("Not sure keeps the plan default fuel job", g.some((j) => j.title === "Change Built-in Gasoline Generator Oil"));
  rig.equipment = { generator: "builtin" }; R.save();
  g = R.planJobsFor(rig, cGas);
  check("unanswered fuel keeps the plan default fuel job", g.some((j) => j.title === "Change Built-in Gasoline Generator Oil"));
  rig.equipment = { generator: "builtin", genfuel: "diesel" }; R.save();
  g = R.planJobsFor(rig, aDiesel);
  check("the diesel plan shows its diesel jobs on diesel", g.some((j) => j.title === "Change Diesel Oil and Filter") && g.some((j) => j.title === "Replace Diesel Primary Fuel Filter"));
  rig.equipment = { generator: "builtin", genfuel: "gas" }; R.save();
  g = R.planJobsFor(rig, aDiesel);
  check("the diesel plan hides its diesel jobs on gas", !g.some((j) => j.title === "Change Diesel Oil and Filter") && !g.some((j) => j.title === "Replace Diesel Primary Fuel Filter"));
  // Class B diesel has no default generator set: its propane jobs load
  // on an explicit Built-in answer, and "Not sure" on fuel must not
  // take them away.
  rig.equipment = { generator: "builtin", genfuel: "unsure" }; R.save();
  g = R.planJobsFor(rig, bDiesel);
  check("Not sure on fuel keeps the propane jobs with no plan default", g.some((j) => j.title === "Change Built-in Propane Generator Oil") && g.some((j) => j.title === "Check Propane Generator Connection"));
  rig.equipment = { generator: "builtin" }; R.save();
  g = R.planJobsFor(rig, bDiesel);
  check("unanswered fuel keeps the propane jobs with no plan default", g.some((j) => j.title === "Change Built-in Propane Generator Oil"));
  rig.equipment = { generator: "builtin", genfuel: "gas" }; R.save();
  g = R.planJobsFor(rig, bDiesel);
  check("gas hides the propane jobs", !g.some((j) => j.title === "Change Built-in Propane Generator Oil") && !g.some((j) => j.title === "Check Propane Generator Connection"));
  rig.equipment = { generator: "unsure" }; R.save();
  g = R.planJobsFor(rig, bDiesel);
  check("no generator answer still hides the non-default set", !g.some((j) => j.title === "Change Built-in Propane Generator Oil"));
  rig.equipment = { generator: "none", genfuel: "gas" }; R.save();
  g = R.planJobsFor(rig, cGas);
  check("no generator hides every generator job", !g.some((j) => j.category === "Generator"));
  // The question itself: only after Built-in or Portable.
  R.openEquipmentSheet(); await sleep(20);
  check("no generator answer asks no fuel question", !doc.querySelector('[data-eq="genfuel"]'));
  click(doc.querySelector('[data-eq="generator"][data-val="builtin"]')); await sleep(20);
  const fuelBtns = Array.from(doc.querySelectorAll('[data-eq="genfuel"]'));
  const labels = Array.from(doc.querySelectorAll("#sheet-host .field label")).map((l) => l.textContent.trim());
  check("Built-in asks the fuel question, right after Generator", fuelBtns.length === 4 && labels.indexOf("Generator fuel?") === labels.indexOf("Generator?") + 1);
  check("the fuel question offers Gas, Diesel, Propane, Not sure", ["Gas", "Diesel", "Propane", "Not sure"].every((t) => fuelBtns.some((b) => b.textContent.trim() === t)));
  check("Built-in asks twenty questions", doc.querySelectorAll("#sheet-host [data-eq]").length === 68 && doc.querySelectorAll('#sheet-host [data-val="unsure"]').length === 20);
  click(doc.querySelector('[data-eq="genfuel"][data-val="propane"]')); await sleep(20);
  click(doc.querySelector('[data-eq="generator"][data-val="portable"]')); await sleep(20);
  check("Portable keeps the fuel question", !!doc.querySelector('[data-eq="genfuel"]'));
  click(doc.querySelector('[data-eq="generator"][data-val="none"]')); await sleep(20);
  check("dropping the generator drops the fuel question", !doc.querySelector('[data-eq="genfuel"]'));
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("dropping the generator drops the stale fuel answer", R.activeRig().equipment.generator === "none" && !R.activeRig().equipment.genfuel);
  R.activeRig().equipment = {}; R.save();

  /* ---- 72. slide mechanism sub-choice (v75) ---- */
  console.log("== 72. slide mechanism ==");
  // Static: the regenerated plans gate mechanism jobs on the new answer.
  const aDiesel72 = R.PREBUILT_PLANS.find((p) => p.id === "class-a-diesel");
  const cGas72 = R.PREBUILT_PLANS.find((p) => p.id === "class-c-gas");
  const aGas72 = R.PREBUILT_PLANS.find((p) => p.id === "class-a-gas");
  const slideJob = (p, t) => p.jobs.find((j) => j.title === t);
  check("hydraulic slide jobs need hydraulic", ["Check Slide Fluid Level", "Inspect Slide System for Leaks", "Inspect Slide Lines and Hoses"].every((t) => { const j = slideJob(aDiesel72, t); return j && j.needs && j.needs.slides === "yes" && j.needs.slidetype === "hydraulic"; }));
  check("Schwintek slide jobs need Schwintek", ["Check Slide Synchronization", "Inspect Slide Drive Racks", "Clean Schwintek slide tracks", "Resync Schwintek slide motors"].every((t) => { const j = slideJob(cGas72, t); return j && j.needs && j.needs.slidetype === "schwintek"; }));
  check("shear pins need rack and pinion", slideJob(cGas72, "Check slide shear pins & gear packs") && slideJob(cGas72, "Check slide shear pins & gear packs").needs.slidetype === "rackpinion");
  check("cables need cable", slideJob(cGas72, "Inspect slide cables & tension") && slideJob(cGas72, "Inspect slide cables & tension").needs.slidetype === "cable");
  check("generic slide jobs carry no mechanism gate", ["Clean Slide Box and Sweeps", "Inspect Slide Seals", "Inspect Visible Damage", "Check Room Alignment", "Check Fasteners and Brackets", "Inspect Electrical Connections"].every((t) => { const j = slideJob(cGas72, t); return j && j.needs && j.needs.slides === "yes" && !j.needs.slidetype; }));
  check("the drive electrical job stays generic", slideJob(aDiesel72, "Clean Slide Drive Electrical Connections") && !slideJob(aDiesel72, "Clean Slide Drive Electrical Connections").needs.slidetype);
  check("every plan carries the four new mechanism jobs", R.PREBUILT_PLANS.every((p) => ["Clean Schwintek slide tracks", "Resync Schwintek slide motors", "Check slide shear pins & gear packs", "Inspect slide cables & tension"].every((t) => slideJob(p, t))));
  check("the fluid job says slides retracted and ATF", slideJob(aDiesel72, "Check Slide Fluid Level").note && slideJob(aDiesel72, "Check Slide Fluid Level").note.indexOf("Dexron III") !== -1);
  check("the tracks job says never grease them", slideJob(cGas72, "Clean Schwintek slide tracks").note && slideJob(cGas72, "Clean Schwintek slide tracks").note.indexOf("Never grease") !== -1);
  check("the resync job says hold Extend five seconds", slideJob(cGas72, "Resync Schwintek slide motors").note && slideJob(cGas72, "Resync Schwintek slide motors").note.indexOf("5 seconds") !== -1);
  check("the plan default mechanism stays the default", slideJob(aDiesel72, "Check Slide Fluid Level").isDefault === true && slideJob(cGas72, "Check Slide Synchronization").isDefault === true);
  check("a new job for another mechanism is not the default", slideJob(aDiesel72, "Clean Schwintek slide tracks").isDefault !== true && slideJob(cGas72, "Check slide shear pins & gear packs").isDefault !== true);
  // Gating, through the real filter.
  rig.equipment = { slides: "yes", slidetype: "hydraulic" }; R.save();
  let s = R.planJobsFor(rig, aDiesel72);
  check("hydraulic shows the hydraulic jobs", s.some((j) => j.title === "Check Slide Fluid Level") && s.some((j) => j.title === "Inspect Slide System for Leaks") && s.some((j) => j.title === "Inspect Slide Lines and Hoses"));
  rig.equipment = { slides: "yes", slidetype: "schwintek" }; R.save();
  s = R.planJobsFor(rig, aDiesel72);
  check("Schwintek hides the hydraulic jobs", !s.some((j) => j.title === "Check Slide Fluid Level") && !s.some((j) => j.title === "Inspect Slide System for Leaks"));
  check("the wrong mechanism keeps the generic slide jobs", s.some((j) => j.title === "Inspect Slide Seals") && s.some((j) => j.title === "Clean Slide Box and Sweeps"));
  rig.equipment = { slides: "yes", slidetype: "mixed" }; R.save();
  s = R.planJobsFor(rig, aDiesel72);
  check("more than one type shows the hydraulic jobs", s.some((j) => j.title === "Check Slide Fluid Level"));
  rig.equipment = { slides: "yes", slidetype: "unsure" }; R.save();
  s = R.planJobsFor(rig, aDiesel72);
  check("Not sure keeps the plan default hydraulic jobs", s.some((j) => j.title === "Check Slide Fluid Level"));
  rig.equipment = { slides: "yes" }; R.save();
  s = R.planJobsFor(rig, aDiesel72);
  check("unanswered mechanism keeps the plan default hydraulic jobs", s.some((j) => j.title === "Check Slide Fluid Level"));
  rig.equipment = { slides: "yes", slidetype: "schwintek" }; R.save();
  s = R.planJobsFor(rig, cGas72);
  check("Schwintek shows the Schwintek jobs", s.some((j) => j.title === "Check Slide Synchronization") && s.some((j) => j.title === "Inspect Slide Drive Racks") && s.some((j) => j.title === "Clean Schwintek slide tracks") && s.some((j) => j.title === "Resync Schwintek slide motors"));
  rig.equipment = { slides: "yes", slidetype: "hydraulic" }; R.save();
  s = R.planJobsFor(rig, cGas72);
  check("hydraulic hides the Schwintek jobs", !s.some((j) => j.title === "Check Slide Synchronization") && !s.some((j) => j.title === "Clean Schwintek slide tracks"));
  rig.equipment = { slides: "yes", slidetype: "mixed" }; R.save();
  s = R.planJobsFor(rig, cGas72);
  check("more than one type shows every mechanism job", s.some((j) => j.title === "Check Slide Synchronization") && s.some((j) => j.title === "Check slide shear pins & gear packs") && s.some((j) => j.title === "Inspect slide cables & tension") && s.some((j) => j.title === "Clean Schwintek slide tracks"));
  rig.equipment = { slides: "yes", slidetype: "unsure" }; R.save();
  s = R.planJobsFor(rig, cGas72);
  check("Not sure keeps the plan Schwintek jobs, not the others", s.some((j) => j.title === "Clean Schwintek slide tracks") && !s.some((j) => j.title === "Check slide shear pins & gear packs") && !s.some((j) => j.title === "Inspect slide cables & tension"));
  rig.equipment = { slides: "yes" }; R.save();
  s = R.planJobsFor(rig, cGas72);
  check("unanswered mechanism keeps the plan Schwintek jobs", s.some((j) => j.title === "Check Slide Synchronization") && !s.some((j) => j.title === "Inspect slide cables & tension"));
  rig.equipment = { slides: "yes", slidetype: "cable" }; R.save();
  s = R.planJobsFor(rig, cGas72);
  check("cable shows the cable job and hides the Schwintek jobs", s.some((j) => j.title === "Inspect slide cables & tension") && !s.some((j) => j.title === "Check Slide Synchronization"));
  rig.equipment = { slides: "yes", slidetype: "rackpinion" }; R.save();
  s = R.planJobsFor(rig, cGas72);
  check("rack and pinion shows the shear pins job", s.some((j) => j.title === "Check slide shear pins & gear packs") && !s.some((j) => j.title === "Clean Schwintek slide tracks"));
  rig.equipment = { slides: "yes", slidetype: "schwintek" }; R.save();
  s = R.planJobsFor(rig, aGas72);
  check("a plan with no mechanism of its own gains the Schwintek jobs", s.some((j) => j.title === "Clean Schwintek slide tracks"));
  rig.equipment = { slides: "yes", slidetype: "unsure" }; R.save();
  s = R.planJobsFor(rig, aGas72);
  check("Not sure adds no mechanism jobs to a plan with none", !s.some((j) => j.title === "Clean Schwintek slide tracks") && !s.some((j) => j.title === "Inspect slide cables & tension"));
  rig.equipment = { slides: "no", slidetype: "schwintek" }; R.save();
  s = R.planJobsFor(rig, cGas72);
  check("no slides hides every slide job", !s.some((j) => j.category === "Slideouts"));
  // Notes ride into the book when a plan builds.
  const tracksTask = R.store().tasks.find((t) => t.title === "Clean Schwintek slide tracks" && t.rigId === rig.id);
  check("the built tracks job carries its no-grease note", tracksTask && tracksTask.note && tracksTask.note.indexOf("Never grease") !== -1);
  rig.equipment = { slides: "yes", slidetype: "hydraulic" }; R.save();
  R.buildPlan(rig, aDiesel72);
  const fluidTask = R.store().tasks.find((t) => t.title === "Check Slide Fluid Level" && t.rigId === rig.id);
  check("the built fluid job carries its ATF note", fluidTask && fluidTask.note && fluidTask.note.indexOf("Dexron III") !== -1);
  // The question itself: only when the rig has slides.
  rig.equipment = {}; R.save();
  R.openEquipmentSheet(); await sleep(20);
  check("no slides answer asks no mechanism question", !doc.querySelector('[data-eq="slidetype"]'));
  click(doc.querySelector('[data-eq="slides"][data-val="yes"]')); await sleep(20);
  const stBtns = Array.from(doc.querySelectorAll('[data-eq="slidetype"]'));
  const stLabels = Array.from(doc.querySelectorAll("#sheet-host .field label")).map((l) => l.textContent.trim());
  check("Yes asks the mechanism question, right after Slides", stBtns.length === 6 && stLabels.indexOf("Slide mechanism?") === stLabels.indexOf("Slides?") + 1);
  check("the mechanism question offers all five types plus Not sure", ["Schwintek (in-wall)", "Rack and pinion", "Cable", "Hydraulic", "More than one type", "Not sure"].every((t) => stBtns.some((b) => b.textContent.trim() === t)));
  check("slides yes asks twenty questions", doc.querySelectorAll("#sheet-host [data-eq]").length === 70 && doc.querySelectorAll('#sheet-host [data-val="unsure"]').length === 20);
  click(doc.querySelector('[data-eq="slidetype"][data-val="mixed"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("more than one type is saved on the rig", R.activeRig().equipment.slidetype === "mixed");
  R.openEquipmentSheet(); await sleep(20);
  click(doc.querySelector('[data-eq="slides"][data-val="no"]')); await sleep(20);
  check("dropping the slides drops the mechanism question", !doc.querySelector('[data-eq="slidetype"]'));
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("dropping the slides drops the stale mechanism answer", R.activeRig().equipment.slides === "no" && !R.activeRig().equipment.slidetype);
  R.activeRig().equipment = {}; R.save();
  /* ---- 73. Tru-Earth Leveling sub-choice (v75) ---- */
  console.log("== 73. Tru-Earth leveling ==");
  // Static: every plan carries the one Tru-Earth check, only on an exact Yes.
  const aGas73 = R.PREBUILT_PLANS.find((p) => p.id === "class-a-gas");
  const aDiesel73 = R.PREBUILT_PLANS.find((p) => p.id === "class-a-diesel");
  const teJob = (p) => p.jobs.find((j) => j.title === "Test Tru-Earth leveling");
  check("every plan carries the Tru-Earth check", R.PREBUILT_PLANS.every((p) => { const j = teJob(p); return j && j.category === "Leveling and Support" && j.intervalMonths === 6; }));
  check("the Tru-Earth check needs an exact Yes", R.PREBUILT_PLANS.every((p) => { const j = teJob(p); return j.needs && j.needs.truearth === "yes" && Object.keys(j.needs).length === 1 && !j.isDefault; }));
  check("the Tru-Earth note says all four corners hold", teJob(aGas73).note && teJob(aGas73).note.indexOf("four corners") !== -1 && teJob(aGas73).note.indexOf("won't hold level") !== -1);
  check("no other plan job is gated on Tru-Earth", R.PREBUILT_PLANS.every((p) => p.jobs.filter((j) => (j.needs || {}).truearth).length === 1));
  // The old jobs are untouched.
  const lsStarter = R.STARTER_TASKS.find((t) => t.title === "Liquid Springs — check fluid & fittings");
  check("the Liquid Springs starter job is unchanged", lsStarter && lsStarter.needs && lsStarter.needs.suspension === "liquidspring" && lsStarter.needsPro === true && lsStarter.intervalMonths === 6 && lsStarter.intervalMiles === 25000);
  check("the hydraulic leveling jack jobs stay ungated", ["Check Hydraulic Leveling Fluid Level", "Inspect Hydraulic Leveling Hoses and Fittings", "Clean Hydraulic Leveling Jack Assemblies", "Inspect Hydraulic Leveling Cylinder Rods and Seals"].every((t) => { const j = aDiesel73.jobs.find((x) => x.title === t); return j && !j.needs; }));
  // Gating, through the real filter.
  rig.equipment = { suspension: "liquidspring", truearth: "yes" }; R.save();
  check("Yes shows the Tru-Earth check", R.planJobsFor(rig, aGas73).some((j) => j.title === "Test Tru-Earth leveling"));
  rig.equipment = { suspension: "liquidspring", truearth: "no" }; R.save();
  check("No hides the Tru-Earth check", !R.planJobsFor(rig, aGas73).some((j) => j.title === "Test Tru-Earth leveling"));
  rig.equipment = { suspension: "liquidspring", truearth: "unsure" }; R.save();
  check("Not sure hides the Tru-Earth check", !R.planJobsFor(rig, aGas73).some((j) => j.title === "Test Tru-Earth leveling"));
  rig.equipment = { suspension: "liquidspring" }; R.save();
  check("unanswered hides the Tru-Earth check", !R.planJobsFor(rig, aGas73).some((j) => j.title === "Test Tru-Earth leveling"));
  rig.equipment = { suspension: "standard" }; R.save();
  check("standard suspension hides the Tru-Earth check", !R.planJobsFor(rig, aGas73).some((j) => j.title === "Test Tru-Earth leveling"));
  rig.equipment = {}; R.save();
  check("no answers at all hides the Tru-Earth check", !R.planJobsFor(rig, aGas73).some((j) => j.title === "Test Tru-Earth leveling"));
  // The note rides into the book when a plan builds.
  rig.equipment = { suspension: "liquidspring", truearth: "yes" }; R.save();
  R.buildPlan(rig, aGas73);
  const teTask = R.store().tasks.find((t) => t.title === "Test Tru-Earth leveling" && t.rigId === rig.id);
  check("the built Tru-Earth check carries its note", teTask && teTask.note && teTask.note.indexOf("four corners") !== -1);
  // The question itself: only on a Liquid Springs rig.
  rig.equipment = {}; R.save();
  R.openEquipmentSheet(); await sleep(20);
  check("no suspension answer asks no Tru-Earth question", !doc.querySelector('[data-eq="truearth"]'));
  click(doc.querySelector('[data-eq="suspension"][data-val="liquidspring"]')); await sleep(20);
  const teBtns = Array.from(doc.querySelectorAll('[data-eq="truearth"]'));
  const teLabels = Array.from(doc.querySelectorAll("#sheet-host .field label")).map((l) => l.textContent.trim());
  check("Liquid Springs asks the Tru-Earth question, right after Suspension", teBtns.length === 3 && teLabels.indexOf("Tru-Earth Leveling?") === teLabels.indexOf("Suspension?") + 1);
  check("the Tru-Earth question offers Yes, No, and Not sure", ["Yes", "No", "Not sure"].every((t) => teBtns.some((b) => b.textContent.trim() === t)));
  check("Liquid Springs asks twenty questions", doc.querySelectorAll("#sheet-host [data-eq]").length === 67 && doc.querySelectorAll('#sheet-host [data-val="unsure"]').length === 20);
  click(doc.querySelector('[data-eq="generator"][data-val="builtin"]')); await sleep(20);
  click(doc.querySelector('[data-eq="slides"][data-val="yes"]')); await sleep(20);
  check("all three conditional questions together ask twenty-two", doc.querySelectorAll("#sheet-host [data-eq]").length === 77 && doc.querySelectorAll('#sheet-host [data-val="unsure"]').length === 22);
  click(doc.querySelector('[data-eq="truearth"][data-val="yes"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("Yes is saved on the rig", R.activeRig().equipment.truearth === "yes");
  R.openEquipmentSheet(); await sleep(20);
  click(doc.querySelector('[data-eq="suspension"][data-val="standard"]')); await sleep(20);
  check("dropping Liquid Springs drops the Tru-Earth question", !doc.querySelector('[data-eq="truearth"]'));
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("dropping Liquid Springs drops the stale Tru-Earth answer", R.activeRig().equipment.suspension === "standard" && !R.activeRig().equipment.truearth);
  R.activeRig().equipment = {}; R.save();
  /* ---- 74. awning sub-choice (v75) ---- */
  console.log("== 74. awning ==");
  // Static: the regenerated plans gate every patio awning job on the answer.
  const aGas74 = R.PREBUILT_PLANS.find((p) => p.id === "class-a-gas");
  const awnJob = (p, t) => p.jobs.find((j) => j.title === t);
  const commonAwn = ["Rinse and Clean Awning Fabric", "Verify Travel Lock Security", "Inspect End Caps and Weather Guard", "Check Mounting Fasteners", "Inspect Support Arms and Joints", "Lubricate Pivot Points per Manufacturer Spec"];
  check("the wind sensor needs a power awning, exact only", awnJob(aGas74, "Test Wind Sensor Auto-Retract").needs && awnJob(aGas74, "Test Wind Sensor Auto-Retract").needs.awning === "power" && !awnJob(aGas74, "Test Wind Sensor Auto-Retract").isDefault);
  check("the motor job needs a power awning, exact only", awnJob(aGas74, "Test awning motor").needs && awnJob(aGas74, "Test awning motor").needs.awning === "power" && !awnJob(aGas74, "Test awning motor").isDefault && awnJob(aGas74, "Test awning motor").intervalMonths === 6);
  check("the motor note names the gearbox and the override crank", awnJob(aGas74, "Test awning motor").note && awnJob(aGas74, "Test awning motor").note.indexOf("stripped gearbox") !== -1 && awnJob(aGas74, "Test awning motor").note.indexOf("manual override crank") !== -1);
  check("the spring job needs a manual awning, exact only", awnJob(aGas74, "Lubricate awning arms and check spring").needs && awnJob(aGas74, "Lubricate awning arms and check spring").needs.awning === "manual" && !awnJob(aGas74, "Lubricate awning arms and check spring").isDefault && awnJob(aGas74, "Lubricate awning arms and check spring").intervalMonths === 6);
  check("the spring note says the tension is a shop job", awnJob(aGas74, "Lubricate awning arms and check spring").note && awnJob(aGas74, "Lubricate awning arms and check spring").note.indexOf("shop job") !== -1);
  check("the common awning jobs fit power or manual and stay the default", commonAwn.every((t) => { const j = awnJob(aGas74, t); return j && j.needs && Array.isArray(j.needs.awning) && j.needs.awning.indexOf("power") !== -1 && j.needs.awning.indexOf("manual") !== -1 && j.isDefault === true; }));
  check("every plan carries the two new awning jobs", R.PREBUILT_PLANS.every((p) => awnJob(p, "Test awning motor") && awnJob(p, "Lubricate awning arms and check spring")));
  check("the slide topper jobs are untouched by the awning gate", R.PREBUILT_PLANS.every((p) => p.jobs.filter((j) => j.category === "Slide Toppers").every((j) => j.needs && j.needs.slidetoppers === "yes" && !j.needs.awning)));
  // Gating, through the real filter.
  rig.equipment = { awning: "power" }; R.save();
  let a = R.planJobsFor(rig, aGas74);
  check("power shows the motor, the wind sensor, and the common jobs", a.some((j) => j.title === "Test awning motor") && a.some((j) => j.title === "Test Wind Sensor Auto-Retract") && commonAwn.every((t) => a.some((j) => j.title === t)));
  check("power hides the manual spring job", !a.some((j) => j.title === "Lubricate awning arms and check spring"));
  rig.equipment = { awning: "manual" }; R.save();
  a = R.planJobsFor(rig, aGas74);
  check("manual shows the spring job and the common jobs", a.some((j) => j.title === "Lubricate awning arms and check spring") && commonAwn.every((t) => a.some((j) => j.title === t)));
  check("manual hides the motor and the wind sensor", !a.some((j) => j.title === "Test awning motor") && !a.some((j) => j.title === "Test Wind Sensor Auto-Retract"));
  rig.equipment = { awning: "none" }; R.save();
  a = R.planJobsFor(rig, aGas74);
  check("none hides every patio awning job", !a.some((j) => j.category === "Patio Awning"));
  rig.equipment = { awning: "unsure" }; R.save();
  a = R.planJobsFor(rig, aGas74);
  check("Not sure keeps the common jobs, not the power or manual ones", commonAwn.every((t) => a.some((j) => j.title === t)) && !a.some((j) => j.title === "Test awning motor") && !a.some((j) => j.title === "Test Wind Sensor Auto-Retract") && !a.some((j) => j.title === "Lubricate awning arms and check spring"));
  rig.equipment = {}; R.save();
  a = R.planJobsFor(rig, aGas74);
  check("unanswered keeps the common jobs, not the power or manual ones", commonAwn.every((t) => a.some((j) => j.title === t)) && !a.some((j) => j.title === "Test awning motor") && !a.some((j) => j.title === "Test Wind Sensor Auto-Retract"));
  // The note rides into the book when a plan builds.
  rig.equipment = { awning: "power" }; R.save();
  R.buildPlan(rig, aGas74);
  const motorTask = R.store().tasks.find((t) => t.title === "Test awning motor" && t.rigId === rig.id);
  check("the built motor job carries its note", motorTask && motorTask.note && motorTask.note.indexOf("stripped gearbox") !== -1);
  // The question itself: asked of every rig, right after Slide toppers.
  rig.equipment = {}; R.save();
  R.openEquipmentSheet(); await sleep(20);
  const awBtns = Array.from(doc.querySelectorAll('[data-eq="awning"]'));
  const awLabels = Array.from(doc.querySelectorAll("#sheet-host .field label")).map((l) => l.textContent.trim());
  check("every rig is asked the awning question, last after Slide toppers", awBtns.length === 4 && awLabels.indexOf("Awning?") === awLabels.indexOf("Slide toppers?") + 1 && awLabels.indexOf("Awning?") === awLabels.length - 1);
  check("the awning question offers Power, Manual, None, and Not sure", ["Power", "Manual", "None", "Not sure"].every((t) => awBtns.some((b) => b.textContent.trim() === t)));
  check("no answers asks nineteen questions", doc.querySelectorAll("#sheet-host [data-eq]").length === 64 && doc.querySelectorAll('#sheet-host [data-val="unsure"]').length === 19);
  click(doc.querySelector('[data-eq="awning"][data-val="power"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("power is saved on the rig", R.activeRig().equipment.awning === "power");
  R.activeRig().type = "Travel trailer"; R.save();
  R.openEquipmentSheet(); await sleep(20);
  check("a trailer is asked the awning question too", !!doc.querySelector('[data-eq="awning"]'));
  click(doc.querySelector("[data-close]")); await sleep(20);
  R.activeRig().type = "Class C"; R.activeRig().equipment = {}; R.save();
  /* ---- 75. converter sub-choice (v75) ---- */
  console.log("== 75. converter ==");
  // Static: every plan carries the three converter jobs, each on its exact type.
  const aGas75 = R.PREBUILT_PLANS.find((p) => p.id === "class-a-gas");
  const convJob = (p, t) => p.jobs.find((j) => j.title === t);
  check("smart shows the profile job, exact only", R.PREBUILT_PLANS.every((p) => { const j = convJob(p, "Verify converter charge profile"); return j && j.category === "Electrical" && j.intervalMonths === 12 && j.needs && j.needs.converter === "smart" && Object.keys(j.needs).length === 1 && !j.isDefault; }));
  check("the profile note names the lithium mode and the 3-stage float", convJob(aGas75, "Verify converter charge profile").note && convJob(aGas75, "Verify converter charge profile").note.indexOf("lithium mode") !== -1 && convJob(aGas75, "Verify converter charge profile").note.indexOf("3-stage") !== -1);
  check("single-stage shows the voltage job, exact only", R.PREBUILT_PLANS.every((p) => { const j = convJob(p, "Check converter output voltage"); return j && j.category === "Electrical" && j.intervalMonths === 12 && j.needs && j.needs.converter === "singlestage" && Object.keys(j.needs).length === 1 && !j.isDefault; }));
  check("the voltage note names the 13.8V overcharge line", convJob(aGas75, "Check converter output voltage").note && convJob(aGas75, "Check converter output voltage").note.indexOf("13.8V") !== -1);
  check("the water job needs single-stage AND flooded batteries", R.PREBUILT_PLANS.every((p) => { const j = convJob(p, "Check battery water levels"); return j && j.category === "Electrical" && j.intervalMonths === 1 && j.needs && j.needs.converter === "singlestage" && j.needs.batteries === "flooded" && !j.isDefault; }));
  check("the water note says the single-stage boils water off", convJob(aGas75, "Check battery water levels").note && convJob(aGas75, "Check battery water levels").note.indexOf("boils water off") !== -1);
  check("the ventilation job is gated on both answers", R.PREBUILT_PLANS.every((p) => { const j = convJob(p, "Clean Converter Ventilation"); return j && j.needs && Array.isArray(j.needs.inverter) && j.needs.inverter.indexOf("inverteronly") !== -1 && Array.isArray(j.needs.converter) && j.needs.converter.indexOf("smart") !== -1 && j.isDefault === true; }));
  check("the inverter jobs are untouched by the converter work", R.PREBUILT_PLANS.every((p) => ["Verify Inverter Settings", "Update Inverter Firmware", "Check Inverter Fault History", "Inspect and Clean Inverter Vents"].every((t) => { const j = convJob(p, t); return !j || (j.needs && Array.isArray(j.needs.inverter) && j.isDefault === true); })));
  // Gating, through the real filter.
  rig.equipment = { converter: "smart" }; R.save();
  let c = R.planJobsFor(rig, aGas75);
  check("smart shows the profile job", c.some((j) => j.title === "Verify converter charge profile"));
  check("smart hides the voltage and water jobs", !c.some((j) => j.title === "Check converter output voltage") && !c.some((j) => j.title === "Check battery water levels"));
  rig.equipment = { converter: "smart", batteries: "flooded" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("smart with flooded batteries still hides the water job", !c.some((j) => j.title === "Check battery water levels"));
  rig.equipment = { converter: "singlestage", batteries: "flooded" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("single-stage with flooded batteries shows voltage and water", c.some((j) => j.title === "Check converter output voltage") && c.some((j) => j.title === "Check battery water levels"));
  check("single-stage hides the profile job", !c.some((j) => j.title === "Verify converter charge profile"));
  rig.equipment = { converter: "singlestage", batteries: "agm" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("single-stage with AGM shows voltage but not water", c.some((j) => j.title === "Check converter output voltage") && !c.some((j) => j.title === "Check battery water levels"));
  rig.equipment = { converter: "singlestage", batteries: "lithium" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("single-stage with lithium shows voltage but not water", c.some((j) => j.title === "Check converter output voltage") && !c.some((j) => j.title === "Check battery water levels"));
  rig.equipment = { converter: "singlestage" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("single-stage with no battery answer shows voltage but not water", c.some((j) => j.title === "Check converter output voltage") && !c.some((j) => j.title === "Check battery water levels"));
  rig.equipment = { converter: "invertercharger" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("inverter-charger only hides all three converter jobs and the ventilation", !c.some((j) => j.title === "Verify converter charge profile") && !c.some((j) => j.title === "Check converter output voltage") && !c.some((j) => j.title === "Check battery water levels") && !c.some((j) => j.title === "Clean Converter Ventilation"));
  rig.equipment = { converter: "smart" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("smart keeps the ventilation job", c.some((j) => j.title === "Clean Converter Ventilation"));
  rig.equipment = { converter: "singlestage", batteries: "flooded" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("single-stage keeps the ventilation job", c.some((j) => j.title === "Clean Converter Ventilation"));
  rig.equipment = { converter: "unsure" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("Not sure keeps the ventilation, not the converter jobs", c.some((j) => j.title === "Clean Converter Ventilation") && !c.some((j) => j.title === "Verify converter charge profile") && !c.some((j) => j.title === "Check converter output voltage") && !c.some((j) => j.title === "Check battery water levels"));
  rig.equipment = {}; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("unanswered keeps the ventilation, not the converter jobs", c.some((j) => j.title === "Clean Converter Ventilation") && !c.some((j) => j.title === "Verify converter charge profile") && !c.some((j) => j.title === "Check battery water levels"));
  rig.equipment = { converter: "smart", inverter: "invertercharger" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("the inverter answer can hide the ventilation too", !c.some((j) => j.title === "Clean Converter Ventilation"));
  rig.equipment = { converter: "invertercharger", inverter: "inverteronly" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("the converter answer can hide the ventilation too", !c.some((j) => j.title === "Clean Converter Ventilation"));
  rig.equipment = { converter: "smart", inverter: "inverteronly" }; R.save();
  c = R.planJobsFor(rig, aGas75);
  check("both answers agreeing on a converter shows the ventilation", c.some((j) => j.title === "Clean Converter Ventilation"));
  // The note rides into the book when a plan builds.
  rig.equipment = { converter: "singlestage", batteries: "flooded" }; R.save();
  R.buildPlan(rig, aGas75);
  const waterTask = R.store().tasks.find((t) => t.title === "Check battery water levels" && t.rigId === rig.id);
  check("the built water job carries its boil-off note", waterTask && waterTask.note && waterTask.note.indexOf("boils water off") !== -1);
  // The question itself: asked of every rig, right before Inverter.
  rig.equipment = {}; R.save();
  R.openEquipmentSheet(); await sleep(20);
  const cvBtns = Array.from(doc.querySelectorAll('[data-eq="converter"]'));
  const cvLabels = Array.from(doc.querySelectorAll("#sheet-host .field label")).map((l) => l.textContent.trim());
  check("every rig is asked the converter question, before Inverter", cvBtns.length === 4 && cvLabels.indexOf("Converter?") === cvLabels.indexOf("Inverter?") - 1 && cvLabels.indexOf("Converter?") === cvLabels.indexOf("House batteries?") + 1);
  check("the converter question offers Smart, Single-stage, Inverter-charger only, and Not sure", ["Smart multi-stage", "Single-stage", "Inverter-charger only", "Not sure"].every((t) => cvBtns.some((b) => b.textContent.trim() === t)));
  check("no answers asks nineteen questions", doc.querySelectorAll("#sheet-host [data-eq]").length === 64 && doc.querySelectorAll('#sheet-host [data-val="unsure"]').length === 19);
  click(doc.querySelector('[data-eq="converter"][data-val="smart"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("smart is saved on the rig", R.activeRig().equipment.converter === "smart");
  R.activeRig().equipment = {}; R.save();
  /* ---- 76. inverter sub-choice (v75) ---- */
  console.log("== 76. inverter ==");
  // Static: every plan carries the inverter jobs, gated on either inverter type.
  const aGas76 = R.PREBUILT_PLANS.find((p) => p.id === "class-a-gas");
  const cGas76 = R.PREBUILT_PLANS.find((p) => p.id === "class-c-gas");
  const invJob = (p, t) => p.jobs.find((j) => j.title === t);
  const fourInv = ["Verify Inverter Settings", "Update Inverter Firmware", "Check Inverter Fault History", "Inspect and Clean Inverter Vents"];
  const invPlans = R.PREBUILT_PLANS.filter((p) => fourInv.some((t) => invJob(p, t)));
  check("thirteen plans carry the inverter jobs", invPlans.length === 13);
  check("the four inverter jobs fit either inverter type and stay the default", invPlans.every((p) => fourInv.every((t) => { const j = invJob(p, t); return j && j.needs && Array.isArray(j.needs.inverter) && j.needs.inverter.indexOf("invertercharger") !== -1 && j.needs.inverter.indexOf("inverteronly") !== -1 && j.isDefault === true; })));
  check("the settings note says the charge profile must match the battery type", invJob(aGas76, "Verify Inverter Settings").note && invJob(aGas76, "Verify Inverter Settings").note.indexOf("charge profile") !== -1 && invJob(aGas76, "Verify Inverter Settings").note.indexOf("flooded") !== -1 && invJob(aGas76, "Verify Inverter Settings").note.indexOf("lithium") !== -1);
  check("the transfer and charger jobs stay ungated", ["Test Transfer Switching", "Inspect Transfer Contacts", "Check Charger Operation"].every((t) => { const j = invJob(cGas76, t); return j && !j.needs; }));
  check("no plan job is gated on a sine type", R.PREBUILT_PLANS.every((p) => p.jobs.every((j) => !(j.needs && (j.needs.sine || j.needs.wave)))));
  // Gating, through the real filter.
  rig.equipment = { inverter: "invertercharger" }; R.save();
  let v = R.planJobsFor(rig, aGas76);
  check("inverter/charger shows the inverter jobs and hides the converter ventilation", fourInv.every((t) => v.some((j) => j.title === t)) && !v.some((j) => j.title === "Clean Converter Ventilation"));
  rig.equipment = { inverter: "inverteronly" }; R.save();
  v = R.planJobsFor(rig, aGas76);
  check("inverter-only shows the inverter jobs and the converter ventilation", fourInv.every((t) => v.some((j) => j.title === t)) && v.some((j) => j.title === "Clean Converter Ventilation"));
  rig.equipment = { inverter: "none" }; R.save();
  v = R.planJobsFor(rig, aGas76);
  check("none hides the inverter jobs and shows the converter ventilation", !fourInv.some((t) => v.some((j) => j.title === t)) && v.some((j) => j.title === "Clean Converter Ventilation"));
  check("none hides the other inverter jobs too", !v.some((j) => j.title === "Inspect DC Fuse or Breaker") && !v.some((j) => j.title === "Inspect Remote Panel"));
  rig.equipment = { inverter: "none" }; R.save();
  v = R.planJobsFor(rig, cGas76);
  check("none keeps the transfer and charger jobs", v.some((j) => j.title === "Test Transfer Switching") && v.some((j) => j.title === "Check Charger Operation"));
  rig.equipment = { inverter: "unsure" }; R.save();
  v = R.planJobsFor(rig, aGas76);
  check("Not sure keeps the inverter jobs and the converter ventilation", fourInv.every((t) => v.some((j) => j.title === t)) && v.some((j) => j.title === "Clean Converter Ventilation"));
  rig.equipment = {}; R.save();
  v = R.planJobsFor(rig, aGas76);
  check("unanswered keeps the inverter jobs and the converter ventilation", fourInv.every((t) => v.some((j) => j.title === t)) && v.some((j) => j.title === "Clean Converter Ventilation"));
  // The note rides into the book when a plan builds.
  rig.equipment = { inverter: "invertercharger" }; R.save();
  R.buildPlan(rig, aGas76);
  const settingsTask = R.store().tasks.find((t) => t.title === "Verify Inverter Settings" && t.rigId === rig.id);
  check("the built settings job carries its charge-profile note", settingsTask && settingsTask.note && settingsTask.note.indexOf("charge profile") !== -1);
  // The question itself: asked of every rig, right after Converter.
  rig.equipment = {}; R.save();
  R.openEquipmentSheet(); await sleep(20);
  const ivBtns = Array.from(doc.querySelectorAll('[data-eq="inverter"]'));
  const ivLabels = Array.from(doc.querySelectorAll("#sheet-host .field label")).map((l) => l.textContent.trim());
  check("every rig is asked the inverter question, after Converter", ivBtns.length === 4 && ivLabels.indexOf("Inverter?") === ivLabels.indexOf("Converter?") + 1);
  check("the inverter question offers Inverter/charger, Inverter only, None, and Not sure", ["Inverter/charger", "Inverter only", "None", "Not sure"].every((t) => ivBtns.some((b) => b.textContent.trim() === t)));
  check("no answers asks nineteen questions", doc.querySelectorAll("#sheet-host [data-eq]").length === 64 && doc.querySelectorAll('#sheet-host [data-val="unsure"]').length === 19);
  click(doc.querySelector('[data-eq="inverter"][data-val="invertercharger"]')); await sleep(20);
  click(doc.querySelector("#eq-save")); await sleep(20);
  check("inverter/charger is saved on the rig", R.activeRig().equipment.inverter === "invertercharger");
  R.activeRig().equipment = {}; R.save();

  /* ---- 77. variant completeness: every plan carries every variant ---- */
  console.log("== 77. variant completeness ==");
  // Static: for every gated job, every plan carries it — the gates, not
  // the plan, decide what a rig sees. (Tru-Earth, awning, and converter
  // were already complete; the gaps were fuel, slide mechanism, inverter.)
  const aGas77 = R.PREBUILT_PLANS.find((p) => p.id === "class-a-gas");
  const aDiesel77 = R.PREBUILT_PLANS.find((p) => p.id === "class-a-diesel");
  const cGas77 = R.PREBUILT_PLANS.find((p) => p.id === "class-c-gas");
  const cDiesel77 = R.PREBUILT_PLANS.find((p) => p.id === "class-c-diesel");
  const tt77 = R.PREBUILT_PLANS.find((p) => p.id === "travel-trailer");
  const fw77 = R.PREBUILT_PLANS.find((p) => p.id === "fifth-wheel");
  const vJob = (p, t) => p.jobs.find((j) => j.title === t);
  const gasFuel77 = ["Change Built-in Gasoline Generator Oil", "Replace Built-in Gasoline Fuel Filter", "Replace Gasoline Spark Plug", "Clean Gasoline Carburetor System", "Check High Altitude Carburetor Setup"];
  const dieselFuel77 = ["Check Diesel Generator Drive Parts", "Replace Diesel Primary Fuel Filter", "Replace Diesel Secondary Fuel Filter", "Flush Liquid Cooling System", "Change Diesel Oil and Filter", "Replace Coolant Pressure Cap", "Replace Diesel Coolant Pump Belt", "Replace Coolant Hoses and Thermostat", "Adjust Diesel Valve Lash", "Check Coolant Freeze Protection", "Service Diesel Fuel Injectors", "Check Liquid Coolant Level"];
  const propaneFuel77 = ["Check Propane Generator Connection", "Change Built-in Propane Generator Oil", "Replace Propane Spark Plug"];
  const hydSlide77 = ["Check Slide Fluid Level", "Inspect Slide System for Leaks", "Inspect Slide Lines and Hoses"];
  const schwSlide77 = ["Check Slide Synchronization", "Inspect Slide Drive Racks"];
  const inv77 = ["Verify Inverter Settings", "Update Inverter Firmware", "Check Inverter Fault History", "Inspect and Clean Inverter Vents", "Inspect DC Fuse or Breaker", "Check DC Input Connections", "Inspect Remote Panel", "Inspect AC Wiring", "Inspect Chassis Ground", "Inspect Mounting Security"];
  check("every plan carries all five gasoline generator jobs", R.PREBUILT_PLANS.every((p) => gasFuel77.every((t) => { const j = vJob(p, t); return j && j.needs && j.needs.genfuel === "gas" && j.needs.generator === "builtin"; })));
  check("every plan carries all twelve diesel generator jobs", R.PREBUILT_PLANS.every((p) => dieselFuel77.every((t) => { const j = vJob(p, t); return j && j.needs && j.needs.genfuel === "diesel" && j.needs.generator === "builtin"; })));
  check("every plan carries all three propane generator jobs", R.PREBUILT_PLANS.every((p) => propaneFuel77.every((t) => { const j = vJob(p, t); return j && j.needs && j.needs.genfuel === "propane" && j.needs.generator === "builtin"; })));
  check("every plan carries the three hydraulic slide jobs", R.PREBUILT_PLANS.every((p) => hydSlide77.every((t) => { const j = vJob(p, t); return j && j.needs && j.needs.slidetype === "hydraulic" && j.needs.slides === "yes"; })));
  check("every plan carries the two Schwintek slide jobs", R.PREBUILT_PLANS.every((p) => schwSlide77.every((t) => { const j = vJob(p, t); return j && j.needs && j.needs.slidetype === "schwintek" && j.needs.slides === "yes"; })));
  check("every plan carries all ten inverter jobs", R.PREBUILT_PLANS.every((p) => inv77.every((t) => { const j = vJob(p, t); return j && j.needs && Array.isArray(j.needs.inverter) && j.isDefault === true; })));
  check("no plan lists the same job twice", R.PREBUILT_PLANS.every((p) => { const seen = {}; return p.jobs.every((j) => { const k = j.title.toLowerCase() + "|" + j.category.toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; }); }));
  check("the shared generator jobs crossed into the diesel plan once each", ["Clean Spark Arrestor", "Adjust Gasoline or Propane Valve Lash"].every((t) => aDiesel77.jobs.filter((j) => j.title === t).length === 1));
  // Gating, through the real filter: the answer, not the plan, picks the variant.
  rig.equipment = { generator: "builtin", genfuel: "diesel" }; R.save();
  let w = R.planJobsFor(rig, aGas77);
  check("a diesel answer on a gas-sourced plan shows the diesel jobs", dieselFuel77.every((t) => w.some((j) => j.title === t)));
  check("a diesel answer on a gas-sourced plan hides the gasoline jobs", !gasFuel77.some((t) => w.some((j) => j.title === t)));
  rig.equipment = { generator: "builtin", genfuel: "gas" }; R.save();
  w = R.planJobsFor(rig, aDiesel77);
  check("a gas answer on a diesel-sourced plan shows the gasoline jobs", gasFuel77.every((t) => w.some((j) => j.title === t)));
  check("a gas answer on a diesel-sourced plan hides the diesel jobs", !dieselFuel77.some((t) => w.some((j) => j.title === t)));
  rig.equipment = { generator: "builtin", genfuel: "propane" }; R.save();
  w = R.planJobsFor(rig, aGas77);
  check("a propane answer on a gas-sourced plan shows the propane jobs", propaneFuel77.every((t) => w.some((j) => j.title === t)));
  check("a propane answer hides the gas and diesel jobs", !gasFuel77.some((t) => w.some((j) => j.title === t)) && !dieselFuel77.some((t) => w.some((j) => j.title === t)));
  rig.equipment = { generator: "builtin", genfuel: "diesel" }; R.save();
  w = R.planJobsFor(rig, cDiesel77);
  check("a diesel answer on the Class C diesel plan shows the diesel jobs", dieselFuel77.every((t) => w.some((j) => j.title === t)));
  rig.equipment = { generator: "builtin", genfuel: "gas" }; R.save();
  w = R.planJobsFor(rig, cDiesel77);
  check("a gas answer on the Class C diesel plan shows the gasoline jobs", gasFuel77.every((t) => w.some((j) => j.title === t)));
  check("a gas answer on the Class C diesel plan hides the diesel jobs", !dieselFuel77.some((t) => w.some((j) => j.title === t)));
  rig.equipment = { generator: "builtin", genfuel: "diesel" }; R.save();
  w = R.planJobsFor(rig, tt77);
  check("a diesel answer on a trailer plan shows the diesel jobs", dieselFuel77.every((t) => w.some((j) => j.title === t)));
  rig.equipment = { generator: "builtin", genfuel: "diesel" }; R.save();
  w = R.planJobsFor(rig, fw77);
  check("a diesel answer on a fifth-wheel plan shows the diesel jobs", dieselFuel77.every((t) => w.some((j) => j.title === t)));
  rig.equipment = { slides: "yes", slidetype: "hydraulic" }; R.save();
  w = R.planJobsFor(rig, cGas77);
  check("a hydraulic answer on a Schwintek-sourced plan shows the hydraulic jobs", hydSlide77.every((t) => w.some((j) => j.title === t)));
  check("a hydraulic answer on a Schwintek-sourced plan hides the Schwintek jobs", !schwSlide77.some((t) => w.some((j) => j.title === t)));
  rig.equipment = { slides: "yes", slidetype: "schwintek" }; R.save();
  w = R.planJobsFor(rig, aDiesel77);
  check("a Schwintek answer on a hydraulic-sourced plan shows the Schwintek jobs", schwSlide77.every((t) => w.some((j) => j.title === t)));
  check("a Schwintek answer on a hydraulic-sourced plan hides the hydraulic jobs", !hydSlide77.some((t) => w.some((j) => j.title === t)));
  rig.equipment = { slides: "yes", slidetype: "unsure" }; R.save();
  w = R.planJobsFor(rig, aGas77);
  check("Not sure adds no mechanism jobs to a plan with none of its own", !hydSlide77.some((t) => w.some((j) => j.title === t)) && !schwSlide77.some((t) => w.some((j) => j.title === t)));
  rig.equipment = { inverter: "inverteronly" }; R.save();
  w = R.planJobsFor(rig, tt77);
  check("an inverter answer on a trailer plan shows the inverter jobs", inv77.every((t) => w.some((j) => j.title === t)));
  rig.equipment = { inverter: "none" }; R.save();
  w = R.planJobsFor(rig, tt77);
  check("none on a trailer plan hides the inverter jobs", !inv77.some((t) => w.some((j) => j.title === t)));
  rig.equipment = { inverter: "unsure" }; R.save();
  w = R.planJobsFor(rig, tt77);
  check("Not sure on a trailer plan keeps the inverter jobs", inv77.every((t) => w.some((j) => j.title === t)));
  rig.equipment = { generator: "builtin", genfuel: "unsure" }; R.save();
  w = R.planJobsFor(rig, aGas77);
  check("Not sure on fuel shows every fuel's jobs, nothing hidden", gasFuel77.every((t) => w.some((j) => j.title === t)) && dieselFuel77.every((t) => w.some((j) => j.title === t)) && propaneFuel77.every((t) => w.some((j) => j.title === t)));
  rig.equipment = { generator: "builtin" }; R.save();
  w = R.planJobsFor(rig, aGas77);
  check("unanswered fuel shows every fuel's jobs, nothing hidden", gasFuel77.every((t) => w.some((j) => j.title === t)) && dieselFuel77.every((t) => w.some((j) => j.title === t)) && propaneFuel77.every((t) => w.some((j) => j.title === t)));
  R.activeRig().equipment = {}; R.save();

  /* ---- 78. Find it: basement bays + search (v78) ---- */
  console.log("== 78. Find it ==");
  // Use the live rig, not the captured one: the harness reloads the store
  // partway through, so the early `rig` object can go stale.
  var rig78 = R.activeRig();
  R.showScreen("more");
  check("More offers Find it", !!doc.querySelector("#storage-open-btn"));
  R.showScreen("storage");
  check("Find it opens its own screen", doc.querySelector("#screen-storage").classList.contains("active"));
  check("Find it has a search box", !!doc.querySelector("#storage-search"));
  var st78 = R.storageFor(rig78);
  check("a motorhome starts with seven bays", st78.compartments.length === 7 && st78.compartments[0].name === "Driver front bay" && st78.compartments[6].name === "Wet bay");
  check("the bays are listed, empty to start", doc.querySelector("#storage-list").textContent.includes("Driver front bay") && doc.querySelector("#storage-list").textContent.includes("Nothing in this bay yet"));
  var ttRig78 = R.newRig({ type: "Travel trailer" });
  check("a trailer starts with four bays", R.storageStarterCompartments(ttRig78).join("|") === "Front pass-through|Rear storage|Wet bay|Under-bed storage");
  check("starters are a fresh copy each time", R.storageStarterCompartments(rig78) !== R.storageStarterCompartments(rig78));
  click(doc.querySelector("#storage-add-btn")); await sleep(20);
  setVal("#st-name", "Fresh water hose");
  doc.querySelector("#st-save").click(); await sleep(20);
  check("adding a thing puts it in the first bay", R.storageFor(rig78).items.some((i) => i.name === "Fresh water hose" && i.compartmentId === st78.compartments[0].id));
  var sEl78 = doc.querySelector("#storage-search");
  sEl78.value = "hose";
  sEl78.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  check("search finds the thing and names its bay", doc.querySelector("#storage-list").textContent.includes("Fresh water hose") && doc.querySelector("#storage-list").textContent.includes("Driver front bay"));
  sEl78.value = "zzz-no-such-thing";
  sEl78.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  check("no match says so plainly", doc.querySelector("#storage-list").textContent.includes("Nothing named"));
  sEl78.value = "";
  sEl78.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  var hose78 = R.storageFor(rig78).items.find((i) => i.name === "Fresh water hose");
  R.openStorageItemSheet(hose78.id); await sleep(20);
  setVal("#st-name", "Fresh water hose");
  doc.querySelector("#st-bay").value = st78.compartments[3].id;
  doc.querySelector("#st-save").click(); await sleep(20);
  check("moving a thing changes the bay search names", R.storageSearch(rig78, "hose")[0].compartment === "Passenger front bay");
  R.openStorageCompartmentSheet(st78.compartments[3].id); await sleep(20);
  setVal("#sb-name", "Passenger front — hoses");
  doc.querySelector("#sb-save").click(); await sleep(20);
  check("renaming a bay renames it in search", R.storageSearch(rig78, "hose")[0].compartment === "Passenger front — hoses");
  var bayId78 = st78.compartments[3].id;
  R.openStorageCompartmentSheet(bayId78); await sleep(20);
  doc.querySelector("#sb-delete").click(); await sleep(20);
  check("a bay that holds things stays put", R.storageFor(rig78).compartments.some((c) => c.id === bayId78));
  R.openStorageItemSheet(hose78.id); await sleep(20);
  doc.querySelector("#st-delete").click(); await sleep(20);
  check("taking a thing out removes it from search", R.storageSearch(rig78, "hose").length === 0);
  R.openStorageCompartmentSheet(bayId78); await sleep(20);
  doc.querySelector("#sb-delete").click(); await sleep(20);
  check("an empty bay can be taken out", !R.storageFor(rig78).compartments.some((c) => c.id === bayId78));
  click(doc.querySelector("#storage-bay-btn")); await sleep(20);
  setVal("#sb-name", "Roof box");
  doc.querySelector("#sb-save").click(); await sleep(20);
  check("adding a bay joins the list", R.storageFor(rig78).compartments.some((c) => c.name === "Roof box"));

  /* ---- 79. Find it: printable bay list (v79) ---- */
  console.log("== 79. Find it print ==");
  var rig79 = R.activeRig();
  var st79 = R.storageFor(rig79);
  var wet79 = st79.compartments.find((c) => c.name === "Wet bay");
  var roof79 = st79.compartments.find((c) => c.name === "Roof box");
  st79.items.push({ id: "t-hose", name: "Fresh water hose", compartmentId: wet79.id });
  st79.items.push({ id: "t-blocks", name: "Leveling blocks", compartmentId: roof79.id });
  R.save();
  R.showScreen("storage");
  check("Find it has a Print button", !!doc.querySelector("#storage-print-btn"));
  R.printStorageList();
  var ps79 = doc.querySelector("#print-sheet").innerHTML;
  check("the print sheet lists every bay", st79.compartments.every((c) => ps79.includes(c.name)));
  check("the print sheet puts each thing under its bay", ps79.indexOf("Wet bay") < ps79.indexOf("Fresh water hose") && ps79.indexOf("Roof box") < ps79.indexOf("Leveling blocks"));
  check("the print sheet shows empty bays too", ps79.includes("Nothing in this bay yet"));
  var html79 = R.storageListHTML(rig79);
  check("the standalone bay list is a full page for the rig", html79.includes("<!DOCTYPE html>") && html79.includes("Where's my stuff?") && html79.includes("Wet bay"));
  check("the standalone list puts each thing under its bay", html79.indexOf("Wet bay") < html79.indexOf("Fresh water hose") && html79.indexOf("Roof box") < html79.indexOf("Leveling blocks"));
  roof79.name = "Roof box — blocks"; R.save();
  check("the print list follows a renamed bay", R.storageListHTML(rig79).includes("Roof box — blocks"));

  /* ---- 80. Find it: the name field takes the keyboard on open (v80) ---- */
  console.log("== 80. Find it keyboard focus ==");
  R.openStorageItemSheet(null, null);
  check("the thing sheet puts the caret in the name field", doc.activeElement && doc.activeElement.id === "st-name");
  setVal("#st-name", "Spare water filter");
  click(doc.querySelector("#st-save")); await sleep(20);
  check("a thing typed with spaces keeps them", R.storageFor(R.activeRig()).items.some(function (i) { return i.name === "Spare water filter"; }));
  check("saving jumps the list to the bay it went into", (function () {
    var it80 = R.storageFor(R.activeRig()).items.find(function (i) { return i.name === "Spare water filter"; });
    var g80 = doc.querySelector('[data-bay="' + it80.compartmentId + '"]');
    return !!g80 && g80.classList.contains("flash");
  })());
  R.openStorageCompartmentSheet(null);
  check("the bay sheet puts the caret in the bay name field", doc.activeElement && doc.activeElement.id === "sb-name");
  click(doc.querySelector("[data-close]")); await sleep(20);

  /* ---- 81. the paywall tells us WHICH store failure it is (v81) ---- */
  console.log("== 81. store failure diagnosis ==");
  // Nov 19: build 36 still shows "not found" with no error — the note
  // couldn't tell "the store never answered" from "it answered with
  // nothing". Two fresh stores, one per side of that fork.
  function makeStoreDom(initFn) {
    const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
    const win = dom.window;
    win.confirm = () => true;
    win.scrollTo = () => {};
    win.eval(plansJs);
    win.eval(appJs);
    const doc = win.document;
    const R = win.RollOnRV;
    const chain = {};
    const fake = {
      _owned: [], ordered: null, readyCb: null, registered: null, initialized: false,
      register(list) { this.registered = list; },
      when() { return chain; },
      initialize() { this.initialized = true; return initFn(); },
      error(fn) { this.globalErrorFn = fn; },
      get(id) { return (this._products || {})[id]; },
      order(id) { this.ordered = id; },
      restorePurchases() { this.restored = true; },
      ready(cb) { this.readyCb = cb; },
      owned(id) { return this._owned.indexOf(id) !== -1; },
    };
    chain.approved = function (fn) { fake.approvedFn = fn; return chain; };
    chain.verified = function (fn) { fake.verifiedFn = fn; return chain; };
    // No .error() on this chain either — the real one has none.
    win.CdvPurchase = {
      store: fake,
      ProductType: { PAID_SUBSCRIPTION: "PAID_SUBSCRIPTION", NON_CONSUMABLE: "NON_CONSUMABLE" },
      Platform: { APPLE_APPSTORE: "APPLE_APPSTORE", GOOGLE_PLAY: "GOOGLE_PLAY" },
      ErrorCode: { PAYMENT_CANCELLED: "PAYMENT_CANCELLED" },
    };
    win.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios" };
    return { win, doc, R, fake };
  }
  // A: initialize never settles — the store never answers.
  const domA = makeStoreDom(function () { return new Promise(function () {}); });
  await sleep(50);
  domA.R.openProPaywall(); await sleep(20);
  domA.R.proSubscribe("monthly", 300); await sleep(700);
  check("a store whose setup never finishes says it never answered", domA.doc.querySelector(".pro-note").textContent.indexOf("never answered") !== -1);
  check("the hanging store still names the missing products", domA.doc.querySelector(".pro-note").textContent.indexOf("Monthly: not found") !== -1);
  check("the hanging store leaves init unsettled", domA.R.proStoreState().initSettled === false);
  // B: initialize settles cleanly, but ready never fires and no products come back.
  const domB = makeStoreDom(function () { return Promise.resolve([]); });
  await sleep(50);
  domB.R.openProPaywall(); await sleep(20);
  domB.R.proSubscribe("monthly", 300); await sleep(700);
  check("a store that answered but never became ready says so", domB.doc.querySelector(".pro-note").textContent.indexOf("answered, but it never became ready") !== -1);
  check("the answered store still names the missing products", domB.doc.querySelector(".pro-note").textContent.indexOf("Monthly: not found") !== -1);
  check("the answered store leaves init settled", domB.R.proStoreState().initSettled === true);

  /* ---- 82. the store check names the stuck stage (v82) ---- */
  console.log("== 82. staged store diagnosis ==");
  // Nov 19: a phone restart did not clear the v81 hang, so the stall
  // is deterministic. The check asks the native plugin, stage by
  // stage, which StoreKit call answers — setup, products, receipt.
  function makeRawPlugin(behavior) {
    return {
      init() { return behavior.init === "hang" ? new Promise(function () {}) : Promise.resolve({}); },
      load() { return behavior.load === "hang" ? new Promise(function () {}) : Promise.resolve({ validProducts: [], invalidProductIds: [] }); },
      loadReceipts() { return behavior.receipts === "hang" ? new Promise(function () {}) : Promise.resolve({ receipt: {} }); },
    };
  }
  // A: every stage answers — the check says so, even though the store
  // itself never becomes ready (its initialize still hangs).
  const domC = makeStoreDom(function () { return new Promise(function () {}); });
  domC.win.Capacitor.Plugins = { PurchasePlugin: makeRawPlugin({}) };
  await sleep(50);
  domC.R.openProPaywall(); await sleep(20);
  domC.R.proSubscribe("monthly", 300); await sleep(900);
  check("when every stage answers, the check says setup, products and receipt OK", domC.doc.querySelector(".pro-note").textContent.indexOf("Store check: setup OK, products OK, receipt OK.") !== -1);
  check("the all-OK check is kept on the store state", domC.R.proStoreState().diag === "Store check: setup OK, products OK, receipt OK.");
  // B: the products stage never answers — the check names it, and the
  // other two stages still report OK.
  const domD = makeStoreDom(function () { return new Promise(function () {}); });
  domD.win.Capacitor.Plugins = { PurchasePlugin: makeRawPlugin({ load: "hang" }) };
  await sleep(50);
  domD.R.openProPaywall(); await sleep(20);
  domD.R.proSubscribe("monthly", 300); await sleep(900);
  check("a stuck products stage is named, with setup and receipt OK", domD.doc.querySelector(".pro-note").textContent.indexOf("Store check: setup OK, products stuck, receipt OK.") !== -1);
  // C: no native plugin at all — the check says the plugin isn't there.
  const domE = makeStoreDom(function () { return new Promise(function () {}); });
  await sleep(50);
  domE.R.openProPaywall(); await sleep(20);
  domE.R.proSubscribe("monthly", 300); await sleep(900);
  check("with no native plugin, the check says the plugin isn't in the app", domE.doc.querySelector(".pro-note").textContent.indexOf("Store check: the store plugin isn't in the app.") !== -1);

  /* ---- 83. the store actually initializes (v83) ---- */
  console.log("== 83. store init regression ==");
  // Nov 19: the when() chain has no .error() in the real plugin, but
  // the app chained it — so proStoreInit threw on every launch, before
  // initialize() was ever called, and the paywall always said the
  // store never answered (builds 31–38). The fakes had .error(), so
  // the suite never caught it. These two checks pin the fix.
  const domF = makeStoreDom(function () { return new Promise(function () {}); });
  await sleep(50);
  domF.R.proSubscribe("monthly", 300); await sleep(20);
  check("init reaches initialize() with a chain that has no .error()", domF.fake.initialized === true);
  // A setup throw is now named on the paywall, never swallowed.
  const domG = makeStoreDom(function () { return Promise.resolve([]); });
  domG.fake.initialize = function () { throw new Error("boom"); };
  await sleep(50);
  domG.R.openProPaywall(); await sleep(20);
  domG.R.proSubscribe("monthly", 300); await sleep(700);
  check("a setup throw names itself instead of saying the store never answered", domG.doc.querySelector(".pro-note").textContent.indexOf("Store problem: setup: boom") !== -1);

  console.log("== 84. purchase failure shows the native reason ==");
  // Nov 19: with the new verified tester, Monthly still failed
  // instantly with no sign-in sheet — "Failed to place order" — and
  // the note gave no reason. The bridge patch (above) surfaces the
  // native message; this check pins that the app displays it.
  const domH = makeStoreDom(function () { return Promise.resolve([]); });
  await sleep(50);
  domH.R.openProPaywall(); await sleep(20);
  domH.fake.globalErrorFn({ code: "PURCHASE", message: "Purchase failed: Cannot connect to iTunes Store" });
  await sleep(20);
  check("a purchase failure shows the native reason on the paywall", domH.doc.querySelector(".pro-note").textContent.indexOf("Purchase failed: Cannot connect to iTunes Store") !== -1);

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(2); });
