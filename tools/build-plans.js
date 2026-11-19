// build-plans.js — RollOnRV prebuilt-plan data generator.
//
// Reads the 7 source maintenance-plan exports in ../../user/files and
// emits ../www/plans.js, a plain script defining one global:
//   var PREBUILT_PLANS = [...]
//
// Run:  node tools/build-plans.js        (from the rollonrv-app folder)
// The run is repeatable: same sources in, same plans.js out, byte for byte.
// Nothing here pushes, deploys, or touches app.js / index.html / tests/.
//
// What it does, in order:
//   1. Parses each export (header row found by its "Task Title" cell; the
//      rig-name / export-date rows above it are skipped).
//   2. Drops every "Identify Your ..." placeholder row entirely.
//   3. Cleans titles: strips "(Type Unknown)", collapses doubled
//      parenthetical qualifiers ("(Hydraulic) (Hydraulic)"), rewords slide
//      jobs mechanism-neutral, and normalizes known near-duplicate titles
//      to one wording across all plans (see TITLE_MAP).
//   4. Drops the personal columns (Next Due, Last Completed, Next Due
//      miles/hours) — they never reach the output.
//   5. Dedupes within each plan by cleaned title + category, keeping the
//      copy with the most interval data.
//   6. Applies the cross-plan moves (generator sets, tank/tankless water
//      heaters, water filtration, slide toppers, DEF/DPF, cab-over,
//      coupler, roof matrix) and builds the 6 derived plans.
//   7. Gates jobs with `needs` / `isDefault` against the setup questions
//      (see gateJob), then writes www/plans.js.
//
// Gating semantics follow www/app.js starterApplies: a job with `needs`
// shows when every answer in `needs` fits — an exact match, or a missing
// / "Not sure" answer on the usual job for that question (`isDefault`).
// A job with no `needs` always shows. Generator jobs carry two keys:
// the generator itself plus the fuel it is written for (`genfuel`); the
// fuel key only hides a job on an explicit mismatch, so "Not sure" (or
// unanswered) keeps the plan's own fuel jobs.

var fs = require("fs");
var path = require("path");

var SRC_DIR = path.join(__dirname, "..", "..", "user", "files");
var OUT_FILE = path.join(__dirname, "..", "www", "plans.js");

// ---------------------------------------------------------------- sources
var SOURCES = {
  agas:    "RVKeeper_MaintenancePlan_Newmar_2026-11-16.csv",              // Class A gas
  adiesel: "RVKeeper_MaintenancePlan_2026_Dutch_Star_2026-11-16.csv",     // Class A diesel
  bdiesel: "RVKeeper_MaintenancePlan_2024_Plateau_2026-11-16.csv",        // Class B diesel
  bgas:    "RVKeeper_MaintenancePlan_2022_Travato_2026-11-16.csv",        // Class B gas
  cgas:    "RVKeeper_MaintenancePlan_2023_Redhawk_2026-11-16.csv",        // Class C gas
  fw:      "RVKeeper_MaintenancePlan_2023_Montana_High_Country_2026-11-16.csv", // Fifth wheel
  tt:      "RVKeeper_MaintenancePlan_2026_Coleman_2026-11-16.csv"         // Travel trailer
};

// ---------------------------------------------------------------- CSV input
// Small quote-aware parser: handles quoted fields with embedded commas
// (e.g. "Nov 17, 2026") and CRLF line endings. No dependencies.
function parseCSV(text) {
  var rows = [], row = [], field = "", inQuotes = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function numOrNull(v) {
  if (v == null) return null;
  var n = parseFloat(String(v).replace(/,/g, "").trim());
  return isNaN(n) ? null : n;
}
function yes(v) { return /^(yes|y|true|1)$/i.test(String(v == null ? "" : v).trim()); }

// Load one export into raw job objects. Columns used: title, component,
// interval days / miles / hours, Requires Caution, Hire Out Eligible.
// The Next Due / Last Completed / Next Due (Miles) / Next Due (Hours)
// columns are deliberately never read.
function loadSource(key, stats) {
  var text = fs.readFileSync(path.join(SRC_DIR, SOURCES[key]), "utf8");
  var rows = parseCSV(text);
  var hi = -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].trim() === "Task Title") { hi = i; break; }
  }
  if (hi < 0) throw new Error("No Task Title header in " + SOURCES[key]);
  var jobs = [];
  rows.slice(hi + 1).forEach(function (r) {
    var title = (r[0] || "").trim();
    if (!title) return;
    // Placeholder rows ("Identify Your ...") are dropped entirely.
    if (/^identify your /i.test(title)) { stats.placeholders++; return; }
    var days = numOrNull(r[3]);
    jobs.push({
      title: cleanTitle(title),
      category: (r[1] || "Other").trim() || "Other",
      intervalMonths: days == null ? null : Math.max(1, Math.round(days / 30)),
      intervalMiles: numOrNull(r[4]),
      intervalGenHours: numOrNull(r[5]),
      caution: yes(r[9]),
      pro: yes(r[10])
    });
  });
  return jobs;
}

