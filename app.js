/* Midnight Rodeo — Pre-Launch Roster Survey · app logic */
(function () {
  const C = window.MR_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const classes = C.classes.filter(c => c.enabled !== false);
  const clsBy = k => C.classes.find(c => c.key === k);
  const specBy = (ck, sk) => { const c = clsBy(ck); return c ? c.specs.find(s => s.key === sk) : null; };
  const roleIcon = r => ({ "Tank": "i-tank", "Healer": "i-healer", "Melee DPS": "i-melee", "Ranged DPS": "i-ranged" }[r]);
  const labelOf = (list, k) => { const x = list.find(i => i.key === k); return x ? x.label : (k || ""); };

  let store = null, roster = [], responses = [], targets = null, mine = null, unsubResponses = null;

  /* ------------------------------------------------------------------ */
  /* Routing                                                             */
  /* ------------------------------------------------------------------ */
  function route() {
    const h = (location.hash || "#home").slice(1);
    const view = ["home", "survey", "done", "council"].includes(h) ? h : "home";
    $$("[data-view]").forEach(v => v.hidden = v.dataset.view !== view);
    $$("[data-nav]").forEach(a => { if (a.dataset.nav === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (view === "council") enterCouncil();
    if (view === "survey") showStep(state.step, false);
    if (view === "done") { renderTicket(); const t = $("#done-title"); t && t.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3200);
  }

  /* ------------------------------------------------------------------ */
  /* Survey state                                                        */
  /* ------------------------------------------------------------------ */
  const STEPS = ["Rider", "Main", "Flex pick", "Playstyle", "Schedule", "Professions", "Review"];
  const DRAFT = "mr-survey-draft";
  const blank = () => ({ character: "", discord: "", mainCls: "", mainSpec: "", role: "", commitment: "", flexCls: "", flexSpec: "", offspec: "", interests: [], roster: "", tz: C.serverTimezone, days: [], start: "", end: "", prof1: "", prof2: "", profChange: "", notes: "" });
  const state = { step: 0, visited: 0, v: blank(), errs: {} };
  try { const d = JSON.parse(localStorage.getItem(DRAFT) || "null"); if (d && d.v) { Object.assign(state.v, d.v); state.v.tz = C.serverTimezone; state.visited = d.visited || 0; } } catch (e) {}
  const saveDraft = () => { try { localStorage.setItem(DRAFT, JSON.stringify({ v: state.v, visited: state.visited })); } catch (e) {} };

  function guessTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; }
  }
  function tzOffsetMin(tz, date) {
    try {
      const d = new Date(Math.floor((date || new Date()).getTime() / 60000) * 60000);
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
      const g = t => +p.find(x => x.type === t).value;
      const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"));
      return Math.round((asUTC - d.getTime()) / 60000);
    } catch (e) { return 0; }
  }
  const fmtOffset = m => "UTC" + (m >= 0 ? "+" : "−") + Math.floor(Math.abs(m) / 60) + (Math.abs(m) % 60 ? ":" + String(Math.abs(m) % 60).padStart(2, "0") : "");
  const hm = x => String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0");
  /* Old answers may be in a rider's own timezone; show everything in server time. */
  const srvTime = (r, t) => { if (!t) return ""; const off = r.tz ? tzOffsetMin(r.tz) : (r.tzOffsetMin || 0), shift = tzOffsetMin(C.serverTimezone) - off; const [h, m] = t.split(":").map(Number); return hm((((h * 60 + m + shift) % 1440) + 1440) % 1440); };

  /* ------------------------------------------------------------------ */
  /* Build controls                                                      */
  /* ------------------------------------------------------------------ */
  function tile(type, name, value, inner, extra = "") {
    const id = "t-" + name + "-" + String(value).replace(/[^a-z0-9]+/gi, "-");
    return `<label class="tile ${extra}" for="${id}"><input type="${type}" id="${id}" name="${name}" value="${esc(value)}"><span>${inner}</span></label>`;
  }
  function buildStatic() {
    $("#main-cls").innerHTML = classes.map(c => tile("radio", "mainCls", c.key, `<span class="ico"><img class="ci" src="${c.key}.webp" alt="" aria-hidden="true" onerror="this.style.display='none'">${esc(c.name)}</span>`, "cls").replace('class="tile cls"', `class="tile cls" style="--cc:${c.color}"`)).join("");
    $("#role-tiles").innerHTML = C.roles.map(r => tile("radio", "role", r, `<span class="ico"><svg aria-hidden="true"><use href="#${roleIcon(r)}"/></svg>${esc(r)}</span>`)).join("");
    $("#commit-tiles").innerHTML = C.commitment.map(o => tile("radio", "commitment", o.key, `${esc(o.label)}<small>${esc(o.hint)}</small>`)).join("");
    $("#f-flexCls").innerHTML = `<option value="">No flex pick</option>` + classes.map(c => `<option value="${c.key}">${esc(c.name)}</option>`).join("");
    $("#offspec-tiles").innerHTML = C.offspec.map(o => tile("radio", "offspec", o.key, esc(o.label))).join("");
    $("#interest-tiles").innerHTML = C.interests.map(i => tile("checkbox", "interests", i, esc(i))).join("");
    $("#roster-tiles").innerHTML = C.rosterPrefs.map(o => tile("radio", "roster", o.key, `${esc(o.label)}<small>${esc(o.hint)}</small>`)).join("");
    $("#day-tiles").innerHTML = C.days.map((d, i) => tile("checkbox", "days", d, `<span aria-hidden="true">${d}</span><span class="sr">${C.dayNames[i]}</span>`)).join("");
    $$(".srv-label").forEach(el => el.textContent = C.serverTimezoneLabel);
    const profOpts = `<option value="">Choose a profession</option>` + C.professions.map(p => `<option>${esc(p)}</option>`).join("");
    $("#f-prof1").innerHTML = profOpts; $("#f-prof2").innerHTML = profOpts;
    $("#profchange-tiles").innerHTML = C.profChange.map(o => tile("radio", "profChange", o.key, esc(o.label))).join("");
    $("#step-list").innerHTML = STEPS.map((s, i) => `<li><button type="button" data-go="${i}"><span class="k num">${i + 1}</span><span class="t">${s}</span></button></li>`).join("");
  }
  function buildSpecs(target, name, clsKey, selected) {
    const c = clsBy(clsKey);
    if (!c) { $(target).innerHTML = `<p class="help">Pick a class first.</p>`; return; }
    $(target).innerHTML = c.specs.map(s => tile("radio", name, s.key, `${esc(s.name)}<small>${s.roles.join(" / ")}</small>`)).join("");
    const inp = $(`${target} input[value="${selected}"]`); if (inp) inp.checked = true;
  }
  function syncRoleTiles() {
    const sp = specBy(state.v.mainCls, state.v.mainSpec);
    const allowed = sp ? sp.roles : [];
    $$("#role-tiles input").forEach(i => { i.disabled = !!sp && !allowed.includes(i.value); });
    if (sp && !allowed.includes(state.v.role)) state.v.role = allowed.length === 1 ? allowed[0] : "";
    if (sp && allowed.length === 1) state.v.role = allowed[0];
    $$("#role-tiles input").forEach(i => i.checked = i.value === state.v.role);
    $("#role-help").textContent = sp ? (allowed.length > 1 ? `${sp.name} can fill ${allowed.join(" or ")}. Pick the one you want.` : `${sp.name} ${clsBy(state.v.mainCls).name} plays ${allowed[0]}.`) : "Roles your spec can't fill are greyed out.";
  }

  /* Push state into controls */
  function fillForm() {
    const v = state.v;
    $("#f-character").value = v.character; $("#f-discord").value = v.discord;
    setRadio("mainCls", v.mainCls); buildSpecs("#main-spec", "mainSpec", v.mainCls, v.mainSpec); syncRoleTiles();
    setRadio("commitment", v.commitment);
    $("#f-flexCls").value = v.flexCls; $("#flex-spec-field").hidden = !v.flexCls; buildSpecs("#flex-spec", "flexSpec", v.flexCls, v.flexSpec);
    setRadio("offspec", v.offspec);
    $$('input[name="interests"]').forEach(i => i.checked = v.interests.includes(i.value));
    setRadio("roster", v.roster);
    $$('input[name="days"]').forEach(i => i.checked = v.days.includes(i.value));
    $("#f-start").value = v.start; $("#f-end").value = v.end;
    $("#f-prof1").value = v.prof1; $("#f-prof2").value = v.prof2;
    setRadio("profChange", v.profChange);
    $("#f-notes").value = v.notes; $("#notes-count").textContent = v.notes.length + " / 600";
  }
  function setRadio(name, val) { $$(`input[name="${name}"]`).forEach(i => i.checked = i.value === val); }

  /* Read controls into state */
  function onInput(e) {
    const t = e.target; if (!t.name) return;
    const v = state.v;
    if (t.type === "checkbox") {
      v[t.name] = $$(`input[name="${t.name}"]:checked`).map(i => i.value);
    } else if (t.type === "radio") {
      v[t.name] = t.value;
      if (t.name === "mainCls") { v.mainSpec = ""; buildSpecs("#main-spec", "mainSpec", v.mainCls, ""); syncRoleTiles(); }
      if (t.name === "mainSpec") syncRoleTiles();
    } else {
      v[t.name] = t.value;
      if (t.name === "flexCls") { v.flexSpec = ""; $("#flex-spec-field").hidden = !v.flexCls; buildSpecs("#flex-spec", "flexSpec", v.flexCls, ""); }
      if (t.name === "notes") $("#notes-count").textContent = t.value.length + " / 600";
    }
    if (state.errs[t.name] || (t.name === "mainCls" && state.errs.mainSpec)) validateStep(state.step, true);
    saveDraft(); updateProgress();
  }

  /* ------------------------------------------------------------------ */
  /* Validation                                                          */
  /* ------------------------------------------------------------------ */
  function stepErrors(i) {
    const v = state.v, e = {};
    if (i === 0) {
      const n = v.character.trim();
      if (!n) e.character = "Enter the character name you plan to use.";
      else if (n.length < 2) e.character = "Names need at least 2 characters.";
      else if (!/^[\p{L}' -]+$/u.test(n)) e.character = "Use letters only (apostrophes and spaces are OK).";
      const d = v.discord.trim();
      if (!d) e.discord = "Enter your Discord name so leadership can reach you.";
      else if (d.length < 2) e.discord = "That Discord name looks too short.";
    }
    if (i === 1) {
      if (!v.mainCls) e.mainCls = "Pick your primary class.";
      else if (!v.mainSpec) e.mainSpec = "Pick the spec you plan to play.";
      if (!v.role) e.role = "Pick your preferred role.";
      if (!v.commitment) e.commitment = "Tell us how set you are on this choice.";
    }
    if (i === 2) {
      if (v.flexCls && !v.flexSpec) e.flexSpec = "Pick a spec for your flex class, or set the flex class to “No flex pick”.";
      if (v.flexCls && v.flexCls === v.mainCls && v.flexSpec === v.mainSpec) e.flexSpec = "Your flex pick matches your main. Choose a different spec or class.";
      if (!v.offspec) e.offspec = "Choose an off-spec answer.";
    }
    if (i === 3) {
      if (!v.interests.length) e.interests = "Pick at least one interest.";
      if (!v.roster) e.roster = "Pick where you see yourself on the roster.";
    }
    if (i === 4) {
      if (!v.days.length) e.days = "Pick at least one day you can play.";
      if (!v.start) e.start = "Enter the time you usually log on.";
      if (!v.end) e.end = "Enter the time you usually log off.";
      else if (v.start && v.start === v.end) e.end = "End time needs to differ from start time.";
    }
    if (i === 5) {
      if (!v.prof1) e.prof1 = "Choose your first profession (“Undecided” is fine).";
      if (!v.prof2) e.prof2 = "Choose your second profession (“Undecided” is fine).";
      else if (v.prof1 && v.prof1 === v.prof2 && v.prof1 !== "Undecided") e.prof2 = "Pick two different professions.";
      if (!v.profChange) e.profChange = "Let us know if you'd switch professions.";
    }
    return e;
  }
  const FIELD_EL = { character: "#f-character", discord: "#f-discord", start: "#f-start", end: "#f-end", prof1: "#f-prof1", prof2: "#f-prof2" };
  function validateStep(i, quiet) {
    const e = stepErrors(i);
    const keys = { 0: ["character", "discord"], 1: ["mainCls", "mainSpec", "role", "commitment"], 2: ["flexSpec", "offspec"], 3: ["interests", "roster"], 4: ["days", "start", "end"], 5: ["prof1", "prof2", "profChange"] }[i] || [];
    keys.forEach(k => {
      const box = $("#e-" + k); if (box) box.textContent = e[k] || "";
      if (FIELD_EL[k]) $(FIELD_EL[k]).setAttribute("aria-invalid", e[k] ? "true" : "false");
      if (e[k]) state.errs[k] = true; else delete state.errs[k];
    });
    const btn = $(`#step-list [data-go="${i}"]`); if (btn) btn.classList.toggle("err", Object.keys(e).length > 0 && !quiet);
    if (!quiet && Object.keys(e).length) {
      const first = keys.find(k => e[k]);
      const el = FIELD_EL[first] ? $(FIELD_EL[first]) : $(`#e-${first}`).closest("fieldset").querySelector("input:not([disabled])");
      if (el) el.focus();
    }
    return Object.keys(e).length === 0;
  }
  function updateProgress() {
    let done = 0; for (let i = 0; i < 6; i++) if (!Object.keys(stepErrors(i)).length) done++;
    const pct = Math.round(done / 6 * 100);
    $("#prog-pct").textContent = pct + "%";
    $("#prog-bar").setAttribute("aria-valuenow", pct);
    $("#prog-bar i").style.width = pct + "%";
    $$("#step-list button").forEach((b, i) => {
      b.disabled = i > state.visited;
      b.classList.toggle("done", i < 6 && i <= state.visited && !Object.keys(stepErrors(i)).length && i !== state.step);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Step navigation                                                     */
  /* ------------------------------------------------------------------ */
  function showStep(i, focus = true) {
    state.step = i; state.visited = Math.max(state.visited, i);
    $$("#survey-form [data-step]").forEach(s => s.hidden = +s.dataset.step !== i);
    $$("#step-list button").forEach((b, k) => { if (k === i) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    $("#btn-back").style.visibility = i === 0 ? "hidden" : "visible";
    const next = $("#btn-next");
    next.textContent = i === 5 ? "Review" : i === 6 ? (mine ? "Update my answers" : "Put me on the board") : "Next";
    if (i === 6) renderReview();
    if (!store || (!store.canSubmit && i === 6)) {
      next.disabled = i === 6;
      if (i === 6 && store && !store.canSubmit) $("#e-submit").textContent = "Your access to this page is view-only, so you can't submit. Ask guild leadership for access.";
    } else next.disabled = false;
    updateProgress(); saveDraft();
    if (focus) { const h = $(`#s${i}h`); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); $("#survey-form").scrollIntoView({ block: "start", behavior: "smooth" }); }
  }
  $("#btn-next").addEventListener("click", async () => {
    if (state.step < 6) { if (validateStep(state.step)) showStep(state.step + 1); return; }
    for (let i = 0; i < 6; i++) if (!validateStep(i, true)) { showStep(i); validateStep(i); return; }
    await submit();
  });
  $("#btn-back").addEventListener("click", () => { if (state.step > 0) showStep(state.step - 1); });
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-go]"); if (!b || b.disabled) return;
    showStep(+b.dataset.go);
  });
  $("#survey-form").addEventListener("input", onInput);
  $("#survey-form").addEventListener("change", onInput);
  $("#survey-form").addEventListener("submit", e => e.preventDefault());
  $("#survey-form").addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type === "text") { e.preventDefault(); $("#btn-next").click(); }
  });

  /* ------------------------------------------------------------------ */
  /* Review + submit                                                     */
  /* ------------------------------------------------------------------ */
  function toRecord() {
    const v = state.v;
    const flexSpec = specBy(v.flexCls, v.flexSpec);
    return {
      v: 1,
      submittedAt: new Date().toISOString(),
      character: v.character.trim(), discord: v.discord.trim(),
      main: { cls: v.mainCls, spec: v.mainSpec },
      role: v.role, commitment: v.commitment,
      flex: { cls: v.flexCls || "", spec: v.flexSpec || "", role: flexSpec ? flexSpec.roles[0] : "" },
      offspec: v.offspec,
      interests: v.interests.slice(), roster: v.roster,
      tz: C.serverTimezone, tzOffsetMin: tzOffsetMin(C.serverTimezone),
      days: C.days.filter(d => v.days.includes(d)),
      start: v.start, end: v.end,
      professions: [v.prof1, v.prof2], profChange: v.profChange,
      notes: v.notes.trim()
    };
  }
  function fromRecord(r) {
    return {
      character: r.character || "", discord: r.discord || "", mainCls: r.main?.cls || "", mainSpec: r.main?.spec || "", role: r.role || "", commitment: r.commitment || "",
      flexCls: r.flex?.cls || "", flexSpec: r.flex?.spec || "", offspec: r.offspec || "", interests: r.interests || [], roster: r.roster || "",
      tz: C.serverTimezone, days: r.days || [], start: srvTime(r, r.start), end: srvTime(r, r.end),
      prof1: (r.professions || [])[0] || "", prof2: (r.professions || [])[1] || "", profChange: r.profChange || "", notes: r.notes || ""
    };
  }
  const specName = (c, s) => { const cc = clsBy(c), sp = specBy(c, s); return cc ? `${sp ? sp.name + " " : ""}${cc.name}` : "None"; };
  function renderReview() {
    const r = toRecord();
    const block = (title, step, rows) => `<div><h3>${title}<button type="button" class="linkbtn" data-go="${step}">Edit</button></h3><dl>${rows.map(x => `<dt>${x[0]}</dt><dd>${esc(x[1]) || "—"}</dd>`).join("")}</dl></div>`;
    $("#review").innerHTML =
      block("Rider", 0, [["Character", r.character], ["Discord", r.discord]]) +
      block("Main", 1, [["Class & spec", specName(r.main.cls, r.main.spec)], ["Role", r.role], ["Commitment", labelOf(C.commitment, r.commitment)]]) +
      block("Flex pick", 2, [["Flex", r.flex.cls ? specName(r.flex.cls, r.flex.spec) : "No flex pick"], ["Raid-ready off-spec", labelOf(C.offspec, r.offspec)]]) +
      block("Playstyle", 3, [["Interests", r.interests.join(", ")], ["Roster", labelOf(C.rosterPrefs, r.roster)]]) +
      block("Schedule", 4, [["Days", r.days.join(", ")], ["Window", r.start && r.end ? `${r.start} to ${r.end} ${C.serverTimezoneLabel.replace(/^Server time /, "")}` : ""]]) +
      block("Professions", 5, [["Professions", r.professions.filter(Boolean).join(" + ")], ["Would switch", labelOf(C.profChange, r.profChange)], ["Notes", r.notes]]);
  }
  async function submit() {
    const btn = $("#btn-next"); btn.disabled = true; btn.textContent = "Riding in…";
    $("#e-submit").textContent = "";
    try {
      const rec = toRecord();
      await store.submit(rec);
      mine = rec;
      try { localStorage.removeItem(DRAFT); } catch (e) {}
      state.visited = 6;
      location.hash = "#done";
    } catch (e) {
      $("#e-submit").textContent = "Your answers didn't save: " + (e && e.message ? e.message : "connection problem") + ". Check your connection and press the button again.";
    } finally { btn.disabled = false; showStepLabel(); }
  }
  function showStepLabel() { if (state.step === 6) $("#btn-next").textContent = mine ? "Update my answers" : "Put me on the board"; }
  function renderTicket() {
    const r = mine || toRecord(); const c = clsBy(r.main.cls);
    $("#ticket").innerHTML = [
      ["Rider", r.character], ["Main", specName(r.main.cls, r.main.spec)], ["Role", r.role],
      ["Flex", r.flex && r.flex.cls ? specName(r.flex.cls, r.flex.spec) : "None"], ["Roster", labelOf(C.rosterPrefs, r.roster)],
      ["Days", (r.days || []).join(" ")]
    ].map((x, i) => `<div class="row"><span>${x[0]}</span><b${i === 1 && c ? ` style="color:${c.color}"` : ""}>${esc(x[1])}</b></div>`).join("");
  }

  /* ------------------------------------------------------------------ */
  /* HOME — the board                                                    */
  /* ------------------------------------------------------------------ */
  const T = () => targets || C.targets;
  function renderHome() {
    const t = T(); const n = roster.length;
    $("#ring-count").textContent = n;
    $("#ring-goal").textContent = n === 1 ? "rider on the board" : "riders on the board";
    const circ = 2 * Math.PI * 52, frac = n ? 1 : 0;
    $("#ring-arc").setAttribute("stroke-dasharray", `${(circ * frac).toFixed(1)} 400`);
    $("#ring").setAttribute("aria-label", `${n} riders have answered`);
    const byRole = {}; C.roles.forEach(r => byRole[r] = 0); roster.forEach(r => { if (byRole[r.role] != null) byRole[r.role]++; });
    const roleMax = Math.max(1, ...C.roles.map(r => byRole[r]));
    $("#role-cards").innerHTML = C.roles.map(r => {
      const have = byRole[r], pct = n ? Math.round(have / n * 100) : 0;
      return `<div class="role-card"><div class="top"><svg aria-hidden="true"><use href="#${roleIcon(r)}"/></svg><span class="name">${r}</span><span class="count num">${have}</span></div>
        <div class="bar"><i style="width:${have / roleMax * 100}%"></i></div>
        <span class="status need">${n ? pct + "% of riders" : "No riders yet"}</span></div>`;
    }).join("");
    const byCls = {}; roster.forEach(r => byCls[r.cls] = (byCls[r.cls] || 0) + 1);
    $("#class-chips").innerHTML = classes.map(c => `<div class="cls-chip ${byCls[c.key] ? "" : "zero"}" style="--cc:${c.color}"><img class="ci" src="${c.key}.webp" alt="${esc(c.name)}" aria-hidden="true" onerror="this.style.display='none'"><span class="n">${c.name}</span><span class="v num">${byCls[c.key] || 0}</span></div>`).join("");
    const latest = roster.slice().sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))).slice(0, 12);
    $("#riders").innerHTML = latest.length ? latest.map(r => {
      const c = clsBy(r.cls) || { color: "#aaa", name: r.cls }; const sp = specBy(r.cls, r.spec);
      return `<li style="--cc:${c.color}"><img class="rider-cls-img" src="${c.key}.webp" alt="" aria-hidden="true" onerror="this.style.display='none'"><span class="who"><b>${esc(r.character)}</b><span>${esc(sp ? sp.name : "")} ${esc(c.name)} · ${esc(r.role)}</span></span></li>`;
    }).join("") : `<li class="empty" style="grid-column:1/-1;display:block">No riders yet. Be the first name on the board.</li>`;
    $("#live-text").textContent = store && store.mode === "demo" ? "Sample riders" : "Live count";
  }
  function renderMe() {
    const note = $("#me-note");
    if (mine) {
      note.innerHTML = `You're on the board as <b>${esc(mine.character)}</b>.`; note.hidden = false;
      $("#start-label").textContent = "Update My Brand"; $("#start-sub").textContent = "Change your answers any time";
    } else { note.hidden = true; $("#start-label").textContent = "Saddle Up"; $("#start-sub").textContent = "Start the survey · about 4 minutes"; }
  }

  /* ------------------------------------------------------------------ */
  /* COUNCIL                                                             */
  /* ------------------------------------------------------------------ */
  function enterCouncil() {
    if (!store) return;
    const lead = !!store.canLead, showLogin = !lead && store.mode === "supabase";
    const locked = !store.canView && !lead;
    $("#council-locked").hidden = !(locked || loginOpen); $("#council-body").hidden = locked;
    $("#login-form").hidden = !showLogin;
    $("#council-locked").classList.toggle("inline", !locked);
    $("#locked-text").textContent = showLogin ? "Leaders: sign in with your leadership email to remove entries and export." : "Responses aren't available in this view.";
    if (locked) return;
    $("#btn-reset-demo").hidden = store.mode !== "demo";
    $("#btn-csv").hidden = !lead;
    $("#btn-lead-login").hidden = !showLogin || loginOpen;
    document.body.classList.toggle("is-lead", lead);
    if (!unsubResponses) unsubResponses = store.watchResponses(list => { responses = dedupe(list); renderCouncil(); });
    fillTargetsForm(); renderCouncil();
  }
  function dedupe(list) { /* latest answer per character wins */
    const m = new Map();
    list.forEach(r => { const k = (r.character || "").toLowerCase(); const p = m.get(k); if (!p || String(r.submittedAt) > String(p.submittedAt)) m.set(k, r); });
    return Array.from(m.values());
  }
  function hbars(rows, max, color) {
    return rows.map(r => {
      const segs = (r.segs || [{ v: r.v, c: r.c || color }]).map(s => `<i style="width:${max ? s.v / max * 100 : 0}%;background:${s.c}"></i>`).join("");
      return `<div class="hbar"><span class="t" title="${esc(r.label)}" ${r.tc ? `style="color:${r.tc}"` : ""}>${r.img ? `<img class="ci" src="${r.img}" alt="" aria-hidden="true" onerror="this.style.display='none'">` : ""}${esc(r.label)}</span><span class="track">${segs}</span><span class="v">${r.text != null ? r.text : r.v}</span></div>`;
    }).join("") || `<p class="empty">No responses yet.</p>`;
  }
  const countBy = (arr, f) => arr.reduce((m, x) => { [].concat(f(x)).forEach(k => { if (k) m[k] = (m[k] || 0) + 1; }); return m; }, {});

  function renderCouncil() {
    if ($("#council-body").hidden) return;
    const R = responses, t = T(), n = R.length;
    const roleC = countBy(R, r => r.role);
    const core = R.filter(r => r.roster === "core").length;
    const flexers = R.filter(r => ["flexible", "open"].includes(r.commitment)).length;
    const switchers = R.filter(r => r.profChange === "yes").length, offs = R.filter(r => r.offspec === "yes").length;
    $("#kpis").innerHTML = [
      ["Riders", n, "answered so far"], ["Core raiders", core, `${R.filter(r => r.roster === "regular").length} regular raiders`],
      ["Flexible", flexers, `${offs} keep a raid-ready off-spec`], ["Will switch professions", switchers, `${R.filter(r => r.profChange === "maybe").length} maybe`]
    ].map(k => `<div class="kpi"><span>${k[0]}</span><b class="num">${k[1]}</b><small>${k[2]}</small></div>`).join("");

    // roles as tiles
    $("#role-dist").innerHTML = C.roles.map(r => {
      const v = roleC[r] || 0, pct = n ? Math.round(v / n * 100) : 0;
      return `<div class="rtile"><svg aria-hidden="true"><use href="#${roleIcon(r)}"/></svg><b class="num">${v}</b><span>${r}</span><small>${pct}%</small></div>`;
    }).join("");

    // class counts main + flex
    const mainC = countBy(R, r => r.main && r.main.cls), flexC = countBy(R, r => r.flex && r.flex.cls);
    const cmax = Math.max(1, ...classes.map(c => (mainC[c.key] || 0) + (flexC[c.key] || 0)));
    $("#class-dist").innerHTML = hbars(classes.map(c => ({ label: c.name, img: c.key + ".webp", tc: c.color, segs: [{ v: mainC[c.key] || 0, c: c.color }, { v: flexC[c.key] || 0, c: "#5a4234" }], text: `${mainC[c.key] || 0}+${flexC[c.key] || 0}` })), cmax);

    // specs grouped by class
    const specC = countBy(R, r => r.main && (r.main.cls + "/" + r.main.spec)), flexSpecC = countBy(R, r => r.flex && r.flex.cls && (r.flex.cls + "/" + r.flex.spec));
    $("#spec-grid").innerHTML = classes.map(c => `<div class="spec-card" style="--cc:${c.color}"><div class="sc-head"><img class="ci" src="${c.key}.webp" alt="" aria-hidden="true" onerror="this.style.display='none'">${c.name}<span class="num">${mainC[c.key] || 0}</span></div>` +
      c.specs.map(s => { const m = specC[c.key + "/" + s.key] || 0, f = flexSpecC[c.key + "/" + s.key] || 0;
        return `<div class="sc-row${m || f ? "" : " none"}"><span>${esc(s.name)}<small>${s.roles.join(" / ")}</small></span><b class="num">${m}</b><i class="num">${f}</i></div>`; }).join("") + `</div>`).join("");

    // professions
    const profC = countBy(R, r => (r.professions || []).filter(Boolean));
    const willing = R.filter(r => r.profChange === "yes").length, maybe = R.filter(r => r.profChange === "maybe").length;
    $("#prof-legend").textContent = `${willing} would switch · ${maybe} maybe`;
    const pmax = Math.max(1, ...C.professions.map(p => profC[p] || 0));
    $("#prof-dist").innerHTML = hbars(C.professions.map(p => ({ label: p, v: profC[p] || 0, c: p === "Undecided" ? "#5a4234" : "#c9a45c" })), pmax);

    // roster / interests / commitment
    const rosC = countBy(R, r => r.roster), intC = countBy(R, r => r.interests || []), comC = countBy(R, r => r.commitment);
    const m1 = Math.max(1, ...Object.values(rosC)), m2 = Math.max(1, ...Object.values(intC)), m3 = Math.max(1, ...Object.values(comC));
    $("#roster-dist").innerHTML = hbars(C.rosterPrefs.map(o => ({ label: o.label, v: rosC[o.key] || 0, c: "#d42a2f" })), m1);
    $("#interest-dist").innerHTML = hbars(C.interests.map(i => ({ label: i, v: intC[i] || 0, c: "#c9a45c" })), m2);
    $("#commit-dist").innerHTML = hbars(C.commitment.map(o => ({ label: o.label, v: comC[o.key] || 0, c: "#a3141c" })), m3);

    renderHeat(); renderGaps(roleC, mainC, profC); renderTable();
  }

  function renderHeat() {
    const refOff = tzOffsetMin(C.serverTimezone);
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    responses.forEach(r => {
      if (!r.start || !r.end || !r.days) return;
      const off = r.tz ? tzOffsetMin(r.tz) : (r.tzOffsetMin || 0), shift = refOff - off;
      const [sh, sm] = r.start.split(":").map(Number), [eh, em] = r.end.split(":").map(Number);
      let s = sh * 60 + sm, e = eh * 60 + em; if (e <= s) e += 1440;
      r.days.forEach(d => {
        const di = C.days.indexOf(d); if (di < 0) return;
        const seen = new Set();
        for (let m = s; m < e; m += 30) {
          const abs = ((di * 1440 + m + shift) % 10080 + 10080) % 10080;
          const key = Math.floor(abs / 60); if (seen.has(key)) continue; seen.add(key);
          grid[Math.floor(key / 24)][key % 24]++;
        }
      });
    });
    const max = Math.max(1, ...grid.flat());
    let html = `<span></span>` + Array.from({ length: 24 }, (_, h) => `<span class="hl">${h % 3 === 0 ? h : ""}</span>`).join("");
    grid.forEach((row, di) => {
      html += `<span class="dl">${C.days[di]}</span>` + row.map((v, h) => `<span class="c" style="--a:${v ? (0.12 + 0.88 * v / max).toFixed(2) : 0.03}" title="${C.dayNames[di]} ${String(h).padStart(2, "0")}:00 · ${v} rider${v === 1 ? "" : "s"}"></span>`).join("");
    });
    $("#heat").innerHTML = html;
    $("#heat").setAttribute("role", "img");
    let best = [0, 0, 0]; grid.forEach((row, d) => row.forEach((v, h) => { if (v > best[0]) best = [v, d, h]; }));
    $("#heat").setAttribute("aria-label", responses.length ? `Availability heatmap. Peak: ${C.dayNames[best[1]]} ${best[2]}:00 with ${best[0]} riders.` : "Availability heatmap, no responses yet.");
  }

  function renderGaps(roleC, mainC, profC) {
    if (!$("#gaps")) return;
    const t = T(), g = [];
    const sev = { high: "#e2554a", med: "#e0a53a", low: "#6fbf73" };
    C.roles.forEach(r => {
      const have = roleC[r] || 0, goal = t.roles[r] || 0;
      if (have < goal) {
        const swap = responses.filter(x => x.role !== r && ["flexible", "open"].includes(x.commitment) && x.flex && x.flex.role === r).map(x => x.character);
        const os = responses.filter(x => x.role !== r && x.offspec === "yes" && (specsFor(x.main.cls).includes(r))).map(x => x.character);
        g.push({ s: goal - have >= Math.ceil(goal / 2) ? "high" : "med", html: `<b>${r}: ${have} of ${goal}</b>, short ${goal - have}.` + (swap.length ? ` Flex candidates: ${esc(swap.slice(0, 6).join(", "))}.` : "") + (os.length ? ` Raid-ready off-spec possible: ${esc(os.slice(0, 6).join(", "))}.` : "") });
      } else if (goal && have > goal + 2) g.push({ s: "low", html: `<b>${r}: ${have} of ${goal}</b>, ${have - goal} above target. Good depth for flex and alts.` });
    });
    const missing = classes.filter(c => !mainC[c.key]).map(c => c.name);
    if (missing.length && responses.length) g.push({ s: "med", html: `<b>No mains yet:</b> ${esc(missing.join(", "))}. Raid buffs and utility from these classes are uncovered.` });
    const needProf = ["Alchemy", "Enchanting", "Blacksmithing", "Tailoring", "Engineering", "Leatherworking"].filter(p => (profC[p] || 0) === 0);
    if (needProf.length && responses.length) g.push({ s: "med", html: `<b>Uncovered crafting:</b> ${esc(needProf.join(", "))}. ${responses.filter(r => r.profChange === "yes").length} riders said they'd switch professions.` });
    const heal = roleC.Healer || 0, total = responses.length;
    if (total >= 10 && heal / total < 0.2) g.push({ s: "high", html: `<b>Healer ratio ${(heal / total * 100).toFixed(0)}%.</b> Most raids want about 25%.` });
    $("#gaps").innerHTML = g.length ? g.map(x => `<div class="gap" style="--sev:${sev[x.s]}"><span class="sev">${x.s === "high" ? "Urgent" : x.s === "med" ? "Watch" : "Surplus"}</span><span>${x.html}</span></div>`).join("") : `<p class="empty">${responses.length ? "No gaps against current targets." : "Gaps appear once riders start answering."}</p>`;
  }
  const specsFor = ck => { const c = clsBy(ck); return c ? Array.from(new Set(c.specs.flatMap(s => s.roles))) : []; };

  function renderTable() {
    const q = ($("#resp-search").value || "").toLowerCase().trim();
    const rows = responses.filter(r => !q || JSON.stringify(r).toLowerCase().includes(q)).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
    $("#resp-table").innerHTML = `<thead><tr><th>Character</th><th>Discord</th><th>Main</th><th>Role</th><th>Commit</th><th>Flex</th><th>Off-spec</th><th>Roster</th><th>Days</th><th>Window (server)</th><th>Professions</th><th>Notes</th><th class="lead-only"></th></tr></thead><tbody>` +
      (rows.map(r => {
        const c = clsBy(r.main && r.main.cls) || { color: "#ccc" };
        return `<tr><td class="cc" style="--cc:${c.color}">${esc(r.character)}${r.demo ? ' <span class="muted">(sample)</span>' : ""}</td><td>${esc(r.discord)}</td><td>${esc(specName(r.main.cls, r.main.spec))}</td><td>${esc(r.role)}</td><td>${esc(labelOf(C.commitment, r.commitment))}</td><td>${r.flex && r.flex.cls ? esc(specName(r.flex.cls, r.flex.spec)) : "—"}</td><td>${esc(labelOf(C.offspec, r.offspec).split(",")[0])}</td><td>${esc(labelOf(C.rosterPrefs, r.roster))}</td><td>${esc((r.days || []).join(" "))}</td><td style="white-space:nowrap">${esc(srvTime(r, r.start))}–${esc(srvTime(r, r.end))}</td><td>${esc((r.professions || []).join(" + "))}</td><td style="min-width:180px">${esc(r.notes)}</td><td class="lead-only"><button class="linkbtn" data-del="${esc(r.id)}" data-name="${esc(r.character)}">Remove</button></td></tr>`;
      }).join("") || `<tr><td colspan="13" class="muted">No matching responses.</td></tr>`) + `</tbody>`;
  }
  $("#resp-search").addEventListener("input", renderTable);
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-del]"); if (!b || !store || !store.canLead) return;
    if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Confirm remove"; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.textContent = "Remove"; } }, 4000); return; }
    try { await store.remove(b.dataset.del); toast(`Removed ${b.dataset.name}.`); } catch (err) { toast("Couldn't remove: " + err.message); }
  });

  function fillTargetsForm() {
    if (!$("#targets-form")) return;
    const t = T(); C.roles.forEach(r => $("#t-" + CSS.escape(r)).value = t.roles[r]);
  }
  $("#btn-targets")?.addEventListener("click", async () => {
    const num = id => Math.max(0, Math.min(200, parseInt($(id).value, 10) || 0));
    const nt = { rosterGoal: T().rosterGoal || 0, roles: {} };
    C.roles.forEach(r => nt.roles[r] = num("#t-" + CSS.escape(r)));
    try { await store.saveTargets(nt); targets = nt; toast("Targets saved."); renderHome(); renderCouncil(); } catch (e) { toast("Couldn't save targets: " + e.message); }
  });
  $("#btn-reset-demo").addEventListener("click", async () => { if (store.reset) { await store.reset(); mine = null; renderMe(); toast("Demo data reset."); } });

  $("#btn-csv").addEventListener("click", async () => {
    const cols = ["submittedAt", "character", "discord", "mainClass", "mainSpec", "role", "commitment", "flexClass", "flexSpec", "flexRole", "offspec", "interests", "roster", "days", "startServer", "endServer", "profession1", "profession2", "profChange", "notes"];
    const q = s => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
    const lines = [cols.join(",")].concat(responses.map(r => [
      r.submittedAt, r.character, r.discord, clsBy(r.main.cls)?.name, specBy(r.main.cls, r.main.spec)?.name, r.role, labelOf(C.commitment, r.commitment),
      clsBy(r.flex?.cls)?.name || "", specBy(r.flex?.cls, r.flex?.spec)?.name || "", r.flex?.role || "", labelOf(C.offspec, r.offspec),
      (r.interests || []).join("; "), labelOf(C.rosterPrefs, r.roster), (r.days || []).join(" "), srvTime(r, r.start), srvTime(r, r.end),
      (r.professions || [])[0], (r.professions || [])[1], labelOf(C.profChange, r.profChange), r.notes
    ].map(q).join(",")));
    try { await store.download(`midnight-rodeo-roster-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n")); } catch (e) { if (e && e.code !== "declined") toast("Export didn't finish: " + (e.message || e.code)); }
  });
  let loginOpen = false;
  $("#btn-lead-login").addEventListener("click", () => { loginOpen = true; enterCouncil(); $("#login-email").focus(); });
  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault(); const em = $("#login-email").value.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) { toast("Enter a valid email address."); return; }
    try { await store.signIn(em); toast("Check your email for the sign-in link."); } catch (err) { toast(err.message); }
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  buildStatic(); fillForm(); renderHome(); route();

  (async function () {
    store = await window.MR_STORE.open();
    const pill = $("#mode-pill");
    pill.textContent = { artifact: "Live", supabase: "Live", demo: "Demo mode", offline: "View only" }[store.mode];
    pill.classList.toggle("demo", store.mode === "demo");
    pill.classList.toggle("live", store.mode === "artifact" || store.mode === "supabase");
    pill.title = store.mode === "demo" ? "Answers are saved only in this browser and sample riders are shown." : store.mode === "offline" ? "This view can't save answers. Ask guild leadership for access." : "Answers are visible to everyone in the War Room.";
    $("#nav-council").hidden = !(store.canLead || store.mode === "supabase"); try { if (store.canLead && localStorage.getItem("mr-go-council")) { localStorage.removeItem("mr-go-council"); location.hash = "#council"; } } catch (e) {}
    try {
      mine = await store.myResponse();
      if (mine) {
        const draftExists = (() => { try { return !!localStorage.getItem(DRAFT); } catch (e) { return false; } })();
        if (!draftExists) { state.v = Object.assign(blank(), fromRecord(mine)); state.visited = 6; fillForm(); }
      }
    } catch (e) {}
    renderMe();
    store.watchRoster(list => { roster = list; renderHome(); });
    store.watchTargets(t => { if (t && t.roles) { targets = t; renderHome(); if (!$("#council-body").hidden) { fillTargetsForm(); renderCouncil(); } } });
    route();
  })();
})();
