/* RollOnRV v1 — The Rig Logbook.
   Local-first, offline, no account, no server, no AI.
   Data lives in localStorage under "rollonrv.v1". Photos are downscaled
   data URLs stored with the log entry (native: camera + filesystem when
   available, same downscale path). Everything else is plain math. */
(function () {
  "use strict";

  /* ---------------- platform guards (mirror the Bible app pattern) ------- */
  var isNative = false;
  try { isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) {}
  var platform = "web";
  try { platform = (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : "web"; } catch (e) {}

  /* ---------------- tiny utils ------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function uid() { return "id-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) {
    n = Number(n) || 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function num(n) { return (Number(n) || 0).toLocaleString("en-US"); }
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseISO(s) { if (!s) return null; var d = new Date(s + "T12:00:00"); return isNaN(d) ? null : d; }
  function fmtDate(iso) {
    var d = parseISO(iso); if (!d) return "—";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
  function fmtMonthYear(iso) {
    var d = parseISO(iso); if (!d) return "";
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  function addMonthsISO(iso, months) {
    var d = parseISO(iso); if (!d || !months) return null;
    var out = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
    return out.getFullYear() + "-" + String(out.getMonth() + 1).padStart(2, "0") + "-" + String(out.getDate()).padStart(2, "0");
  }
  function daysBetween(aISO, bISO) {
    var a = parseISO(aISO), b = parseISO(bISO); if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------------- store ------------------------------------------------- */
  var KEY = "rollonrv.v1";
  var DEFAULTS = function () {
    return { version: 1, rigs: [], activeRigId: null, tasks: [], logs: [], tires: [], runs: [], settings: {} };
  };
  var store = DEFAULTS();
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.version === 1) { store = data; return; }
      }
    } catch (e) {}
    store = DEFAULTS();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { toast("Couldn't save — the book is full. Export a copy, then delete old photos."); }
  }
  function activeRig() {
    return store.rigs.find(function (r) { return r.id === store.activeRigId; }) || store.rigs[0] || null;
  }

  /* ---------------- data model -------------------------------------------- */
  var CATEGORIES = ["Engine & Chassis", "Tires", "Generator", "House Systems", "Water & Plumbing", "Electrical", "Safety", "Seasonal", "Appliances", "Other"];

  function newRig(o) {
    return {
      id: uid(), year: o.year || "", make: o.make || "", model: o.model || "",
      nickname: o.nickname || "", type: o.type || "Class A",
      mileage: Number(o.mileage) || 0, genHours: Number(o.genHours) || 0,
      psiFront: Number(o.psiFront) || null, psiRear: Number(o.psiRear) || null,
      createdAt: todayISO()
    };
  }
  function rigName(rig) {
    if (!rig) return "Your rig";
    var base = [rig.year, rig.make, rig.model].filter(Boolean).join(" ");
    return rig.nickname ? rig.nickname + " — " + base : (base || "Your rig");
  }
  function newTask(o) {
    return {
      id: uid(), rigId: o.rigId, title: (o.title || "").trim(), category: o.category || "Other",
      intervalMonths: o.intervalMonths != null ? Number(o.intervalMonths) : null,
      intervalMiles: o.intervalMiles != null ? Number(o.intervalMiles) : null,
      intervalGenHours: o.intervalGenHours != null ? Number(o.intervalGenHours) : null,
      nextDueDate: o.nextDueDate || null, nextDueMileage: o.nextDueMileage != null ? Number(o.nextDueMileage) : null,
      nextDueGenHours: o.nextDueGenHours != null ? Number(o.nextDueGenHours) : null,
      note: o.note || "", lastDoneAt: o.lastDoneAt || null,
      lastDoneMileage: o.lastDoneMileage != null ? Number(o.lastDoneMileage) : null,
      lastDoneGenHours: o.lastDoneGenHours != null ? Number(o.lastDoneGenHours) : null,
      snoozedUntil: null, createdAt: todayISO()
    };
  }
  function newLog(o) {
    return {
      id: uid(), rigId: o.rigId, taskId: o.taskId || null, title: (o.title || "").trim(),
      date: o.date || todayISO(), mileage: o.mileage != null && o.mileage !== "" ? Number(o.mileage) : null,
      genHours: o.genHours != null && o.genHours !== "" ? Number(o.genHours) : null,
      cost: Number(o.cost) || 0, note: o.note || "",
      parts: (o.parts || []).filter(function (p) { return p.name || p.partNo || p.cost; }),
      photos: o.photos || [], createdAt: todayISO()
    };
  }
  function newTire(o) {
    return { id: uid(), rigId: o.rigId, position: o.position || "", dotCode: (o.dotCode || "").trim(), note: o.note || "" };
  }

  /* ---------------- due math — plain words, not badge counts ------------- */
  var SOON_DAYS = 14, SOON_MILES = 500, SOON_HOURS = 25;
  function taskStatus(task, rig) {
    // Returns { level: 'overdue'|'soon'|'ok'|'done', text: '...' }
    if (!task.intervalMonths && !task.intervalMiles && !task.intervalGenHours && !task.nextDueDate && !task.nextDueMileage && !task.nextDueGenHours) {
      return { level: "done", text: "One-time — no next due" };
    }
    var today = todayISO();
    // Overdue checks
    if (task.nextDueDate && daysBetween(task.nextDueDate, today) > 0) {
      var d = daysBetween(task.nextDueDate, today);
      return { level: "overdue", text: "Overdue by " + d + (d === 1 ? " day" : " days") };
    }
    if (task.nextDueMileage != null && rig && rig.mileage >= task.nextDueMileage) {
      return { level: "overdue", text: "Overdue by " + num(rig.mileage - task.nextDueMileage) + " miles" };
    }
    if (task.nextDueGenHours != null && rig && rig.genHours >= task.nextDueGenHours) {
      return { level: "overdue", text: "Overdue by " + num(rig.genHours - task.nextDueGenHours) + " gen hours" };
    }
    // Due soon — nearest threshold wins
    var soon = [];
    if (task.nextDueDate) {
      var dd = daysBetween(today, task.nextDueDate);
      if (dd != null && dd <= SOON_DAYS) soon.push({ k: "date", v: dd, text: dd === 0 ? "Due today" : dd === 1 ? "Due tomorrow" : "Due in " + dd + " days" });
    }
    if (task.nextDueMileage != null && rig) {
      var dm = task.nextDueMileage - rig.mileage;
      if (dm <= SOON_MILES) soon.push({ k: "miles", v: dm, text: dm + " miles to go" });
    }
    if (task.nextDueGenHours != null && rig) {
      var dh = task.nextDueGenHours - rig.genHours;
      if (dh <= SOON_HOURS) soon.push({ k: "hours", v: dh, text: dh + " gen hours to go" });
    }
    if (soon.length) {
      soon.sort(function (a, b) { return a.v - b.v; });
      return { level: "soon", text: soon[0].text };
    }
    // Otherwise: farthest out, in plain words
    var far = [];
    if (task.nextDueDate) far.push("due " + fmtDate(task.nextDueDate));
    if (task.nextDueMileage != null && rig) far.push(num(task.nextDueMileage - rig.mileage) + " miles to go");
    if (task.nextDueGenHours != null && rig) far.push(num(task.nextDueGenHours - rig.genHours) + " gen hours to go");
    return { level: "ok", text: far.length ? far.join(" · ") : "On the books" };
  }
  function dueTasks(rig) {
    return store.tasks.filter(function (t) { return t.rigId === rig.id; }).map(function (t) {
      return { task: t, status: taskStatus(t, rig) };
    }).sort(function (a, b) {
      var rank = { overdue: 0, soon: 1, ok: 2, done: 3 };
      return rank[a.status.level] - rank[b.status.level];
    });
  }
  function completeTask(task, logData) {
    // A job logged against a task advances its next dues from the job itself.
    var doneDate = logData.date || todayISO();
    task.lastDoneAt = doneDate;
    if (logData.mileage != null) task.lastDoneMileage = Number(logData.mileage);
    if (logData.genHours != null) task.lastDoneGenHours = Number(logData.genHours);
    if (task.intervalMonths) task.nextDueDate = addMonthsISO(doneDate, task.intervalMonths);
    if (task.intervalMiles != null && logData.mileage != null) task.nextDueMileage = Number(logData.mileage) + task.intervalMiles;
    if (task.intervalGenHours != null && logData.genHours != null) task.nextDueGenHours = Number(logData.genHours) + task.intervalGenHours;
    task.snoozedUntil = null;
  }
  function snoozeTask(task) {
    var d = new Date(); d.setDate(d.getDate() + 7);
    task.snoozedUntil = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ---------------- DOT tire age ------------------------------------------ */
  // DOT date code: last 4 digits are WWYY (week + year). Tires made before
  // 2000 used 3 digits; we treat any 3-digit code as "older than 2000 — replace".
  function dotInfo(dotCode) {
    var digits = String(dotCode || "").replace(/\D/g, "");
    if (digits.length < 3) return { ok: false, text: "Enter the last 4 digits of the DOT code" };
    if (digits.length === 3) {
      return { ok: true, week: null, year: null, ageYears: 26, ageText: "Made before 2000", flag: "replace", flagText: "Older than 2000 — replace it." };
    }
    var code = digits.slice(-4);
    var week = parseInt(code.slice(0, 2), 10), year = 2000 + parseInt(code.slice(2), 10);
    if (!week || week < 1 || week > 53 || isNaN(year)) return { ok: false, text: "That DOT code doesn't parse — use the last 4 digits, e.g. 3222" };
    var made = new Date(year, 0, 1 + (week - 1) * 7);
    var now = new Date();
    var ageMonths = (now.getFullYear() - made.getFullYear()) * 12 + (now.getMonth() - made.getMonth());
    var ageYears = ageMonths / 12;
    var yrs = Math.floor(ageMonths / 12), mos = ageMonths % 12;
    var ageText = yrs + (yrs === 1 ? " yr " : " yrs ") + mos + (mos === 1 ? " mo" : " mos");
    var flag = ageYears < 5 ? "good" : ageYears < 7 ? "old" : "replace";
    var flagText = flag === "good" ? "Good — plenty of life left."
      : flag === "old" ? "Getting old — plan replacements before the next long trip."
      : "Past 7 years — replace it. A tire you can't trust isn't a tire.";
    return {
      ok: true, week: week, year: year, madeText: "made week " + week + ", " + year,
      ageYears: ageYears, ageMonths: ageMonths, ageText: ageText,
      flag: flag, flagText: flagText, pctToTen: Math.min(100, Math.round(ageYears / 10 * 100))
    };
  }

  /* ---------------- costs -------------------------------------------------- */
  function costsForYear(rigId, year) {
    var logs = store.logs.filter(function (l) { return l.rigId === rigId && l.date.indexOf(String(year)) === 0; });
    var total = logs.reduce(function (s, l) { return s + (Number(l.cost) || 0); }, 0);
    var byCat = {};
    logs.forEach(function (l) {
      var cat = "Other";
      if (l.taskId) { var t = store.tasks.find(function (x) { return x.id === l.taskId; }); if (t) cat = t.category; }
      byCat[cat] = (byCat[cat] || 0) + (Number(l.cost) || 0);
    });
    return { logs: logs, total: total, byCat: byCat };
  }
  function costPerMile(rig) {
    var logs = store.logs.filter(function (l) { return l.rigId === rig.id; });
    if (!logs.length || !rig.mileage) return null;
    var earliest = logs.reduce(function (m, l) { return (l.mileage != null && (m == null || l.mileage < m)) ? l.mileage : m; }, null);
    var miles = earliest != null ? rig.mileage - earliest : rig.mileage;
    if (!miles || miles <= 0) return null;
    var total = logs.reduce(function (s, l) { return s + (Number(l.cost) || 0); }, 0);
    return { perMile: total / miles, miles: miles, total: total };
  }

  /* ---------------- CSV ---------------------------------------------------- */
  function parseCSV(text) {
    var rows = [], row = [], cur = "", inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = ""; rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); });
  }
  function csvCell(v) {
    v = String(v == null ? "" : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  var HEADER_MAP = [
    [/^(task|title|name|maintenance task|item)$/i, "title"],
    [/^(category|system)$/i, "category"],
    [/^(due date|due|next due|due by)$/i, "nextDueDate"],
    [/^(due mileage|due miles|due odometer|mileage)$/i, "nextDueMileage"],
    [/^(due gen(eral)? ?hours?|due generator hours?|gen ?hours?)$/i, "nextDueGenHours"],
    [/^(every ?months?|cadence ?months?|interval ?months?|months)$/i, "intervalMonths"],
    [/^(every ?miles?|interval ?miles?)$/i, "intervalMiles"],
    [/^(every ?gen ?hours?|interval ?gen ?hours?)$/i, "intervalGenHours"],
    [/^(note|notes|guidance)$/i, "note"]
  ];
  function importTasksCSV(text, rigId) {
    var rows = parseCSV(text);
    if (rows.length < 2) return { imported: 0, skipped: 0, errors: ["The file needs a header row and at least one task."] };
    var headers = rows[0].map(function (h) { return String(h).trim(); });
    var colMap = {};
    headers.forEach(function (h, i) {
      HEADER_MAP.forEach(function (pair) { if (pair[0].test(h)) colMap[pair[1]] = i; });
    });
    if (colMap.title == null) return { imported: 0, skipped: 0, errors: ["Couldn't find a task column. The header needs one of: task, title, name."] };
    var imported = 0, skipped = 0, errors = [];
    rows.slice(1).forEach(function (r, idx) {
      var title = (r[colMap.title] || "").trim();
      if (!title) { skipped++; return; }
      function val(key) { return colMap[key] == null ? "" : String(r[colMap[key]] || "").trim(); }
      function numVal(key) { var v = val(key).replace(/,/g, ""); var n = parseFloat(v); return isNaN(n) ? null : n; }
      var dueDate = val("nextDueDate");
      var task = newTask({
        rigId: rigId, title: title,
        category: CATEGORIES.indexOf(val("category")) >= 0 ? val("category") : (val("category") || "Other"),
        intervalMonths: numVal("intervalMonths"),
        intervalMiles: numVal("intervalMiles"),
        intervalGenHours: numVal("intervalGenHours"),
        nextDueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null,
        nextDueMileage: numVal("nextDueMileage"),
        nextDueGenHours: numVal("nextDueGenHours"),
        note: val("note")
      });
      store.tasks.push(task); imported++;
    });
    return { imported: imported, skipped: skipped, errors: errors };
  }
  function exportTasksCSV(rigId) {
    var head = ["Task", "Category", "Due Date", "Due Mileage", "Due Gen Hours", "Every Months", "Every Miles", "Every Gen Hours", "Note"];
    var lines = [head.map(csvCell).join(",")];
    store.tasks.filter(function (t) { return t.rigId === rigId; }).forEach(function (t) {
      lines.push([t.title, t.category, t.nextDueDate || "", t.nextDueMileage != null ? t.nextDueMileage : "",
        t.nextDueGenHours != null ? t.nextDueGenHours : "", t.intervalMonths != null ? t.intervalMonths : "",
        t.intervalMiles != null ? t.intervalMiles : "", t.intervalGenHours != null ? t.intervalGenHours : "", t.note || ""].map(csvCell).join(","));
    });
    return lines.join("\n");
  }
  function exportLogsCSV(rigId) {
    var head = ["Date", "Job", "Mileage", "Gen Hours", "Cost", "Note", "Parts"];
    var lines = [head.map(csvCell).join(",")];
    store.logs.filter(function (l) { return l.rigId === rigId; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (l) {
      var parts = (l.parts || []).map(function (p) { return p.name + (p.partNo ? " (" + p.partNo + ")" : "") + " " + money(p.cost || 0); }).join("; ");
      lines.push([l.date, l.title, l.mileage != null ? l.mileage : "", l.genHours != null ? l.genHours : "", (Number(l.cost) || 0).toFixed(2), l.note || "", parts].map(csvCell).join(","));
    });
    return lines.join("\n");
  }
  function downloadFile(name, text) {
    var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------------- checklists (original copy, written for this book) ----- */
  var CHECKLISTS = [
    {
      id: "pretrip", name: "Before You Roll", sub: "Pre-trip walk-around", groups: [
        { name: "Outside", items: [
          { id: "tires", label: "Tire pressures to placard", psi: true },
          { id: "lugs", label: "Lug nuts torqued" },
          { id: "lights", label: "Lights, leaks & walk-around" },
          { id: "slides", label: "Slides in · awning in · antenna down" },
          { id: "jacks", label: "Jacks up, pads stowed" }
        ]},
        { name: "Hookups", items: [
          { id: "power", label: "Shore power cord stowed" },
          { id: "water", label: "Water hose drained & stowed" },
          { id: "sewer", label: "Sewer hose rinsed & capped" },
          { id: "propane", label: "Propane set for travel" }
        ]},
        { name: "Inside", items: [
          { id: "fridge", label: "Fridge latched, mode set" },
          { id: "cabinets", label: "Cabinets & drawers latched" },
          { id: "loose", label: "Loose items stowed" },
          { id: "windows", label: "Windows & vents closed" },
          { id: "steps", label: "Steps up, door latched" }
        ]}
      ]
    },
    {
      id: "arrival", name: "Arrival Set-Up", sub: "Just pulled in — get settled", groups: [
        { name: "Outside", items: [
          { id: "spot", label: "Parked where you want it — slides clear" },
          { id: "level", label: "Level side to side, then front to back" },
          { id: "jacksdown", label: "Jacks down, pads under" },
          { id: "slidesout", label: "Slides out, awning out" },
          { id: "chocks", label: "Wheels chocked" }
        ]},
        { name: "Hookups", items: [
          { id: "power2", label: "Shore power plugged in, breaker on" },
          { id: "water2", label: "Water hose connected, pressure checked" },
          { id: "sewer2", label: "Sewer hose connected, valves closed" },
          { id: "propane2", label: "Propane on for fridge & water heater" }
        ]},
        { name: "Inside", items: [
          { id: "fridge2", label: "Fridge on the right mode, cooling" },
          { id: "waterheater", label: "Water heater on" },
          { id: "vents", label: "Vents open, windows as you like them" },
          { id: "steps2", label: "Steps down, door mat out" }
        ]}
      ]
    },
    {
      id: "departure", name: "Departure Tear-Down", sub: "Leaving the site — leave nothing behind", groups: [
        { name: "Outside", items: [
          { id: "slidesin", label: "Slides in, awning in, antenna down" },
          { id: "jacksup", label: "Jacks up, pads picked up" },
          { id: "chocks2", label: "Chocks picked up" },
          { id: "walk", label: "Walk the site — nothing left behind" }
        ]},
        { name: "Hookups", items: [
          { id: "power3", label: "Shore power unplugged & stowed" },
          { id: "water3", label: "Water hose drained & stowed" },
          { id: "sewer3", label: "Sewer hose rinsed, capped & stowed" },
          { id: "tanks", label: "Tanks dumped, valves closed" }
        ]},
        { name: "Inside", items: [
          { id: "fridge3", label: "Fridge latched, mode set for travel" },
          { id: "cabinets3", label: "Cabinets & drawers latched" },
          { id: "loose3", label: "Loose items stowed" },
          { id: "windows3", label: "Windows & vents closed" },
          { id: "steps3", label: "Steps up, door latched" }
        ]}
      ]
    },
    {
      id: "winterize", name: "Winterize", sub: "Put the rig to sleep for the cold", groups: [
        { name: "Water", items: [
          { id: "drain", label: "Drain fresh, grey & black tanks" },
          { id: "heater", label: "Water heater drained, bypass on" },
          { id: "blow", label: "Blow the lines out, low points open" },
          { id: "pink", label: "Pink antifreeze through every tap & trap" },
          { id: "toilet", label: "Toilet bowl & valve with antifreeze" }
        ]},
        { name: "Outside", items: [
          { id: "wash", label: "Wash & wax — winter is hard on the finish" },
          { id: "seals", label: "Roof & window seals checked" },
          { id: "tiresw", label: "Tires aired up, covers on" },
          { id: "cover", label: "Cover on, vents cracked for air" }
        ]},
        { name: "Inside", items: [
          { id: "fridgew", label: "Fridge emptied, doors propped open" },
          { id: "batteries", label: "Batteries charged, disconnect off" },
          { id: "dry", label: "Dry goods out, moisture absorbers in" },
          { id: "propanew", label: "Propane off at the tank" }
        ]}
      ]
    },
    {
      id: "dewinterize", name: "De-Winterize", sub: "Wake the rig up for the season", groups: [
        { name: "Water", items: [
          { id: "flush", label: "Flush the lines till the water runs clear" },
          { id: "heater2", label: "Water heater bypass off, tank full" },
          { id: "sanitize", label: "Sanitize the fresh tank" },
          { id: "leaks", label: "Pressurize & check every joint for leaks" }
        ]},
        { name: "Systems", items: [
          { id: "batteries2", label: "Batteries charged & reconnected" },
          { id: "propane4", label: "Propane on, fridge & water heater lit" },
          { id: "tires2", label: "Tire pressures to placard — check the DOT ages" },
          { id: "test", label: "Slides, jacks, awning — run them all once" }
        ]},
        { name: "Inside", items: [
          { id: "fridge4", label: "Fridge cold before you load it" },
          { id: "detectors", label: "Smoke & CO detectors tested" },
          { id: "clean", label: "Air it out, wipe it down" }
        ]}
      ]
    }
  ];
  function checklistTotal(tpl) {
    return tpl.groups.reduce(function (n, g) { return n + g.items.length; }, 0);
  }
  function activeRun(templateId) {
    var runs = store.runs.filter(function (r) { return r.templateId === templateId && !r.finishedAt; });
    return runs.length ? runs[runs.length - 1] : null;
  }
  function startRun(templateId, rigId) {
    var run = { id: uid(), templateId: templateId, rigId: rigId, startedAt: todayISO(), finishedAt: null, checks: {} };
    store.runs.push(run); save(); return run;
  }
  function runCheckedCount(run, tpl) {
    var n = 0;
    tpl.groups.forEach(function (g) { g.items.forEach(function (it) { if (run.checks[it.id]) n++; }); });
    return n;
  }

  /* ---------------- starter tasks (generic, written for this book) ------- */
  var STARTER_TASKS = [
    { title: "Engine oil & filter", category: "Engine & Chassis", intervalMonths: 12, note: "Once a year, or per your chassis manual." },
    { title: "Generator oil & filter", category: "Generator", intervalMonths: 12, intervalGenHours: 150, note: "Oil and filter together; check the air filter too." },
    { title: "Roof seals — inspect & touch up", category: "House Systems", intervalMonths: 6, note: "Walk the roof, look at every seam and vent, touch up what is cracked." },
    { title: "House batteries — water & terminals", category: "Electrical", intervalMonths: 3, note: "Top up with distilled water; clean the terminals." },
    { title: "Tire pressures — check all", category: "Tires", intervalMonths: 1, note: "Cold, to the placard pressures for your rig." },
    { title: "Water heater — flush", category: "Water & Plumbing", intervalMonths: 12, note: "Drain and flush the tank once a year." },
    { title: "Smoke & CO detectors — test", category: "Safety", intervalMonths: 6, note: "Press the test button; swap batteries when they chirp." },
    { title: "Slide seals — clean & treat", category: "House Systems", intervalMonths: 6, note: "Wipe the seals and treat them so they stay soft." }
  ];

  /* ---------------- navigation -------------------------------------------- */
  var currentScreen = "home";
  function showScreen(name) {
    currentScreen = name;
    $all(".screen").forEach(function (s) { s.classList.toggle("active", s.id === "screen-" + name); });
    $all("#tabbar .tab").forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-screen") === name); });
    if (name === "home") renderHome();
    if (name === "logbook") renderLogbook();
    if (name === "checklists") renderChecklists();
    if (name === "tires") renderTires();
    if (name === "more") renderMore();
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* ---------------- Home --------------------------------------------------- */
  function renderHome() {
    var rig = activeRig();
    $("#home-year").textContent = new Date().getFullYear();
    if (!rig) { showScreen("setup"); return; }
    $("#home-rig-line").textContent = rigName(rig) + " · " + num(rig.mileage) + " mi · " + num(rig.genHours) + " gen hrs";
    var due = dueTasks(rig).filter(function (d) { return d.status.level === "overdue" || d.status.level === "soon"; });
    var list = $("#home-due-list");
    if (!due.length) {
      list.innerHTML = '<p class="muted">Nothing due right now. The book is quiet — enjoy the drive.</p>';
    } else {
      list.innerHTML = due.slice(0, 5).map(function (d) {
        var dot = d.status.level === "overdue" ? "red" : "amber";
        return '<div class="row"><span class="dot ' + dot + '"></span><div class="grow"><div class="title">' + esc(d.task.title) + '</div>' +
          '<div class="sub">' + esc(d.task.category) + '</div></div>' +
          '<span class="pill ' + dot + '">' + esc(d.status.text) + '</span></div>';
      }).join("") + (due.length > 5 ? '<p class="small muted">And ' + (due.length - 5) + ' more in the logbook.</p>' : "");
    }
    $("#home-numbers").innerHTML =
      '<div class="row"><div class="grow"><div class="title">Odometer</div><div class="sub">Last updated in the book</div></div><b>' + num(rig.mileage) + ' mi</b></div>' +
      '<div class="row"><div class="grow"><div class="title">Generator hours</div><div class="sub">Hours on the generator</div></div><b>' + num(rig.genHours) + ' hrs</b></div>' +
      '<div class="row"><div class="grow"><div class="title">Tire pressures</div><div class="sub">Front / rear, per your placard</div></div><b>' + (rig.psiFront ? rig.psiFront + " / " + (rig.psiRear || "—") + " psi" : "Not set") + '</b></div>';
    var year = new Date().getFullYear();
    var c = costsForYear(rig.id, year);
    var cpm = costPerMile(rig);
    $("#home-spent").innerHTML =
      '<div class="big-number money">' + money(c.total) + '</div>' +
      '<p class="muted" style="margin:.2rem 0 0">' + (cpm ? money(cpm.perMile) + ' a mile over the last ' + num(cpm.miles) + ' miles' : 'all-in this year') + '</p>';
  }

  /* ---------------- Logbook ------------------------------------------------ */
  function renderLogbook() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var host = $("#logbook-pages");
    var tasks = dueTasks(rig);
    var logs = store.logs.filter(function (l) { return l.rigId === rig.id; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var html = "";
    // Tasks still on the books, grouped by status
    var open = tasks.filter(function (d) { return d.status.level !== "done"; });
    if (open.length) {
      html += '<div class="page"><div class="page-head">On the books</div>' + open.map(function (d) {
        var dot = d.status.level === "overdue" ? "red" : d.status.level === "soon" ? "amber" : "green";
        return '<div class="row" data-task="' + d.task.id + '" style="cursor:pointer"><span class="dot ' + dot + '"></span>' +
          '<div class="grow"><div class="title">' + esc(d.task.title) + '</div><div class="sub">' + esc(d.task.category) + (d.task.note ? ' · ' + esc(d.task.note) : '') + '</div></div>' +
          '<span class="pill ' + dot + '">' + esc(d.status.text) + '</span></div>';
      }).join("") + "</div>";
    }
    // Completed entries, grouped by month, ruled pages
    var byMonth = {};
    logs.forEach(function (l) { var k = l.date.slice(0, 7); (byMonth[k] = byMonth[k] || []).push(l); });
    var months = Object.keys(byMonth).sort().reverse();
    if (!months.length) {
      html += '<div class="page"><div class="page-head">The book is empty</div>' +
        '<p class="muted">Nothing written yet. Log your first job — snap the receipt, write what it cost, stamp it done.</p></div>';
    }
    months.forEach(function (m) {
      var entries = byMonth[m];
      var total = entries.reduce(function (s, l) { return s + (Number(l.cost) || 0); }, 0);
      html += '<div class="page ruled"><div class="page-head">' + esc(fmtMonthYear(m + "-01")) + '</div>' +
        entries.map(function (l) {
          return '<div class="entry" data-log="' + l.id + '">' +
            '<div style="display:flex;justify-content:space-between;gap:.6rem;align-items:baseline">' +
            '<span class="date">' + esc(fmtDate(l.date)) + '</span>' +
            '<span class="cost money">' + (l.cost ? money(l.cost) : "—") + '</span></div>' +
            '<div class="job">' + esc(l.title) + '</div>' +
            '<div class="meta">' + [l.mileage != null ? num(l.mileage) + " mi" : null, l.genHours != null ? num(l.genHours) + " gen hrs" : null, l.note ? esc(l.note) : null].filter(Boolean).join(" · ") + '</div>' +
            (l.photos && l.photos.length ? '<div class="thumbs">' + l.photos.slice(0, 3).map(function (p) { return '<img src="' + esc(p.data) + '" alt="Job photo" />'; }).join("") + '</div>' : "") +
            '<div style="margin-top:.35rem"><span class="stamp">Done</span></div></div>';
        }).join("") +
        '<p class="muted" style="margin:.7rem 0 0">Spent in ' + esc(fmtMonthYear(m + "-01")) + ' · <b class="money">' + money(total) + '</b></p></div>';
    });
    host.innerHTML = html;
    $all("[data-task]", host).forEach(function (el) {
      el.addEventListener("click", function () { openTaskSheet(el.getAttribute("data-task")); });
    });
    $all("[data-log]", host).forEach(function (el) {
      el.addEventListener("click", function () { openLogSheet(el.getAttribute("data-log")); });
    });
  }

  /* ---------------- Checklists --------------------------------------------- */
  function renderChecklists() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var picker = $("#checklist-picker"), runHost = $("#checklist-run");
    picker.innerHTML = CHECKLISTS.map(function (tpl) {
      var run = activeRun(tpl.id);
      var done = run ? runCheckedCount(run, tpl) : 0, total = checklistTotal(tpl);
      return '<div class="card"><h2>' + esc(tpl.name) + '</h2><p class="muted">' + esc(tpl.sub) + ' · ' + total + ' items</p>' +
        (run ? '<div class="progress"><div style="width:' + Math.round(done / total * 100) + '%"></div></div><p class="small" style="margin:.4rem 0 0">' + done + ' of ' + total + ' checked — started ' + esc(fmtDate(run.startedAt)) + '</p>' : '') +
        '<div class="btnrow"><button class="btn" data-start="' + tpl.id + '">' + (run ? 'Keep going' : 'Start') + '</button>' +
        (run ? '<button class="btn ghost" data-restart="' + tpl.id + '">Start over</button>' : '') + '</div></div>';
    }).join("");
    $all("[data-start]", picker).forEach(function (b) {
      b.addEventListener("click", function () { openChecklistRun(b.getAttribute("data-start")); });
    });
    $all("[data-restart]", picker).forEach(function (b) {
      b.addEventListener("click", function () {
        var run = activeRun(b.getAttribute("data-restart"));
        if (run) { run.checks = {}; save(); }
        openChecklistRun(b.getAttribute("data-restart"));
      });
    });
    runHost.hidden = true; runHost.innerHTML = "";
    picker.hidden = false;
  }
  function openChecklistRun(templateId) {
    var rig = activeRig(); var tpl = CHECKLISTS.find(function (t) { return t.id === templateId; });
    var run = activeRun(templateId) || startRun(templateId, rig.id);
    var picker = $("#checklist-picker"), host = $("#checklist-run");
    picker.hidden = true; host.hidden = false;
    function draw() {
      var done = runCheckedCount(run, tpl), total = checklistTotal(tpl);
      var html = '<div class="card"><h2>' + esc(tpl.name) + '</h2>' +
        '<p class="muted">' + done + ' of ' + total + ' checked</p>' +
        '<div class="progress"><div style="width:' + Math.round(done / total * 100) + '%"></div></div>';
      tpl.groups.forEach(function (g) {
        html += '<div class="check-group">' + esc(g.name) + '</div>';
        g.items.forEach(function (it) {
          var psi = "";
          if (it.psi && rig) psi = '<div class="psi">' + (rig.psiFront ? rig.psiFront + " psi front" : "") + (rig.psiFront && rig.psiRear ? " · " : "") + (rig.psiRear ? rig.psiRear + " psi rear" : "") + '</div>';
          html += '<button class="check-item' + (run.checks[it.id] ? ' done' : '') + '" data-item="' + it.id + '">' +
            '<span class="box">' + (run.checks[it.id] ? "✓" : "") + '</span>' +
            '<span><span class="label">' + esc(it.label) + '</span>' + psi + '</span></button>';
        });
      });
      html += '<div class="btnrow"><button class="btn block" id="run-finish">' + (done === total ? 'Stamp it done' : 'Done for now') + '</button>' +
        '<button class="btn ghost block" id="run-back">Back to checklists</button></div>';
      if (done === total) html += '<p style="text-align:center;margin-top:1rem"><span class="stamp big pop">Done</span></p>';
      html += '</div>';
      host.innerHTML = html;
      $all("[data-item]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-item");
          run.checks[id] = !run.checks[id]; save(); draw();
        });
      });
      $("#run-finish").addEventListener("click", function () {
        run.finishedAt = todayISO(); save(); renderChecklists(); toast("Checklist finished — nice and done.");
      });
      $("#run-back").addEventListener("click", function () { save(); renderChecklists(); });
    }
    draw();
  }

  /* ---------------- Tires --------------------------------------------------- */
  function renderTires() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var host = $("#tire-list");
    var tires = store.tires.filter(function (t) { return t.rigId === rig.id; });
    if (!tires.length) {
      host.innerHTML = '<div class="card"><div class="empty"><span class="hand">No tires in the book yet.</span>Add each tire with its DOT code — the last four digits on the sidewall — and the book will watch its birthday.</div></div>';
      return;
    }
    host.innerHTML = tires.map(function (t) {
      var info = dotInfo(t.dotCode);
      var cls = info.ok ? (info.flag === "good" ? "green" : info.flag === "old" ? "amber" : "red") : "amber";
      var pill = info.ok ? (info.flag === "good" ? "Good" : info.flag === "old" ? "Getting old" : "Replace") : "Check code";
      return '<div class="card" data-tire="' + t.id + '" style="cursor:pointer">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:.6rem">' +
        '<h2 style="margin:0">' + esc(t.position || "Tire") + '</h2><span class="pill ' + cls + '">' + pill + '</span></div>' +
        '<div class="age">' + (info.ok ? esc(info.ageText) : "—") + '</div>' +
        '<p class="muted" style="margin:.2rem 0">DOT ···· ' + esc(String(t.dotCode || "").replace(/\D/g, "").slice(-4)) +
        (info.ok && info.madeText ? ' — ' + esc(info.madeText) : '') + '</p>' +
        (info.ok ? '<div class="tire-bar"><div class="' + cls + '" style="width:' + info.pctToTen + '%"></div></div>' +
        '<p class="small muted">The bar fills toward 10 years — the hard limit.</p>' : '') +
        '<p>' + esc(info.ok ? info.flagText : info.text) + '</p>' +
        (t.note ? '<p class="small muted">' + esc(t.note) + '</p>' : '') + '</div>';
    }).join("");
    $all("[data-tire]", host).forEach(function (el) {
      el.addEventListener("click", function () { openTireSheet(el.getAttribute("data-tire")); });
    });
  }

  /* ---------------- More: costs, rig, CSV ---------------------------------- */
  function renderMore() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var year = new Date().getFullYear();
    $("#costs-year").textContent = year;
    var c = costsForYear(rig.id, year);
    var cpm = costPerMile(rig);
    var cats = Object.keys(c.byCat).sort(function (a, b) { return c.byCat[b] - c.byCat[a]; });
    var max = cats.length ? Math.max.apply(null, cats.map(function (k) { return c.byCat[k]; })) : 0;
    var html = '<div class="big-number money">' + money(c.total) + '</div>' +
      '<p class="muted" style="margin:.2rem 0 0">' + (cpm ? money(cpm.perMile) + ' a mile over the last ' + num(cpm.miles) + ' miles' : 'all-in this year') + '</p>';
    if (cats.length) {
      html += cats.map(function (k) {
        return '<div class="bar-row"><span class="lbl">' + esc(k) + '</span><span class="bar"><div style="width:' + Math.round(c.byCat[k] / max * 100) + '%"></div></span><span class="amt money">' + money(c.byCat[k]) + '</span></div>';
      }).join("");
    } else {
      html += '<p class="muted">Nothing logged yet this year — the numbers will grow as the jobs do.</p>';
    }
    $("#costs-body").innerHTML = html;
    $("#rig-body").innerHTML =
      '<div class="row"><div class="grow"><div class="title">' + esc(rigName(rig)) + '</div><div class="sub">' + esc(rig.type) + '</div></div></div>' +
      '<div class="row"><div class="grow"><div class="title">Odometer</div></div><b>' + num(rig.mileage) + ' mi</b></div>' +
      '<div class="row"><div class="grow"><div class="title">Generator hours</div></div><b>' + num(rig.genHours) + ' hrs</b></div>' +
      '<div class="row"><div class="grow"><div class="title">Tire pressures</div></div><b>' + (rig.psiFront ? rig.psiFront + " / " + (rig.psiRear || "—") + " psi" : "Not set") + '</b></div>';
  }

  /* ---------------- sheets (modals) ---------------------------------------- */
  var sheetHost = null;
  function openSheet(html) {
    sheetHost = $("#sheet-host");
    sheetHost.innerHTML = '<div class="sheet-backdrop"><div class="sheet" role="dialog">' + html + "</div></div>";
    sheetHost.hidden = false;
    $(".sheet-backdrop", sheetHost).addEventListener("click", function (e) {
      if (e.target.classList.contains("sheet-backdrop")) closeSheet();
    });
  }
  function closeSheet() { if (sheetHost) { sheetHost.hidden = true; sheetHost.innerHTML = ""; } }
  function sheetHead(title, sub) {
    return '<h2>' + title + '</h2>' + (sub ? '<p class="muted">' + sub + '</p>' : '') +
      '<div style="text-align:right;margin:-2.4rem 0 .6rem"><button class="btn small ghost" data-close type="button">Close</button></div>';
  }
  function wireClose(root) {
    $all("[data-close]", root || document).forEach(function (b) { b.addEventListener("click", closeSheet); });
  }

  /* ---------------- photos -------------------------------------------------- */
  var MAX_PHOTO_DIM = 1024, MAX_PHOTOS_PER_LOG = 12, STORE_SOFT_LIMIT = 4500000;
  function downscalePhoto(dataUrl) {
    return new Promise(function (resolve) {
      try {
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.width, h = img.height;
            if (w <= MAX_PHOTO_DIM && h <= MAX_PHOTO_DIM) { resolve(dataUrl); return; }
            var s = Math.min(MAX_PHOTO_DIM / w, MAX_PHOTO_DIM / h);
            var c = document.createElement("canvas");
            c.width = Math.round(w * s); c.height = Math.round(h * s);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL("image/jpeg", 0.8));
          } catch (e) { resolve(dataUrl); }
        };
        img.onerror = function () { resolve(dataUrl); };
        img.src = dataUrl;
      } catch (e) { resolve(dataUrl); }
    });
  }
  function storeHasRoom(bytes) {
    try { return (localStorage.getItem(KEY) || "").length + bytes < STORE_SOFT_LIMIT; } catch (e) { return true; }
  }
  var photoPending = null; // function(dataUrl)
  function requestPhoto(cb) {
    photoPending = cb;
    if (isNative) {
      try {
        var Camera = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera;
        if (Camera && Camera.getPhoto) {
          Camera.getPhoto({ quality: 80, allowEditing: false, resultType: "dataUrl", source: "prompt" })
            .then(function (r) { var f = photoPending; photoPending = null; if (f && r && r.dataUrl) f(r.dataUrl); })
            .catch(function () { photoPending = null; });
          return;
        }
      } catch (e) {}
    }
    var input = $("#photo-input");
    input.value = "";
    input.click();
  }

  /* ---------------- local reminders (native only) --------------------------- */
  function scheduleReminders() {
    if (!isNative) return;
    try {
      var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
      if (!LN || !LN.schedule) return;
      var rig = activeRig(); if (!rig) return;
      var notifs = [];
      store.tasks.filter(function (t) { return t.rigId === rig.id && t.nextDueDate; }).forEach(function (t, i) {
        var d = parseISO(t.nextDueDate); if (!d) return;
        if (daysBetween(todayISO(), t.nextDueDate) > 30) return;
        var at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0);
        if (at < new Date()) return;
        var id = 1000 + (i % 900);
        notifs.push({ id: id, title: "RollOnRV — " + t.title, body: "Due in the logbook: " + t.title, schedule: { at: at } });
      });
      if (notifs.length) LN.schedule({ notifications: notifs });
    } catch (e) {}
  }

  /* ---------------- log-a-job sheet ----------------------------------------- */
  function openLogSheet(logId, presetTaskId) {
    var rig = activeRig();
    var existing = logId ? store.logs.find(function (l) { return l.id === logId; }) : null;
    var draft = existing ? JSON.parse(JSON.stringify(existing)) : newLog({ rigId: rig.id, taskId: presetTaskId || null });
    var tasks = store.tasks.filter(function (t) { return t.rigId === rig.id; });
    function draw() {
      var partsHtml = draft.parts.map(function (p, i) {
        return '<div class="fieldrow" data-part="' + i + '">' +
          '<div class="field" style="flex:2;margin-top:.4rem"><input data-pname placeholder="Part — e.g. Oil filter" value="' + esc(p.name || "") + '" /></div>' +
          '<div class="field" style="flex:1.4;margin-top:.4rem"><input data-ppart placeholder="Part no." value="' + esc(p.partNo || "") + '" /></div>' +
          '<div class="field" style="flex:.8;margin-top:.4rem"><input data-pcost inputmode="decimal" placeholder="$" value="' + (p.cost != null && p.cost !== "" ? p.cost : "") + '" /></div></div>';
      }).join("");
      openSheet(
        sheetHead(existing ? "One job, written up" : "Log a job", existing ? "" : "The photo starts the entry — snap the receipt, the part label, or the odometer.") +
        '<button class="photo-btn" id="lj-photo" type="button">📷 Add a photo</button>' +
        '<div class="thumbs" id="lj-thumbs">' + draft.photos.map(function (p, i) {
          return '<span style="position:relative"><img src="' + esc(p.data) + '" alt="Job photo" /><button type="button" data-del-photo="' + i + '" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:none;border-radius:50%;width:1.4rem;height:1.4rem;font-weight:700">×</button></span>';
        }).join("") + '</div>' +
        '<div class="field"><label for="lj-title">What was done</label><input id="lj-title" value="' + esc(draft.title) + '" placeholder="e.g. Generator oil &amp; filter change" /></div>' +
        '<div class="field"><label for="lj-task">Tied to a task in the book (optional)</label><select id="lj-task">' +
        '<option value="">Not tied to a task</option>' +
        tasks.map(function (t) { return '<option value="' + t.id + '"' + (draft.taskId === t.id ? " selected" : "") + '>' + esc(t.title) + '</option>'; }).join("") +
        '</select></div>' +
        '<div class="fieldrow"><div class="field"><label for="lj-date">Date</label><input id="lj-date" type="date" value="' + esc(draft.date) + '" /></div>' +
        '<div class="field"><label for="lj-cost">Cost</label><input id="lj-cost" inputmode="decimal" placeholder="0.00" value="' + (draft.cost ? draft.cost : "") + '" /></div></div>' +
        '<div class="fieldrow"><div class="field"><label for="lj-miles">Odometer (miles)</label><input id="lj-miles" inputmode="decimal" placeholder="' + num(rig.mileage) + '" value="' + (draft.mileage != null ? draft.mileage : "") + '" /></div>' +
        '<div class="field"><label for="lj-gen">Generator hours</label><input id="lj-gen" inputmode="decimal" placeholder="' + num(rig.genHours) + '" value="' + (draft.genHours != null ? draft.genHours : "") + '" /></div></div>' +
        '<div class="field"><label>Parts — what went into it</label>' + partsHtml +
        '<button class="btn small ghost" id="lj-add-part" type="button">＋ Add a part</button></div>' +
        '<div class="field"><label for="lj-note">Note to your future self</label><textarea id="lj-note" placeholder="e.g. Old oil looked clean. Next one at 431 hrs — before the spring trip.">' + esc(draft.note || "") + '</textarea></div>' +
        '<div class="btnrow"><button class="btn block" id="lj-save" type="button">' + (existing ? "Save changes" : "Mark it done — stamp the page") + '</button></div>' +
        (existing ? '<div class="btnrow"><button class="btn ghost block" id="lj-delete" type="button">Delete this entry</button></div>' : "") +
        '<div id="lj-stamp" style="text-align:center;margin-top:1rem" hidden><span class="stamp big pop">Done</span></div>'
      );
      wireClose(sheetHost);
      $("#lj-photo").addEventListener("click", function () {
        if (draft.photos.length >= MAX_PHOTOS_PER_LOG) { toast("That's enough photos for one entry — 12 is the limit."); return; }
        requestPhoto(function (dataUrl) {
          downscalePhoto(dataUrl).then(function (small) {
            if (!storeHasRoom(small.length)) { toast("The book is nearly full — export a copy before adding more photos."); return; }
            draft.photos.push({ id: uid(), name: "photo", data: small });
            draw();
          });
        });
      });
      $all("[data-del-photo]", sheetHost).forEach(function (b) {
        b.addEventListener("click", function () { draft.photos.splice(Number(b.getAttribute("data-del-photo")), 1); draw(); });
      });
      $("#lj-add-part").addEventListener("click", function () {
        collectParts();
        draft.parts.push({ name: "", partNo: "", cost: "" });
        draw();
      });
      function collectParts() {
        $all("[data-part]", sheetHost).forEach(function (rowEl) {
          var i = Number(rowEl.getAttribute("data-part"));
          draft.parts[i] = {
            name: $("[data-pname]", rowEl).value.trim(),
            partNo: $("[data-ppart]", rowEl).value.trim(),
            cost: parseFloat($("[data-pcost]", rowEl).value) || 0
          };
        });
      }
      $("#lj-save").addEventListener("click", function () {
        collectParts();
        draft.title = $("#lj-title").value.trim();
        if (!draft.title) { toast("Give the job a name first."); return; }
        draft.taskId = $("#lj-task").value || null;
        draft.date = $("#lj-date").value || todayISO();
        draft.cost = parseFloat($("#lj-cost").value) || 0;
        draft.mileage = $("#lj-miles").value === "" ? null : Number($("#lj-miles").value);
        draft.genHours = $("#lj-gen").value === "" ? null : Number($("#lj-gen").value);
        draft.note = $("#lj-note").value.trim();
        draft.parts = draft.parts.filter(function (p) { return p.name || p.partNo || p.cost; });
        // Parts add up: if no total was typed, the parts total is the cost.
        var partsTotal = draft.parts.reduce(function (s, p) { return s + (Number(p.cost) || 0); }, 0);
        if (!draft.cost && partsTotal) draft.cost = partsTotal;
        if (existing) {
          var idx = store.logs.findIndex(function (l) { return l.id === existing.id; });
          if (idx >= 0) store.logs[idx] = draft;
        } else {
          store.logs.push(draft);
          if (draft.taskId) {
            var task = store.tasks.find(function (t) { return t.id === draft.taskId; });
            if (task) completeTask(task, draft);
          }
          if (draft.mileage != null && draft.mileage > rig.mileage) rig.mileage = draft.mileage;
          if (draft.genHours != null && draft.genHours > rig.genHours) rig.genHours = draft.genHours;
        }
        save(); scheduleReminders();
        var stamp = $("#lj-stamp"); stamp.hidden = false;
        setTimeout(function () { closeSheet(); renderLogbook(); renderHome(); }, 650);
      });
      var del = $("#lj-delete");
      if (del) del.addEventListener("click", function () {
        if (!confirm("Delete this entry from the book?")) return;
        store.logs = store.logs.filter(function (l) { return l.id !== existing.id; });
        save(); closeSheet(); renderLogbook();
      });
    }
    draw();
  }

  /* ---------------- task sheet (add / detail) ------------------------------- */
  function openTaskSheet(taskId) {
    var rig = activeRig();
    var task = taskId ? store.tasks.find(function (t) { return t.id === taskId; }) : null;
    if (!task) { openAddTaskSheet(); return; }
    var st = taskStatus(task, rig);
    openSheet(
      sheetHead(esc(task.title), esc(task.category)) +
      '<p><span class="pill ' + (st.level === "overdue" ? "red" : st.level === "soon" ? "amber" : "green") + '">' + esc(st.text) + '</span></p>' +
      (task.note ? '<p>' + esc(task.note) + '</p>' : '') +
      '<div class="row"><div class="grow"><div class="title">Every</div><div class="sub">Cadence, when it repeats</div></div><b>' +
      [task.intervalMonths ? task.intervalMonths + " mo" : null, task.intervalMiles ? num(task.intervalMiles) + " mi" : null, task.intervalGenHours ? num(task.intervalGenHours) + " hrs" : null].filter(Boolean).join(" · ") + '</b></div>' +
      (task.lastDoneAt ? '<div class="row"><div class="grow"><div class="title">Last done</div></div><b>' + esc(fmtDate(task.lastDoneAt)) + '</b></div>' : '') +
      '<div class="btnrow"><button class="btn block" id="ts-log">Log this job</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="ts-snooze">Nudge me again in a week</button>' +
      '<button class="btn ghost block" id="ts-delete">Delete task</button></div>'
    );
    wireClose(sheetHost);
    $("#ts-log").addEventListener("click", function () { closeSheet(); openLogSheet(null, task.id); });
    $("#ts-snooze").addEventListener("click", function () { snoozeTask(task); save(); closeSheet(); renderLogbook(); renderHome(); toast("Snoozed a week."); });
    $("#ts-delete").addEventListener("click", function () {
      if (!confirm("Delete this task from the book?")) return;
      store.tasks = store.tasks.filter(function (t) { return t.id !== task.id; });
      save(); scheduleReminders(); closeSheet(); renderLogbook();
    });
  }
  function openAddTaskSheet() {
    var rig = activeRig();
    openSheet(
      sheetHead("Add a task", "Something the rig needs, on a rhythm or just once.") +
      '<div class="field"><label for="at-title">Task</label><input id="at-title" placeholder="e.g. Roof seals — inspect &amp; touch up" /></div>' +
      '<div class="field"><label for="at-cat">Category</label><select id="at-cat">' + CATEGORIES.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + '</select></div>' +
      '<div class="fieldrow"><div class="field"><label for="at-months">Every (months)</label><input id="at-months" inputmode="numeric" placeholder="12" /></div>' +
      '<div class="field"><label for="at-miles">Every (miles)</label><input id="at-miles" inputmode="numeric" placeholder="" /></div>' +
      '<div class="field"><label for="at-hours">Every (gen hrs)</label><input id="at-hours" inputmode="numeric" placeholder="" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="at-due-date">Due date</label><input id="at-due-date" type="date" /></div>' +
      '<div class="field"><label for="at-due-miles">Due at (miles)</label><input id="at-due-miles" inputmode="numeric" placeholder="" /></div></div>' +
      '<div class="field"><label for="at-note">Note</label><textarea id="at-note" placeholder="What to look for, what it takes."></textarea></div>' +
      '<div class="btnrow"><button class="btn block" id="at-save" type="button">Write it in the book</button></div>'
    );
    wireClose(sheetHost);
    $("#at-save").addEventListener("click", function () {
      var title = $("#at-title").value.trim();
      if (!title) { toast("Give the task a name first."); return; }
      var task = newTask({
        rigId: rig.id, title: title, category: $("#at-cat").value,
        intervalMonths: $("#at-months").value === "" ? null : Number($("#at-months").value),
        intervalMiles: $("#at-miles").value === "" ? null : Number($("#at-miles").value),
        intervalGenHours: $("#at-hours").value === "" ? null : Number($("#at-hours").value),
        nextDueDate: $("#at-due-date").value || null,
        nextDueMileage: $("#at-due-miles").value === "" ? null : Number($("#at-due-miles").value),
        note: $("#at-note").value.trim()
      });
      store.tasks.push(task); save(); scheduleReminders();
      closeSheet(); renderLogbook(); toast("Written in the book.");
    });
  }

  /* ---------------- tire sheet ---------------------------------------------- */
  function openTireSheet(tireId) {
    var rig = activeRig();
    var tire = tireId ? store.tires.find(function (t) { return t.id === tireId; }) : null;
    var draft = tire ? JSON.parse(JSON.stringify(tire)) : newTire({ rigId: rig.id });
    function draw() {
      var info = dotInfo(draft.dotCode);
      openSheet(
        sheetHead(tire ? "Tire — " + esc(tire.position || "") : "Add a tire", "The DOT code is the last four digits on the sidewall — week, then year. 3222 means week 32 of 2022.") +
        '<div class="field"><label for="ti-pos">Position</label><input id="ti-pos" list="ti-positions" value="' + esc(draft.position) + '" placeholder="e.g. Steer — left" />' +
        '<datalist id="ti-positions"><option>Steer — left</option><option>Steer — right</option><option>Drive — outer left</option><option>Drive — outer right</option><option>Drive — inner left</option><option>Drive — inner right</option><option>Tag — left</option><option>Tag — right</option><option>Spare</option></datalist></div>' +
        '<div class="field"><label for="ti-dot">DOT code (last 4 digits)</label><input id="ti-dot" inputmode="numeric" maxlength="4" value="' + esc(draft.dotCode) + '" placeholder="3222" /></div>' +
        (info.ok ? '<div class="card"><div class="age">' + esc(info.ageText) + '</div><p>' + esc(info.flagText) + '</p><div class="tire-bar"><div class="' + (info.flag === "good" ? "green" : info.flag === "old" ? "amber" : "red") + '" style="width:' + info.pctToTen + '%"></div></div><p class="small muted">The bar fills toward 10 years — the hard limit.</p></div>'
          : '<p class="muted">' + esc(info.text) + '</p>') +
        '<div class="field"><label for="ti-note">Note</label><input id="ti-note" value="' + esc(draft.note || "") + '" placeholder="e.g. Michelin, bought at..." /></div>' +
        '<div class="btnrow"><button class="btn block" id="ti-save" type="button">Save tire</button></div>' +
        (tire ? '<div class="btnrow"><button class="btn ghost block" id="ti-delete" type="button">Remove tire</button></div>' : "")
      );
      wireClose(sheetHost);
      $("#ti-dot").addEventListener("input", function () { draft.dotCode = $("#ti-dot").value; draft.position = $("#ti-pos").value; draft.note = $("#ti-note").value; draw(); });
      $("#ti-save").addEventListener("click", function () {
        draft.position = $("#ti-pos").value.trim() || "Tire";
        draft.dotCode = $("#ti-dot").value.trim();
        draft.note = $("#ti-note").value.trim();
        if (!dotInfo(draft.dotCode).ok) { toast("Check the DOT code — four digits, week then year."); return; }
        if (tire) { var i = store.tires.findIndex(function (t) { return t.id === tire.id; }); store.tires[i] = draft; }
        else store.tires.push(draft);
        save(); closeSheet(); renderTires(); toast("Tire written in the book.");
      });
      var del = $("#ti-delete");
      if (del) del.addEventListener("click", function () {
        if (!confirm("Remove this tire from the book?")) return;
        store.tires = store.tires.filter(function (t) { return t.id !== tire.id; });
        save(); closeSheet(); renderTires();
      });
    }
    draw();
  }

  /* ---------------- rig sheets ---------------------------------------------- */
  function openRigSheet() {
    var rig = activeRig();
    openSheet(
      sheetHead("Your rig", "The numbers the book does its math from.") +
      '<div class="fieldrow"><div class="field"><label for="rg-year">Year</label><input id="rg-year" value="' + esc(rig.year) + '" /></div>' +
      '<div class="field"><label for="rg-make">Make</label><input id="rg-make" value="' + esc(rig.make) + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-model">Model</label><input id="rg-model" value="' + esc(rig.model) + '" /></div>' +
      '<div class="field"><label for="rg-type">Type</label><select id="rg-type">' + ["Class A", "Class B", "Class C", "Travel trailer", "Fifth wheel", "Truck camper", "Other"].map(function (t) { return '<option' + (rig.type === t ? " selected" : "") + '>' + t + '</option>'; }).join("") + '</select></div></div>' +
      '<div class="field"><label for="rg-nick">Nickname</label><input id="rg-nick" value="' + esc(rig.nickname || "") + '" /></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-miles">Odometer (miles)</label><input id="rg-miles" inputmode="decimal" value="' + rig.mileage + '" /></div>' +
      '<div class="field"><label for="rg-gen">Generator hours</label><input id="rg-gen" inputmode="decimal" value="' + rig.genHours + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-psi-f">Tire pressure — front (PSI)</label><input id="rg-psi-f" inputmode="numeric" value="' + (rig.psiFront || "") + '" /></div>' +
      '<div class="field"><label for="rg-psi-r">Tire pressure — rear (PSI)</label><input id="rg-psi-r" inputmode="numeric" value="' + (rig.psiRear || "") + '" /></div></div>' +
      '<div class="btnrow"><button class="btn block" id="rg-save" type="button">Save rig</button></div>'
    );
    wireClose(sheetHost);
    $("#rg-save").addEventListener("click", function () {
      rig.year = $("#rg-year").value.trim(); rig.make = $("#rg-make").value.trim();
      rig.model = $("#rg-model").value.trim(); rig.type = $("#rg-type").value;
      rig.nickname = $("#rg-nick").value.trim();
      rig.mileage = Number($("#rg-miles").value) || 0; rig.genHours = Number($("#rg-gen").value) || 0;
      rig.psiFront = Number($("#rg-psi-f").value) || null; rig.psiRear = Number($("#rg-psi-r").value) || null;
      save(); closeSheet(); renderMore(); renderHome(); toast("Rig updated.");
    });
  }
  function openMilesSheet() {
    var rig = activeRig();
    openSheet(
      sheetHead("Update odometer &amp; hours", "The book's due dates and cost-per-mile run off these numbers.") +
      '<div class="field"><label for="mi-miles">Odometer (miles)</label><input id="mi-miles" inputmode="decimal" value="' + rig.mileage + '" /></div>' +
      '<div class="field"><label for="mi-gen">Generator hours</label><input id="mi-gen" inputmode="decimal" value="' + rig.genHours + '" /></div>' +
      '<div class="btnrow"><button class="btn block" id="mi-save" type="button">Save numbers</button></div>'
    );
    wireClose(sheetHost);
    $("#mi-save").addEventListener("click", function () {
      rig.mileage = Number($("#mi-miles").value) || 0; rig.genHours = Number($("#mi-gen").value) || 0;
      save(); closeSheet(); renderHome(); toast("Numbers updated.");
    });
  }

  /* ---------------- wiring --------------------------------------------------- */
  function wire() {
    $all("#tabbar .tab").forEach(function (t) {
      t.addEventListener("click", function () { showScreen(t.getAttribute("data-screen")); });
    });
    $("#setup-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var rig = newRig({
        year: $("#su-year").value.trim(), make: $("#su-make").value.trim(), model: $("#su-model").value.trim(),
        nickname: $("#su-nick").value.trim(), type: $("#su-type").value,
        mileage: $("#su-miles").value, genHours: $("#su-gen").value,
        psiFront: $("#su-psi-f").value, psiRear: $("#su-psi-r").value
      });
      if (!rig.year && !rig.make && !rig.model) { toast("Tell the book what rig this is — year, make, or model."); return; }
      store.rigs.push(rig); store.activeRigId = rig.id;
      // Tasks imported before the rig existed attach to it now.
      store.tasks.forEach(function (t) { if (t.rigId === "pending") t.rigId = rig.id; });
      // Offer the starter list? No — keep setup honest: rig is in, book is open.
      save();
      $("#tabbar").style.display = "";
      showScreen("home");
      toast("Welcome to the logbook.");
    });
    $("#setup-import-btn").addEventListener("click", function () { $("#csv-file-input").click(); });
    $("#home-start-checklist").addEventListener("click", function () { showScreen("checklists"); openChecklistRun("pretrip"); });
    $("#home-pick-checklist").addEventListener("click", function () { showScreen("checklists"); });
    $("#home-update-miles").addEventListener("click", openMilesSheet);
    $("#home-log-job").addEventListener("click", function () { openLogSheet(null, null); });
    $("#log-add-btn").addEventListener("click", function () { openLogSheet(null, null); });
    $("#log-add-task-btn").addEventListener("click", openAddTaskSheet);
    $("#tire-add-btn").addEventListener("click", function () { openTireSheet(null); });
    $("#rig-edit-btn").addEventListener("click", openRigSheet);
    $("#csv-import-btn").addEventListener("click", function () { $("#csv-file-input").click(); });
    $("#csv-file-input").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var rig = activeRig();
        var rigId = rig ? rig.id : "pending";
        var res = importTasksCSV(String(reader.result || ""), rigId);
        save();
        var msg = res.imported + " task" + (res.imported === 1 ? "" : "s") + " written in the book" +
          (res.skipped ? " · " + res.skipped + " row" + (res.skipped === 1 ? "" : "s") + " skipped" : "") +
          (res.errors.length ? " — " + res.errors[0] : "") + ".";
        $("#csv-status").textContent = msg;
        if (rig) { renderMore(); renderLogbook(); } else toast(msg + " Now add your rig and they'll attach to it.");
      };
      reader.readAsText(file);
      e.target.value = "";
    });
    $("#csv-export-tasks-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-tasks.csv", exportTasksCSV(rig.id));
      toast("Tasks exported — rollonrv-tasks.csv");
    });
    $("#csv-export-logs-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-logbook.csv", exportLogsCSV(rig.id));
      toast("Logbook exported — rollonrv-logbook.csv");
    });
    $("#reset-btn").addEventListener("click", function () {
      if (!confirm("Erase the whole book — rig, tasks, log entries, tires, everything? Export a CSV first if you want to keep it.")) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    });
    $("#photo-input").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      var cb = photoPending; photoPending = null;
      if (!file || !cb) return;
      var reader = new FileReader();
      reader.onload = function () { cb(String(reader.result || "")); };
      reader.readAsDataURL(file);
      e.target.value = "";
    });
  }

  /* ---------------- init ------------------------------------------------------ */
  function init() {
    load();
    wire();
    if (!store.rigs.length) {
      $("#tabbar").style.display = "none";
      $all(".screen").forEach(function (s) { s.classList.remove("active"); });
      $("#screen-setup").classList.add("active");
    } else {
      $("#tabbar").style.display = "";
      showScreen("home");
    }
    scheduleReminders();
  }

  /* ---------------- test hooks (not shipped UI — used by tests/test.js) ------ */
  window.RollOnRV = {
    store: function () { return store; },
    save: save, load: load,
    newRig: newRig, newTask: newTask, newLog: newLog, newTire: newTire,
    taskStatus: taskStatus, dueTasks: dueTasks, completeTask: completeTask, snoozeTask: snoozeTask,
    dotInfo: dotInfo, costsForYear: costsForYear, costPerMile: costPerMile,
    importTasksCSV: importTasksCSV, exportTasksCSV: exportTasksCSV, exportLogsCSV: exportLogsCSV,
    parseCSV: parseCSV, CHECKLISTS: CHECKLISTS, STARTER_TASKS: STARTER_TASKS, CATEGORIES: CATEGORIES,
    showScreen: showScreen, renderHome: renderHome, renderLogbook: renderLogbook,
    renderChecklists: renderChecklists, renderTires: renderTires, renderMore: renderMore,
    activeRig: activeRig, isNative: isNative, platform: platform
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();


