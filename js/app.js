/* Cycle Notes — a private, offline-first menstrual & symptom tracker.
 * All data lives in localStorage on this device. Only research search terms
 * are sent to Europe PMC (a public literature database). */
(function () {
  "use strict";

  // ---------- storage ----------
  const STORE_KEY = "cycleNotes.v1";
  const CACHE_KEY = "cycleNotes.researchCache.v1";

  const defaultState = () => ({
    version: 1,
    profile: {
      removalDate: "2026-06-25",
      removalApprox: true,
      history: [
        { label: "Combined oral contraceptive pill", from: "", to: "2023-06-01", note: "From age 18" },
        { label: "Etonogestrel implant (Implanon)", from: "2023-06-01", to: "2026-06-25", note: "About 3 years" }
      ]
    },
    customSymptoms: {},   // id -> {id, name, desc, query, created}
    entries: {}           // "YYYY-MM-DD" -> entry
  });

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const d = defaultState();
        return { ...d, ...s, profile: { ...d.profile, ...(s.profile || {}) } };
      }
    } catch (e) { console.warn("Could not read saved data", e); }
    return defaultState();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); flash("Saved on this device."); }
    catch (e) { flash("Couldn't save. Storage may be full or blocked. Export a backup."); }
  }
  function loadCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { return {}; } }
  function saveCache(c) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) { /* ignore */ } }

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const todayISO = () => toISO(new Date());
  const addDays = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const diffDays = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 864e5); // b - a
  const fmt = (iso, opts = { day: "numeric", month: "short", year: "numeric" }) => fromISO(iso).toLocaleDateString(undefined, opts);
  let flashTimer;
  function flash(msg) {
    const el = $("#saved-msg"); if (!el) return;
    el.textContent = msg; clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (el.textContent = "Saved automatically on this device."), 2000);
  }

  const FLOWS = [
    { id: "none", label: "None" },
    { id: "spotting", label: "Spotting" },
    { id: "light", label: "Light" },
    { id: "medium", label: "Medium" },
    { id: "heavy", label: "Heavy" },
    { id: "vheavy", label: "Very heavy (soaking through in 1–2 h)" }
  ];
  const BLEED = new Set(["light", "medium", "heavy", "vheavy"]);
  const PHASES = [
    { id: "menstrual", label: "Period", short: "Period" },
    { id: "follicular", label: "Follicular", short: "Follic." },
    { id: "ovulation", label: "Ovulation window", short: "Ovul." },
    { id: "luteal", label: "Luteal", short: "Luteal" },
    { id: "premenstrual", label: "Pre-period (last 5 days)", short: "Pre-period" }
  ];
  const phaseLabel = (id) => (PHASES.find((p) => p.id === id) || { label: "Unknown" }).label;

  function allSymptoms() {
    const custom = Object.values(state.customSymptoms).map((c) => ({
      id: c.id, name: c.name, category: "Your symptoms", custom: true, desc: c.desc,
      query: c.query, about: c.desc || "", hormonal: "", stress: "", gp: [], urgent: []
    }));
    return [...custom, ...window.KB];
  }
  const symById = (id) => allSymptoms().find((s) => s.id === id);

  function entry(date) { return state.entries[date] || { flow: "none", symptoms: {}, stress: null, mood: null, sleep: null, ptest: "", notes: "" }; }
  function setEntry(date, patch) {
    const e = { ...entry(date), ...patch };
    const empty = e.flow === "none" && !Object.keys(e.symptoms).length && e.stress == null && e.mood == null && e.sleep == null && !e.ptest && !e.notes;
    if (empty) delete state.entries[date]; else state.entries[date] = e;
    save();
  }

  // ---------- cycle analysis ----------
  function computeCycles() {
    const bleedDays = Object.keys(state.entries).filter((d) => BLEED.has(state.entries[d].flow)).sort();
    const periods = [];
    for (const d of bleedDays) {
      const last = periods[periods.length - 1];
      if (last && diffDays(last.end, d) <= 2) { last.end = d; last.days.push(d); }
      else periods.push({ start: d, end: d, days: [d] });
    }
    periods.forEach((p, i) => {
      p.length = diffDays(p.start, p.end) + 1;
      p.heavyDays = p.days.filter((d) => ["heavy", "vheavy"].includes(state.entries[d].flow)).length;
      p.vheavyDays = p.days.filter((d) => state.entries[d].flow === "vheavy").length;
      p.cycleLength = periods[i + 1] ? diffDays(p.start, periods[i + 1].start) : null;
    });
    const lens = periods.map((p) => p.cycleLength).filter(Boolean);
    const recent = lens.slice(-6);
    const avg = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 28;
    const avgPeriod = periods.length ? Math.round(periods.slice(-6).reduce((a, p) => a + p.length, 0) / Math.min(periods.length, 6)) : 5;
    const last = periods[periods.length - 1];
    const nextStart = last ? addDays(last.start, avg) : null;
    return { periods, lengths: lens, avg, avgPeriod, confident: recent.length >= 3, nextStart, variation: recent.length >= 2 ? Math.max(...recent) - Math.min(...recent) : null };
  }

  // Returns {phase, cycleDay, estimated, periodIndex} for a date, or null.
  function phaseFor(date, cyc = computeCycles()) {
    const { periods, avg } = cyc;
    let idx = -1;
    for (let i = 0; i < periods.length; i++) if (periods[i].start <= date) idx = i;
    if (idx < 0) return null;
    const p = periods[idx];
    const cycleDay = diffDays(p.start, date) + 1;
    if (date <= p.end) return { phase: "menstrual", cycleDay, estimated: false, periodIndex: idx };
    const next = periods[idx + 1];
    let daysBefore, estimated = false;
    if (next) daysBefore = diffDays(date, next.start);
    else {
      estimated = true;
      if (cycleDay > avg + 10) return { phase: null, cycleDay, estimated, periodIndex: idx, late: true };
      daysBefore = Math.max(1, avg - cycleDay + 1);
    }
    let phase;
    if (daysBefore <= 5) phase = "premenstrual";
    else if (daysBefore <= 11) phase = "luteal";
    else if (daysBefore <= 16) phase = "ovulation";
    else phase = "follicular";
    return { phase, cycleDay, estimated, periodIndex: idx };
  }

  // ---------- alerts / triage ----------
  function computeAlerts() {
    const out = [];
    const cyc = computeCycles();
    const today = todayISO();
    const recentDates = Object.keys(state.entries).filter((d) => diffDays(d, today) <= 14 && diffDays(d, today) >= 0);

    // urgent: very heavy flow / red-flag symptoms logged recently
    const vh = recentDates.filter((d) => state.entries[d].flow === "vheavy");
    if (vh.length) out.push({ level: "urgent", title: "You logged very heavy bleeding", body: "Soaking a pad or tampon every 1–2 hours needs a doctor's review. If you're soaking one per hour for several hours, or feel faint or breathless, get urgent care." });
    const rf = new Set();
    recentDates.forEach((d) => Object.keys(state.entries[d].symptoms).forEach((id) => { const s = symById(id); if (s && s.redFlag) rf.add(s.name); }));
    if (rf.size) out.push({ level: "urgent", title: `Needs checking: ${[...rf].join(", ")}`, body: "Please talk to a doctor about this soon. If it's severe or sudden, seek urgent care. Open 'Symptoms & research' for details." });
    const ppos = Object.keys(state.entries).some((d) => state.entries[d].ptest === "pos" && diffDays(d, today) <= 60);
    if (ppos) out.push({ level: "gp", title: "Positive pregnancy test logged", body: "Book a GP appointment to confirm. If you get one-sided pain, shoulder-tip pain, bleeding or feel faint, get urgent care (possible ectopic pregnancy)." });

    // periods
    const last = cyc.periods[cyc.periods.length - 1];
    if (last) {
      if (last.length > 8) out.push({ level: "gp", title: `Your last period lasted ${last.length} days`, body: "Bleeding for more than 7–8 days is worth discussing with a GP. Ask about iron levels too." });
      if (last.heavyDays >= 4) out.push({ level: "gp", title: "Several heavy days in your last period", body: "Heavier periods can come back after hormonal contraception stops. They're worth assessing, and so is your iron (ferritin) level." });
      const sinceLast = diffDays(last.start, today);
      if (sinceLast >= 90) out.push({ level: "gp", title: `No period for ${sinceLast} days`, body: "Take a pregnancy test. If it's negative, three months without a period should be checked by a GP. Ask about thyroid, prolactin, PCOS and stress-related (hypothalamic) causes." });
      else if (cyc.nextStart && diffDays(cyc.nextStart, today) >= 7 && !ppos)
        out.push({ level: "info", title: `Period about ${diffDays(cyc.nextStart, today)} days later than your average`, body: "Stress often delays ovulation. Because you're not using contraception, a pregnancy test is a sensible first step." });
    } else {
      const since = state.profile.removalDate ? diffDays(state.profile.removalDate, today) : null;
      if (since != null && since >= 90) out.push({ level: "gp", title: "No period logged since stopping contraception", body: `It's been about ${since} days. If you haven't had a period, take a pregnancy test and see a GP. If you have had periods, log them so the patterns work.` });
    }
    const abnormal = cyc.lengths.slice(-3).filter((l) => l < 21 || l > 35);
    if (abnormal.length >= 2) out.push({ level: "gp", title: "Cycles outside the 21–35 day range", body: `Your recent cycle lengths were ${cyc.lengths.slice(-3).join(", ")} days. Some irregularity is normal for a few months after stopping. If it keeps happening, it's worth a GP review (PCOS, thyroid, stress).` });
    if (cyc.variation != null && cyc.variation > 9 && cyc.lengths.length >= 3) out.push({ level: "info", title: `Cycle length varies by ${cyc.variation} days`, body: "Variation over 7–9 days counts as irregular. Stress is a common reason. Keep logging." });

    // spotting between periods
    if (cyc.periods.length >= 1) {
      const from = cyc.periods[Math.max(0, cyc.periods.length - 3)].start;
      const between = Object.keys(state.entries).filter((d) => d >= from && state.entries[d].flow === "spotting" && !cyc.periods.some((p) => d >= addDays(p.start, -2) && d <= addDays(p.end, 2)));
      if (between.length >= 3) out.push({ level: "gp", title: "Repeated spotting between periods", body: "This is common in the first few months after stopping contraception. If it keeps happening, see a GP and make sure your cervical screening is up to date." });
    }
    return out;
  }

  function renderAlerts() {
    const alerts = computeAlerts();
    $("#alerts").innerHTML = alerts.map((a) => `<div class="alert ${a.level}"><strong>${esc(a.title)}</strong>${esc(a.body)}</div>`).join("");
  }

  // ---------- header ----------
  function renderHeader() {
    const r = state.profile.removalDate;
    if (!r) { $("#since-removal").textContent = ""; return; }
    const days = diffDays(r, todayISO());
    if (days < 0) { $("#since-removal").textContent = ""; return; }
    const months = (days / 30.44).toFixed(1);
    $("#since-removal").textContent = `${days} days (≈${months} months) since your implant removal${state.profile.removalApprox ? " (approximate date)" : ""}`;
  }

  // ---------- LOG tab ----------
  let logDate = todayISO();
  function renderLog() {
    $("#log-date").value = logDate;
    const e = entry(logDate);
    const ph = phaseFor(logDate);
    $("#log-phase").textContent = ph
      ? (ph.late ? `Cycle day ${ph.cycleDay}: later than your usual cycle` : `Cycle day ${ph.cycleDay} · ${phaseLabel(ph.phase)}${ph.estimated ? " (estimated)" : ""}`)
      : "Log your period days to see your cycle day and phase.";

    $("#flow-chips").innerHTML = FLOWS.map((f) => `<button type="button" class="chip ${e.flow === f.id ? "flow-on" : ""}" data-flow="${f.id}">${esc(f.label)}</button>`).join("");

    const filter = $("#symptom-filter").value.trim().toLowerCase();
    const groups = {};
    allSymptoms().forEach((s) => {
      if (filter && !s.name.toLowerCase().includes(filter)) return;
      (groups[s.category] ||= []).push(s);
    });
    $("#symptom-groups").innerHTML = Object.entries(groups).map(([cat, list]) => `
      <h3>${esc(cat)}</h3>
      <div class="chips">${list.map((s) => {
        const sev = e.symptoms[s.id] || 0;
        return `<button type="button" class="chip ${sev ? "on" : ""} ${s.custom ? "custom" : ""}" data-sym="${esc(s.id)}" aria-pressed="${!!sev}" title="${sev ? ["", "Mild", "Moderate", "Severe"][sev] : "Not logged"}">${esc(s.name)}${sev ? `<span class="sev">${"●".repeat(sev)}</span>` : ""}</button>`;
      }).join("")}</div>`).join("") || `<p class="muted small">No symptom matches. Add it below.</p>`;

    $("#stress").value = e.stress ?? 0; $("#stress-out").textContent = e.stress == null ? "–" : `${e.stress}/5`;
    $("#mood").value = e.mood ?? 3; $("#mood-out").textContent = e.mood == null ? "–" : ["", "Very low", "Low", "OK", "Good", "Great"][e.mood];
    $("#sleep").value = e.sleep ?? "";
    $("#ptest").value = e.ptest || "";
    $("#notes").value = e.notes || "";
  }

  function bindLog() {
    $("#log-date").addEventListener("change", (ev) => { if (ev.target.value) { logDate = ev.target.value; renderLog(); } });
    $("#prev-day").onclick = () => { logDate = addDays(logDate, -1); renderLog(); };
    $("#next-day").onclick = () => { logDate = addDays(logDate, 1); renderLog(); };
    $("#flow-chips").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-flow]"); if (!b) return;
      setEntry(logDate, { flow: b.dataset.flow }); renderAll();
    });
    $("#symptom-groups").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-sym]"); if (!b) return;
      const e = entry(logDate); const syms = { ...e.symptoms };
      const next = ((syms[b.dataset.sym] || 0) + 1) % 4;
      if (next) syms[b.dataset.sym] = next; else delete syms[b.dataset.sym];
      setEntry(logDate, { symptoms: syms }); renderAll();
    });
    $("#symptom-filter").addEventListener("input", renderLog);
    $("#stress").addEventListener("input", (ev) => { setEntry(logDate, { stress: Number(ev.target.value) }); $("#stress-out").textContent = `${ev.target.value}/5`; });
    $("#mood").addEventListener("input", (ev) => { const v = Number(ev.target.value); setEntry(logDate, { mood: v }); $("#mood-out").textContent = ["", "Very low", "Low", "OK", "Good", "Great"][v]; });
    $("#sleep").addEventListener("change", (ev) => setEntry(logDate, { sleep: ev.target.value === "" ? null : Number(ev.target.value) }));
    $("#ptest").addEventListener("change", (ev) => { setEntry(logDate, { ptest: ev.target.value }); renderAlerts(); });
    let t; $("#notes").addEventListener("input", (ev) => { clearTimeout(t); t = setTimeout(() => setEntry(logDate, { notes: ev.target.value }), 400); });

    $("#add-symptom").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const name = $("#new-sym-name").value.trim(); if (!name) return;
      const desc = $("#new-sym-desc").value.trim();
      const existing = allSymptoms().find((s) => s.name.toLowerCase() === name.toLowerCase());
      let id = existing && existing.id;
      if (!existing) {
        id = "c_" + Date.now().toString(36);
        state.customSymptoms[id] = { id, name, desc, query: buildQuery(name), created: todayISO() };
      }
      const e = entry(logDate);
      setEntry(logDate, { symptoms: { ...e.symptoms, [id]: e.symptoms[id] || 1 } });
      $("#new-sym-name").value = ""; $("#new-sym-desc").value = "";
      renderAll();
      openResearch(id, true);
    });
  }

  function buildQuery(name) {
    const n = name.replace(/["()]/g, " ").trim();
    return `"${n}" AND ("menstrual cycle" OR "hormonal contraception" OR "contraceptive discontinuation" OR estrogen OR progesterone)`;
  }

  // ---------- CALENDAR tab ----------
  let calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
  function renderCalendar() {
    const cyc = computeCycles();
    $("#cal-title").textContent = calMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const first = new Date(calMonth); const startDow = (first.getDay() + 6) % 7; // Monday first
    const start = new Date(first); start.setDate(1 - startDow);
    // predicted next period + ovulation window (only forward-looking)
    const predicted = new Set(); const ovu = new Set();
    if (cyc.nextStart) {
      for (let k = 0; k < 3; k++) {
        const ps = addDays(cyc.nextStart, cyc.avg * k);
        for (let i = 0; i < cyc.avgPeriod; i++) predicted.add(addDays(ps, i));
        for (let i = -16; i <= -12; i++) ovu.add(addDays(ps, i));
      }
    }
    // also show past estimated ovulation windows for completed cycles
    cyc.periods.forEach((p, i) => { if (i > 0) for (let k = -16; k <= -12; k++) ovu.add(addDays(p.start, k)); });
    const today = todayISO();
    let html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="dow">${d}</div>`).join("");
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const iso = toISO(d);
      const e = state.entries[iso];
      const cls = ["day"];
      if (d.getMonth() !== calMonth.getMonth()) cls.push("other");
      if (iso === today) cls.push("today");
      if (e && e.flow !== "none") cls.push("flow-" + e.flow);
      else if (iso > today && predicted.has(iso)) cls.push("predicted");
      if (!(e && e.flow !== "none") && ovu.has(iso)) cls.push("ovu");
      const n = e ? Object.keys(e.symptoms).length : 0;
      html += `<button type="button" class="${cls.join(" ")}" data-date="${iso}" aria-label="${fmt(iso)}">${d.getDate()}${n ? `<span class="dots">${"<i></i>".repeat(Math.min(n, 5))}</span>` : ""}</button>`;
    }
    $("#cal").innerHTML = html;

    const rows = cyc.periods.slice().reverse().map((p) => `<tr><td>${fmt(p.start)}</td><td>${p.length} d</td><td>${p.cycleLength ? p.cycleLength + " d" : "<span class='muted'>current</span>"}</td><td>${p.heavyDays}</td></tr>`).join("");
    $("#cycle-list").innerHTML = cyc.periods.length
      ? `<p class="small">Average cycle: <strong>${cyc.avg} days</strong>${cyc.confident ? "" : " (need 3+ full cycles for a reliable average)"}. Next period estimated around <strong>${cyc.nextStart ? fmt(cyc.nextStart) : "–"}</strong>.</p>
         <div class="tbl-wrap"><table><thead><tr><th>Period started</th><th>Bleeding</th><th>Cycle length</th><th>Heavy days</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : `<p class="muted small">No periods logged yet. On the Log tab, choose a date and tap Light, Medium or Heavy. Add past periods too if you remember them.</p>`;
  }
  function bindCalendar() {
    $("#cal-prev").onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); renderCalendar(); };
    $("#cal-next").onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); renderCalendar(); };
    $("#cal").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-date]"); if (!b) return;
      logDate = b.dataset.date; showTab("log");
    });
  }

  // ---------- PATTERNS tab ----------
  function analysePatterns() {
    const cyc = computeCycles();
    const dates = Object.keys(state.entries).sort();
    const dayPhase = {};
    dates.forEach((d) => { const ph = phaseFor(d, cyc); if (ph && ph.phase) dayPhase[d] = ph; });
    const L = Math.max(cyc.avg, 21), m = Math.min(cyc.avgPeriod, 8);
    const expectedShare = { menstrual: m / L, premenstrual: 5 / L, luteal: 6 / L, ovulation: 5 / L, follicular: Math.max(L - m - 16, 2) / L };

    const stats = {};
    dates.forEach((d) => {
      const e = state.entries[d];
      Object.entries(e.symptoms).forEach(([id, sev]) => {
        const s = (stats[id] ||= { id, total: 0, sev: 0, phases: Object.fromEntries(PHASES.map((p) => [p.id, 0])), cycles: new Set(), stressOn: [], dates: [] });
        s.total++; s.sev += sev; s.dates.push(d);
        const ph = dayPhase[d];
        if (ph) { s.phases[ph.phase]++; s.cycles.add(ph.periodIndex); }
        if (e.stress != null) s.stressOn.push(e.stress);
      });
    });

    return Object.values(stats).map((s) => {
      const sym = symById(s.id) || { name: "(deleted symptom)" };
      const phased = Object.values(s.phases).reduce((a, b) => a + b, 0);
      let top = null, topShare = 0, lift = 0;
      PHASES.forEach((p) => {
        const share = phased ? s.phases[p.id] / phased : 0;
        if (share > topShare) { topShare = share; top = p.id; }
      });
      // Baseline: how much of a typical cycle each phase occupies. A symptom is
      // "cyclic" when it lands in one phase far more often than chance.
      if (top) lift = topShare / expectedShare[top];
      const stressOn = s.stressOn.length ? s.stressOn.reduce((a, b) => a + b, 0) / s.stressOn.length : null;
      const stressOffArr = dates.filter((d) => !state.entries[d].symptoms[s.id] && state.entries[d].stress != null).map((d) => state.entries[d].stress);
      const stressOff = stressOffArr.length ? stressOffArr.reduce((a, b) => a + b, 0) / stressOffArr.length : null;
      const stressLinked = stressOn != null && stressOff != null && s.stressOn.length >= 3 && stressOn - stressOff >= 1;

      let verdict, tag;
      if (s.total < 3 || phased < 3) { tag = "early"; verdict = "Not enough logs yet. Keep logging for 2–3 cycles."; }
      else if (s.cycles.size < 2) { tag = "early"; verdict = `Mostly in the ${phaseLabel(top).toLowerCase()} phase so far, but only in one cycle. Check whether it repeats.`; }
      else if (topShare >= (top === "follicular" ? 0.75 : 0.5) && lift >= 1.5) { tag = "hormonal"; verdict = `Clusters in the <strong>${phaseLabel(top).toLowerCase()}</strong> phase across ${s.cycles.size} cycles. That pattern fits hormonal cycling.`; }
      else { tag = "unclear"; verdict = "Spread across your cycle, so not clearly hormonal. Look at stress, sleep, diet and illness, and mention it to a GP if it keeps happening."; }
      if (stressLinked && tag === "unclear") verdict = `Not tied to one cycle phase, but it shows up more on high-stress days (avg stress ${stressOn.toFixed(1)} vs ${stressOff.toFixed(1)}). Stress, sleep or workload may be the bigger factor.`;
      else if (stressLinked) verdict += ` It also tends to show up on higher-stress days (avg ${stressOn.toFixed(1)} vs ${stressOff.toFixed(1)}).`;
      return { ...s, name: sym.name, avgSev: s.sev / s.total, top, topShare, verdict, tag, stressLinked, stressOn, stressOff };
    }).sort((a, b) => b.total - a.total);
  }

  function renderPatterns() {
    const rows = analysePatterns();
    if (!rows.length) {
      $("#pattern-table").innerHTML = `<p class="muted small">Log a few symptoms and your period days, and patterns will show here. You'll usually need 2–3 cycles before they mean much.</p>`;
      $("#stress-summary").innerHTML = "";
      return;
    }
    const max = Math.max(1, ...rows.flatMap((r) => Object.values(r.phases)));
    $("#pattern-table").innerHTML = rows.map((r) => `<div class="pat">
        <div class="row between"><button class="link" data-research="${esc(r.id)}"><strong>${esc(r.name)}</strong></button><span class="muted small">${r.total}× · severity ${r.avgSev.toFixed(1)}</span></div>
        <div class="strip">${PHASES.map((p) => { const v = r.phases[p.id]; const a = v / max; return `<div class="cell" style="background: rgba(178,69,110,${(0.08 + a * 0.6).toFixed(2)})"><b>${v || "·"}</b><span>${esc(p.short)}</span></div>`; }).join("")}</div>
        <p class="verdict"><span class="tag ${r.tag}">${{ hormonal: "Likely cyclic", unclear: "Not clearly cyclic", early: "Too early" }[r.tag]}</span>${r.stressLinked ? ' <span class="tag stress">Stress-linked</span>' : ""} ${r.verdict}</p>
      </div>`).join("");

    const dates = Object.keys(state.entries);
    const withStress = dates.filter((d) => state.entries[d].stress != null);
    if (withStress.length < 5) {
      $("#stress-summary").innerHTML = `<p class="muted small">Rate your stress on the Log tab most days. Once there are a week or two of ratings, this shows which symptoms go along with stress.</p>`;
    } else {
      const hi = withStress.filter((d) => state.entries[d].stress >= 4);
      const lo = withStress.filter((d) => state.entries[d].stress <= 2);
      const avgSyms = (arr) => arr.length ? (arr.reduce((a, d) => a + Object.keys(state.entries[d].symptoms).length, 0) / arr.length).toFixed(1) : "–";
      const linked = rows.filter((r) => r.stressLinked).map((r) => esc(r.name));
      $("#stress-summary").innerHTML = `<p class="small">On high-stress days (4–5) you logged <strong>${avgSyms(hi)}</strong> symptoms on average (${hi.length} days). On low-stress days (0–2) it was <strong>${avgSyms(lo)}</strong> (${lo.length} days).</p>
        <p class="small">${linked.length ? `Symptoms that show up more on stressful days: <strong>${linked.join(", ")}</strong>.` : "No single symptom is clearly tied to stress yet."}</p>`;
    }
  }

  // ---------- RESEARCH tab ----------
  let currentResearch = null;
  function renderResearchSelect() {
    const sel = $("#research-select");
    const logged = new Set(Object.values(state.entries).flatMap((e) => Object.keys(e.symptoms)));
    const opts = allSymptoms().map((s) => `<option value="${esc(s.id)}">${logged.has(s.id) ? "● " : ""}${esc(s.name)}${s.custom ? " (yours)" : ""}</option>`).join("");
    sel.innerHTML = opts;
    if (!currentResearch) currentResearch = (allSymptoms().find((s) => logged.has(s.id)) || allSymptoms()[0]).id;
    sel.value = currentResearch;
    $("#red-flag-list").innerHTML = window.RED_FLAGS.map((r) => `<li>${esc(r)}</li>`).join("");
  }

  function renderResearch(autoSearch = false) {
    const s = symById(currentResearch); if (!s) return;
    const custom = state.customSymptoms[s.id];
    const query = (custom && custom.query) || s.query;
    const myLogs = Object.keys(state.entries).filter((d) => state.entries[d].symptoms[s.id]).sort();
    const pat = analysePatterns().find((r) => r.id === s.id);
    const list = (arr) => arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const plain = s.name;
    const community = encodeURIComponent(`${plain} after stopping birth control OR implant removal`);

    $("#research-body").innerHTML = `
      <div class="card kb">
        <h2>${esc(s.name)}</h2>
        ${custom ? `${custom.desc ? `<p class="user-desc">“${esc(custom.desc)}”</p>` : ""}
          <p class="small muted">This is a symptom you added. There's no built-in summary, so use the research and community links below, and the pattern view. If it's new, keeps happening, or you're worried, it's reasonable to see a GP.</p>` : `
          <p>${esc(s.about)}</p>
          <h3>Hormonal / post-contraception link</h3><p>${esc(s.hormonal)}</p>
          <h3>Stress &amp; lifestyle</h3><p>${esc(s.stress)}</p>
          ${s.gp.length ? `<h3>Book a GP appointment if…</h3>${list(s.gp)}` : ""}
          ${s.urgent.length ? `<h3 style="color:var(--urgent-line)">Seek urgent care if…</h3>${list(s.urgent)}` : ""}`}
        <h3>Your data</h3>
        <p class="small">${myLogs.length ? `Logged ${myLogs.length}× (first ${fmt(myLogs[0])}, latest ${fmt(myLogs[myLogs.length - 1])}).` : "Not logged yet."}
          ${pat ? `<br>${pat.verdict}` : ""}</p>
        ${custom ? `<p><button class="link" id="del-custom">Remove this custom symptom</button></p>` : ""}
      </div>

      <div class="card">
        <div class="row between"><h2>Research</h2><label class="small row" style="font-weight:400"><input type="checkbox" id="reviews-only" style="width:auto"> Reviews only</label></div>
        <label class="small">Search terms <input id="research-query" value="${esc(query)}"></label>
        <div class="row mt"><button id="run-search">Search Europe PMC</button></div>
        <div id="papers" class="mt"></div>
        <div class="linkrow mt">
          <a target="_blank" rel="noopener" href="https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}">PubMed</a>
          <a target="_blank" rel="noopener" href="https://scholar.google.com/scholar?q=${encodeURIComponent(plain + " menstrual cycle hormonal contraception")}">Google Scholar</a>
          <a target="_blank" rel="noopener" href="https://www.cochranelibrary.com/search?text=${encodeURIComponent(plain)}">Cochrane reviews</a>
        </div>
      </div>

      <div class="card">
        <h2>Others with the same experience</h2>
        <p class="small muted">Personal stories help you feel less alone and can give you ideas to ask about. They aren't evidence, and people who post tend to have stronger symptoms than average.</p>
        <div class="linkrow">
          <a target="_blank" rel="noopener" href="https://www.reddit.com/r/birthcontrol/search/?q=${encodeURIComponent(plain + " removal")}">r/birthcontrol</a>
          <a target="_blank" rel="noopener" href="https://www.reddit.com/search/?q=${encodeURIComponent(plain + " after nexplanon OR implanon removal")}">Reddit: after implant removal</a>
          <a target="_blank" rel="noopener" href="https://www.reddit.com/search/?q=${encodeURIComponent(plain + " after stopping the pill")}">Reddit: after stopping the pill</a>
          <a target="_blank" rel="noopener" href="https://www.google.com/search?q=${community}&tbm=dsc">Forum discussions</a>
          <a target="_blank" rel="noopener" href="https://healthunlocked.com/search/${encodeURIComponent(plain)}">HealthUnlocked</a>
        </div>
      </div>`;

    $("#run-search").onclick = () => searchPapers($("#research-query").value, $("#reviews-only").checked);
    $("#research-query").addEventListener("change", (ev) => { if (custom) { custom.query = ev.target.value; save(); } });
    const del = $("#del-custom");
    if (del) del.onclick = () => {
      if (!confirm(`Remove "${s.name}"? This also removes it from your past logs.`)) return;
      delete state.customSymptoms[s.id];
      Object.keys(state.entries).forEach((d) => { if (state.entries[d].symptoms[s.id]) { delete state.entries[d].symptoms[s.id]; } });
      save(); currentResearch = null; renderAll();
    };
    const cached = loadCache()[cacheKey(query, false)];
    if (cached) showPapers(cached, true);
    else if (autoSearch) searchPapers(query, false);
  }

  const cacheKey = (q, rev) => (rev ? "R|" : "A|") + q.trim();
  async function searchPapers(query, reviewsOnly) {
    const box = $("#papers");
    const q = query.trim(); if (!q) return;
    const key = cacheKey(q, reviewsOnly);
    const cache = loadCache();
    if (cache[key] && Date.now() - cache[key].at < 7 * 864e5) { showPapers(cache[key], true); return; }
    box.innerHTML = `<p class="muted small">Searching…</p>`;
    const full = reviewsOnly ? `(${q}) AND PUB_TYPE:"review"` : q;
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=8&sort=RELEVANCE&query=${encodeURIComponent(full + " AND HAS_ABSTRACT:y")}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const results = ((data.resultList && data.resultList.result) || []).map((r) => ({
        title: (r.title || "").replace(/<[^>]+>/g, ""), authors: r.authorString, journal: (r.journalInfo && r.journalInfo.journal && r.journalInfo.journal.title) || r.journalTitle || r.bookOrReportDetails?.publisher || "",
        year: r.pubYear, pmid: r.pmid, doi: r.doi, id: r.id, source: r.source, isReview: (r.pubTypeList?.pubType || []).some((t) => /review/i.test(t)),
        abstract: (r.abstractText || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), oa: r.isOpenAccess === "Y"
      }));
      const payload = { at: Date.now(), count: data.hitCount || 0, results };
      cache[key] = payload; saveCache(cache);
      showPapers(payload, false);
    } catch (e) {
      box.innerHTML = `<div class="alert info"><strong>Couldn't reach Europe PMC</strong>You may be offline, or the site may be blocked here. Use the PubMed and Google Scholar links below instead.</div>`;
    }
  }
  function showPapers(p, fromCache) {
    const box = $("#papers");
    if (!p.results.length) { box.innerHTML = `<p class="muted small">No papers found for these search terms. Try simpler words, like the medical term for the symptom.</p>`; return; }
    box.innerHTML = `<p class="muted small">${p.count.toLocaleString()} papers match · showing the most relevant ${p.results.length}${fromCache ? " (saved search)" : ""}. Reviews summarise many studies and are the best place to start.</p>` +
      p.results.map((r) => {
        const link = r.pmid ? `https://europepmc.org/article/MED/${encodeURIComponent(r.pmid)}` : r.doi ? `https://doi.org/${encodeURIComponent(r.doi)}` : `https://europepmc.org/article/${encodeURIComponent(r.source)}/${encodeURIComponent(r.id)}`;
        return `<div class="paper">
          <h3><a href="${link}" target="_blank" rel="noopener">${esc(r.title)}</a></h3>
          <div class="meta">${esc(r.journal)} · ${esc(r.year)}${r.isReview ? " · <strong>Review</strong>" : ""}${r.oa ? " · Free full text" : ""}</div>
          ${r.abstract ? `<details><summary>Abstract</summary><p>${esc(r.abstract)}</p></details>` : ""}
        </div>`;
      }).join("");
  }

  function openResearch(id, autoSearch) {
    currentResearch = id; showTab("research", autoSearch);
  }
  function bindResearch() {
    $("#research-select").addEventListener("change", (ev) => { currentResearch = ev.target.value; renderResearch(); });
    document.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-research]"); if (b) openResearch(b.dataset.research, false);
    });
  }

  // ---------- ME tab ----------
  function renderMe() {
    const h = state.profile.history;
    $("#history-list").innerHTML = h.length ? `<div class="tbl-wrap"><table><tbody>${h.map((x, i) => `<tr><td><strong>${esc(x.label)}</strong>${x.note ? `<div class="muted small">${esc(x.note)}</div>` : ""}</td><td>${x.from ? fmt(x.from, { month: "short", year: "numeric" }) : "?"} → ${x.to ? fmt(x.to, { month: "short", year: "numeric" }) : "now"}</td><td><button class="link" data-del-hist="${i}">remove</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">No history yet.</p>`;
    $("#removal-date").value = state.profile.removalDate || "";
  }
  function bindMe() {
    $("#history-list").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-del-hist]"); if (!b) return;
      state.profile.history.splice(Number(b.dataset.delHist), 1); save(); renderMe();
    });
    $("#history-form").addEventListener("submit", (ev) => {
      ev.preventDefault();
      state.profile.history.push({ label: $("#h-label").value.trim(), from: $("#h-from").value, to: $("#h-to").value, note: "" });
      ev.target.reset(); save(); renderMe();
    });
    $("#removal-date").addEventListener("change", (ev) => { state.profile.removalDate = ev.target.value; state.profile.removalApprox = false; save(); renderAll(); });
    $("#export").onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `cycle-notes-${todayISO()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $("#import").addEventListener("change", async (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!data || typeof data.entries !== "object") throw new Error("Not a Cycle Notes backup");
        if (!confirm("Replace the data on this device with this backup?")) return;
        state = { ...defaultState(), ...data }; save(); renderAll();
      } catch (e) { alert("That file couldn't be imported: " + e.message); }
      ev.target.value = "";
    });
    $("#wipe").onclick = () => {
      if (!confirm("Delete ALL your Cycle Notes data on this device? Export a backup first if you want to keep it.")) return;
      localStorage.removeItem(STORE_KEY); localStorage.removeItem(CACHE_KEY); state = defaultState(); renderAll();
    };
    $("#make-report").onclick = renderReport;
  }

  // ---------- doctor report ----------
  function renderReport() {
    const cyc = computeCycles();
    const pats = analysePatterns();
    const alerts = computeAlerts();
    const today = todayISO();
    const recentNotes = Object.keys(state.entries).filter((d) => state.entries[d].notes && diffDays(d, today) <= 90).sort().reverse().slice(0, 15);
    const ptests = Object.keys(state.entries).filter((d) => state.entries[d].ptest).sort().reverse().slice(0, 3);
    const r = $("#report");
    r.innerHTML = `
      <div class="noprint"><button id="print">Print / save as PDF</button><button class="ghost" id="close-report">Close</button></div>
      <h1>Cycle &amp; symptom summary</h1>
      <p>Generated ${fmt(today)} from self-tracked data (Cycle Notes).</p>
      <h2>Contraception history</h2>
      <ul>${state.profile.history.map((h) => `<li>${esc(h.label)}: ${h.from ? fmt(h.from, { month: "short", year: "numeric" }) : "?"} – ${h.to ? fmt(h.to, { month: "short", year: "numeric" }) : "present"}${h.note ? ` (${esc(h.note)})` : ""}</li>`).join("")}</ul>
      <p>Currently no hormonal contraception. Stopped ${state.profile.removalDate ? fmt(state.profile.removalDate) : "?"}${state.profile.removalApprox ? " (approx.)" : ""}.</p>
      <h2>Cycles since then</h2>
      ${cyc.periods.length ? `<p>Average cycle ${cyc.avg} days${cyc.variation != null ? `, variation ${cyc.variation} days` : ""}; average bleeding ${cyc.avgPeriod} days.</p>
      <table><thead><tr><th>Start</th><th>Bleeding days</th><th>Heavy days</th><th>Cycle length</th></tr></thead><tbody>
      ${cyc.periods.map((p) => `<tr><td>${fmt(p.start)}</td><td>${p.length}</td><td>${p.heavyDays}${p.vheavyDays ? ` (${p.vheavyDays} very heavy)` : ""}</td><td>${p.cycleLength ?? "ongoing"}</td></tr>`).join("")}</tbody></table>` : "<p>No periods logged.</p>"}
      <h2>Symptoms</h2>
      ${pats.length ? `<table><thead><tr><th>Symptom</th><th>Times</th><th>Avg severity (1–3)</th><th>Most common phase</th><th>Pattern</th></tr></thead><tbody>
      ${pats.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.total}</td><td>${p.avgSev.toFixed(1)}</td><td>${p.top ? phaseLabel(p.top) : "–"}${p.top ? ` (${Math.round(p.topShare * 100)}%)` : ""}</td><td>${{ hormonal: "Cyclic", unclear: "Not clearly cyclic", early: "Insufficient data" }[p.tag]}${p.stressLinked ? "; stress-associated" : ""}</td></tr>`).join("")}</tbody></table>` : "<p>No symptoms logged.</p>"}
      ${Object.values(state.customSymptoms).filter((c) => c.desc).length ? `<h2>In my own words</h2><ul>${Object.values(state.customSymptoms).filter((c) => c.desc).map((c) => `<li><strong>${esc(c.name)}:</strong> ${esc(c.desc)}</li>`).join("")}</ul>` : ""}
      ${alerts.length ? `<h2>Flags raised by the tracker</h2><ul>${alerts.map((a) => `<li>${esc(a.title)}</li>`).join("")}</ul>` : ""}
      ${ptests.length ? `<h2>Pregnancy tests</h2><ul>${ptests.map((d) => `<li>${fmt(d)}: ${state.entries[d].ptest === "pos" ? "positive" : "negative"}</li>`).join("")}</ul>` : ""}
      ${recentNotes.length ? `<h2>Recent notes</h2><ul>${recentNotes.map((d) => `<li>${fmt(d)}: ${esc(state.entries[d].notes)}</li>`).join("")}</ul>` : ""}
      <h2>Questions I'd like to ask</h2>
      <ul><li>Could anything have been masked by hormonal contraception (e.g. endometriosis, PCOS, heavy menstrual bleeding)?</li>
      <li>Should I have bloods checked (FBC, ferritin, TSH, prolactin, and androgens if cycles are irregular)?</li>
      <li>Is my cervical screening up to date?</li></ul>`;
    r.hidden = false; document.body.classList.add("reporting"); window.scrollTo(0, 0);
    $("#print").onclick = () => window.print();
    $("#close-report").onclick = () => { r.hidden = true; document.body.classList.remove("reporting"); };
  }

  // ---------- tabs ----------
  function showTab(name, autoSearch = false) {
    $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    $$(".tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + name));
    if (name === "log") renderLog();
    if (name === "calendar") renderCalendar();
    if (name === "patterns") renderPatterns();
    if (name === "research") { renderResearchSelect(); renderResearch(autoSearch); }
    if (name === "me") renderMe();
    try { sessionStorage.setItem("cycleNotes.tab", name); } catch (e) { /* ignore */ }
    window.scrollTo(0, 0);
  }

  function renderAll() {
    renderHeader(); renderAlerts();
    const active = ($(".tabs button.active") || {}).dataset?.tab || "log";
    if (active === "log") renderLog();
    if (active === "calendar") renderCalendar();
    if (active === "patterns") renderPatterns();
    if (active === "research") { renderResearchSelect(); renderResearch(); }
    if (active === "me") renderMe();
  }

  // ---------- init ----------
  $$(".tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  bindLog(); bindCalendar(); bindResearch(); bindMe();
  renderHeader(); renderAlerts();
  let startTab = "log"; try { startTab = sessionStorage.getItem("cycleNotes.tab") || "log"; } catch (e) { /* ignore */ }
  showTab(startTab);

  // exposed for tests / console debugging
  window.CycleNotes = { computeCycles, phaseFor, analysePatterns, computeAlerts, get state() { return state; } };
})();