// ---------------------------------------------------------------- cleaning
// Exact title normalizations (applied after the qualifier stripping below).
// Same job, same words, across all plans.
var TITLE_MAP = {
  // Engine oil / belts
  "Change Engine Oil and Oil Filter": "Change Engine Oil and Filter",
  "Check Accessory Drive Belt Tension": "Inspect Accessory Drive Belt",
  "Inspect Drive Belt": "Inspect Accessory Drive Belt",
  "Replace Drive Belt": "Replace Accessory Drive Belt",
  // Roof sealant / joints
  "Inspect All Roof Sealant": "Inspect Roof Sealant",
  "Inspect Roof Sealant and Seams": "Inspect Roof Sealant",
  "Inspect Roof-to-Sidewall Seals": "Inspect Roof-to-Sidewall Joint",
  // Fuel system (gas vs diesel wording for the same job)
  "Inspect Diesel Fuel Lines": "Inspect Fuel Lines",
  "Inspect Gas Fuel Lines": "Inspect Fuel Lines",
  "Inspect Diesel Fuel Cap": "Inspect Fuel Cap and Seal",
  "Inspect Diesel Fuel Tank": "Inspect Fuel Tank and Straps",
  // Transmission
  "Inspect for External Leaks": "Inspect for Transmission Leaks",
  "Inspect External Leaks": "Inspect for Transmission Leaks",
  "Inspect Cooler or Heat Exchanger": "Inspect Cooler and Heat Exchanger",
  "Change Transmission Fluid": "Change Transmission Fluid and Filter",
  "Change Fluid and Filter": "Change Transmission Fluid and Filter",
  "Verify Shift Quality and Prognostics": "Verify Shift Quality",
  "Check Electronic Fluid Level": "Check Transmission Fluid Level",
  // Chassis / brakes
  "Lubricate U-Joints": "Lubricate Driveshaft U-Joints",
  "Replace Hydraulic Brake Fluid": "Replace Brake Fluid",
  "Inspect Hydraulic Brake Hoses and Lines": "Inspect Brake Hoses and Lines",
  "Inspect Brake Hoses and Steel Lines": "Inspect Brake Hoses and Lines",
  "Inspect Brake Pads, Rotors, and Calipers": "Inspect Brake Pads and Rotors",
  "Inspect Calipers and Slide Hardware": "Inspect Calipers and Brake Hardware",
  "Inspect ABS Sensors and Wiring": "Inspect ABS and Wheel-Speed Sensor Wiring",
  "Inspect Steering Linkage and Boot Seals": "Inspect Steering Linkage",
  // Engine cooling / PCV / coolant
  "Inspect Coolant Hoses and Strength": "Inspect Coolant Hoses",
  "Replace Factory-Fill Engine Coolant": "Replace Engine Coolant",
  "Change Engine Coolant": "Replace Engine Coolant",
  "Check Engine Coolant Level": "Check Coolant Level and Concentration",
  "Inspect and Replace PCV Valve as Needed": "Inspect PCV System",
  // Waste
  "Inspect Sewer Hose If Equipped": "Inspect Sewer Hose and Fittings",
  // Slide jobs, reworded mechanism-neutral (no Hydraulic / Schwintek in
  // the title; the job is the same whatever moves the room).
  "Check Hydraulic Fluid Level": "Check Slide Fluid Level",
  "Inspect Hydraulic Leaks": "Inspect Slide System for Leaks",
  "Inspect Hydraulic Lines": "Inspect Slide Lines and Hoses",
  "Clean Pump Electrical Connections": "Clean Slide Drive Electrical Connections",
  "Check Schwintek Synchronization": "Check Slide Synchronization",
  "Inspect Schwintek Racks": "Inspect Slide Drive Racks"
};

function cleanTitle(title) {
  var t = (title || "").trim();
  // Strip "(Type Unknown)" in any casing, wherever it appears.
  t = t.replace(/\s*\(type unknown\)/gi, "");
  // Strip doubled parenthetical qualifiers: "(X) (X)" at the end of the
  // title where both halves match ignoring case, e.g. "(Hydraulic)
  // (Hydraulic)" or "(Schwintek in-Wall) (Schwintek in-wall)".
  var m;
  while ((m = t.match(/\(([^()]*)\)\s*\(([^()]*)\)\s*$/)) &&
         m[1].toLowerCase() === m[2].toLowerCase()) {
    t = t.slice(0, m.index).trim();
  }
  t = t.replace(/\s+/g, " ").trim();
  return TITLE_MAP[t] || t;
}

// ---------------------------------------------------------------- dedupe
function jobKey(j) { return j.title.toLowerCase() + "|" + j.category.toLowerCase(); }
function intervalScore(j) {
  return (j.intervalMonths != null ? 1 : 0) +
         (j.intervalMiles != null ? 1 : 0) +
         (j.intervalGenHours != null ? 1 : 0);
}
// Within one plan, one copy per cleaned title + category: keep the copy
// with the most interval data; ties keep the first copy seen.
function dedupe(jobs, stats) {
  var kept = {};
  var order = [];
  jobs.forEach(function (j) {
    var k = jobKey(j);
    if (!kept[k]) { kept[k] = j; order.push(k); return; }
    stats.deduped++;
    if (intervalScore(j) > intervalScore(kept[k])) kept[k] = j;
  });
  return order.map(function (k) { return kept[k]; });
}

