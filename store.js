/* =====================================================================
   STORAGE ADAPTERS
   One interface, three backends:
     1. "artifact" — Claude artifact shared database (claude.use("db"))
     2. "supabase" — self-hosted (fill MR_CONFIG.supabase)
     3. "demo"     — this browser only, preloaded with sample riders
   ---------------------------------------------------------------------
   Data model (same everywhere):
     response  = full survey answer (leadership only)
     roster    = public card: {id, character, cls, spec, role, submittedAt}
     config    = {rosterGoal, roles:{Tank,Healer,...}} (leadership edits)
   ===================================================================== */
(function () {
  const C = window.MR_CONFIG;

  function publicCard(id, r) {
    return { id, character: r.character, cls: r.main.cls, spec: r.main.spec, role: r.role, submittedAt: r.submittedAt };
  }

  /* ---------------- 1. Claude artifact db ---------------- */
  async function artifactStore() {
    for (let i = 0; i < 10 && !(window.claude && typeof window.claude.use === "function"); i++) await new Promise(r => setTimeout(r, 100));
    if (!window.claude || typeof window.claude.use !== "function") return null;
    const db = await window.claude.use("db");
    if (!db) return null;
    const user = await window.claude.use("user");
    let uid = null, lead = false, canWrite = true;
    try { uid = user ? await user.id() : null; } catch (e) {}
    try { lead = user ? !!(await user.canEdit()) : false; } catch (e) {}
    try { const w = user ? await user.can("data.write") : null; if (w === false) canWrite = false; } catch (e) {}

    return {
      mode: "artifact",
      canLead: lead,
      canView: true,
      canSubmit: !!uid && canWrite,
      async myResponse() {
        if (!uid) return null;
        const s = await db.doc("responses/" + uid).get();
        return s.exists ? s.data() : null;
      },
      async submit(r) {
        if (!uid) throw new Error("Sign in to claude.ai to submit.");
        await db.doc("responses/" + uid).set(r);
        await db.doc("roster/" + uid).set(publicCard(uid, r));
      },
      watchRoster(cb) {
        return db.collection("roster").onSnapshot(s => cb(s.docs.map(d => d.data())), () => cb([]));
      },
      watchResponses(cb) {
        return db.collection("responses").onSnapshot(s => cb(s.docs.map(d => Object.assign({ id: d.id }, d.data()))), () => cb([]));
      },
      watchTargets(cb) {
        return db.doc("config/targets").onSnapshot(s => cb(s.exists ? s.data() : null), () => cb(null));
      },
      async saveTargets(t) { await db.doc("config/targets").set(t); },
      async remove(id) {
        await db.doc("responses/" + id).delete();
        await db.doc("roster/" + id).delete();
      },
      async download(name, text) {
        const dl = await window.claude.use("downloads");
        if (!dl) throw new Error("Downloads aren't available in this view.");
        await dl.save({ filename: name, data: text });
      }
    };
  }

  /* ---------------- 2. Supabase ---------------- */
  async function supabaseStore() {
    const cfg = C.supabase || {};
    if (!cfg.url || !cfg.anonKey || /PASTE/.test(cfg.anonKey)) return null;
    if (!window.supabase) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data: sess } = await sb.auth.getSession();
    let lead = false;
    if (sess && sess.session) {
      const { data: isLeader } = await sb.rpc("is_leader");
      lead = !!isLeader;
    }
    const poll = (fn, cb, ms) => { let alive = true; const run = async () => { if (!alive) return; try { cb(await fn()); } catch (e) {} setTimeout(run, ms); }; run(); return () => { alive = false; }; };
    const myKey = "mr-my-response";
    const tokKey = "mr-edit-token";
    const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const getToken = () => {
      let t = null; try { t = localStorage.getItem(tokKey); } catch (e) {}
      if (!t) { t = Array.from(crypto.getRandomValues(new Uint8Array(16)), x => ALPHA[x % 32]).join(""); try { localStorage.setItem(tokKey, t); } catch (e) {} }
      return t;
    };
    const friendly = msg => { const e = new Error(msg); e.friendly = true; return e; };

    return {
      mode: "supabase",
      canLead: lead,
      canView: true,
      canSubmit: true,
      async myResponse() {
        try { return JSON.parse(localStorage.getItem(myKey) || "null"); } catch (e) { return null; }
      },
      editCode() { const t = getToken(); return t.match(/.{1,4}/g).join("-"); },
      useEditCode(code) {
        const t = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (t.length !== 16) return false;
        try { localStorage.setItem(tokKey, t); } catch (e) { return false; }
        return true;
      },
      async submit(r) {
        const row = { character: r.character, main_class: r.main.cls, main_spec: r.main.spec, role: r.role, payload: r };
        /* One answer per character. This browser keeps an edit code so the same rider can update later. */
        const { error } = await sb.rpc("save_response", { p_token: getToken(), p_character: r.character, p_main_class: r.main.cls, p_main_spec: r.main.spec, p_role: r.role, p_payload: r });
        if (error) {
          if (/ALREADY_ANSWERED/.test(error.message || "")) throw friendly(`${r.character} has already answered from another device or browser. To update those answers here, enter the edit code from that answer's ticket in section 1 ("Answered before?"). If you're a different rider, use your own character name.`);
          const missing = error.code === "PGRST202" || /could not find the function|does not exist/i.test(error.message || "");
          if (!missing) throw new Error(error.message);
          const { error: e2 } = await sb.from("responses").insert(row); /* database not upgraded yet */
          if (e2) throw new Error(e2.message);
        }
        try { localStorage.setItem(myKey, JSON.stringify(r)); } catch (e) {}
      },
      watchRoster(cb) {
        return poll(async () => {
          const { data } = await sb.from("roster_public").select("*").order("created_at", { ascending: false }).limit(500);
          return (data || []).map(x => ({ id: x.id, character: x.character, cls: x.main_class, spec: x.main_spec, role: x.role, submittedAt: x.created_at }));
        }, cb, 20000);
      },
      watchResponses(cb) {
        return poll(async () => {
          const { data } = await sb.from("responses").select("id,payload,created_at").order("created_at", { ascending: false });
          if (data && data.length) return data.map(x => Object.assign({ id: x.id }, x.payload));
          /* Full answers not readable (database policy): fall back to the public roster so the War Room still fills in. */
          const { data: pub } = await sb.from("roster_public").select("*").order("created_at", { ascending: false }).limit(500);
          return (pub || []).map(x => ({ id: x.id, character: x.character, discord: "", main: { cls: x.main_class, spec: x.main_spec }, role: x.role, commitment: "", flex: { cls: "", spec: "", role: "" }, offspec: "", interests: [], roster: "", tz: "", days: [], start: "", end: "", professions: [], profChange: "", notes: "", submittedAt: x.created_at }));
        }, cb, 30000);
      },
      watchTargets(cb) {
        return poll(async () => {
          const { data } = await sb.from("config").select("data").eq("id", "targets").maybeSingle();
          return data ? data.data : null;
        }, cb, 60000);
      },
      async saveTargets(t) {
        const { error } = await sb.from("config").upsert({ id: "targets", data: t });
        if (error) throw new Error(error.message);
      },
      async remove(id) {
        const { error } = await sb.from("responses").delete().eq("id", id);
        if (error) throw new Error(error.message);
      },
      async signIn(email) {
        try { localStorage.setItem("mr-go-council", "1"); } catch (e) {} const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("#")[0] } });
        if (error) throw new Error(error.message);
      },
      async download(name, text) { blobDownload(name, text); }
    };
  }

  /* ---------------- 3. Demo (this browser) ---------------- */
  function demoStore() {
    const KEY = "mr-demo-v1";
    let state;
    try { state = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!state) state = { responses: sampleResponses(), targets: null, mine: null };
    const listeners = { roster: [], responses: [], targets: [] };
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
    const emit = () => {
      listeners.roster.forEach(cb => cb(state.responses.map(r => publicCard(r.id, r))));
      listeners.responses.forEach(cb => cb(state.responses.slice()));
      listeners.targets.forEach(cb => cb(state.targets));
    };
    const sub = (k, cb) => { listeners[k].push(cb); setTimeout(emit, 0); return () => { listeners[k] = listeners[k].filter(x => x !== cb); }; };
    return {
      mode: "demo",
      canLead: true,
      canView: true,
      canSubmit: true,
      async myResponse() { return state.mine ? state.responses.find(r => r.id === state.mine) || null : null; },
      async submit(r) {
        const id = state.mine || ("me-" + Date.now());
        state.responses = state.responses.filter(x => x.id !== id).concat([Object.assign({ id }, r)]);
        state.mine = id; save(); emit();
      },
      watchRoster: cb => sub("roster", cb),
      watchResponses: cb => sub("responses", cb),
      watchTargets: cb => sub("targets", cb),
      async saveTargets(t) { state.targets = t; save(); emit(); },
      async remove(id) { state.responses = state.responses.filter(r => r.id !== id); if (state.mine === id) state.mine = null; save(); emit(); },
      async reset() { state = { responses: sampleResponses(), targets: null, mine: null }; save(); emit(); },
      async download(name, text) { blobDownload(name, text); }
    };
  }

  /* ---------------- Published page without shared storage ----------------
     Never shows sample riders: an empty board and submitting turned off. */
  function offlineStore() {
    const empty = cb => { setTimeout(() => cb([]), 0); return () => {}; };
    return {
      mode: "offline", canLead: false, canView: false, canSubmit: false,
      async myResponse() { return null; },
      async submit() { throw new Error("Saving isn't available in this view."); },
      watchRoster: empty, watchResponses: empty,
      watchTargets(cb) { setTimeout(() => cb(null), 0); return () => {}; },
      async saveTargets() { throw new Error("Not available."); },
      async remove() { throw new Error("Not available."); },
      async download(name, text) { blobDownload(name, text); }
    };
  }

  function blobDownload(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  /* Sample riders for demo mode only (clearly labelled in the UI). */
  function sampleResponses() {
    const S = [
      ["Grimtusk", "warrior", "protection", "Tank", "locked", "core", "America/New_York"],
      ["Moonhoof", "druid", "restoration", "Healer", "strong", "core", "America/Chicago"],
      ["Zul'vex", "shaman", "restoration", "Healer", "flexible", "regular", "America/Puerto_Rico"],
      ["Skarra", "rogue", "combat", "Melee DPS", "locked", "core", "America/New_York"],
      ["Vorlof", "warlock", "destruction", "Ranged DPS", "strong", "core", "America/Puerto_Rico"],
      ["Ashbrand", "mage", "fire", "Ranged DPS", "flexible", "regular", "America/Los_Angeles"],
      ["Kragnor", "warrior", "fury", "Melee DPS", "open", "core", "America/Denver"],
      ["Duskarrow", "hunter", "marksmanship", "Ranged DPS", "strong", "casual", "Europe/London"],
      ["Mortessa", "priest", "shadow", "Ranged DPS", "flexible", "regular", "America/New_York"],
      ["Hollowmane", "paladin", "holy", "Healer", "locked", "core", "America/Chicago"],
      ["Tzikka", "shaman", "enhancement", "Melee DPS", "open", "bench", "America/Sao_Paulo"],
      ["Brakka", "druid", "feral-tank", "Tank", "strong", "regular", "America/New_York"]
    ];
    const profs = [["Mining", "Blacksmithing"], ["Herbalism", "Alchemy"], ["Skinning", "Leatherworking"], ["Tailoring", "Enchanting"], ["Mining", "Engineering"], ["Herbalism", "Alchemy"]];
    const now = Date.now();
    return S.map((s, i) => ({
      id: "demo-" + i,
      v: 1, demo: true,
      submittedAt: new Date(now - (S.length - i) * 3.6e6 * 7).toISOString(),
      character: s[0], discord: s[0].toLowerCase().replace(/[^a-z]/g, "") + "#" + (1000 + i * 37),
      main: { cls: s[1], spec: s[2] }, role: s[3], commitment: s[4],
      flex: i % 3 === 0 ? { cls: "", spec: "" } : { cls: ["priest", "shaman", "druid", "paladin"][i % 4], spec: ["holy", "restoration", "restoration", "protection"][i % 4] },
      offspec: ["yes", "some", "no"][i % 3],
      interests: ["Raiding"].concat(i % 2 ? ["Dungeons", "Battlegrounds"] : ["Professions / Economy", "Casual / Social"]),
      roster: s[5], tz: s[6],
      days: i % 2 ? ["Tue", "Wed", "Thu", "Sun"] : ["Mon", "Tue", "Thu", "Fri", "Sat"],
      start: ["19:00", "20:00", "18:30", "21:00"][i % 4], end: ["23:00", "00:00", "22:30", "01:00"][i % 4],
      professions: profs[i % profs.length], profChange: ["yes", "maybe", "no"][i % 3],
      notes: i === 4 ? "Can bring Soulstones and summons every night." : ""
    }));
  }

  window.MR_STORE = {
    async open() {
      try { const s = await supabaseStore(); if (s) return s; } catch (e) { console.warn("Supabase unavailable", e); }
      try { const a = await artifactStore(); if (a) return a; } catch (e) { console.warn("Artifact db unavailable", e); }
      const local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      return local ? demoStore() : offlineStore();
    },
    publicCard
  };
})();
