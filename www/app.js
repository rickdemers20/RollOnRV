/* RollOnRV v1 — The Rig Logbook.
   Local-first, offline, no account, no server, no AI.
   Data lives in localStorage under "rollonrv.v1". Photos are downscaled
   data URLs stored with the log entry (native: camera + filesystem when
   available, same downscale path). Everything else is plain math. */
(function () {
  "use strict";

  /* Build number — bump it on every release. It shows in More, under
     About, so a glance tells which build is on the phone. */
  var APP_VERSION = "52";

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
    return { version: 1, rigs: [], activeRigId: null, tasks: [], logs: [], tires: [], runs: [], customItems: [], customGroups: [], customLists: [], customHeadings: [], parts: [], pros: [], fuel: [], trips: [], settings: {} };
  };
  var store = DEFAULTS();
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.version === 1) {
          store = data;
          /* Books saved before custom checklist items existed lack the list. */
          if (!Array.isArray(store.customItems)) store.customItems = [];
          if (!Array.isArray(store.customGroups)) store.customGroups = [];
          if (!Array.isArray(store.customLists)) store.customLists = [];
          if (!Array.isArray(store.customHeadings)) store.customHeadings = [];
          if (!Array.isArray(store.parts)) store.parts = [];
          /* Books saved before the pros list existed lack it. */
          if (!Array.isArray(store.pros)) store.pros = [];
          /* Books saved before the fuel log or the trips existed lack them. */
          if (!Array.isArray(store.fuel)) store.fuel = [];
          if (!Array.isArray(store.trips)) store.trips = [];
          /* Books saved before the rig questions existed lack the answers. */
          (store.rigs || []).forEach(function (r) { if (!r.equipment || typeof r.equipment !== "object") r.equipment = {}; });
          /* One-time cleanup (Nov 14): the plan export tacked "(Type
             Unknown)" onto some titles — twice, once capitalised and once
             not. Idempotent: once a title is clean it no longer matches,
             so this is safe to run on every load. */
          var cleanedAny = false;
          [store.tasks, store.logs].forEach(function (list) {
            if (!Array.isArray(list)) return;
            list.forEach(function (entry) {
              var c = cleanTaskTitle(entry.title);
              if (c !== entry.title) { entry.title = c; cleanedAny = true; }
            });
          });
          if (cleanedAny) save();
          /* One-time cleanup (Nov 15): merge jobs doubled by importing
             the same file twice — keep the copy with the work behind it. */
          if (dedupeTasks()) save();
          return;
        }
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
      photo: o.photo || null, equipment: o.equipment || {},
      createdAt: todayISO()
    };
  }
  function rigName(rig) {
    if (!rig) return "Your rig";
    var base = [rig.year, rig.make, rig.model].filter(Boolean).join(" ");
    return rig.nickname ? rig.nickname + " — " + base : (base || "Your rig");
  }

  /* ---------------- rig silhouettes --------------------------------------- */
  /* Hand-drawn line-art of the rig, keyed by type — your rig's own shape
     on the home screen, not a stock photo. Pure SVG paths, no images. */
  function rigWheels(a, b) {
    return '<circle cx="' + a + '" cy="57" r="7"/><circle cx="' + b + '" cy="57" r="7"/>' +
      '<circle cx="' + a + '" cy="57" r="1.6" fill="currentColor" stroke="none"/><circle cx="' + b + '" cy="57" r="1.6" fill="currentColor" stroke="none"/>';
  }
  var RIG_ART = {
    "Class A": '<path d="M12 57V16Q12 12 16 12H196Q200 12 200 16V57"/><path d="M24 20H120V36H24Z"/><path d="M172 20H192V36H172Z"/><path d="M150 20V57"/>' + rigWheels(52, 168),
    "Class B": '<path d="M14 57V24Q14 20 18 20H158L190 36Q198 40 198 48V57"/><path d="M26 26H92V38H26Z"/><path d="M136 26L164 26L178 36H136Z"/>' + rigWheels(52, 168),
    "Class C": '<path d="M14 57V16H150V57"/><path d="M150 16H184V30H150Z"/><path d="M150 57V30L184 30L198 42Q204 46 204 52V57"/><path d="M26 24H120V36H26Z"/><path d="M156 34L182 34L192 42H156Z"/>' + rigWheels(52, 172),
    "Travel trailer": '<path d="M24 57V18H190V57"/><path d="M190 44L210 57"/><path d="M44 24H120V36H44Z"/><path d="M150 24V57"/>' + rigWheels(116, 146),
    "Fifth wheel": '<path d="M14 57V14H190V34H168V57"/><path d="M28 20H130V32H28Z"/>' + rigWheels(88, 116),
    "Truck camper": '<path d="M62 57V14H172V57"/><path d="M172 57V34L190 34L202 44Q208 48 208 54V57"/><path d="M74 20H140V32H74Z"/><path d="M176 38L192 38L198 44H176Z"/>' + rigWheels(92, 176),
    "Other": '<path d="M40 57V20H180V57"/><path d="M180 44L200 57"/><path d="M56 26H130V38H56Z"/>' + rigWheels(76, 150)
  };
  function rigSilhouette(type) {
    var inner = RIG_ART[type] || RIG_ART["Other"];
    return '<svg viewBox="0 0 220 72" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner +
      '<path d="M8 64H212" stroke-width="2" opacity=".35"/></svg>';
  }
  /* Your rig's own photo replaces the silhouette when one is set — tap the
     picture on the home screen (or the rig sheet) to take or choose one.
     No photo yet? The line drawing stands in. */
  function rigArt(rig) {
    if (rig && rig.photo) return '<img src="' + esc(rig.photo) + '" class="rig-photo" alt="Your rig" />';
    return rigSilhouette(rig ? rig.type : "Class A");
  }
  function setRigPhoto(dataUrl) {
    var rig = activeRig(); if (!rig) return;
    rig.photo = dataUrl || null; save(); renderHome();
  }
  function pickRigPhoto() {
    var rig = activeRig(); if (!rig) return;
    requestPhoto(function (dataUrl) {
      downscalePhoto(dataUrl).then(function (small) {
        if (!storeHasRoom(small.length)) { toast("The book is nearly full — export a copy before adding more photos."); return; }
        rig.photo = small; save(); renderHome(); toast("That's the one — your rig's photo is on the home screen.");
      });
    });
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
      needsPro: !!o.needsPro, proId: o.proId || null, proShop: (o.proShop || "").trim(),
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

  /* ---------------- parts to get (the shopping list — free) ---------------- */
  /* A part belongs to a job, with its part number on it — or it's just
     supplies. Bought means the money is spent: what you paid lands in
     "What she's cost" for that year, under the job's system ("Parts" with
     no job). The price is only counted while the box is ticked, so
     un-ticking it takes the money back out. When the job is later logged,
     bought list parts come along already counted, so the same dollars
     are never counted twice. */
  /* One pro — a shop or tech you trust. The list lives at the book
     level, not per rig: a good suspension shop is a good suspension
     shop whichever rig you bring. */
  function newPro(o) {
    return {
      id: uid(), name: (o.name || "").trim(), specialty: (o.specialty || "").trim(),
      phone: (o.phone || "").trim(), town: (o.town || "").trim()
    };
  }
  /* The pro a task points at: by id first, then by name for jobs written
     before the list existed. A deleted pro leaves the name behind, but
     the number goes with them. */
  function proFor(task) {
    if (!task) return null;
    var pros = store.pros || [];
    if (task.proId) { var byId = pros.find(function (p) { return p.id === task.proId; }); if (byId) return byId; }
    if (task.proShop) return pros.find(function (p) { return p.name.toLowerCase() === task.proShop.toLowerCase(); }) || null;
    return null;
  }
  function proLine(task) {
    var p = proFor(task);
    var line = "🔧 Leave it to the pro" + (task.proShop ? " — " + esc(task.proShop) : "");
    if (p && p.phone) line += ' · <a href="tel:' + esc(p.phone.replace(/[^0-9+*#]/g, "")) + '">📞 Call ' + esc(p.phone) + "</a>";
    return "<p>" + line + "</p>";
  }

  function newPart(o) {
    return {
      id: uid(), rigId: o.rigId, name: (o.name || "").trim(), partNo: (o.partNo || "").trim(),
      qty: Math.max(1, Number(o.qty) || 1), taskId: o.taskId || null,
      bought: false, boughtAt: null, boughtCost: 0, createdAt: todayISO()
    };
  }
  function partsForRig(rigId) {
    return (store.parts || []).filter(function (p) { return p.rigId === rigId; });
  }
  function partTaskTitle(part) {
    if (!part.taskId) return "";
    var t = store.tasks.find(function (x) { return x.id === part.taskId; });
    return t ? t.title : "";
  }
  function togglePartBought(part) {
    part.bought = !part.bought;
    part.boughtAt = part.bought ? (part.boughtAt || todayISO()) : null;
    save();
  }
  function boughtPartsCostForTask(taskId) {
    var rig = activeRig(); if (!rig) return 0;
    return partsForRig(rig.id).filter(function (p) { return p.taskId === taskId && p.bought; })
      .reduce(function (s, p) { return s + (Number(p.boughtCost) || 0); }, 0);
  }

  /* ---------------- due math — plain words, not badge counts ------------- */
  var SOON_DAYS = 14, SOON_MILES = 500, SOON_HOURS = 25;
  function taskStatus(task, rig) {
    // Returns { level: 'overdue'|'soon'|'ok'|'open'|'done', text: '...' }
    if (!task.intervalMonths && !task.intervalMiles && !task.intervalGenHours && !task.nextDueDate && !task.nextDueMileage && !task.nextDueGenHours) {
      // One-time, no schedule: it's still a job to do until it's been
      // logged once. Only then is it done and off the books.
      return task.lastDoneAt ? { level: "done", text: "One-time — done" } : { level: "open", text: "One-time — no next due" };
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
    // Otherwise: farthest out — nearest factor only, like "soon". Joining
    // date + miles + hours made pills so long they ran into the task title.
    // The full cadence still shows on the task's own sheet.
    var far = [];
    if (task.nextDueDate) far.push({ v: daysBetween(today, task.nextDueDate), text: "due " + fmtDate(task.nextDueDate) });
    if (task.nextDueMileage != null && rig) far.push({ v: task.nextDueMileage - rig.mileage, text: num(task.nextDueMileage - rig.mileage) + " miles to go" });
    if (task.nextDueGenHours != null && rig) far.push({ v: task.nextDueGenHours - rig.genHours, text: num(task.nextDueGenHours - rig.genHours) + " gen hours to go" });
    far.sort(function (a, b) { return a.v - b.v; });
    return { level: "ok", text: far.length ? far[0].text : "On the books" };
  }
  function dueTasks(rig) {
    return store.tasks.filter(function (t) { return t.rigId === rig.id; }).map(function (t) {
      return { task: t, status: taskStatus(t, rig) };
    }).sort(function (a, b) {
      var rank = { overdue: 0, soon: 1, ok: 2, open: 3, done: 4 };
      return rank[a.status.level] - rank[b.status.level];
    });
  }
  /* Next up: the three jobs that matter most, in plain words — overdue
     safety first, then anything overdue, then soonest. No black box, no
     hidden tasks: the rest of the book is one tap away in the Logbook. */
  var SAFETY_CATEGORIES = ["Tires", "Chassis Brakes", "Safety", "Engine", "Transmission", "Suspension", "Chassis", "Fuel System", "Brakes", "Steering"];
  function nextUpTasks(rig, n) {
    var open = dueTasks(rig).filter(function (d) { return d.status.level !== "done"; });
    function rank(d) {
      var safety = SAFETY_CATEGORIES.indexOf(d.task.category) !== -1;
      if (d.status.level === "overdue") return safety ? 0 : 1;
      if (d.status.level === "soon") return safety ? 2 : 3;
      if (d.status.level === "open") return 5;
      return 4;
    }
    function dueKey(d) {
      return (d.task.nextDueDate || "9999") + "|" + String(d.task.nextDueMileage || 999999999).padStart(9, "0");
    }
    open.sort(function (a, b) {
      var r = rank(a) - rank(b);
      if (r) return r;
      var ka = dueKey(a), kb = dueKey(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    return open.slice(0, n || 3);
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
    /* Parts bought count too — the money left the pocket when the part
       was bought, not when the job was logged. */
    (store.parts || []).filter(function (p) { return p.rigId === rigId && p.bought && p.boughtAt && p.boughtAt.indexOf(String(year)) === 0; }).forEach(function (p) {
      var c = Number(p.boughtCost) || 0;
      total += c;
      var cat = "Parts";
      if (p.taskId) { var t = store.tasks.find(function (x) { return x.id === p.taskId; }); if (t) cat = t.category; }
      byCat[cat] = (byCat[cat] || 0) + c;
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
    total += (store.parts || []).filter(function (p) { return p.rigId === rig.id && p.bought; }).reduce(function (s, p) { return s + (Number(p.boughtCost) || 0); }, 0);
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
  /* CSV import is deliberately tolerant: plan exports from other apps put
     title rows above the real header, use their own column names
     ("Task Title", "Component", "Interval (Days)") and write dates like
     "Oct 12, 2026". So: find the header row by scanning, match columns by
     keyword with the specific ones first ("Next Due (Miles)" before
     "Next Due"), and parse dates loosely. "Interval (Days)" becomes months
     (90 days = 3 months) because the book keeps cadence in months. */
  function headerField(h) {
    var t = String(h == null ? "" : h).trim().toLowerCase();
    if (!t) return null;
    if (/next due/.test(t) && /mile/.test(t)) return "nextDueMileage";
    if (/next due/.test(t) && /hour/.test(t)) return "nextDueGenHours";
    if (/interval/.test(t) && /mile/.test(t)) return "intervalMiles";
    if (/interval/.test(t) && /hour/.test(t)) return "intervalGenHours";
    if (/interval/.test(t) && /day/.test(t)) return "intervalDays";
    if (/interval/.test(t) && /month/.test(t)) return "intervalMonths";
    if (/every/.test(t) && /mile/.test(t)) return "intervalMiles";
    if (/every/.test(t) && /hour/.test(t)) return "intervalGenHours";
    if (/every/.test(t) && /day/.test(t)) return "intervalDays";
    if (/every/.test(t) && /month/.test(t)) return "intervalMonths";
    if (/due/.test(t) && /mile/.test(t)) return "nextDueMileage";
    if (/due/.test(t) && (/gen/.test(t) || /hour/.test(t))) return "nextDueGenHours";
    if (/due/.test(t) && /date/.test(t)) return "nextDueDate";
    if (/next due/.test(t)) return "nextDueDate";
    if (/^due$/.test(t) || /due by/.test(t)) return "nextDueDate";
    if (/^mileage$/.test(t) || /odometer/.test(t)) return "nextDueMileage";
    if (/task/.test(t) || /^title$/.test(t) || /^name$/.test(t) || /^item$/.test(t)) return "title";
    if (/categor/.test(t) || /system/.test(t) || /component/.test(t)) return "category";
    if (/last complet/.test(t) || /last done/.test(t)) return "lastCompleted";
    if (/note/.test(t) || /guidance/.test(t)) return "note";
    if (/^pro$/.test(t) || /leave it to a pro/.test(t)) return "needsPro";
    if (/^shop$/.test(t) || /shop or tech/.test(t)) return "proShop";
    return null;
  }
  function parseImportDate(v) {
    var s = String(v == null ? "" : v).trim();
    if (!s) return null;
    if (/^(never|n\/a|unknown|usage-based|usage based)$/i.test(s)) return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return s;
    var d = new Date(s);
    if (isNaN(d.getTime())) return null;
    var y = d.getFullYear(), mo = d.getMonth() + 1, da = d.getDate();
    return y + "-" + (mo < 10 ? "0" : "") + mo + "-" + (da < 10 ? "0" : "") + da;
  }
  /* The plan export tacks "(Type Unknown)" onto some titles — twice,
     once capitalised and once not. It's a placeholder, not part of the job
     name, so it comes off. The category underneath already says what
     system the job belongs to. */
  function cleanTaskTitle(title) {
    var cleaned = (title || "").replace(/\s*\(type unknown\)/gi, "").trim();
    return cleaned || title;
  }

  function importTasksCSV(text, rigId) {
    var rows = parseCSV(text);
    if (rows.length < 2) return { imported: 0, skipped: 0, errors: ["The file needs a header row and at least one task."] };
    /* Find the header row: the first row with a task-title column plus at
       least one other recognised column. Title rows above it (rig name,
       export date) are skipped, not read as data. */
    var headerIdx = -1, colMap = null;
    for (var hi = 0; hi < rows.length; hi++) {
      var map = {}, found = 0;
      rows[hi].forEach(function (h, i) {
        var f = headerField(h);
        if (f && map[f] == null) { map[f] = i; found++; }
      });
      if (map.title != null && found >= 2) { headerIdx = hi; colMap = map; break; }
    }
    if (headerIdx < 0) return { imported: 0, skipped: 0, errors: ["Couldn't find a task column. The header needs one of: task, title, name."] };
    var imported = 0, skipped = 0, errors = [];
    rows.slice(headerIdx + 1).forEach(function (r) {
      var title = cleanTaskTitle((r[colMap.title] || "").trim());
      if (!title) { skipped++; return; }
      function val(key) { return colMap[key] == null ? "" : String(r[colMap[key]] || "").trim(); }
      function numVal(key) { var v = val(key).replace(/,/g, ""); var n = parseFloat(v); return isNaN(n) ? null : n; }
      var days = numVal("intervalDays");
      var cat = CATEGORIES.indexOf(val("category")) >= 0 ? val("category") : (val("category") || "Other");
      /* Already in the book? A second import of the same file must not
         double every job — skip the row and count it, so the book stays
         one copy per job. Same cleaned title + same category = same job. */
      var dupe = store.tasks.some(function (t) {
        return t.rigId === rigId && cleanTaskTitle(t.title).toLowerCase() === title.toLowerCase() && String(t.category || "").toLowerCase() === String(cat).toLowerCase();
      });
      if (dupe) { skipped++; return; }
      var task = newTask({
        rigId: rigId, title: title,
        category: cat,
        intervalMonths: numVal("intervalMonths") != null ? numVal("intervalMonths") : (days != null ? Math.max(1, Math.round(days / 30)) : null),
        intervalMiles: numVal("intervalMiles"),
        intervalGenHours: numVal("intervalGenHours"),
        nextDueDate: parseImportDate(val("nextDueDate")),
        nextDueMileage: numVal("nextDueMileage"),
        nextDueGenHours: numVal("nextDueGenHours"),
        note: val("note"),
        needsPro: /^(yes|y|true|1)$/i.test(val("needsPro")),
        proShop: val("proShop"),
        lastDoneAt: parseImportDate(val("lastCompleted"))
      });
      store.tasks.push(task); imported++;
    });
    return { imported: imported, skipped: skipped, errors: errors };
  }
  /* Merge jobs doubled by importing the same file twice: same rig, same
     cleaned title, same category = the same job, twice. Keep the copy
     with the most work behind it — logs first, then latest done, then
     latest due — and re-point the dropped copy's logs and parts at the
     copy that stays, so nothing written up is lost. Idempotent: once
     the twins are gone it finds nothing to do. Returns how many it removed. */
  function dedupeTasks() {
    var groups = {};
    store.tasks.forEach(function (t) {
      var k = t.rigId + "|" + cleanTaskTitle(t.title).toLowerCase() + "|" + String(t.category || "").toLowerCase();
      (groups[k] = groups[k] || []).push(t);
    });
    var removed = 0;
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      if (g.length < 2) return;
      function logCount(id) { return store.logs.filter(function (l) { return l.taskId === id; }).length; }
      function cmp(a, b) {
        var d = logCount(b.id) - logCount(a.id); if (d) return d;
        var la = a.lastDoneAt || "", lb = b.lastDoneAt || ""; if (la !== lb) return lb < la ? -1 : 1;
        var na = a.nextDueDate || "", nb = b.nextDueDate || ""; if (na !== nb) return nb < na ? -1 : 1;
        return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1;
      }
      g.sort(cmp);
      var keep = g[0];
      g.slice(1).forEach(function (drop) {
        store.logs.forEach(function (l) { if (l.taskId === drop.id) l.taskId = keep.id; });
        (store.parts || []).forEach(function (p) { if (p.taskId === drop.id) p.taskId = keep.id; });
        store.tasks = store.tasks.filter(function (t) { return t.id !== drop.id; });
        removed++;
      });
    });
    return removed;
  }
  function exportTasksCSV(rigId) {
    var head = ["Task", "Category", "Due Date", "Due Mileage", "Due Gen Hours", "Every Months", "Every Miles", "Every Gen Hours", "Note", "Pro", "Shop"];
    var lines = [head.map(csvCell).join(",")];
    store.tasks.filter(function (t) { return t.rigId === rigId; }).forEach(function (t) {
      lines.push([t.title, t.category, t.nextDueDate || "", t.nextDueMileage != null ? t.nextDueMileage : "",
        t.nextDueGenHours != null ? t.nextDueGenHours : "", t.intervalMonths != null ? t.intervalMonths : "",
        t.intervalMiles != null ? t.intervalMiles : "", t.intervalGenHours != null ? t.intervalGenHours : "", t.note || "",
        t.needsPro ? "Yes" : "", t.proShop || ""].map(csvCell).join(","));
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
  function exportPartsCSV(rigId) {
    var head = ["Part", "Part Number", "Quantity", "For Job", "Bought", "Price Paid"];
    var lines = [head.map(csvCell).join(",")];
    partsForRig(rigId).forEach(function (p) {
      lines.push([p.name, p.partNo || "", p.qty, partTaskTitle(p), p.bought ? "Yes" : "No", p.bought ? (Number(p.boughtCost) || 0).toFixed(2) : ""].map(csvCell).join(","));
    });
    return lines.join("\n");
  }
  function downloadFile(name, text, type) {
    var blob = new Blob([text], { type: type || "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    /* target _blank matters on iPhone: Safari ignores the download
       attribute for a blob and opens the file IN the tab instead, which
       pushes the app away. A new tab keeps the book where it was. On a
       computer the download attribute still saves the file as before. */
    a.href = URL.createObjectURL(blob); a.download = name; a.target = "_blank"; a.rel = "noopener";
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
  /* Custom checklist items: plain text the owner adds to a list. They live
     with the rig, not with one run, so they are there next trip too. The
     built-in items are never editable — only your own can come back off. */
  function customItemsFor(rigId, templateId) {
    return (store.customItems || []).filter(function (c) { return c.rigId === rigId && c.templateId === templateId; });
  }
  /* Custom groups: named sections the owner adds inside a checklist, with
     their own items. As many as you want, per rig, free tier. */
  function customGroupsFor(rigId, templateId) {
    return (store.customGroups || []).filter(function (g) { return g.rigId === rigId && g.templateId === templateId; });
  }
  /* The heading over your own items is yours too — rename it per list and
     rig, and it prints under the new name. No heading saved yet means the
     plain "Your own items". */
  function customHeadingFor(rigId, templateId) {
    var h = (store.customHeadings || []).find(function (x) { return x.rigId === rigId && x.templateId === templateId; });
    return h ? h.label : "Your own items";
  }
  function setCustomHeading(rigId, templateId, label) {
    var h = (store.customHeadings || []).find(function (x) { return x.rigId === rigId && x.templateId === templateId; });
    if (h) h.label = label;
    else (store.customHeadings = store.customHeadings || []).push({ rigId: rigId, templateId: templateId, label: label });
  }
  /* Custom checklists ("custom groups" in Rick's words): whole lists of his
     own, made from the picker page — not nested inside a built-in list.
     They start empty; he fills them in from the run screen. */
  function customListsFor(rigId) {
    return (store.customLists || []).filter(function (l) { return l.rigId === rigId; });
  }
  function findChecklist(id, rigId) {
    var tpl = CHECKLISTS.find(function (t) { return t.id === id; });
    if (tpl) return tpl;
    var list = (store.customLists || []).find(function (l) { return l.id === id; });
    if (!list) return null;
    /* The card's second line is the list's own heading — renamed, it
       follows the rename; untouched, it reads "Your own list". */
    return { id: list.id, name: list.name, sub: rigId ? customHeadingFor(rigId, list.id) : "Your own list", groups: [], custom: true };
  }
  function checklistTotal(tpl, rigId) {
    var n = tpl.groups.reduce(function (acc, g) { return acc + g.items.length; }, 0);
    if (!rigId) return n;
    n += customItemsFor(rigId, tpl.id).length;
    customGroupsFor(rigId, tpl.id).forEach(function (g) { n += g.items.length; });
    return n;
  }
  function activeRun(templateId) {
    var runs = store.runs.filter(function (r) { return r.templateId === templateId && !r.finishedAt; });
    return runs.length ? runs[runs.length - 1] : null;
  }
  function startRun(templateId, rigId) {
    var run = { id: uid(), templateId: templateId, rigId: rigId, startedAt: todayISO(), finishedAt: null, checks: {}, proof: null, proofAt: null };
    store.runs.push(run); save(); return run;
  }
  function runCheckedCount(run, tpl, rigId) {
    var n = 0;
    tpl.groups.forEach(function (g) { g.items.forEach(function (it) { if (run.checks[it.id]) n++; }); });
    if (rigId) {
      customItemsFor(rigId, tpl.id).forEach(function (c) { if (run.checks[c.id]) n++; });
      customGroupsFor(rigId, tpl.id).forEach(function (g) { g.items.forEach(function (it) { if (run.checks[it.id]) n++; }); });
    }
    return n;
  }

  /* ---------------- starter tasks (generic, written for this book) ------- */
  /* Each job can carry a `needs` — the rig answer it fits. A job with
     needs shows when the answer matches, or when the answer is missing
     or "unsure" and the job is the usual one for that question
     (`isDefault`). A job without isDefault only shows on an exact match,
     so a rig that has never answered never sees both sides of a pair
     (tank flush and tankless descale, built-in and portable generator). */
  var STARTER_TASKS = [
    { title: "Engine oil & filter", category: "Engine & Chassis", intervalMonths: 12, motorized: true, note: "Once a year, or per your chassis manual." },
    { title: "Generator oil & filter", category: "Generator", intervalMonths: 12, intervalGenHours: 150, motorized: true, needs: { generator: "builtin" }, isDefault: true, note: "Oil and filter together; check the air filter too." },
    { title: "Liquid Springs — check fluid & fittings", category: "Engine & Chassis", intervalMonths: 6, intervalMiles: 25000, needs: { suspension: "liquidspring" }, needsPro: true, note: "Every 25,000 miles or 6 months, whichever comes first. Check the reservoir fluid level, look over every hose and fitting for leaks, and check the bolts for looseness. Never feel for a leak with your hands — the system runs up to 3,500 psi. Depressurize before touching any fitting. Before each trip: green ride-height light steady, red warning light off." },
    { title: "Diesel fuel filter — change", category: "Engine & Chassis", intervalMonths: 12, motorized: true, needs: { fuel: "diesel" }, note: "Change the filter once a year; drain the water separator when the light says so." },
    { title: "Spark plugs — change", category: "Engine & Chassis", intervalMiles: 60000, motorized: true, needs: { fuel: "gas" }, note: "Per your chassis manual — most gas coaches are 60,000 to 100,000 miles." },
    { title: "Roof seals — inspect & touch up", category: "House Systems", intervalMonths: 6, note: "Walk the roof, look at every seam and vent, touch up what is cracked." },
    { title: "House batteries — water & terminals", category: "Electrical", intervalMonths: 3, note: "Top up with distilled water; clean the terminals." },
    { title: "Tire pressures — check all", category: "Tires", intervalMonths: 1, note: "Cold, to the placard pressures for your rig." },
    { title: "Water heater — flush", category: "Water & Plumbing", intervalMonths: 12, needs: { waterHeater: "tank" }, isDefault: true, note: "Drain and flush the tank once a year." },
    { title: "Tankless water heater — descale", category: "Water & Plumbing", intervalMonths: 12, needs: { waterHeater: "tankless" }, note: "Run vinegar through it once a year so it heats like new." },
    { title: "Fridge burner & flue — clean", category: "Appliances", intervalMonths: 12, needs: { fridge: "absorption" }, isDefault: true, note: "Brush out the flue and clean the burner so the flame stays blue." },
    { title: "Smoke & CO detectors — test", category: "Safety", intervalMonths: 6, note: "Press the test button; swap batteries when they chirp." },
    { title: "Slide seals — clean & treat", category: "House Systems", intervalMonths: 6, needs: { slides: "yes" }, isDefault: true, note: "Wipe the seals and treat them so they stay soft." },
    { title: "Portable generator — service", category: "Generator", intervalMonths: 12, needs: { generator: "portable" }, note: "Oil, spark plug and air filter once a year." }
  ];

  /* ---------------- rig questions (fit the jobs to the rig) --------------- */
  /* Five quick questions, asked in plain words, so the usual-jobs list
     only shows work this rig actually has. No data to import? This is
     the quick way to build the book instead. "Not sure" is always a
     fine answer — it never hides a job. */
  var EQUIPMENT_QUESTIONS = [
    { key: "roof", label: "What kind of roof?", options: [["rubber", "Rubber"], ["fiberglass", "Fiberglass"], ["aluminum", "Aluminum"]] },
    { key: "waterHeater", label: "Water heater?", options: [["tank", "Tank"], ["tankless", "Tankless"]] },
    { key: "fridge", label: "Fridge?", options: [["absorption", "Propane"], ["residential", "Residential"]] },
    { key: "generator", label: "Generator?", options: [["builtin", "Built-in"], ["portable", "Portable"], ["none", "None"]] },
    { key: "slides", label: "Slides?", options: [["yes", "Yes"], ["no", "No"]] },
    { key: "suspension", label: "Suspension?", options: [["liquidspring", "Liquid Springs"], ["standard", "Standard"]] },
    { key: "fuel", label: "Gas or diesel?", options: [["gas", "Gas"], ["diesel", "Diesel"]], motorized: true }
  ];
  var ROOF_NOTES = {
    rubber: "Walk the roof, look at every seam and vent, touch up cracked sealant with self-leveling sealant.",
    fiberglass: "Walk the roof, check the seams and vents for cracks, touch up what is cracked.",
    aluminum: "Check the seams and rivets for leaks, touch up what is cracked."
  };
  function openEquipmentSheet() {
    var rig = activeRig(); if (!rig) return;
    var draft = JSON.parse(JSON.stringify(rig.equipment || {}));
    function draw() {
      // Gas or diesel only makes sense on a motorhome — a trailer has no engine.
      var qs = EQUIPMENT_QUESTIONS.filter(function (q) { return !q.motorized || /class [abc]/i.test(rig.type || ""); });
      openSheet(
        sheetHead("What does your rig have?", qs.length + " quick questions — the usual jobs will only show the ones that fit your rig. Not sure is always a fine answer.") +
        qs.map(function (q) {
          var opts = q.options.concat([["unsure", "Not sure"]]);
          return '<div class="field"><label>' + esc(q.label) + '</label><div class="btnrow">' +
            opts.map(function (o) {
              var sel = draft[q.key] === o[0];
              return '<button class="btn small ' + (sel ? "" : "ghost") + '" type="button" data-eq="' + q.key + '" data-val="' + o[0] + '">' + esc(o[1]) + '</button>';
            }).join("") + '</div></div>';
        }).join("") +
        '<div class="btnrow"><button class="btn block" id="eq-save" type="button">Fit the jobs to my rig</button></div>' +
        '<div class="btnrow"><button class="btn ghost block" id="eq-skip" type="button">Skip — show me every job</button></div>'
      );
      wireClose(sheetHost);
      $all("[data-eq]").forEach(function (b) {
        b.addEventListener("click", function () { draft[b.getAttribute("data-eq")] = b.getAttribute("data-val"); draw(); });
      });
      $("#eq-save").addEventListener("click", function () {
        rig.equipment = draft; save(); closeSheet(); openStarterTasksSheet(); toast("The usual jobs now fit your rig.");
      });
      $("#eq-skip").addEventListener("click", function () { closeSheet(); openStarterTasksSheet(); });
    }
    draw();
  }

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
    if (name === "parts") renderParts();
    if (name === "pros") renderPros();
    if (name === "fuel") renderFuel();
    if (name === "trips") renderTrips();
    if (name === "more") renderMore();
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* ---------------- Home --------------------------------------------------- */
  function renderHome() {
    var rig = activeRig();
    $("#home-year").textContent = new Date().getFullYear();
    if (!rig) { showScreen("setup"); return; }
    $("#home-rig-line").textContent = rigName(rig) + " · " + num(rig.mileage) + " mi · " + num(rig.genHours) + " gen hrs";
    $("#home-rig-art").innerHTML = rigArt(rig);
    $("#home-rig-photo-btn").textContent = rig.photo ? "📷 Change photo" : "📷 Add a photo of your rig";
    var open = dueTasks(rig).filter(function (d) { return d.status.level !== "done"; });
    var next = nextUpTasks(rig, 3);
    var list = $("#home-nextup");
    if (!next.length) {
      list.innerHTML = '<p class="muted">Nothing on the books — the rig is caught up.</p>';
    } else {
      list.innerHTML = next.map(function (d) {
        var dot = d.status.level === "overdue" ? "red" : d.status.level === "soon" ? "amber" : "green";
        return '<div class="row" data-task="' + d.task.id + '" style="cursor:pointer"><span class="dot ' + dot + '"></span><div class="grow"><div class="title">' + esc(d.task.title) + '</div>' +
          '<div class="sub">' + esc(d.task.category) + '</div></div>' +
          '<span class="pill ' + dot + '">' + esc(d.status.text) + '</span></div>';
      }).join("");
      $all("[data-task]", list).forEach(function (el) {
        el.addEventListener("click", function () { openTaskSheet(el.getAttribute("data-task")); });
      });
    }
    var more = $("#home-nextup-more");
    var rest = open.length - next.length;
    more.textContent = rest > 0 ? rest + " more on the books — in the Logbook." : "";
    more.onclick = rest > 0 ? function () { showScreen("logbook"); } : null;
    var toGet = partsForRig(rig.id).filter(function (p) { return !p.bought; });
    var ph = $("#home-parts");
    if (!toGet.length) {
      ph.innerHTML = '<p class="muted">Nothing on the list — add a part from a job, or just supplies.</p>';
    } else {
      ph.innerHTML = toGet.slice(0, 3).map(function (p) {
        var sub = [p.partNo, partTaskTitle(p)].filter(Boolean).join(" · ");
        return '<div class="row" data-part="' + p.id + '" style="cursor:pointer"><span class="dot green"></span><div class="grow"><div class="title">' + esc(p.name) + (p.qty > 1 ? ' ×' + p.qty : '') + '</div>' +
          '<div class="sub">' + esc(sub || "Supplies") + '</div></div></div>';
      }).join("");
      $all("[data-part]", ph).forEach(function (el) {
        el.addEventListener("click", function () { openPartSheet(el.getAttribute("data-part")); });
      });
    }
    var pm = $("#home-parts-more");
    pm.textContent = toGet.length > 3 ? (toGet.length - 3) + " more on the list — see the whole list." : (toGet.length ? "See the whole list." : "Open the list to add a part.");
    pm.onclick = function () { showScreen("parts"); };
    var fs = fuelStats(rig.id);
    var fh = $("#home-fuel");
    fh.innerHTML = fs.count ?
      '<div class="row"><div class="grow"><div class="title">' + (fs.mpg ? fs.mpg.toFixed(1) + ' MPG' : 'MPG coming') + '</div><div class="sub">' + fs.count + ' fill-up' + (fs.count === 1 ? '' : 's') + ' · ' + money(fs.spent) + ' on fuel</div></div></div>' :
      '<p class="muted">No fill-ups yet — log one and the MPG starts here.</p>';
    var fm = $("#home-fuel-more");
    fm.textContent = "Open the fuel log.";
    fm.onclick = function () { showScreen("fuel"); };
    var tr = tripsForRig(rig.id);
    var th = $("#home-trips");
    if (!tr.length) {
      th.innerHTML = '<p class="muted">No trips yet — plan the next one and the book keeps the miles and the money.</p>';
    } else {
      var latest = tr[0];
      var tc = tripCosts(latest);
      th.innerHTML = '<div class="row"><div class="grow"><div class="title">' + esc(latest.name || latest.destination || "Trip") + '</div>' +
        '<div class="sub">' + esc(fmtDate(latest.startDate)) + (latest.endDate ? ' – ' + esc(fmtDate(latest.endDate)) : '') + ' · ' + money(tc.total) + ' all in</div></div></div>';
    }
    var tm = $("#home-trips-more");
    tm.textContent = tr.length > 1 ? (tr.length - 1) + " more trip" + (tr.length === 2 ? "" : "s") + " — see them all." : "Open the trips.";
    tm.onclick = function () { showScreen("trips"); };
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
    renderHomeSearch();
  }

  /* ---------------- Home search ------------------------------------------- */
  /* Find a task by name or system, right from the Home screen — tap a
     result and its sheet opens, same as tapping it in the logbook. */
  var homeSearchQuery = "";
  function renderHomeSearch() {
    var host = $("#home-search-results");
    if (!host) return;
    if (!homeSearchQuery) { host.innerHTML = ""; return; }
    var rig = activeRig(); if (!rig) { host.innerHTML = ""; return; }
    var hits = dueTasks(rig).filter(function (d) {
      return d.status.level !== "done" &&
        (d.task.title + " " + d.task.category + " " + (d.task.note || "")).toLowerCase().indexOf(homeSearchQuery) !== -1;
    });
    if (!hits.length) {
      host.innerHTML = '<div class="card"><p class="muted">Nothing on the books matches "' + esc(homeSearchQuery) + '".</p></div>';
      return;
    }
    host.innerHTML = '<div class="card"><div class="page-head">Found in the book</div>' + hits.map(function (d) {
      var dot = d.status.level === "overdue" ? "red" : d.status.level === "soon" ? "amber" : "green";
      return '<div class="row" data-task="' + d.task.id + '" style="cursor:pointer"><span class="dot ' + dot + '"></span>' +
        '<div class="grow"><div class="title">' + esc(d.task.title) + '</div><div class="sub">' + esc(d.task.category) + '</div></div>' +
        '<span class="pill ' + dot + '">' + esc(d.status.text) + '</span></div>';
    }).join("") + "</div>";
    $all("[data-task]", host).forEach(function (el) {
      el.addEventListener("click", function () { openTaskSheet(el.getAttribute("data-task")); });
    });
  }

  /* ---------------- Logbook ------------------------------------------------ */
  /* How the "On the books" list is ordered — remembered per device. */
  var LOG_SORTS = ["due", "system", "name"];
  var logSort = "due";
  try {
    var savedSort = localStorage.getItem("rollonrv-logsort");
    if (LOG_SORTS.indexOf(savedSort) !== -1) logSort = savedSort;
  } catch (e) {}
  function sortOpenTasks(items, sortKey) {
    var list = items.slice();
    function byDate(a, b) {
      var da = a.task.nextDueDate || "9999", db = b.task.nextDueDate || "9999";
      if (da !== db) return da < db ? -1 : 1;
      var ma = a.task.nextDueMileage != null ? a.task.nextDueMileage : 999999999;
      var mb = b.task.nextDueMileage != null ? b.task.nextDueMileage : 999999999;
      return ma - mb;
    }
    function byTitle(a, b) {
      var ta = (a.task.title || "").toLowerCase(), tb = (b.task.title || "").toLowerCase();
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    }
    if (sortKey === "system") {
      list.sort(function (a, b) {
        var ca = (a.task.category || "").toLowerCase(), cb = (b.task.category || "").toLowerCase();
        if (ca !== cb) return ca < cb ? -1 : 1;
        return byTitle(a, b);
      });
    } else if (sortKey === "name") {
      list.sort(byTitle);
    } else {
      // Due soonest: overdue first by date, then the soonest due of the rest.
      var rank = { overdue: 0, soon: 1, ok: 2 };
      list.sort(function (a, b) {
        var r = (rank[a.status.level] != null ? rank[a.status.level] : 3) - (rank[b.status.level] != null ? rank[b.status.level] : 3);
        return r || byDate(a, b);
      });
    }
    return list;
  }
  function renderLogbook() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var host = $("#logbook-pages");
    var tasks = dueTasks(rig);
    var logs = store.logs.filter(function (l) { return l.rigId === rig.id; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var html = "";
    // Tasks still on the books, grouped by status
    var open = tasks.filter(function (d) { return d.status.level !== "done"; });
    if (open.length) {
      open = sortOpenTasks(open, logSort);
      var sortBtn = function (key, label) {
        return '<button class="btn small' + (logSort === key ? '' : ' ghost') + '" data-sort="' + key + '">' + label + '</button>';
      };
      var taskRow = function (d) {
        var dot = d.status.level === "overdue" ? "red" : d.status.level === "soon" ? "amber" : "green";
        return '<div class="row" data-task="' + d.task.id + '" style="cursor:pointer"><span class="dot ' + dot + '"></span>' +
          '<div class="grow"><div class="title">' + esc(d.task.title) + '</div><div class="sub">' + esc(d.task.category) + (d.task.needsPro ? ' · 🔧 Pro' : '') + (d.task.note ? ' · ' + esc(d.task.note) : '') + '</div></div>' +
          '<span class="pill ' + dot + '">' + esc(d.status.text) + '</span></div>';
      };
      var rowsHtml = "";
      if (logSort === "system") {
        // One named heading per system, so each group reads as a group.
        var currentGroup = null;
        open.forEach(function (d) {
          var g = d.task.category || "Other";
          if (g !== currentGroup) {
            currentGroup = g;
            var count = open.filter(function (x) { return (x.task.category || "Other") === currentGroup; }).length;
            rowsHtml += '<div class="group-head">' + esc(currentGroup) + ' · ' + count + '</div>';
          }
          rowsHtml += taskRow(d);
        });
      } else {
        rowsHtml = open.map(taskRow).join("");
      }
      html += '<div class="page"><div class="page-head">On the books</div>' +
        '<div class="sortrow"><span class="muted small">Sort:</span>' + sortBtn("due", "Due soonest") + sortBtn("system", "System") + sortBtn("name", "Name") + '</div>' +
        rowsHtml + "</div>";
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
    $all("[data-sort]", host).forEach(function (el) {
      el.addEventListener("click", function () {
        logSort = el.getAttribute("data-sort");
        try { localStorage.setItem("rollonrv-logsort", logSort); } catch (e) {}
        renderLogbook();
      });
    });
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
    var armedList = null; /* first tap on a list's × only arms it — second tap deletes */
    var lists = CHECKLISTS.concat(customListsFor(rig.id).map(function (l) { return findChecklist(l.id, rig.id); }));
    picker.innerHTML = '<div class="btnrow" style="padding:0 .2rem"><button class="btn ghost block" id="add-custom-list-btn" type="button">＋ Add a custom group</button></div>' +
      lists.map(function (tpl) {
        var run = activeRun(tpl.id);
        var done = run ? runCheckedCount(run, tpl, rig.id) : 0, total = checklistTotal(tpl, rig.id);
        var pct = total ? Math.round(done / total * 100) : 0;
        /* The run you finished most recently — later starts win a same-day tie. */
        var lastFinished = null;
        store.runs.forEach(function (r) {
          if (r.templateId === tpl.id && r.finishedAt && (!lastFinished || r.finishedAt >= lastFinished.finishedAt)) lastFinished = r;
        });
        return '<div class="card"><div class="card-head"><h2>' + esc(tpl.name) + '</h2>' +
          (tpl.custom ? '<button class="custom-del' + (armedList === tpl.id ? ' armed' : '') + '" data-del-list="' + tpl.id + '" aria-label="Remove this list">' + (armedList === tpl.id ? 'Delete?' : '×') + '</button>' : '') + '</div>' +
          '<p class="muted">' + esc(tpl.sub) + ' · ' + total + ' items</p>' +
          (run ? '<div class="progress"><div style="width:' + pct + '%"></div></div><p class="small" style="margin:.4rem 0 0">' + done + ' of ' + total + ' checked — started ' + esc(fmtDate(run.startedAt)) + '</p>' : '') +
          (lastFinished ? '<div class="small" style="margin:.4rem 0 0;cursor:pointer" data-open-finished="' + tpl.id + '|' + lastFinished.id + '">✓ Finished ' + esc(fmtDate(lastFinished.finishedAt)) + (lastFinished.proof ? ' · 📷 proof taken ' + esc(fmtDate(lastFinished.proofAt || lastFinished.finishedAt)) : ' · no photo yet') + '</div>' +
            (lastFinished.proof ? '<div class="thumbs"><img src="' + esc(lastFinished.proof) + '" alt="Photo proof" /></div>' : '') : '') +
          '<div class="btnrow"><button class="btn" data-start="' + tpl.id + '">' + (run ? 'Keep going' : 'Start') + '</button>' +
          (run ? '<button class="btn ghost" data-restart="' + tpl.id + '">Start over</button>' : '') + '</div></div>';
      }).join("");
    $("#add-custom-list-btn", picker).addEventListener("click", openCustomListSheet);
    $all("[data-del-list]", picker).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-del-list");
        if (armedList !== id) { armedList = id; b.textContent = "Delete?"; b.classList.add("armed"); return; }
        store.customLists = (store.customLists || []).filter(function (l) { return l.id !== id; });
        store.customItems = (store.customItems || []).filter(function (c) { return c.templateId !== id; });
        store.customGroups = (store.customGroups || []).filter(function (g) { return g.templateId !== id; });
        store.customHeadings = (store.customHeadings || []).filter(function (h) { return h.templateId !== id; });
        store.runs = store.runs.filter(function (r) { return r.templateId !== id; });
        armedList = null; save(); renderChecklists(); toast("List removed.");
      });
    });
    $all("[data-start]", picker).forEach(function (b) {
      b.addEventListener("click", function () { openChecklistRun(b.getAttribute("data-start")); });
    });
    $all("[data-open-finished]", picker).forEach(function (el) {
      el.addEventListener("click", function () {
        var parts = el.getAttribute("data-open-finished").split("|");
        openChecklistRun(parts[0], parts[1]);
      });
    });
    $all("[data-restart]", picker).forEach(function (b) {
      b.addEventListener("click", function () {
        var run = activeRun(b.getAttribute("data-restart"));
        if (run) { run.checks = {}; run.proof = null; run.proofAt = null; save(); }
        openChecklistRun(b.getAttribute("data-restart"));
      });
    });
    runHost.hidden = true; runHost.innerHTML = "";
    picker.hidden = false;
  }
  /* Sheet for naming a new custom group — a whole checklist of his own. */
  function openCustomListSheet() {
    var rig = activeRig();
    openSheet(
      sheetHead("Add a custom group", "A checklist of your own — name it, then tap Start to fill it in.") +
      '<div class="field"><label for="cl-name">Group name</label><input id="cl-name" type="text" placeholder="e.g. Grandkids\u2019 gear" maxlength="60" autocomplete="off" /></div>' +
      '<div class="btnrow"><button class="btn block" id="cl-create" type="button">Create group</button></div>'
    );
    wireClose(sheetHost);
    var input = $("#cl-name");
    function createList() {
      var name = input.value.trim();
      if (!name) { toast("Give the group a name first."); return; }
      store.customLists.push({ id: uid(), rigId: rig.id, name: name });
      save(); closeSheet(); renderChecklists(); toast("Group added — tap Start to fill it in.");
    }
    $("#cl-create").addEventListener("click", createList);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); createList(); } });
    input.focus();
  }
  function openChecklistRun(templateId, runId) {
    var rig = activeRig(); var tpl = findChecklist(templateId, rig.id);
    if (!tpl) return;
    /* Reopening a finished run (from the picker's finished line) so a
       photo can be added later; otherwise the run in progress, or a new one. */
    var run = runId ? (store.runs.find(function (r) { return r.id === runId; }) || null) : null;
    if (!run) run = activeRun(templateId) || startRun(templateId, rig.id);
    var picker = $("#checklist-picker"), host = $("#checklist-run");
    var armedDel = null; /* first tap on × only arms it — second tap deletes */
    var armedGroup = null; /* same deal for a whole custom group */
    picker.hidden = true; host.hidden = false;
    /* Takes a custom item back off, whether it lives in a named group or
       in the flat "Your own items" list. */
    function removeCustomItem(id) {
      var found = false;
      (store.customGroups || []).forEach(function (g) {
        var i = g.items.findIndex(function (it) { return it.id === id; });
        if (i !== -1) { g.items.splice(i, 1); found = true; }
      });
      if (!found) store.customItems = store.customItems.filter(function (c) { return c.id !== id; });
      delete run.checks[id];
    }
    /* Your own words can change — tap them and fix the wording. The
       check stays as it is; built-in lines never change. */
    function openCustomItemSheet(id) {
      var item = null, where = null;
      (store.customItems || []).forEach(function (c) { if (c.id === id) { item = c; where = "flat"; } });
      if (!item) (store.customGroups || []).forEach(function (g) {
        g.items.forEach(function (it) { if (it.id === id) { item = it; where = g.name; } });
      });
      if (!item) return;
      openSheet(
        sheetHead("One item", where === "flat" ? "Your own item — change the words." : "Your own item, in " + where + " — change the words.") +
        '<div class="field"><label for="ci-label">The words</label><input id="ci-label" value="' + esc(item.label) + '" maxlength="120" /></div>' +
        '<div class="btnrow"><button class="btn block" id="ci-save" type="button">Save the words</button></div>' +
        '<div class="btnrow"><button class="btn ghost block" id="ci-delete" type="button">Take it off the list</button></div>'
      );
      wireClose(sheetHost);
      $("#ci-save").addEventListener("click", function () {
        var label = $("#ci-label").value.trim();
        if (!label) { toast("Give the item some words first."); return; }
        item.label = label;
        save(); closeSheet(); draw(); toast("Words changed.");
      });
      $("#ci-delete").addEventListener("click", function () {
        if (!confirm("Take this item off the list?")) return;
        removeCustomItem(id); save(); closeSheet(); draw();
      });
    }
    /* The heading over your own items is yours too — tap it and give
       that group a name of your own. It prints under the new name. */
    function openCustomHeadingSheet() {
      var current = customHeadingFor(rig.id, tpl.id);
      openSheet(
        sheetHead("That heading", "Give this group of your own items a name.") +
        '<div class="field"><label for="ch-label">The heading</label><input id="ch-label" value="' + esc(current) + '" maxlength="60" /></div>' +
        '<div class="btnrow"><button class="btn block" id="ch-save" type="button">Save the heading</button></div>' +
        '<div class="btnrow"><button class="btn ghost block" id="ch-reset" type="button">Back to "Your own items"</button></div>'
      );
      wireClose(sheetHost);
      $("#ch-save").addEventListener("click", function () {
        var label = $("#ch-label").value.trim();
        if (!label) { toast("Give the heading some words first."); return; }
        setCustomHeading(rig.id, tpl.id, label);
        save(); closeSheet(); draw(); toast("Heading changed.");
      });
      $("#ch-reset").addEventListener("click", function () {
        store.customHeadings = (store.customHeadings || []).filter(function (x) { return !(x.rigId === rig.id && x.templateId === tpl.id); });
        save(); closeSheet(); draw(); toast("Heading back to \"Your own items\".");
      });
    }
    function draw() {
      var customs = customItemsFor(rig.id, tpl.id);
      var groups = customGroupsFor(rig.id, tpl.id);
      var done = runCheckedCount(run, tpl, rig.id), total = checklistTotal(tpl, rig.id);
      var pct = total ? Math.round(done / total * 100) : 0;
      var html = '<div class="card"><h2>' + esc(tpl.name) + '</h2>' +
        '<p class="muted">' + done + ' of ' + total + ' checked</p>' +
        '<div class="progress"><div style="width:' + pct + '%"></div></div>';
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
      if (customs.length) {
        html += '<button class="check-group heading-edit" type="button" data-edit-heading>' + esc(customHeadingFor(rig.id, tpl.id)) + ' <span class="edit-hint">✎</span></button>';
        customs.forEach(function (c) {
          html += '<div class="custom-row"><button class="check-item' + (run.checks[c.id] ? ' done' : '') + '" data-item="' + c.id + '">' +
            '<span class="box">' + (run.checks[c.id] ? "✓" : "") + '</span>' +
            '<span><span class="label" data-edit-custom="' + c.id + '">' + esc(c.label) + ' <span class="edit-hint">✎</span></span></span></button>' +
            '<button class="custom-del' + (armedDel === c.id ? ' armed' : '') + '" data-del-custom="' + c.id + '" aria-label="Take this item off the list">' + (armedDel === c.id ? 'Delete?' : '×') + '</button></div>';
        });
      }
      html += '<div class="add-custom"><input id="custom-item-input" type="text" placeholder="Add your own item" maxlength="120" autocomplete="off" />' +
        '<button class="btn" id="custom-item-add" type="button">Add item</button></div>';
      groups.forEach(function (g) {
        html += '<div class="custom-group-head"><span class="check-group">' + esc(g.name) + '</span>' +
          '<button class="custom-del' + (armedGroup === g.id ? ' armed' : '') + '" data-del-group="' + g.id + '" aria-label="Remove this group">' + (armedGroup === g.id ? 'Delete?' : '×') + '</button></div>';
        g.items.forEach(function (it) {
          html += '<div class="custom-row"><button class="check-item' + (run.checks[it.id] ? ' done' : '') + '" data-item="' + it.id + '">' +
            '<span class="box">' + (run.checks[it.id] ? "✓" : "") + '</span>' +
            '<span><span class="label" data-edit-custom="' + it.id + '">' + esc(it.label) + ' <span class="edit-hint">✎</span></span></span></button>' +
            '<button class="custom-del' + (armedDel === it.id ? ' armed' : '') + '" data-del-custom="' + it.id + '" aria-label="Take this item off the list">' + (armedDel === it.id ? 'Delete?' : '×') + '</button></div>';
        });
        html += '<div class="add-custom"><input data-group-input="' + g.id + '" type="text" placeholder="Add an item to ' + esc(g.name) + '" maxlength="120" autocomplete="off" />' +
          '<button class="btn" data-group-add="' + g.id + '" type="button">Add item</button></div>';
      });
      html += '<div class="check-group">Photo proof</div>' +
        '<p class="small muted">Snap the finished sheet, or the work itself — it rides along with this run, for warranty claims and your own records.</p>';
      if (run.proof) {
        html += '<img src="' + esc(run.proof) + '" alt="Photo proof" style="width:100%;border-radius:12px;display:block;margin-top:.5rem" />' +
          '<p class="small muted">Taken ' + esc(fmtDate(run.proofAt || run.finishedAt)) + ' — the date the photo was taken, with the run.</p>' +
          '<div class="btnrow"><button class="btn ghost block" id="run-proof-replace">📷 Replace the photo</button>' +
          '<button class="btn ghost block" id="run-proof-remove">Remove the photo</button></div>';
      } else {
        html += '<div class="btnrow"><button class="btn ghost block" id="run-proof-add">📷 Add a photo — proof for this run</button></div>';
      }
      html += '<div class="btnrow"><button class="btn block" id="run-finish">' + (done === total ? 'Stamp it done' : 'Done for now') + '</button>' +
        '<button class="btn ghost block" id="run-print">🖨 Print this list</button>' +
        '<button class="btn ghost block" id="run-back">Back to checklists</button></div>';
      if (done === total) html += '<p style="text-align:center;margin-top:1rem"><span class="stamp big pop">Done</span></p>';
      html += '</div>';
      host.innerHTML = html;
      $all("[data-item]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-item");
          armedDel = null; armedGroup = null; run.checks[id] = !run.checks[id]; save(); draw();
        });
      });
      /* Tap the words themselves to change them — the tap never reaches
         the row, so the check stays as it is. */
      $all("[data-edit-custom]", host).forEach(function (el) {
        el.addEventListener("click", function (e) {
          e.stopPropagation();
          armedDel = null; armedGroup = null;
          openCustomItemSheet(el.getAttribute("data-edit-custom"));
        });
      });
      /* The heading over your own items is yours too. */
      $all("[data-edit-heading]", host).forEach(function (el) {
        el.addEventListener("click", function () {
          armedDel = null; armedGroup = null;
          openCustomHeadingSheet();
        });
      });
      $all("[data-del-custom]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-del-custom");
          if (armedDel !== id) { armedDel = id; armedGroup = null; draw(); return; }
          removeCustomItem(id); armedDel = null; save(); draw(); toast("Item taken off the list.");
        });
      });
      $all("[data-del-group]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-del-group");
          if (armedGroup !== id) { armedGroup = id; armedDel = null; draw(); return; }
          var g = (store.customGroups || []).find(function (x) { return x.id === id; });
          if (g) g.items.forEach(function (it) { delete run.checks[it.id]; });
          store.customGroups = store.customGroups.filter(function (x) { return x.id !== id; });
          armedGroup = null; save(); draw(); toast("Group removed.");
        });
      });
      $all("[data-group-add]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var gid = b.getAttribute("data-group-add");
          var inputEl = host.querySelector('[data-group-input="' + gid + '"]');
          var label = inputEl.value.trim();
          if (!label) return;
          var g = (store.customGroups || []).find(function (x) { return x.id === gid; });
          if (!g) return;
          armedDel = null; armedGroup = null;
          g.items.push({ id: uid(), label: label });
          save(); draw(); toast("Added to " + g.name + ".");
        });
      });
      $all("[data-group-input]", host).forEach(function (inp) {
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); host.querySelector('[data-group-add="' + inp.getAttribute("data-group-input") + '"]').click(); }
        });
      });
      var input = $("#custom-item-input", host);
      function addCustom() {
        var label = input.value.trim();
        if (!label) return;
        armedDel = null; armedGroup = null;
        store.customItems.push({ id: uid(), rigId: rig.id, templateId: tpl.id, label: label });
        save(); draw(); toast("Added to this checklist.");
      }
      $("#custom-item-add", host).addEventListener("click", addCustom);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addCustom(); } });
      $("#run-finish").addEventListener("click", function () {
        run.finishedAt = todayISO(); save(); renderChecklists(); toast("Checklist finished — nice and done.");
      });
      function addProof() {
        requestPhoto(function (dataUrl) {
          downscalePhoto(dataUrl).then(function (small) {
            if (!storeHasRoom(small.length)) { toast("The book is nearly full — export a copy before adding more photos."); return; }
            run.proof = small; run.proofAt = todayISO(); save(); draw();
          });
        });
      }
      var proofAdd = $("#run-proof-add", host), proofReplace = $("#run-proof-replace", host), proofRemove = $("#run-proof-remove", host);
      if (proofAdd) proofAdd.addEventListener("click", addProof);
      if (proofReplace) proofReplace.addEventListener("click", addProof);
      if (proofRemove) proofRemove.addEventListener("click", function () { run.proof = null; run.proofAt = null; save(); draw(); });
      $("#run-print").addEventListener("click", function () { printChecklistRun(tpl, run, rig); });
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
  /* ---------------- Parts to get (the shopping list — free) ----------------- */
  /* The list lives in the app; print it for the counter, or download it
     as a CSV. Tap the box when you've got it; tap the line to change it
     or add what you paid. */
  function renderParts() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var all = partsForRig(rig.id);
    var toGet = all.filter(function (p) { return !p.bought; });
    var got = all.filter(function (p) { return p.bought; });
    function rowHtml(p) {
      var sub = [p.partNo, partTaskTitle(p)].filter(Boolean).join(" · ");
      return '<div class="check-item' + (p.bought ? ' done' : '') + '">' +
        '<button class="box" data-toggle-part="' + p.id + '" type="button" aria-label="Got it">' + (p.bought ? "✓" : "") + '</button>' +
        '<span class="label" data-open-part="' + p.id + '" style="cursor:pointer"><b>' + esc(p.name) + '</b>' + (p.qty > 1 ? ' ×' + p.qty : '') +
        (sub ? '<br><span class="psi">' + esc(sub) + '</span>' : '') +
        (p.bought && p.boughtCost ? '<br><span class="psi">' + esc(money(p.boughtCost)) + ' · ' + esc(fmtDate(p.boughtAt)) + '</span>' : '') +
        '</span></div>';
    }
    $("#parts-list").innerHTML =
      (toGet.length ? '<div class="check-group">To get</div>' + toGet.map(rowHtml).join("") : '<p class="muted">Nothing on the list — add a part from a job, or just supplies.</p>') +
      (got.length ? '<div class="check-group">Already got</div>' + got.map(rowHtml).join("") : "") +
      '<p class="small muted">Tap a line to change it or add what you paid — it lands in what she\'s cost. Tap the box when you\'ve got it.</p>';
    $all("[data-toggle-part]", $("#parts-list")).forEach(function (b) {
      b.addEventListener("click", function () {
        var part = (store.parts || []).find(function (p) { return p.id === b.getAttribute("data-toggle-part"); });
        if (!part) return;
        togglePartBought(part); renderParts(); renderHome();
      });
    });
    $all("[data-open-part]", $("#parts-list")).forEach(function (el) {
      el.addEventListener("click", function () { openPartSheet(el.getAttribute("data-open-part")); });
    });
  }

  /* ---------------- My pros ------------------------------------------------- */
  function renderPros() {
    var pros = store.pros || [];
    $("#pros-list").innerHTML = pros.length ? pros.map(function (p) {
      var sub = [p.specialty, p.town].filter(Boolean).join(" · ");
      return '<div class="row" data-open-pro="' + p.id + '" style="cursor:pointer"><div class="grow"><div class="title">' + esc(p.name) + '</div>' +
        (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>' +
        (p.phone ? '<a class="btn small" href="tel:' + esc(p.phone.replace(/[^0-9+*#]/g, "")) + '">📞 ' + esc(p.phone) + '</a>' : '<span class="muted small">No number yet</span>') + '</div>';
    }).join("") + '<p class="small muted">Tap a line to change it. Tap the number to call.</p>'
      : '<p class="muted">No pros yet — add the first shop you trust, and it will be there when a job belongs to them.</p>';
    $all("[data-open-pro]").forEach(function (el) {
      el.addEventListener("click", function (e) { if (e.target.closest("a")) return; openProSheet(el.getAttribute("data-open-pro")); });
    });
  }
  function openProSheet(proId) {
    var pro = proId ? (store.pros || []).find(function (p) { return p.id === proId; }) : null;
    var draft = pro ? JSON.parse(JSON.stringify(pro)) : newPro({});
    openSheet(
      sheetHead(pro ? "One pro" : "Add a pro", "Name, what they do, and a number to call. It joins your list for every job.") +
      '<div class="field"><label for="pr-name">Name</label><input id="pr-name" value="' + esc(draft.name) + '" placeholder="e.g. Bob\'s RV Service" /></div>' +
      '<div class="field"><label for="pr-specialty">What they do (optional)</label><input id="pr-specialty" value="' + esc(draft.specialty) + '" placeholder="e.g. Suspension, roof, slideouts" /></div>' +
      '<div class="field"><label for="pr-phone">Phone (optional)</label><input id="pr-phone" inputmode="tel" value="' + esc(draft.phone) + '" placeholder="e.g. (850) 555-0134" /></div>' +
      '<div class="field"><label for="pr-town">Town (optional)</label><input id="pr-town" value="' + esc(draft.town) + '" placeholder="e.g. Panama City" /></div>' +
      '<div class="btnrow"><button class="btn block" id="pr-save" type="button">Save this pro</button></div>' +
      (pro ? '<div class="btnrow"><button class="btn ghost block" id="pr-delete" type="button">Delete this pro</button></div>' : '')
    );
    wireClose(sheetHost);
    $("#pr-save").addEventListener("click", function () {
      var name = $("#pr-name").value.trim();
      if (!name) { toast("Give the pro a name first."); return; }
      draft.name = name; draft.specialty = $("#pr-specialty").value.trim(); draft.phone = $("#pr-phone").value.trim(); draft.town = $("#pr-town").value.trim();
      if (!pro) { store.pros = store.pros || []; store.pros.push(draft); }
      else { var i = store.pros.findIndex(function (p) { return p.id === pro.id; }); if (i >= 0) store.pros[i] = draft; }
      save(); closeSheet(); renderPros(); toast("Saved to your pros.");
    });
    if (pro) $("#pr-delete").addEventListener("click", function () {
      if (!confirm("Delete " + pro.name + " from your pros? Jobs that named them keep the name, but the number goes with them.")) return;
      store.pros = store.pros.filter(function (p) { return p.id !== pro.id; });
      store.tasks.forEach(function (t) { if (t.proId === pro.id) t.proId = null; });
      save(); closeSheet(); renderPros();
    });
  }

  /* ---------------- Fuel ---------------------------------------------------- */
  /* A fill-up is a date, an odometer, gallons, and what you paid — the
     price a gallon and the MPG work themselves out. Fill the tank each
     time and the math stays honest: the MPG on a fill-up is the miles it
     covered over its own gallons. Fuel money stays its own line — it
     never lands in "What she's cost", which is maintenance money. */
  function newFuel(o) {
    return { id: uid(), rigId: o.rigId, date: o.date || todayISO(), odometer: Number(o.odometer) || 0, gallons: Number(o.gallons) || 0, total: Number(o.total) || 0 };
  }
  function fuelForRig(rigId) {
    return (store.fuel || []).filter(function (f) { return f.rigId === rigId; }).sort(function (a, b) { return a.odometer - b.odometer || (a.date < b.date ? -1 : 1); });
  }
  function fuelMpg(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var mpg = null;
      if (i > 0 && list[i].gallons > 0 && list[i].odometer > list[i - 1].odometer) mpg = (list[i].odometer - list[i - 1].odometer) / list[i].gallons;
      out.push({ fill: list[i], mpg: mpg });
    }
    return out;
  }
  function fuelStats(rigId) {
    var list = fuelForRig(rigId);
    var miles = 0, intGallons = 0, allGallons = 0, spent = 0;
    list.forEach(function (f) { allGallons += Number(f.gallons) || 0; spent += Number(f.total) || 0; });
    for (var i = 1; i < list.length; i++) {
      if (list[i].odometer > list[i - 1].odometer) { miles += list[i].odometer - list[i - 1].odometer; intGallons += Number(list[i].gallons) || 0; }
    }
    return { count: list.length, miles: miles, gallons: allGallons, spent: spent, mpg: intGallons > 0 ? miles / intGallons : null, avgGal: allGallons > 0 ? spent / allGallons : null };
  }
  function exportFuelCSV(rigId) {
    var head = ["Date", "Odometer", "Gallons", "Total Paid", "Price Per Gallon"];
    var lines = [head.map(csvCell).join(",")];
    fuelForRig(rigId).forEach(function (f) {
      lines.push([f.date, f.odometer, f.gallons, (Number(f.total) || 0).toFixed(2), f.gallons > 0 ? (Number(f.total) / Number(f.gallons)).toFixed(3) : ""].map(csvCell).join(","));
    });
    return lines.join("\n");
  }
  function renderFuel() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var list = fuelForRig(rig.id);
    var stats = fuelStats(rig.id);
    var rows = fuelMpg(list).slice().reverse();
    $("#fuel-summary").innerHTML = list.length ?
      '<div class="big-number">' + (stats.mpg ? stats.mpg.toFixed(1) + ' <span class="small">MPG</span>' : '—') + '</div>' +
      '<p class="muted" style="margin:.2rem 0 0">' + num(stats.miles) + ' miles on ' + stats.gallons.toFixed(1) + ' gallons · ' + money(stats.spent) + ' spent' + (stats.avgGal ? ' · ' + money(stats.avgGal) + ' a gallon' : '') + '</p>' :
      '<p class="muted">Nothing logged yet — add your first fill-up and the MPG starts here.</p>';
    $("#fuel-list").innerHTML = rows.length ? rows.map(function (r) {
      var f = r.fill;
      return '<div class="row" data-open-fuel="' + f.id + '" style="cursor:pointer"><div class="grow"><div class="title">' + esc(fmtDate(f.date)) + '</div>' +
        '<div class="sub">' + num(f.odometer) + ' mi · ' + f.gallons + ' gal · ' + money(f.total) + (f.gallons > 0 ? ' · ' + money(f.total / f.gallons) + '/gal' : '') + '</div></div>' +
        '<b>' + (r.mpg ? r.mpg.toFixed(1) + ' MPG' : '—') + '</b></div>';
    }).join("") + '<p class="small muted">Tap a line to change it. Fill the tank each time — that\'s how the MPG stays honest.</p>' : '';
    $all("[data-open-fuel]").forEach(function (el) {
      el.addEventListener("click", function () { openFuelSheet(el.getAttribute("data-open-fuel")); });
    });
  }
  function openFuelSheet(fillId) {
    var rig = activeRig(); if (!rig) return;
    var fill = fillId ? (store.fuel || []).find(function (f) { return f.id === fillId; }) : null;
    var draft = fill ? JSON.parse(JSON.stringify(fill)) : newFuel({ rigId: rig.id, odometer: rig.mileage });
    openSheet(
      sheetHead(fill ? "One fill-up" : "Log a fill-up", "Gallons and what you paid — the MPG works itself out. Fill the tank each time.") +
      '<div class="fieldrow"><div class="field"><label for="fu-date">Date</label><input id="fu-date" type="date" value="' + esc(draft.date) + '" /></div>' +
      '<div class="field"><label for="fu-odo">Odometer (miles)</label><input id="fu-odo" inputmode="decimal" value="' + (draft.odometer || "") + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="fu-gal">Gallons</label><input id="fu-gal" inputmode="decimal" value="' + (draft.gallons || "") + '" /></div>' +
      '<div class="field"><label for="fu-total">What you paid</label><input id="fu-total" inputmode="decimal" placeholder="0.00" value="' + (draft.total || "") + '" /></div></div>' +
      '<p class="small muted" id="fu-ppg"></p>' +
      '<div class="btnrow"><button class="btn block" id="fu-save" type="button">Save this fill-up</button></div>' +
      (fill ? '<div class="btnrow"><button class="btn ghost block" id="fu-delete" type="button">Delete this fill-up</button></div>' : '')
    );
    wireClose(sheetHost);
    function ppg() {
      var g = Number($("#fu-gal").value) || 0, t = Number($("#fu-total").value) || 0;
      $("#fu-ppg").textContent = (g > 0 && t > 0) ? money(t / g) + " a gallon" : "";
    }
    ["fu-gal", "fu-total"].forEach(function (id) { $("#" + id).addEventListener("input", ppg); });
    ppg();
    $("#fu-save").addEventListener("click", function () {
      var gal = Number($("#fu-gal").value) || 0;
      if (gal <= 0) { toast("How many gallons went in?"); return; }
      draft.date = $("#fu-date").value || todayISO();
      draft.odometer = Number($("#fu-odo").value) || 0;
      draft.gallons = gal;
      draft.total = Number($("#fu-total").value) || 0;
      if (!fill) store.fuel.push(draft);
      else { var i = store.fuel.findIndex(function (f) { return f.id === fill.id; }); if (i >= 0) store.fuel[i] = draft; }
      /* A fill-up moves the rig forward, same as a logged job does. */
      if (draft.odometer > rig.mileage) rig.mileage = draft.odometer;
      save(); closeSheet(); renderFuel(); renderHome();
      toast("Fill-up saved.");
    });
    if (fill) $("#fu-delete").addEventListener("click", function () {
      if (!confirm("Delete this fill-up?")) return;
      store.fuel = store.fuel.filter(function (f) { return f.id !== fill.id; });
      save(); closeSheet(); renderFuel(); renderHome();
    });
  }

  /* ---------------- Trips --------------------------------------------------- */
  /* Where you went, when, and what it cost. The miles come from the
     odometer out and home; the money is the campground plus every
     fill-up dated inside the trip — the fuel counts itself, so the
     trip's total is the budget number, not a guess. */
  function newTrip(o) {
    return { id: uid(), rigId: o.rigId, name: o.name || "", destination: o.destination || "", startDate: o.startDate || todayISO(), endDate: o.endDate || "", campground: o.campground || "", campgroundCost: Number(o.campgroundCost) || 0, startOdo: Number(o.startOdo) || 0, endOdo: Number(o.endOdo) || 0, notes: o.notes || "" };
  }
  function tripsForRig(rigId) {
    return (store.trips || []).filter(function (t) { return t.rigId === rigId; }).sort(function (a, b) { return (a.startDate || "") < (b.startDate || "") ? 1 : -1; });
  }
  function tripCosts(trip) {
    var miles = (trip.endOdo > 0 && trip.startOdo > 0 && trip.endOdo > trip.startOdo) ? trip.endOdo - trip.startOdo : 0;
    var fuel = 0;
    fuelForRig(trip.rigId).forEach(function (f) {
      if ((!trip.startDate || f.date >= trip.startDate) && (!trip.endDate || f.date <= trip.endDate)) fuel += Number(f.total) || 0;
    });
    var camp = Number(trip.campgroundCost) || 0;
    return { miles: miles, fuel: fuel, camp: camp, total: fuel + camp };
  }
  function renderTrips() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var trips = tripsForRig(rig.id);
    $("#trips-list").innerHTML = trips.length ? trips.map(function (t) {
      var c = tripCosts(t);
      return '<div class="row" data-open-trip="' + t.id + '" style="cursor:pointer"><div class="grow"><div class="title">' + esc(t.name || t.destination || "Trip") + '</div>' +
        '<div class="sub">' + esc(fmtDate(t.startDate)) + (t.endDate ? ' – ' + esc(fmtDate(t.endDate)) : '') + (t.destination ? ' · ' + esc(t.destination) : '') + '</div>' +
        '<div class="sub">' + (c.miles ? num(c.miles) + ' miles · ' : '') + 'Fuel ' + money(c.fuel) + (c.camp ? ' · Campground ' + money(c.camp) : '') + ' · <b>' + money(c.total) + '</b></div></div></div>';
    }).join("") + '<p class="small muted">Tap a trip to change it. The fuel inside the trip dates counts itself.</p>'
      : '<p class="muted">No trips yet — add the next one and the book will keep the miles and the money.</p>';
    $all("[data-open-trip]").forEach(function (el) {
      el.addEventListener("click", function () { openTripSheet(el.getAttribute("data-open-trip")); });
    });
  }
  function openTripSheet(tripId) {
    var rig = activeRig(); if (!rig) return;
    var trip = tripId ? (store.trips || []).find(function (t) { return t.id === tripId; }) : null;
    var draft = trip ? JSON.parse(JSON.stringify(trip)) : newTrip({ rigId: rig.id, startOdo: rig.mileage });
    openSheet(
      sheetHead(trip ? "One trip" : "Plan a trip", "Where, when, and what it cost — the fuel inside these dates counts itself.") +
      '<div class="field"><label for="tr-name">Trip name</label><input id="tr-name" value="' + esc(draft.name) + '" placeholder="e.g. Fall run to the Smokies" /></div>' +
      '<div class="field"><label for="tr-dest">Where to</label><input id="tr-dest" value="' + esc(draft.destination) + '" placeholder="e.g. Gatlinburg, TN" /></div>' +
      '<div class="fieldrow"><div class="field"><label for="tr-start">Leaves</label><input id="tr-start" type="date" value="' + esc(draft.startDate) + '" /></div>' +
      '<div class="field"><label for="tr-end">Back</label><input id="tr-end" type="date" value="' + esc(draft.endDate || "") + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="tr-camp">Campground</label><input id="tr-camp" value="' + esc(draft.campground) + '" placeholder="e.g. Twin Creek" /></div>' +
      '<div class="field"><label for="tr-campcost">Campground cost</label><input id="tr-campcost" inputmode="decimal" placeholder="0.00" value="' + (draft.campgroundCost || "") + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="tr-odo1">Odometer out</label><input id="tr-odo1" inputmode="decimal" value="' + (draft.startOdo || "") + '" /></div>' +
      '<div class="field"><label for="tr-odo2">Odometer home</label><input id="tr-odo2" inputmode="decimal" value="' + (draft.endOdo || "") + '" /></div></div>' +
      '<div class="field"><label for="tr-notes">Notes</label><textarea id="tr-notes" placeholder="e.g. Site 14, full hookups, quiet at night.">' + esc(draft.notes || "") + '</textarea></div>' +
      '<div class="btnrow"><button class="btn block" id="tr-save" type="button">Save this trip</button></div>' +
      (trip ? '<div class="btnrow"><button class="btn ghost block" id="tr-delete" type="button">Delete this trip</button></div>' : '')
    );
    wireClose(sheetHost);
    $("#tr-save").addEventListener("click", function () {
      draft.name = $("#tr-name").value.trim();
      draft.destination = $("#tr-dest").value.trim();
      draft.startDate = $("#tr-start").value || todayISO();
      draft.endDate = $("#tr-end").value;
      draft.campground = $("#tr-camp").value.trim();
      draft.campgroundCost = Number($("#tr-campcost").value) || 0;
      draft.startOdo = Number($("#tr-odo1").value) || 0;
      draft.endOdo = Number($("#tr-odo2").value) || 0;
      draft.notes = $("#tr-notes").value.trim();
      if (!draft.name && !draft.destination) { toast("Give the trip a name or a place first."); return; }
      if (!trip) { store.trips = store.trips || []; store.trips.push(draft); }
      else { var i = store.trips.findIndex(function (t) { return t.id === trip.id; }); if (i >= 0) store.trips[i] = draft; }
      save(); closeSheet(); renderTrips(); renderHome(); toast("Trip saved.");
    });
    if (trip) $("#tr-delete").addEventListener("click", function () {
      if (!confirm("Delete this trip?")) return;
      store.trips = store.trips.filter(function (t) { return t.id !== trip.id; });
      save(); closeSheet(); renderTrips(); renderHome();
    });
  }

  function renderMore() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var year = new Date().getFullYear();
    var av = $("#about-version"); if (av) av.textContent = "RollOnRV v1.0 · build " + APP_VERSION;
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
      /* A phone photo that never decodes must not hang the photo flow
         forever (Nov 15: a picked photo that never lands looks identical
         to a dead button). The 6s timer settles with the original, same
         as the error path. */
      var done = false;
      function finish(v) { if (!done) { done = true; resolve(v); } }
      setTimeout(function () { finish(dataUrl); }, 6000);
      try {
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.width, h = img.height;
            if (w <= MAX_PHOTO_DIM && h <= MAX_PHOTO_DIM) { finish(dataUrl); return; }
            var s = Math.min(MAX_PHOTO_DIM / w, MAX_PHOTO_DIM / h);
            var c = document.createElement("canvas");
            c.width = Math.round(w * s); c.height = Math.round(h * s);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            finish(c.toDataURL("image/jpeg", 0.8));
          } catch (e) { finish(dataUrl); }
        };
        img.onerror = function () { finish(dataUrl); };
        img.src = dataUrl;
      } catch (e) { finish(dataUrl); }
    });
  }
  function storeHasRoom(bytes) {
    try { return (localStorage.getItem(KEY) || "").length + bytes < STORE_SOFT_LIMIT; } catch (e) { return true; }
  }
  var photoPending = null; // function(dataUrl)
  function openPhotoInput() {
    var input = $("#photo-input");
    input.value = "";
    input.click();
  }
  function requestPhoto(cb) {
    photoPending = cb;
    if (isNative) {
      try {
        var Camera = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera;
        if (Camera && Camera.getPhoto) {
          Camera.getPhoto({ quality: 80, allowEditing: false, resultType: "dataUrl", source: "prompt" })
            .then(function (r) { var f = photoPending; photoPending = null; if (f && r && r.dataUrl) f(r.dataUrl); })
            .catch(function (err) {
              /* The native camera call can fail (plugin not answering, no
                 permission, anything else) — and a failed call used to swallow
                 the tap entirely, so the button looked dead (Nov 15, TestFlight:
                 "Add photo of your rig won't open"). Fall back to the file
                 picker so a photo is always reachable. A user cancel is the one
                 case that stays silent: they already said no. The callback must
                 STAY pending for the fallback picker — clearing it here (v45)
                 meant the picker opened, a photo was chosen, and nothing
                 happened (Nov 15: "opens the camera and the photos but won't
                 add to screen"). */
              var msg = "";
              try { msg = String((err && err.message) || err || ""); } catch (e) {}
              if (/cancel/i.test(msg)) { photoPending = null; return; }
              openPhotoInput();
            });
          return;
        }
      } catch (e) {}
    }
    openPhotoInput();
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
    // Tied to a task? The task IS what was done — fill the name in so the
    // user never has to type the same thing twice. Still editable: change
    // it to add detail ("ran it twice") and the edit wins.
    if (!existing && presetTaskId && !draft.title) {
      var preset = store.tasks.find(function (t) { return t.id === presetTaskId; });
      if (preset) draft.title = preset.title;
    }
    var tasks = store.tasks.filter(function (t) { return t.rigId === rig.id; });
    /* Bought for this job already? Bring those parts along — already
       counted, so the same dollars are never counted twice. */
    if (!existing && draft.taskId) {
      partsForRig(rig.id).filter(function (p) { return p.taskId === draft.taskId && p.bought; }).forEach(function (p) {
        if (!draft.parts.some(function (x) { return x.name === p.name; })) {
          draft.parts.push({ name: p.name, partNo: p.partNo || "", cost: Number(p.boughtCost) || 0, counted: false });
        }
      });
    }
    function draw() {
      var partsHtml = draft.parts.map(function (p, i) {
        var row = '<div class="fieldrow" data-part="' + i + '" data-counted="' + (p.counted === false ? "0" : "1") + '">' +
          '<div class="field" style="flex:2;margin-top:.4rem"><input data-pname placeholder="Part — e.g. Oil filter" value="' + esc(p.name || "") + '" /></div>' +
          '<div class="field" style="flex:1.4;margin-top:.4rem"><input data-ppart placeholder="Part no." value="' + esc(p.partNo || "") + '" /></div>' +
          '<div class="field" style="flex:.8;margin-top:.4rem"><input data-pcost inputmode="decimal" placeholder="$" value="' + (p.cost != null && p.cost !== "" ? p.cost : "") + '" /></div></div>';
        if (p.counted === false) row += '<p class="small muted" style="margin:0 0 .4rem">✓ Already in the book — bought for this job, not counted twice.</p>';
        return row;
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
        '<p class="small muted" id="lj-cost-hint"></p>' +
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
      function costHint() {
        var already = draft.parts.filter(function (p) { return p.counted === false; }).reduce(function (s, p) { return s + (Number(p.cost) || 0); }, 0);
        var el = $("#lj-cost-hint");
        if (el) el.textContent = already ? "Already in the book: " + money(already) + " in parts bought for this job — put only the rest here." : "";
      }
      costHint();
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
      $("#lj-task").addEventListener("change", function () {
        // Picking a task fills the name in — unless the user already typed
        // their own wording, or the name still matches the old task's.
        var picked = tasks.find(function (x) { return x.id === $("#lj-task").value; });
        var oldTask = tasks.find(function (x) { return x.id === draft.taskId; });
        var titleEl = $("#lj-title");
        if (picked && (!titleEl.value.trim() || (oldTask && titleEl.value.trim() === oldTask.title))) {
          titleEl.value = picked.title; draft.title = picked.title;
        }
        draft.taskId = $("#lj-task").value || null; // keep the sheet in sync if it re-draws
        if (picked) {
          partsForRig(rig.id).filter(function (p) { return p.taskId === picked.id && p.bought; }).forEach(function (p) {
            if (!draft.parts.some(function (x) { return x.name === p.name; })) {
              draft.parts.push({ name: p.name, partNo: p.partNo || "", cost: Number(p.boughtCost) || 0, counted: false });
            }
          });
          costHint();
        }
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
            cost: parseFloat($("[data-pcost]", rowEl).value) || 0,
            counted: rowEl.getAttribute("data-counted") !== "0"
          };
        });
      }
      $("#lj-save").addEventListener("click", function () {
        collectParts();
        draft.taskId = $("#lj-task").value || null;
        draft.title = $("#lj-title").value.trim();
        // Tied to a task and the name left blank (or cleared)? The task
        // name is the job — use it rather than making the user retype it.
        if (!draft.title && draft.taskId) {
          var linked = store.tasks.find(function (t) { return t.id === draft.taskId; });
          if (linked) draft.title = linked.title;
        }
        if (!draft.title) { toast("Give the job a name first."); return; }
        draft.date = $("#lj-date").value || todayISO();
        draft.cost = parseFloat($("#lj-cost").value) || 0;
        draft.mileage = $("#lj-miles").value === "" ? null : Number($("#lj-miles").value);
        draft.genHours = $("#lj-gen").value === "" ? null : Number($("#lj-gen").value);
        draft.note = $("#lj-note").value.trim();
        draft.parts = draft.parts.filter(function (p) { return p.name || p.partNo || p.cost; });
        // Parts add up: if no total was typed, the parts total is the cost.
        var partsTotal = draft.parts.reduce(function (s, p) { return s + (p.counted === false ? 0 : (Number(p.cost) || 0)); }, 0);
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

  /* ---------------- Printing ------------------------------------------------ */
  /* A paper copy of a checklist or of what's due — clipboard, pencil, no
     phone in hand. The sheet is built into #print-sheet and the print
     stylesheet hides the app itself, so only the page comes out. */
  function printHead(title, sub) {
    return '<div class="print-head"><h1>' + esc(title) + '</h1><p>' + esc(sub) + '</p></div>';
  }
  function printFoot(note) {
    return '<div class="print-foot"><p>Checked by ______________________&nbsp;&nbsp;Date __________</p><p>' + esc(note) + '</p></div>';
  }
  function printSheet(html) {
    var host = $("#print-sheet");
    if (!host) return;
    host.innerHTML = html;
    if (isNative) {
      /* window.print() does nothing inside the installed app — iOS
         WKWebView has no print dialog (Nov 15: "Print this list
         doesn't work"). Open the sheet in Safari instead, where
         Share → Print works; the book stays put behind it. */
      openPrintPage(html);
      return;
    }
    try { window.print(); } catch (e) {}
  }
  function openPrintPage(html) {
    /* v49 tried a blob link (the download attribute swallowed the tap);
       v50 tried a plain blob link (Safari cannot open a blob: URL from
       outside the web view, so nothing opened either). The sheet now
       travels as a #hash on a real https page — the same plain-link path
       the old guide link used to leave the app for Safari, which is
       proven to work on this phone. print.html carries the print
       styles and the Print button. */
    var a = document.createElement("a");
    a.href = "https://rickdemers.com/rollonrv-preview/print.html#" + encodeURIComponent(html);
    a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 500);
  }
  function printChecklistRun(tpl, run, rig) {
    var rows = [];
    function addGroup(name, items) {
      if (!items.length) return;
      rows.push('<div class="print-group">' + esc(name) + '</div>');
      items.forEach(function (it) {
        var sub = "";
        if (it.psi && rig) sub = (rig.psiFront ? rig.psiFront + " psi front" : "") + (rig.psiFront && rig.psiRear ? " · " : "") + (rig.psiRear ? rig.psiRear + " psi rear" : "");
        rows.push('<div class="print-item"><span class="print-box">' + (run && run.checks[it.id] ? "✓" : "") + '</span><span><span class="print-label">' + esc(it.label) + '</span>' + (sub ? '<span class="print-sub">' + esc(sub) + '</span>' : "") + '</span></div>');
      });
    }
    tpl.groups.forEach(function (g) { addGroup(g.name, g.items); });
    addGroup(customHeadingFor(rig.id, tpl.id), customItemsFor(rig.id, tpl.id).map(function (c) { return { id: c.id, label: c.label }; }));
    customGroupsFor(rig.id, tpl.id).forEach(function (g) { addGroup(g.name, g.items); });
    printSheet(
      printHead("RollOnRV — " + tpl.name, rigName(rig) + " · " + fmtDate(todayISO())) +
      rows.join("") +
      '<div class="print-notes"><div class="print-group">Notes</div><div class="print-note-line"></div><div class="print-note-line"></div><div class="print-note-line"></div></div>' +
      printFoot("Mark it with a pen, then log it in the book when you're back inside.")
    );
  }
  function printDueTasks() {
    var rig = activeRig(); if (!rig) return;
    var open = sortOpenTasks(dueTasks(rig).filter(function (d) { return d.status.level !== "done" && d.status.level !== "open"; }), logSort);
    var rows = "";
    var currentGroup = null;
    open.forEach(function (d) {
      if (logSort === "system") {
        var g = d.task.category || "Other";
        if (g !== currentGroup) { currentGroup = g; rows += '<div class="print-group">' + esc(currentGroup) + '</div>'; }
      }
      rows += '<div class="print-item"><span class="print-box"></span><span><span class="print-label">' + esc(d.task.title) + '</span>' +
        '<span class="print-sub">' + esc(d.task.category) + ' · ' + esc(d.status.text) + '</span></span></div>';
    });
    printSheet(
      printHead("RollOnRV — What's due", rigName(rig) + " · " + fmtDate(todayISO())) +
      (rows || '<p class="muted">Nothing on the books — all caught up.</p>') +
      printFoot("Log each one in the book when it's done.")
    );
  }
  /* The downloaded list as a page you can actually read on the phone:
     big type, the logbook look, tick boxes — not Safari's tiny CSV table.
     The spreadsheet file is still there too, under More. */
  function partsListHTML(rig) {
    var all = partsForRig(rig.id);
    var toGet = all.filter(function (p) { return !p.bought; });
    var got = all.filter(function (p) { return p.bought; });
    function row(p, ticked) {
      var sub = [p.partNo, partTaskTitle(p)].filter(Boolean).join(" · ");
      return '<div class="item"><span class="box">' + (ticked ? "✓" : "") + '</span><span><b>' + esc(p.name) + '</b>' + (p.qty > 1 ? ' ×' + p.qty : '') +
        (sub ? '<br><span class="sub">' + esc(sub) + '</span>' : '') +
        (ticked && p.boughtCost ? '<br><span class="sub">' + esc(money(p.boughtCost)) + ' · ' + esc(fmtDate(p.boughtAt)) + '</span>' : '') + '</span></div>';
    }
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Parts to get — ' + esc(rigName(rig)) + '</title><style>' +
      'body{font-family:Georgia,serif;background:#fffdf4;color:#22304a;margin:0;padding:1.2rem;font-size:19px;line-height:1.45}' +
      'h1{font-size:1.7rem;margin:.2rem 0 .1rem}h2{font-size:1.25rem;color:#b3372c;margin:1.4rem 0 .4rem}' +
      '.meta{color:#55617a;font-size:.95rem}.item{display:flex;gap:.8rem;align-items:flex-start;padding:.7rem 0;border-bottom:1px solid #e2d8bd}' +
      '.box{flex:none;width:1.5rem;height:1.5rem;border:2px solid #55617a;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#b3372c}' +
      '.sub{color:#55617a;font-size:.9rem}.foot{color:#55617a;font-size:.9rem;margin-top:1.4rem}' +
      '</style></head><body>' +
      '<h1>Parts to get</h1><p class="meta">' + esc(rigName(rig)) + ' · ' + esc(fmtDate(todayISO())) + '</p>' +
      (toGet.length ? '<h2>To get</h2>' + toGet.map(function (p) { return row(p, false); }).join("") : '<p>Nothing on the list.</p>') +
      (got.length ? '<h2>Already got</h2>' + got.map(function (p) { return row(p, true); }).join("") : '') +
      '<p class="foot">Take it to the counter — check off what you find. · RollOnRV, your rig\'s logbook.</p>' +
      '</body></html>';
  }
  function printPartsList() {
    var rig = activeRig(); if (!rig) return;
    var all = partsForRig(rig.id);
    var toGet = all.filter(function (p) { return !p.bought; });
    var got = all.filter(function (p) { return p.bought; });
    function item(p, ticked) {
      var sub = [p.partNo, partTaskTitle(p)].filter(Boolean).join(" · ");
      return '<div class="print-item"><span class="print-box">' + (ticked ? "✓" : "") + '</span><span><span class="print-label">' + esc(p.name) + (p.qty > 1 ? ' ×' + p.qty : '') + '</span>' +
        (sub ? '<span class="print-sub">' + esc(sub) + '</span>' : "") + '</span></div>';
    }
    printSheet(
      printHead("RollOnRV — Parts to get", rigName(rig) + " · " + fmtDate(todayISO())) +
      (toGet.length ? toGet.map(function (p) { return item(p, false); }).join("") : '<p class="muted">Nothing on the list.</p>') +
      (got.length ? '<div class="print-group">Already got</div>' + got.map(function (p) { return item(p, true); }).join("") : "") +
      printFoot("Take it to the counter — check off what you find.")
    );
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
      (task.needsPro ? proLine(task) : '') +
      '<div class="row"><div class="grow"><div class="title">Every</div><div class="sub">Cadence, when it repeats</div></div><b>' +
      [task.intervalMonths ? task.intervalMonths + " mo" : null, task.intervalMiles ? num(task.intervalMiles) + " mi" : null, task.intervalGenHours ? num(task.intervalGenHours) + " hrs" : null].filter(Boolean).join(" · ") + '</b></div>' +
      (task.lastDoneAt ? '<div class="row"><div class="grow"><div class="title">Last done</div></div><b>' + esc(fmtDate(task.lastDoneAt)) + '</b></div>' : '') +
      '<div class="btnrow"><button class="btn block" id="ts-log">Log this job</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="ts-part">＋ Add a part for this job</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="ts-edit">Edit task</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="ts-snooze">Nudge me again in a week</button>' +
      '<button class="btn ghost block" id="ts-delete">Delete task</button></div>'
    );
    wireClose(sheetHost);
    $("#ts-log").addEventListener("click", function () { closeSheet(); openLogSheet(null, task.id); });
    $("#ts-part").addEventListener("click", function () { closeSheet(); openPartSheet(null, task.id); });
    $("#ts-edit").addEventListener("click", function () { closeSheet(); openEditTaskSheet(task.id); });
    $("#ts-snooze").addEventListener("click", function () { snoozeTask(task); save(); closeSheet(); renderLogbook(); renderHome(); toast("Snoozed a week."); });
    $("#ts-delete").addEventListener("click", function () {
      if (!confirm("Delete this task from the book?")) return;
      store.tasks = store.tasks.filter(function (t) { return t.id !== task.id; });
      save(); scheduleReminders(); closeSheet(); renderLogbook();
    });
  }
  /* Fix a task after the fact — the words, the rhythm, or when it's due.
     What you've already done stays in the book: last-done is history,
     never edited here. Imported categories (Slideouts, AC, …) are kept
     as they are — the list offers them alongside the built-in ones. */
  function openEditTaskSheet(taskId) {
    var rig = activeRig();
    var task = store.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;
    var cats = CATEGORIES.slice();
    if (task.category && cats.indexOf(task.category) === -1) cats.unshift(task.category);
    openSheet(
      sheetHead("Edit task", "Change the words, the rhythm, or when it's due. What you've already done stays in the book.") +
      '<div class="field"><label for="et-title">Task</label><input id="et-title" value="' + esc(task.title) + '" /></div>' +
      '<div class="field"><label for="et-cat">Category</label><select id="et-cat">' + cats.map(function (c) { return '<option' + (c === task.category ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join("") + '</select></div>' +
      '<div class="fieldrow"><div class="field"><label for="et-months">Every (months)</label><input id="et-months" inputmode="numeric" value="' + (task.intervalMonths != null ? task.intervalMonths : "") + '" /></div>' +
      '<div class="field"><label for="et-miles">Every (miles)</label><input id="et-miles" inputmode="numeric" value="' + (task.intervalMiles != null ? task.intervalMiles : "") + '" /></div>' +
      '<div class="field"><label for="et-hours">Every (gen hrs)</label><input id="et-hours" inputmode="numeric" value="' + (task.intervalGenHours != null ? task.intervalGenHours : "") + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="et-due-date">Due date</label><input id="et-due-date" type="date" value="' + esc(task.nextDueDate || "") + '" /></div>' +
      '<div class="field"><label for="et-due-miles">Due at (miles)</label><input id="et-due-miles" inputmode="numeric" value="' + (task.nextDueMileage != null ? task.nextDueMileage : "") + '" /></div></div>' +
      '<div class="field"><label for="et-note">Note</label><textarea id="et-note">' + esc(task.note || "") + '</textarea></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="et-pro" type="button">' + (task.needsPro ? "🔧 Leave it to the pro — this one's for a shop" : "🔧 Leave it to the pro — not for this one") + '</button></div>' +
      '<div id="et-pro-wrap"' + (task.needsPro ? '' : ' hidden') + '>' + proAreaHTML("et", task) + '</div>' +
      '<div class="btnrow"><button class="btn block" id="et-save" type="button">Save changes</button></div>'
    );
    wireClose(sheetHost);
    var etPro = !!task.needsPro;
    wireProArea("et");
    $("#et-pro").addEventListener("click", function () { etPro = !etPro; $("#et-pro").textContent = etPro ? "🔧 Leave it to the pro — this one's for a shop" : "🔧 Leave it to the pro — not for this one"; $("#et-pro-wrap").hidden = !etPro; });
    $("#et-save").addEventListener("click", function () {
      var title = $("#et-title").value.trim();
      if (!title) { toast("Give the task a name first."); return; }
      task.title = title;
      task.category = $("#et-cat").value;
      task.intervalMonths = $("#et-months").value === "" ? null : Number($("#et-months").value);
      task.intervalMiles = $("#et-miles").value === "" ? null : Number($("#et-miles").value);
      task.intervalGenHours = $("#et-hours").value === "" ? null : Number($("#et-hours").value);
      task.nextDueDate = $("#et-due-date").value || null;
      task.nextDueMileage = $("#et-due-miles").value === "" ? null : Number($("#et-due-miles").value);
      task.note = $("#et-note").value.trim();
      var etProPick = etPro ? proFromArea("et") : { proId: null, proShop: "" };
      task.needsPro = etPro;
      task.proId = etProPick.proId;
      task.proShop = etProPick.proShop;
      save(); scheduleReminders(); closeSheet(); renderLogbook(); renderHome(); toast("Task updated.");
    });
  }

  /* The usual jobs — the starter library: jobs most rigs need, rhythms
     already set, the way the big maintenance apps do it. Engine and
     only (Class A/B/C); a towable never sees them. Tapping Add writes the
     job into this rig's book; one already in the book shows as such, so
     a job is never added twice. Set a due date on the task after, or log
     it once and the rhythm takes over from there. */
  function starterApplies(t, rig) {
    if (t.motorized && !/class [abc]/i.test(rig.type || "")) return false;
    if (!t.needs) return true;
    var key = Object.keys(t.needs)[0];
    var ans = ((rig && rig.equipment) || {})[key];
    if (ans === t.needs[key]) return true;
    if ((!ans || ans === "unsure") && t.isDefault) return true;
    return false;
  }
  function starterTasksFor(rig) {
    return STARTER_TASKS.filter(function (t) { return starterApplies(t, rig); });
  }
  function openStarterTasksSheet() {
    var rig = activeRig();
    var list = starterTasksFor(rig);
    function alreadyIn(title) {
      return store.tasks.some(function (t) { return t.rigId === rig.id && t.title.toLowerCase() === title.toLowerCase(); });
    }
    function fitted() {
      return EQUIPMENT_QUESTIONS.some(function (q) { var a = (rig.equipment || {})[q.key]; return a && a !== "unsure"; });
    }
    function draw() {
      var qCount = EQUIPMENT_QUESTIONS.filter(function (q) { return !q.motorized || /class [abc]/i.test(rig.type || ""); }).length;
      openSheet(
        sheetHead("The usual jobs", "Jobs most rigs need, rhythms already set. Tap Add on the ones that fit yours.") +
        '<div class="btnrow"><button class="btn ghost small" id="st-fit" type="button">' + (fitted() ? "Fitted to your rig — change answers" : "⚙️ Fit the jobs to my rig — " + qCount + " quick questions") + '</button></div>' +
        list.map(function (t, i) {
          var every = [t.intervalMonths ? t.intervalMonths + " mo" : null, t.intervalMiles ? num(t.intervalMiles) + " mi" : null, t.intervalGenHours ? t.intervalGenHours + " gen hrs" : null].filter(Boolean).join(" · ");
          return '<div class="row"><div class="grow"><div class="title">' + esc(t.title) + '</div>' +
            '<div class="sub">' + esc(t.category) + (every ? " · every " + every : "") + '</div>' +
            (t.note ? '<div class="sub">' + esc(t.note) + '</div>' : "") + '</div>' +
            (alreadyIn(t.title) ? '<span class="pill green">In the book ✓</span>' :
              '<button class="btn ghost" type="button" data-add-starter="' + i + '">Add</button>') + '</div>';
        }).join("") +
        '<div class="btnrow"><button class="btn block" data-close type="button">Done</button></div>'
      );
      wireClose(sheetHost);
      $("#st-fit").addEventListener("click", function () { closeSheet(); openEquipmentSheet(); });
      $all("[data-add-starter]").forEach(function (b) {
        b.addEventListener("click", function () {
          var t = list[Number(b.getAttribute("data-add-starter"))];
          if (!t || alreadyIn(t.title)) return;
          var note = t.note;
          if (t.title.indexOf("Roof seals") === 0) { var rn = ROOF_NOTES[(rig.equipment || {}).roof]; if (rn) note = rn; }
          store.tasks.push(newTask({ rigId: rig.id, title: t.title, category: t.category, intervalMonths: t.intervalMonths, intervalMiles: t.intervalMiles, intervalGenHours: t.intervalGenHours, note: note, needsPro: !!t.needsPro }));
          save(); scheduleReminders(); draw(); renderLogbook(); renderHome();
        });
      });
    }
    draw();
  }

  /* The pro picker inside a task sheet: pick one of your pros, or add a
     new one right here — the name, number and town join My pros when the
     task is written in the book. A job from before the list existed
     (a name, no link) opens with the new-pro fields out and the name
     already in them, so one save puts it in the list. */
  function proAreaHTML(prefix, task) {
    var pros = store.pros || [];
    var selId = task && task.proId ? task.proId : "";
    var legacyName = task && !task.proId && task.proShop ? task.proShop : "";
    var startNew = !!legacyName;
    var opts = '<option value="">— Pick one of your pros —</option>' +
      pros.map(function (p) { return '<option value="' + p.id + '"' + (p.id === selId ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join("") +
      '<option value="__new__"' + (startNew ? ' selected' : '') + '>＋ Add a new pro…</option>';
    return '<div id="' + prefix + '-pro-area">' +
      '<div class="field"><label for="' + prefix + '-pro-pick">Which pro?</label><select id="' + prefix + '-pro-pick">' + opts + '</select></div>' +
      '<div id="' + prefix + '-pro-new" hidden>' +
      '<div class="field"><label for="' + prefix + '-pro-name">Name</label><input id="' + prefix + '-pro-name" value="' + esc(legacyName) + '" placeholder="e.g. Bob\'s RV Service" /></div>' +
      '<div class="field"><label for="' + prefix + '-pro-specialty">What they do (optional)</label><input id="' + prefix + '-pro-specialty" placeholder="e.g. Suspension" /></div>' +
      '<div class="fieldrow"><div class="field"><label for="' + prefix + '-pro-phone">Phone (optional)</label><input id="' + prefix + '-pro-phone" inputmode="tel" placeholder="e.g. (850) 555-0134" /></div>' +
      '<div class="field"><label for="' + prefix + '-pro-town">Town (optional)</label><input id="' + prefix + '-pro-town" placeholder="e.g. Panama City" /></div></div>' +
      '<p class="small muted">Saved to My pros when you write the task in the book.</p>' +
      '</div></div>';
  }
  function wireProArea(prefix) {
    var pick = $("#" + prefix + "-pro-pick"), box = $("#" + prefix + "-pro-new");
    pick.addEventListener("change", function () { box.hidden = pick.value !== "__new__"; });
    if (pick.value === "__new__") box.hidden = false;
  }
  function proFromArea(prefix) {
    var pick = $("#" + prefix + "-pro-pick");
    if (pick.value === "__new__") {
      var name = $("#" + prefix + "-pro-name").value.trim();
      if (!name) return { proId: null, proShop: "" };
      var p = newPro({ name: name, specialty: $("#" + prefix + "-pro-specialty").value.trim(), phone: $("#" + prefix + "-pro-phone").value.trim(), town: $("#" + prefix + "-pro-town").value.trim() });
      store.pros = store.pros || []; store.pros.push(p);
      return { proId: p.id, proShop: p.name };
    }
    if (pick.value) {
      var saved = (store.pros || []).find(function (x) { return x.id === pick.value; });
      return { proId: pick.value, proShop: saved ? saved.name : "" };
    }
    return { proId: null, proShop: "" };
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
      '<div class="btnrow"><button class="btn ghost block" id="at-pro" type="button">🔧 Leave it to the pro — not for this one</button></div>' +
      '<div id="at-pro-wrap" hidden>' + proAreaHTML("at", null) + '</div>' +
      '<div class="btnrow"><button class="btn block" id="at-save" type="button">Write it in the book</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="at-starters" type="button">Or start with the usual jobs</button></div>'
    );
    wireClose(sheetHost);
    var pro = false;
    wireProArea("at");
    $("#at-pro").addEventListener("click", function () { pro = !pro; $("#at-pro").textContent = pro ? "🔧 Leave it to the pro — this one's for a shop" : "🔧 Leave it to the pro — not for this one"; $("#at-pro-wrap").hidden = !pro; });
    $("#at-starters").addEventListener("click", function () { closeSheet(); openStarterTasksSheet(); });
    $("#at-save").addEventListener("click", function () {
      var title = $("#at-title").value.trim();
      if (!title) { toast("Give the task a name first."); return; }
      var proPick = pro ? proFromArea("at") : { proId: null, proShop: "" };
      var task = newTask({
        rigId: rig.id, title: title, category: $("#at-cat").value,
        intervalMonths: $("#at-months").value === "" ? null : Number($("#at-months").value),
        intervalMiles: $("#at-miles").value === "" ? null : Number($("#at-miles").value),
        intervalGenHours: $("#at-hours").value === "" ? null : Number($("#at-hours").value),
        nextDueDate: $("#at-due-date").value || null,
        nextDueMileage: $("#at-due-miles").value === "" ? null : Number($("#at-due-miles").value),
        note: $("#at-note").value.trim(), needsPro: pro,
        proId: proPick.proId, proShop: proPick.proShop
      });
      store.tasks.push(task); save(); scheduleReminders();
      closeSheet(); renderLogbook(); toast("Written in the book.");
    });
  }

  /* One part — add it or change it. A part belongs to a job, or it's
     just supplies. "What you paid" is only counted once you've got it. */
  function openPartSheet(partId, presetTaskId) {
    var rig = activeRig();
    var part = partId ? (store.parts || []).find(function (p) { return p.id === partId; }) : null;
    var draft = part ? JSON.parse(JSON.stringify(part)) : newPart({ rigId: rig.id, taskId: presetTaskId || null });
    var tasks = store.tasks.filter(function (t) { return t.rigId === rig.id; });
    openSheet(
      sheetHead(part ? "One part" : "Add a part", "What you need, which job it's for, and what you paid when you've got it.") +
      '<div class="field"><label for="pp-name">Part or supply</label><input id="pp-name" value="' + esc(draft.name) + '" placeholder="e.g. Oil filter" /></div>' +
      '<div class="fieldrow"><div class="field"><label for="pp-no">Part no. (optional)</label><input id="pp-no" value="' + esc(draft.partNo || "") + '" placeholder="e.g. LF16035" /></div>' +
      '<div class="field"><label for="pp-qty">How many</label><input id="pp-qty" inputmode="numeric" value="' + draft.qty + '" /></div></div>' +
      '<div class="field"><label for="pp-task">For which job (optional)</label><select id="pp-task"><option value="">Just supplies — no job</option>' +
      tasks.map(function (t) { return '<option value="' + t.id + '"' + (draft.taskId === t.id ? " selected" : "") + '>' + esc(t.title) + '</option>'; }).join("") + '</select></div>' +
      '<div class="field"><label for="pp-price">What you paid</label><input id="pp-price" inputmode="decimal" placeholder="0.00" value="' + (draft.boughtCost ? draft.boughtCost : "") + '" /></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="pp-bought" type="button">' + (draft.bought ? "✓ Got it" : "Not got yet — tap when you've got it") + '</button></div>' +
      '<div class="btnrow"><button class="btn block" id="pp-save" type="button">Write it on the list</button></div>' +
      (part ? '<div class="btnrow"><button class="btn ghost block" id="pp-delete" type="button">Take it off the list</button></div>' : "")
    );
    wireClose(sheetHost);
    $("#pp-bought").addEventListener("click", function () {
      draft.bought = !draft.bought;
      this.textContent = draft.bought ? "✓ Got it" : "Not got yet — tap when you've got it";
    });
    $("#pp-save").addEventListener("click", function () {
      var name = $("#pp-name").value.trim();
      if (!name) { toast("Give the part a name first."); return; }
      draft.name = name;
      draft.partNo = $("#pp-no").value.trim();
      draft.qty = Math.max(1, Number($("#pp-qty").value) || 1);
      draft.taskId = $("#pp-task").value || null;
      draft.boughtCost = parseFloat($("#pp-price").value) || 0;
      if (draft.bought && !draft.boughtAt) draft.boughtAt = todayISO();
      if (!draft.bought) draft.boughtAt = null;
      if (part) { var i = store.parts.findIndex(function (p) { return p.id === part.id; }); store.parts[i] = draft; }
      else store.parts.push(draft);
      save(); closeSheet(); renderParts(); renderHome(); toast("On the list.");
    });
    var del = $("#pp-delete");
    if (del) del.addEventListener("click", function () {
      if (!confirm("Take this part off the list?")) return;
      store.parts = store.parts.filter(function (p) { return p.id !== part.id; });
      save(); closeSheet(); renderParts(); renderHome();
    });
  }

  /* ---------------- tire sheet ---------------------------------------------- */
  function openTireSheet(tireId) {
    var rig = activeRig();
    var tire = tireId ? store.tires.find(function (t) { return t.id === tireId; }) : null;
    var draft = tire ? JSON.parse(JSON.stringify(tire)) : newTire({ rigId: rig.id });
    /* The age preview under the DOT field, updated in place as you type.
       The field itself is never rebuilt, so the keyboard stays up and
       focus never leaves while you type the four digits. */
    function ageHtml() {
      var info = dotInfo(draft.dotCode);
      return info.ok
        ? '<div class="card"><div class="age">' + esc(info.ageText) + '</div><p>' + esc(info.flagText) + '</p><div class="tire-bar"><div class="' + (info.flag === "good" ? "green" : info.flag === "old" ? "amber" : "red") + '" style="width:' + info.pctToTen + '%"></div></div><p class="small muted">The bar fills toward 10 years — the hard limit.</p></div>'
        : '<p class="muted">' + esc(info.text) + '</p>';
    }
    function draw() {
      openSheet(
        sheetHead(tire ? "Tire — " + esc(tire.position || "") : "Add a tire", "The DOT code is the last four digits on the sidewall — week, then year. 3222 means week 32 of 2022.") +
        '<div class="field"><label for="ti-pos">Position</label><input id="ti-pos" list="ti-positions" value="' + esc(draft.position) + '" placeholder="e.g. Steer — left" />' +
        '<datalist id="ti-positions"><option>Steer — left</option><option>Steer — right</option><option>Drive — outer left</option><option>Drive — outer right</option><option>Drive — inner left</option><option>Drive — inner right</option><option>Tag — left</option><option>Tag — right</option><option>Spare</option></datalist></div>' +
        '<div class="field"><label for="ti-dot">DOT code (last 4 digits)</label><input id="ti-dot" inputmode="numeric" maxlength="4" value="' + esc(draft.dotCode) + '" placeholder="3222" /></div>' +
        '<div id="ti-age">' + ageHtml() + '</div>' +
        '<div class="field"><label for="ti-note">Note</label><input id="ti-note" value="' + esc(draft.note || "") + '" placeholder="e.g. Michelin, bought at..." /></div>' +
        '<div class="btnrow"><button class="btn block" id="ti-save" type="button">Save tire</button></div>' +
        (tire ? '<div class="btnrow"><button class="btn ghost block" id="ti-delete" type="button">Remove tire</button></div>' : "")
      );
      wireClose(sheetHost);
      $("#ti-dot").addEventListener("input", function () { draft.dotCode = $("#ti-dot").value; $("#ti-age").innerHTML = ageHtml(); });
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
      '<div class="field"><label>Your rig\u2019s photo</label><div id="rg-photo-preview">' + rigArt(rig) + '</div>' +
      '<div class="btnrow" style="margin-top:.5rem"><button class="btn small" id="rg-photo-change" type="button">📷 ' + (rig.photo ? 'Change photo' : 'Add a photo') + '</button>' +
      (rig.photo ? '<button class="btn small ghost" id="rg-photo-remove" type="button">Remove photo</button>' : '') + '</div></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-year">Year</label><input id="rg-year" value="' + esc(rig.year) + '" /></div>' +
      '<div class="field"><label for="rg-make">Make</label><input id="rg-make" value="' + esc(rig.make) + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-model">Model</label><input id="rg-model" value="' + esc(rig.model) + '" /></div>' +
      '<div class="field"><label for="rg-type">Type</label><select id="rg-type">' + ["Class A", "Class B", "Class C", "Travel trailer", "Fifth wheel", "Truck camper", "Other"].map(function (t) { return '<option' + (rig.type === t ? " selected" : "") + '>' + t + '</option>'; }).join("") + '</select></div></div>' +
      '<div class="rig-art rig-art--sm" id="rg-type-art" aria-hidden="true"></div>' +
      '<div class="field"><label for="rg-nick">Nickname</label><input id="rg-nick" value="' + esc(rig.nickname || "") + '" /></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-miles">Odometer (miles)</label><input id="rg-miles" inputmode="decimal" value="' + rig.mileage + '" /></div>' +
      '<div class="field"><label for="rg-gen">Generator hours</label><input id="rg-gen" inputmode="decimal" value="' + rig.genHours + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-psi-f">Tire pressure — front (PSI)</label><input id="rg-psi-f" inputmode="numeric" value="' + (rig.psiFront || "") + '" /></div>' +
      '<div class="field"><label for="rg-psi-r">Tire pressure — rear (PSI)</label><input id="rg-psi-r" inputmode="numeric" value="' + (rig.psiRear || "") + '" /></div></div>' +
      '<div class="btnrow"><button class="btn block" id="rg-save" type="button">Save rig</button></div>'
    );
    wireClose(sheetHost);
    function updateRgArt() { $("#rg-type-art").innerHTML = rigSilhouette($("#rg-type").value); }
    $("#rg-type").addEventListener("change", updateRgArt);
    updateRgArt();
    $("#rg-photo-change").addEventListener("click", function () { pickRigPhoto(); closeSheet(); });
    var rgRemove = $("#rg-photo-remove");
    if (rgRemove) rgRemove.addEventListener("click", function () {
      if (rgRemove.textContent !== "Tap again to remove") { rgRemove.textContent = "Tap again to remove"; return; }
      rig.photo = null; save(); closeSheet(); renderHome(); renderMore(); toast("Photo removed — the silhouette is back.");
    });
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
    $("#su-type").addEventListener("change", function () { $("#setup-type-art").innerHTML = rigSilhouette($("#su-type").value); });
    $("#setup-type-art").innerHTML = rigSilhouette($("#su-type").value);
    $("#setup-import-btn").addEventListener("click", function () { $("#csv-file-input").click(); });
    $("#home-start-checklist").addEventListener("click", function () { showScreen("checklists"); openChecklistRun("pretrip"); });
    $("#home-rig-art").addEventListener("click", pickRigPhoto);
    $("#home-rig-photo-btn").addEventListener("click", pickRigPhoto);
    $("#home-guide-link").addEventListener("click", function () { showScreen("guide"); });
    $("#guide-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#home-pick-checklist").addEventListener("click", function () { showScreen("checklists"); });
    $("#home-update-miles").addEventListener("click", openMilesSheet);
    $("#home-log-job").addEventListener("click", function () { openLogSheet(null, null); });
    $("#log-add-btn").addEventListener("click", function () { openLogSheet(null, null); });
    $("#log-print-btn").addEventListener("click", function () { printDueTasks(); });
    $("#home-search").addEventListener("input", function (e) { homeSearchQuery = e.target.value.trim().toLowerCase(); renderHomeSearch(); });
    $("#log-add-task-btn").addEventListener("click", openAddTaskSheet);
    $("#tire-add-btn").addEventListener("click", function () { openTireSheet(null); });
    $("#parts-add-btn").addEventListener("click", function () { openPartSheet(null, null); });
    $("#parts-print-btn").addEventListener("click", function () { printPartsList(); });
    $("#parts-csv-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-parts.html", partsListHTML(rig), "text/html;charset=utf-8");
      toast("Opened in a new tab — the app is still here behind it.");
    });
    $("#parts-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#parts-back-btn-bottom").addEventListener("click", function () { showScreen("home"); });
    $("#pros-open-btn").addEventListener("click", function () { showScreen("pros"); });
    $("#pros-add-btn").addEventListener("click", function () { openProSheet(null); });
    $("#pros-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#pros-back-btn-bottom").addEventListener("click", function () { showScreen("home"); });
    $("#fuel-add-btn").addEventListener("click", function () { openFuelSheet(null); });
    $("#fuel-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#fuel-back-btn-bottom").addEventListener("click", function () { showScreen("home"); });
    $("#trips-add-btn").addEventListener("click", function () { openTripSheet(null); });
    $("#trips-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#trips-back-btn-bottom").addEventListener("click", function () { showScreen("home"); });
    $("#rig-edit-btn").addEventListener("click", openRigSheet);
    $("#rig-equipment-btn").addEventListener("click", openEquipmentSheet);
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
    $("#csv-export-parts-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-parts.csv", exportPartsCSV(rig.id));
      toast("Parts list exported — rollonrv-parts.csv");
    });
    $("#csv-export-fuel-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-fuel.csv", exportFuelCSV(rig.id));
      toast("Fuel log exported — rollonrv-fuel.csv");
    });
    $all(".theme-btn").forEach(function (b) {
      b.addEventListener("click", function () { setTheme(currentTheme() === "dark" ? "light" : "dark"); });
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
  /* ---------------- night mode -------------------------------------------- */
  /* Opt-in, like the Bible study — a button, never the phone's dark mode.
     Light is the default; the choice is saved per device. */
  var THEME_KEY = "rollonrv-theme";
  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"; }
    catch (e) { return "light"; }
  }
  function setTheme(mode) {
    var dark = mode === "dark";
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (e) {}
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    $all(".theme-btn").forEach(function (b) { b.textContent = dark ? "☀️ Day mode" : "🌙 Night mode"; });
  }

  function init() {
    load();
    setTheme(currentTheme());
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
    newRig: newRig, newTask: newTask, newLog: newLog, newTire: newTire, newPart: newPart,
    partsForRig: partsForRig, togglePartBought: togglePartBought, boughtPartsCostForTask: boughtPartsCostForTask,
    exportPartsCSV: exportPartsCSV, printPartsList: printPartsList, partsListHTML: partsListHTML, renderParts: renderParts, openPartSheet: openPartSheet,
    taskStatus: taskStatus, dueTasks: dueTasks, completeTask: completeTask, snoozeTask: snoozeTask,
    dotInfo: dotInfo, costsForYear: costsForYear, costPerMile: costPerMile,
    importTasksCSV: importTasksCSV, exportTasksCSV: exportTasksCSV, exportLogsCSV: exportLogsCSV, dedupeTasks: dedupeTasks,
    exportFuelCSV: exportFuelCSV, fuelStats: fuelStats, fuelMpg: fuelMpg, fuelForRig: fuelForRig,
    tripCosts: tripCosts, tripsForRig: tripsForRig,
    cleanTaskTitle: cleanTaskTitle,
    parseCSV: parseCSV, CHECKLISTS: CHECKLISTS, STARTER_TASKS: STARTER_TASKS, CATEGORIES: CATEGORIES,
    rigSilhouette: rigSilhouette, setRigPhoto: setRigPhoto,
    photoPendingSet: function () { return !!photoPending; },
    setTheme: setTheme, currentTheme: currentTheme,
    printChecklistRun: printChecklistRun, printDueTasks: printDueTasks,
    nextUpTasks: nextUpTasks,
    sortOpenTasks: sortOpenTasks,
    currentLogSort: function () { return logSort; },
    showScreen: showScreen, renderHome: renderHome, renderLogbook: renderLogbook,
    renderChecklists: renderChecklists, renderTires: renderTires, renderMore: renderMore,
    activeRig: activeRig, isNative: isNative, platform: platform
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();