// Merge helpers. addMissing appends only jobs the plan lacks (by title +
// category). mergeReplace appends, replacing any same title + category
// already present — used where the incoming set is authoritative for that
// system (the diesel chassis jobs replacing the gas ones in class-c-diesel,
// the full generator set replacing a fifth wheel's 13-job subset).
function addMissing(base, incoming, stats, label) {
  var have = {};
  base.forEach(function (j) { have[jobKey(j)] = true; });
  incoming.forEach(function (j) {
    if (!have[jobKey(j)]) {
      have[jobKey(j)] = true;
      base.push(clone(j));
      if (stats && label) stats.added[label] = (stats.added[label] || 0) + 1;
    }
  });
  return base;
}
function mergeReplace(base, incoming, stats, label) {
  var idx = {};
  base.forEach(function (j, i) { idx[jobKey(j)] = i; });
  incoming.forEach(function (j) {
    var k = jobKey(j);
    if (idx[k] != null) base[idx[k]] = clone(j);
    else { idx[k] = base.length; base.push(clone(j)); }
    if (stats && label) stats.added[label] = (stats.added[label] || 0) + 1;
  });
  return base;
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function pick(jobs, titles, category) {
  var want = {};
  titles.forEach(function (t) { want[t.toLowerCase()] = true; });
  return jobs.filter(function (j) {
    return j.category === category && want[j.title.toLowerCase()];
  }).map(clone);
}
function without(jobs, pred) { return jobs.filter(function (j) { return !pred(j); }); }

// ---------------------------------------------------------------- gating
// Title sets that decide a job's `needs` key. Every `needs` value below is
// one of the setup-question answers; `isDefault` marks the common-case
// variant of a pair (shown when the answer is missing or "Not sure").
var TANK_WATER_HEATER = [
  "Test Pressure Relief Valve", "Flush Water Heater Tank",
  "Inspect Combustion Air Vent", "Inspect and Replace Anode Rod",
  "Inspect Water Heater Vent and Wiring"
];
var TANKLESS_WATER_HEATER = [
  "Clean Water Inlet Filter", "Descale Heat Exchanger",
  "Schedule Annual Tankless Service"
];
var TPO_ROOF = ["Clean TPO Roof", "Inspect TPO Roof Membrane"];
var FIBERGLASS_ROOF = [
  "Clean the Fiberglass Roof", "Inspect for Cracks, Crazing, and Soft Spots",
  "Check for Oxidation and Chalking", "Wax or Protect the Fiberglass Roof Finish"
];
var PAINTED_METAL_ROOF = [
  "Inspect Roof for Corrosion and Coating Damage",
  "Wash Off Salt and Corrosive Deposits", "Wax Painted Roof Surfaces"
];
var GAS_ENGINE_JOBS = ["Replace Spark Plugs", "Replace Ignition Wires", "Inspect PCV System"];
var LITHIUM_BATTERY_JOBS = [
  "Check Lithium BMS Status", "Check Charge Temperature",
  "Update Smart Battery Firmware"
];
// Generator jobs written for one fuel only. The rest of the Generator
// set (exercise, annual service, fuel lines, breaker, record hours)
// fits every fuel and stays gated on the generator alone.
// "Adjust Gasoline or Propane Valve Lash" is deliberately in none of
// these lists — the same job fits a gas or a propane generator.
// The diesel coolant jobs are the liquid-cooled diesel generator's
// own cooling system (gas and propane generators are air-cooled).
var GAS_GENERATOR_JOBS = [
  "Change Built-in Gasoline Generator Oil",
  "Replace Built-in Gasoline Fuel Filter",
  "Replace Gasoline Spark Plug",
  "Clean Gasoline Carburetor System",
  "Check High Altitude Carburetor Setup"
];
var DIESEL_GENERATOR_JOBS = [
  "Check Diesel Generator Drive Parts",
  "Replace Diesel Primary Fuel Filter",
  "Replace Diesel Secondary Fuel Filter",
  "Flush Liquid Cooling System",
  "Change Diesel Oil and Filter",
  "Replace Coolant Pressure Cap",
  "Replace Diesel Coolant Pump Belt",
  "Replace Coolant Hoses and Thermostat",
  "Adjust Diesel Valve Lash",
  "Check Coolant Freeze Protection",
  "Service Diesel Fuel Injectors",
  "Check Liquid Coolant Level"
];
var PROPANE_GENERATOR_JOBS = [
  "Check Propane Generator Connection",
  "Change Built-in Propane Generator Oil",
  "Replace Propane Spark Plug"
];
// Slide jobs written for one mechanism only. The rest of the Slideouts
// set (box and sweeps, seals, damage, alignment, fasteners, electrical)
// fits every slide and stays gated on the slides alone. "Inspect Slide
// Drive Racks" is in the Schwintek list: its source title is "Inspect
// Schwintek Racks" — the racks are the Schwintek in-wall tracks, not a
// through-frame rack-and-pinion rail.
var SCHWINTEK_SLIDE_JOBS = [
  "Check Slide Synchronization",
  "Inspect Slide Drive Racks",
  "Clean Schwintek slide tracks",
  "Resync Schwintek slide motors"
];
var RACKPINION_SLIDE_JOBS = [
  "Check slide shear pins & gear packs"
];
var CABLE_SLIDE_JOBS = [
  "Inspect slide cables & tension"
];
var HYDRAULIC_SLIDE_JOBS = [
  "Check Slide Fluid Level",
  "Inspect Slide System for Leaks",
  "Inspect Slide Lines and Hoses"
];
// Notes written in our own words for jobs whose title alone doesn't
// say how (the fluid check wants the slides in; the Schwintek tracks
// want a brush, never grease). Hand-written jobs carry their note on
// the job itself (see hand()); this map covers source jobs.
var JOB_NOTES = {
  "Check Slide Fluid Level": "Check it with all slides retracted. Top up with ATF (Dexron III / Mercon V).",
  "Verify Inverter Settings": "For an inverter/charger, the charge profile must match the house battery type — flooded, AGM, or lithium (see the House batteries answer)."
};
// The Inverter jobs that belong to the inverter itself. The transfer
// switching and charger-operation jobs stay ungated — a transfer switch
// and a charger also live on rigs with no inverter at all.
var INVERTER_JOBS = [
  "Verify Inverter Settings", "Update Inverter Firmware",
  "Check Inverter Fault History", "Inspect and Clean Inverter Vents",
  "Inspect DC Fuse or Breaker", "Check DC Input Connections",
  "Inspect Remote Panel", "Inspect AC Wiring",
  "Inspect Chassis Ground", "Inspect Mounting Security"
];

function has(list, title) { return list.indexOf(title) !== -1; }

// ctx: { fuel: "gas" | "diesel" | null, typicalRoof, genDefault: boolean, slideDefault }
//   fuel is null for trailers (no engine/fuel jobs of their own).
//   typicalRoof is the roof material the source rig for the plan has;
//     the generic roof-seam job is the common-case variant for that roof.
//   genDefault is false for the Class B plans and class-c-diesel, whose
//     generator sets only load on an explicit Built-in answer.
//   slideDefault is the slide mechanism the plan was built from
//     ("hydraulic" for class-a-diesel, "schwintek" for the Class C
//     plans); a mechanism job is the usual one only when it matches it.
function gateJob(job, ctx) {
  var needs = null, isDefault = false;
  var t = job.title, c = job.category;
  if (t === "Test Tru-Earth leveling") {
    // Only ever on an exact Yes — never the plan default, never on
    // "Not sure" or unanswered. The question itself only shows when
    // Suspension is Liquid Springs, so the answer implies the rig.
    needs = { truearth: "yes" };
  } else if (c === "Generator") {
    needs = { generator: "builtin" };
    isDefault = !!ctx.genDefault;
    // Fuel-specific jobs also need the rig's generator fuel. The fuel
    // key only hides a job on an explicit mismatch (see starterApplies
    // in www/app.js) — "Not sure" keeps the plan's own fuel jobs.
    if (has(GAS_GENERATOR_JOBS, t)) needs.genfuel = "gas";
    else if (has(DIESEL_GENERATOR_JOBS, t)) needs.genfuel = "diesel";
    else if (has(PROPANE_GENERATOR_JOBS, t)) needs.genfuel = "propane";
  } else if (c === "Slideouts") {
    needs = { slides: "yes" }; isDefault = true;
    // Mechanism-specific slide jobs also need the rig's slide
    // mechanism. A mechanism job is the plan's usual one only when it
    // matches the mechanism the plan was built from (ctx.slideDefault);
    // otherwise it only shows on an explicit answer (or "More than one
    // type"). "Not sure" keeps the plan's own mechanism jobs.
    var sm = null;
    if (has(SCHWINTEK_SLIDE_JOBS, t)) sm = "schwintek";
    else if (has(RACKPINION_SLIDE_JOBS, t)) sm = "rackpinion";
    else if (has(CABLE_SLIDE_JOBS, t)) sm = "cable";
    else if (has(HYDRAULIC_SLIDE_JOBS, t)) sm = "hydraulic";
    if (sm) {
      needs.slidetype = sm;
      isDefault = (ctx.slideDefault === sm);
    }
  } else if (c === "Slide Toppers") {
    needs = { slidetoppers: "yes" };
  } else if (c === "Patio Awning") {
    // The wind sensor and the motor only exist on a power awning, and
    // only on an exact answer — never the default, never on "Not sure".
    // The spring job is the manual twin. The fabric, arms, and
    // fastener jobs fit either awning, so their need names both values
    // and they stay the plan default — "Not sure" keeps them, and only
    // "None" hides them.
    if (t === "Test Wind Sensor Auto-Retract" || t === "Test awning motor") {
      needs = { awning: "power" };
    } else if (t === "Lubricate awning arms and check spring") {
      needs = { awning: "manual" };
    } else {
      needs = { awning: ["power", "manual"] };
      isDefault = true;
    }
  } else if (c === "Inverter") {
    // Inverter jobs fit either kind of inverter, stay the plan default
    // — "Not sure" keeps them — and hide only when there is no inverter.
    if (has(INVERTER_JOBS, t)) {
      needs = { inverter: ["invertercharger", "inverteronly"] };
      isDefault = true;
    }
  } else if (c === "Water Heater") {
    if (has(TANK_WATER_HEATER, t)) { needs = { waterHeater: "tank" }; isDefault = true; }
    else if (has(TANKLESS_WATER_HEATER, t)) { needs = { waterHeater: "tankless" }; }
    // Anything else here is the diesel hydronic set (class-a-diesel):
    // no setup answer matches it, so it stays ungated.
  } else if (c === "Washer/Dryer") {
    needs = { washerdryer: "yes" };
  } else if (c === "Dishwasher") {
    needs = { dishwasher: "yes" };
  } else if (c === "Central Vacuum") {
    needs = { centralvac: "yes" };
  } else if (c === "Solar") {
    needs = { solar: "yes" };
  } else if (t === "Inspect Spare Tire") {
    needs = { sparetire: "yes" };
  } else if (c === "Furnace") {
    // Diesel-heater jobs (class-a-diesel) have no matching setup answer
    // and stay ungated; gas furnace jobs are the common case.
    if (!/^Run Diesel Heater|^Get Diesel Heater|^Check Diesel Heater|^Clear Diesel Heater/.test(t)) {
      needs = { furnace: "gas" }; isDefault = true;
    }
  } else if (c === "Refrigerator") {
    if (t === "Inspect Burner Flame" || t === "Inspect Flue and Burner Area") {
      needs = { fridge: "absorption" }; isDefault = true;
    } else if (t === "Inspect Residential Vents") {
      needs = { fridge: "residential" };
    }
  } else if (c === "Electrical") {
    if (t === "Verify AGM Charge Maintenance") needs = { batteries: "agm" };
    else if (has(LITHIUM_BATTERY_JOBS, t)) needs = { batteries: "lithium" };
    else if (t === "Clean Converter Ventilation") {
      // An inverter/charger does the charging, so there is no standalone
      // converter to clean — and either answer can say so. The job hides
      // when the inverter answer OR the converter answer names an
      // inverter/charger; every other answer keeps it.
      needs = { inverter: ["inverteronly", "none"], converter: ["smart", "singlestage"] };
      isDefault = true;
    } else if (t === "Verify converter charge profile") {
      // Only on an exact smart match — a single-stage converter has no
      // profile to verify, and an inverter/charger has no converter.
      needs = { converter: "smart" };
    } else if (t === "Check converter output voltage") {
      needs = { converter: "singlestage" };
    } else if (t === "Check battery water levels") {
      // Both keys must fit: a single-stage converter on flooded
      // batteries. The matcher checks every key in `needs`.
      needs = { converter: "singlestage", batteries: "flooded" };
    }
  } else if (c === "Roof") {
    if (has(TPO_ROOF, t)) needs = { roof: "tpo" };
    else if (has(FIBERGLASS_ROOF, t)) needs = { roof: "fiberglass" };
    else if (has(PAINTED_METAL_ROOF, t)) needs = { roof: "aluminum" };
    else if (t === "Inspect Roof Sealant") {
      needs = { roof: ctx.typicalRoof }; isDefault = true;
    }
    // Other roof jobs (vents, roof-mounted components, debris, the
    // roof-to-sidewall joint) fit every roof and stay ungated.
  } else if (c === "Fuel System") {
    if (ctx.fuel) { needs = { fuel: ctx.fuel }; isDefault = true; }
  } else if (c === "Engine") {
    if (has(GAS_ENGINE_JOBS, t)) { needs = { fuel: "gas" }; isDefault = true; }
    else if (t === "Inspect Turbocharger") { needs = { fuel: "diesel" }; isDefault = true; }
  }
  // Leveling, chassis, transmission (other than fuel-specific), tires
  // (other than the spare), safety, and the rest fit the plan as built.
  var out = {
    title: job.title,
    category: job.category,
    intervalMonths: job.intervalMonths,
    intervalMiles: job.intervalMiles,
    intervalGenHours: job.intervalGenHours,
    caution: job.caution,
    pro: job.pro
  };
  if (job.note) out.note = job.note;
  if (JOB_NOTES[t]) out.note = JOB_NOTES[t];
  if (needs) out.needs = needs;
  if (isDefault) out.isDefault = true;
  return out;
}

// ---------------------------------------------------------------- hand-written jobs
// Written in our own words for gaps the exports miss. Intervals are plain
// maintenance rhythms; caution marks fuel / cable-failure jobs; pro marks
// jobs a shop can be hired for (matching the exports, where nearly every
// job is hire-out eligible).
function hand(title, category, days, caution, note) {
  var j = {
    title: title, category: category,
    intervalMonths: Math.max(1, Math.round(days / 30)),
    intervalMiles: null, intervalGenHours: null,
    caution: !!caution, pro: true
  };
  if (note) j.note = note;
  return j;
}
var CABOVER_JOBS = [
  hand("Inspect Cab-Over Seals and Window", "Exterior", 180),
  hand("Check Cab-Over Area for Leaks", "Exterior", 90),
  hand("Inspect Cab-Over Bunk Structure", "Exterior", 365)
];
var COUPLER_JOBS = [
  hand("Inspect Coupler and Latch", "Chassis", 90, true),
  hand("Inspect Safety Chains and Hooks", "Chassis", 90, true),
  hand("Inspect Weight-Distribution Hitch", "Chassis", 180),
  hand("Grease Coupler Ball and Hitch Components", "Chassis", 180)
];
var GALLEY_HATCH_JOBS = [
  hand("Inspect Galley Hatch Seals", "Exterior", 180),
  hand("Inspect Galley Hatch Hinges and Struts", "Exterior", 180),
  hand("Check Galley Hatch for Leaks", "Exterior", 90)
];
var LIFT_SYSTEM_JOBS = [
  hand("Inspect Lift Winch and Handle", "Leveling and Support", 180),
  hand("Inspect Lift Cables", "Leveling and Support", 180, true),
  hand("Inspect Lift Pulleys", "Leveling and Support", 180),
  hand("Inspect Lift Arms and Springs", "Leveling and Support", 365),
  hand("Inspect Canvas Attachment to Roof and Body", "Canvas Care", 180)
];
var CORNER_JACK_JOBS = [
  hand("Inspect Corner Jacks", "Leveling and Support", 180),
  hand("Lubricate Corner Jack Mechanisms", "Leveling and Support", 180),
  hand("Inspect Tie-Downs and Turnbuckles", "Exterior", 90, true),
  hand("Inspect Bed Seal", "Exterior", 180),
  hand("Check Camper Fit and Clearance in Truck Bed", "Exterior", 365)
];
var GARAGE_JOBS = [
  hand("Inspect Ramp Door Seals and Hinges", "Exterior", 180),
  hand("Inspect Ramp Door Cables and Springs", "Exterior", 180, true),
  hand("Clean and Inspect Ramp Door Surface", "Exterior", 90),
  hand("Inspect Garage Tie-Downs and D-Rings", "Exterior", 180),
  hand("Inspect Garage Fuel Station and Hoses", "Safety", 180, true),
  hand("Check Garage Fuel Station for Leaks", "Safety", 90, true)
];
// Slide-mechanism jobs the exports miss: one set per mechanism, gated
// on the slide-mechanism answer (see gateJob). Every plan gets them;
// they only show for a rig with slides, and a mechanism job is the
// plan's usual one only when it matches the plan's own mechanism.
var SLIDE_MECHANISM_JOBS = [
  hand("Clean Schwintek slide tracks", "Slideouts", 90, false,
    "Brush or vacuum the tracks clean so the motors run true. Never grease them — grease holds grit and wrecks the tracks."),
  hand("Resync Schwintek slide motors", "Slideouts", 180, false,
    "Only needed if the room runs unevenly or one side lags. Run the room all the way out, then hold Extend about 5 seconds after it stops so the motors resync."),
  hand("Check slide shear pins & gear packs", "Slideouts", 365, false,
    "Look for sheared pins and worn gear packs — if the motor spins and the room doesn't move, a pin has sheared."),
  hand("Inspect slide cables & tension", "Slideouts", 180, true,
    "Look for fraying and rubbing on the cables, and check the tension at the corner nuts and the pulleys. Don't overtighten — it overloads the motor.")
];
// Tru-Earth Leveling is an option on Liquid Springs rigs: the leveling
// runs through the suspension itself, same fluid and struts, no separate
// jacks. The one extra check is the leveling itself — the height sensors
// and accelerometer it depends on. It only shows on an exact Yes.
var TRUEARTH_JOBS = [
  hand("Test Tru-Earth leveling", "Leveling and Support", 180, false,
    "Run the leveling — all four corners level and hold, no sensor faults or warnings. Check the fluid level and fittings at the same time: a leak shows up as a corner that won't hold level.")
];
// Awning jobs the exports miss, one per awning type. A power awning has
// a motor and a wind sensor; a manual one has a spring-loaded roller
// and a pull strap. The fabric and fastener care is the same either way.
var AWNING_JOBS = [
  hand("Test awning motor", "Patio Awning", 180, false,
    "Extend and retract the awning and listen. Humming without moving means a stripped gearbox or a sheared drive pin; silent means check the fuse, the switch, and the control board. Check the wiring, and know where the manual override crank is."),
  hand("Lubricate awning arms and check spring", "Patio Awning", 180, false,
    "Lubricate the arm pivots and check the pull strap and arms for bends. Spring tension is a shop job — the torsion spring holds serious energy.")
];
// Converter jobs the exports miss, one per converter type. A smart
// multi-stage converter has a charge profile to check; a single-stage
// one holds a fixed voltage and boils water out of flooded batteries
// on long shore-power stays.
var CONVERTER_JOBS = [
  hand("Verify converter charge profile", "Electrical", 365, false,
    "Confirm the converter is set to the right charging profile for the house battery type — lithium mode switch or auto-detect for lithium, 3-stage with float for flooded or AGM."),
  hand("Check converter output voltage", "Electrical", 365, false,
    "Measure the voltage at the battery while on shore power. A full battery held above about 13.8V means the converter is overcharging it."),
  hand("Check battery water levels", "Electrical", 30, false,
    "A single-stage converter boils water off on long shore stays. Check the levels monthly while plugged in and top up with distilled water.")
];

// ---------------------------------------------------------------- build
function main() {
  var stats = { placeholders: 0, deduped: 0, added: {} };
  var src = {};
  Object.keys(SOURCES).forEach(function (k) { src[k] = loadSource(k, stats); });

  // Sets lifted from the exports themselves (intervals and caution/pro
  // come from the source rows, not from tables here).
  var tankSet = pick(src.agas, TANK_WATER_HEATER, "Water Heater");
  var tanklessSet = pick(src.tt, TANKLESS_WATER_HEATER, "Water Heater");
  var waterFiltrationSet = pick(src.agas, [
    "Replace and Flush Filter Cartridge", "Inspect and Service Canister O-Rings",
    "Inspect Filter Connections for Leaks", "Inspect Filter Mounting Hardware",
    "Inspect Filter Housing and Lid", "Replace Serviceable Housing O-Ring"
  ], "Water Filtration");
  var slideTopperSet = pick(src.agas, [
    "Clean Slide Topper Fabric", "Inspect Brackets, Fasteners, and End Caps",
    "Inspect Topper Fabric for Wear", "Inspect Roller Tension and Fabric Sag",
    "Inspect Awning Rail and Fabric Alignment", "Protect Vinyl Topper Fabric",
    "Restore Acrylic Fabric Water Repellency",
    "Inspect Topper Fabric to Assess Replacement Need"
  ], "Slide Toppers");
  var gasGeneratorSet = src.agas.filter(function (j) { return j.category === "Generator"; });
  var dieselGeneratorSet = src.adiesel.filter(function (j) { return j.category === "Generator"; });
  var propaneGeneratorSet = src.bdiesel.filter(function (j) { return j.category === "Generator"; });
  // Variant sets: the source jobs for each generator fuel, each slide
  // mechanism, and the inverter — lifted from the exports that have
  // them so every plan can carry the full set (see emit()). The
  // generic jobs inside the generator sets share titles across fuels
  // and dedupe on the way in; only the fuel-specific titles are new
  // to a plan. The transfer-switch and charger-operation jobs are
  // deliberately NOT in the inverter set — they stay ungated.
  var hydraulicSlideSet = pick(src.adiesel, HYDRAULIC_SLIDE_JOBS, "Slideouts");
  var schwintekSlideSet = pick(src.cgas, ["Check Slide Synchronization", "Inspect Slide Drive Racks"], "Slideouts");
  var inverterSet = pick(src.agas, INVERTER_JOBS, "Inverter");
  var defDpfSet = pick(src.bdiesel, [
    "Check DEF Level", "Refill DEF with Certified Fluid",
    "Inspect DEF Lines and Pump", "Inspect DEF Tank and Heater",
    "Check DPF Saturation Level", "Service DPF Ash Load"
  ], "Fuel System");
  var canvasSet = src.bdiesel.filter(function (j) { return j.category === "Canvas Care"; });
  var toiletSet = pick(src.agas, [
    "Inspect Toilet Water Valve", "Inspect and Lubricate Bowl Seal",
    "Inspect Toilet Base Seal", "Inspect Foot Pedal or Handle",
    "Inspect Flush Mechanism"
  ], "Toilet");
  var tpoRoofSet = pick(src.agas, TPO_ROOF, "Roof");
  var fiberglassRoofSet = pick(src.adiesel, FIBERGLASS_ROOF, "Roof");
  var paintedRoofSet = pick(src.bgas, PAINTED_METAL_ROOF, "Roof");
  var roofSeamJob = pick(src.agas, ["Inspect Roof Sealant"], "Roof");

  // Roof matrix: every plan that has roof jobs gets the material-specific
  // sets it lacks, so any roof answer finds its own care. The generic seam
  // job is keyed to the plan's typical roof (see gateJob).
  function applyRoofMatrix(jobs, stats) {
    addMissing(jobs, tpoRoofSet, stats, "roofMatrix");
    addMissing(jobs, fiberglassRoofSet, stats, "roofMatrix");
    addMissing(jobs, paintedRoofSet, stats, "roofMatrix");
    addMissing(jobs, roofSeamJob, stats, "roofMatrix"); // class-b-gas has none
    return jobs;
  }
  // Tank + tankless side by side, gated by water-heater type. The diesel
  // hydronic set (class-a-diesel) is left alone — it is neither.
  function applyWaterHeaterSets(jobs, stats) {
    addMissing(jobs, tankSet, stats, "tankWaterHeater");
    addMissing(jobs, tanklessSet, stats, "tanklessWaterHeater");
    return jobs;
  }

  var plans = [];
  var dedupeByPlan = {};
  function emit(id, label, rigTypes, ctx, jobs) {
    var before = stats.deduped;
    jobs = dedupe(jobs, stats);
    // Every plan gets the slide-mechanism jobs; they only show for a
    // rig with slides, gated on the mechanism answer (see gateJob).
    addMissing(jobs, SLIDE_MECHANISM_JOBS, stats, "slideMechanism");
    // And the Tru-Earth check; it only shows on an exact Yes.
    addMissing(jobs, TRUEARTH_JOBS, stats, "truEarth");
    // And the awning jobs; the power and manual ones only show on an
    // exact answer, the common ones on either.
    addMissing(jobs, AWNING_JOBS, stats, "awning");
    // And the converter jobs; each only shows on its exact converter type.
    addMissing(jobs, CONVERTER_JOBS, stats, "converter");
    // Variant completeness: every plan also carries every fuel's
    // generator jobs, every slide mechanism's jobs, and the inverter
    // jobs. The `needs` gates decide what a rig actually sees — a plan
    // built from a gas rig must still serve a diesel generator, a
    // hydraulic slide, or an inverter, or the owner gets no jobs for
    // their own type at all. "Not sure" behavior is unchanged: the
    // gates, not the presence, decide what shows.
    addMissing(jobs, gasGeneratorSet, stats, "gasGeneratorSet");
    addMissing(jobs, dieselGeneratorSet, stats, "dieselGeneratorSet");
    addMissing(jobs, propaneGeneratorSet, stats, "propaneGeneratorSet");
    addMissing(jobs, hydraulicSlideSet, stats, "hydraulicSlideSet");
    addMissing(jobs, schwintekSlideSet, stats, "schwintekSlideSet");
    addMissing(jobs, inverterSet, stats, "inverterSet");
    dedupeByPlan[id] = stats.deduped - before;
    plans.push({
      id: id, label: label, rigTypes: rigTypes,
      jobs: jobs.map(function (j) { return gateJob(j, ctx); })
    });
  }

  // -- class-a-gas: Newmar export as-is + tankless + roof matrix.
  var agasJobs = applyRoofMatrix(applyWaterHeaterSets(clone(src.agas), stats), stats);
  emit("class-a-gas", "Full Class A gas plan", ["Class A"],
       { fuel: "gas", typicalRoof: "tpo", genDefault: true }, agasJobs);

  // -- class-a-diesel: Dutch Star export + DEF/DPF set + roof matrix.
  // Water-heater sets NOT added: this plan's heater is the diesel hydronic
  // system, not a tank or tankless unit.
  var adieselJobs = applyRoofMatrix(clone(src.adiesel), stats);
  addMissing(adieselJobs, defDpfSet, stats, "defDpf");
  emit("class-a-diesel", "Full Class A diesel plan", ["Class A"],
       { fuel: "diesel", typicalRoof: "fiberglass", genDefault: true, slideDefault: "hydraulic" }, adieselJobs);

  // -- class-b-diesel: Plateau export, minus the pop-top Canvas Care jobs
  // and the Sprinter 4x4-specific chassis jobs (transfer case oil, front
  // axle gear oil, propeller shaft / flex discs). Tank set completed
  // (its export lacks the anode-rod job) + tankless + roof matrix.
  var fourByFour = [
    "Change Transfer Case Oil", "Change Front Axle Gear Oil",
    "Inspect Propeller Shaft and Flex Discs"
  ];
  var bdieselJobs = without(clone(src.bdiesel), function (j) {
    return j.category === "Canvas Care" || has(fourByFour, j.title);
  });
  applyWaterHeaterSets(bdieselJobs, stats);
  applyRoofMatrix(bdieselJobs, stats);
  emit("class-b-diesel", "Full Class B diesel plan", ["Class B"],
       { fuel: "diesel", typicalRoof: "aluminum", genDefault: false }, bdieselJobs);

  // -- class-b-gas: Travato export + the gasoline generator set from the
  // Class A gas plan (behind the generator question, no isDefault — many
  // B vans have no generator) + the standard gravity-toilet set in place
  // of the Travato's single cassette-toilet job + tankless + roof matrix.
  var bgasJobs = without(clone(src.bgas), function (j) {
    return j.title === "Exercise Dump Valve If Equipped";
  });
  addMissing(bgasJobs, gasGeneratorSet, stats, "gasGeneratorSet");
  addMissing(bgasJobs, toiletSet, stats, "toiletSet");
  applyWaterHeaterSets(bgasJobs, stats);
  applyRoofMatrix(bgasJobs, stats);
  emit("class-b-gas", "Full Class B gas plan", ["Class B"],
       { fuel: "gas", typicalRoof: "aluminum", genDefault: false }, bgasJobs);

  // -- class-c-gas: Redhawk export + generic cab-over jobs + slide topper
  // jobs (behind the slide-topper question) + tankless + roof matrix.
  var cgasJobs = applyRoofMatrix(applyWaterHeaterSets(clone(src.cgas), stats), stats);
  addMissing(cgasJobs, slideTopperSet, stats, "slideToppers");
  addMissing(cgasJobs, CABOVER_JOBS, stats, "cabOver");
  emit("class-c-gas", "Full Class C gas plan", ["Class C"],
       { fuel: "gas", typicalRoof: "tpo", genDefault: true, slideDefault: "schwintek" }, cgasJobs);

  // -- fifth-wheel: Montana export + Water Filtration 6 from the Class A
  // gas plan + the full generator set behind the question (its export has
  // only a 13-job subset) + tankless + roof matrix.
  var fwJobs = applyRoofMatrix(applyWaterHeaterSets(clone(src.fw), stats), stats);
  addMissing(fwJobs, waterFiltrationSet, stats, "waterFiltration");
  mergeReplace(fwJobs, gasGeneratorSet, stats, "fullGeneratorSet");
  emit("fifth-wheel", "Full fifth wheel plan", ["Fifth wheel"],
       { fuel: null, typicalRoof: "tpo", genDefault: true }, fwJobs);

  // -- travel-trailer: Coleman export + coupler / safety-chain /
  // weight-distribution jobs + Water Filtration 6 + the generator set +
  // slide topper jobs + the tank water-heater set alongside its tankless
  // set + roof matrix.
  var ttJobs = applyRoofMatrix(applyWaterHeaterSets(clone(src.tt), stats), stats);
  addMissing(ttJobs, waterFiltrationSet, stats, "waterFiltration");
  addMissing(ttJobs, gasGeneratorSet, stats, "gasGeneratorSet");
  addMissing(ttJobs, slideTopperSet, stats, "slideToppers");
  addMissing(ttJobs, COUPLER_JOBS, stats, "coupler");
  emit("travel-trailer", "Full travel trailer plan", ["Travel trailer"],
       { fuel: null, typicalRoof: "tpo", genDefault: true }, ttJobs);

  // -- class-c-diesel (derived): Class C gas jobs minus gas-specific jobs
  // (spark plugs, ignition wires, PCV, gas fuel system, gasoline
  // generator set), plus the Plateau Sprinter engine / chassis /
  // suspension / brakes / diesel-fuel / DEF / DPF jobs (not the 4x4 ones)
  // and the Plateau propane generator set. The Sprinter jobs replace same
  // title + category jobs so the diesel intervals win. Cab-over jobs stay.
  var cdieselJobs = applyRoofMatrix(applyWaterHeaterSets(clone(src.cgas), stats), stats);
  addMissing(cdieselJobs, slideTopperSet, stats, "slideToppers");
  addMissing(cdieselJobs, CABOVER_JOBS, stats, "cabOver");
  var gasSpecific = [
    "Replace Spark Plugs", "Replace Ignition Wires", "Inspect PCV System"
  ];
  var gasFuelTitles = [
    "Inspect Fuel Lines", "Inspect Fuel Cap and Seal",
    "Inspect Fuel Tank and Straps", "Replace Serviceable Fuel Filter"
  ];
  cdieselJobs = without(cdieselJobs, function (j) {
    if (j.category === "Generator") return true;
    if (j.category === "Engine" && has(gasSpecific, j.title)) return true;
    if (j.category === "Fuel System" && has(gasFuelTitles, j.title)) return true;
    return false;
  });
  var plateauDiesel = without(clone(src.bdiesel), function (j) {
    return j.category === "Canvas Care" || j.category === "Generator" ||
           j.category === "Water Heater" || j.category === "Water Filtration" ||
           j.category === "Roof" || j.category === "Solar" ||
           j.category === "Inverter" || j.category === "Toilet" ||
           j.category === "Refrigerator" || j.category === "Furnace" ||
           j.category === "AC" || j.category === "Electrical" ||
           j.category === "Safety" || j.category === "Seasonal" ||
           j.category === "Exterior" || j.category === "Waste System" ||
           j.category === "Water Systems" || j.category === "Patio Awning" ||
           j.category === "Tires" || j.category === "Leveling and Support" ||
           j.category === "Engine and Drivetrain" ||
           has(fourByFour, j.title);
  });
  // plateauDiesel is now Engine, Fuel System, Transmission, Chassis,
  // Suspension, Chassis Brakes — the Sprinter running gear.
  mergeReplace(cdieselJobs, plateauDiesel, stats, "sprinterDiesel");
  addMissing(cdieselJobs, propaneGeneratorSet, stats, "propaneGeneratorSet");
  emit("class-c-diesel", "Full Class C diesel plan", ["Class C"],
       { fuel: "diesel", typicalRoof: "tpo", genDefault: false, slideDefault: "schwintek" }, cdieselJobs);

  // -- teardrop (derived): travel-trailer core + rear galley hatch jobs.
  var teardropJobs = clone(ttJobs);
  addMissing(teardropJobs, GALLEY_HATCH_JOBS, stats, "galleyHatch");
  emit("teardrop", "Teardrop plan", ["Travel trailer"],
       { fuel: null, typicalRoof: "tpo", genDefault: true }, teardropJobs);

  // -- pop-up (derived): travel-trailer core + Plateau Canvas Care jobs
  // (tent fabric, seams, zippers, vinyl windows) + lift-system jobs.
  var popupJobs = clone(ttJobs);
  addMissing(popupJobs, canvasSet, stats, "canvasCare");
  addMissing(popupJobs, LIFT_SYSTEM_JOBS, stats, "liftSystem");
  emit("pop-up", "Pop-up camper plan", ["Travel trailer"],
       { fuel: null, typicalRoof: "tpo", genDefault: true }, popupJobs);

  // -- destination (derived): travel-trailer plan as-is, new id/label.
  emit("destination", "Destination trailer plan", ["Travel trailer"],
       { fuel: null, typicalRoof: "tpo", genDefault: true }, clone(ttJobs));

  // -- truck-camper (derived): travel-trailer core minus the running gear
  // the truck owns (tires, brakes, bearings, suspension, axle jobs) and
  // minus the coupler / safety-chain / weight-distribution jobs (no
  // coupler on a truck camper), plus corner jacks, tie-downs and bed seal.
  var truckJobs = without(clone(ttJobs), function (j) {
    return j.category === "Tires" || j.category === "Brakes" ||
           j.category === "Wheel Bearings" || j.category === "Suspension" ||
           j.category === "Chassis"; // the coupler jobs are the only Chassis jobs here
  });
  addMissing(truckJobs, CORNER_JACK_JOBS, stats, "cornerJacks");
  emit("truck-camper", "Truck camper plan", ["Truck camper"],
       { fuel: null, typicalRoof: "tpo", genDefault: true }, truckJobs);

  // -- toy-hauler (derived): fifth-wheel core + garage jobs.
  var toyJobs = clone(fwJobs);
  addMissing(toyJobs, GARAGE_JOBS, stats, "garage");
  emit("toy-hauler", "Toy Hauler plan", ["Travel trailer", "Fifth wheel"],
       { fuel: null, typicalRoof: "tpo", genDefault: true }, toyJobs);

  // -- write www/plans.js
  var header = [
    "// RollOnRV prebuilt maintenance plans.",
    "// Generated by tools/build-plans.js from the 7 source plan exports —",
    "// do not edit by hand; change the generator (or the sources) and rerun it.",
    "// Each plan: { id, label, rigTypes, jobs }. Each job: { title, category,",
    "// intervalMonths, intervalMiles, intervalGenHours, caution, pro,",
    "// needs?, isDefault?, note? }. `needs` holds setup-question answers; a job",
    "// with `needs` shows when every answer fits — an exact match, or a",
    "// missing / \"Not sure\" answer on the usual job (`isDefault`). The",
    "// generator-fuel answer (`genfuel`) is the one exception: it only",
    "// hides a job when it names a different fuel outright.",
    "var PREBUILT_PLANS = "
  ].join("\n");
  var out = header + JSON.stringify(plans, null, 2) + ";\n";
  fs.writeFileSync(OUT_FILE, out, "utf8");

  var total = plans.reduce(function (n, p) { return n + p.jobs.length; }, 0);
  console.log("Wrote " + OUT_FILE);
  plans.forEach(function (p) { console.log("  " + p.id + ": " + p.jobs.length + " jobs"); });
  console.log("Total jobs: " + total);
  console.log("Placeholders dropped: " + stats.placeholders);
  console.log("Duplicates merged: " + stats.deduped + " " + JSON.stringify(dedupeByPlan));
  console.log("Added by move: " + JSON.stringify(stats.added));
}

main();
