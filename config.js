/* =====================================================================
   MIDNIGHT RODEO — SURVEY CONFIG
   Everything leadership may want to change lives in this file.
   - Class / spec list for WoW Forever (rename specs, change roles,
     hide a class with enabled:false) without touching app code.
   - Roster targets (default; leadership can also edit them live in
     the Council view).
   - Professions, timezones, labels.
   ===================================================================== */

window.MR_CONFIG = {
  guild: "Midnight Rodeo",
  realmNote: "WoW Forever · Horde",
  surveyTitle: "Pre-Launch Roster Survey",

  /* Optional Supabase backend for the self-hosted version
     (see README.md + supabase/schema.sql). Leave blank to use the
     built-in storage (Claude artifact) or local demo mode. */
  supabase: { url: "https://kmueigrekqqmjmznpevb.supabase.co", anonKey: "99bf5a8e-a2ae-464b-9517-61193b16d198" },

  /* Reference timezone for the Council availability heatmap. */
  serverTimezone: "America/New_York",
  serverTimezoneLabel: "Server time (ET)",

  roles: ["Tank", "Healer", "Melee DPS", "Ranged DPS"],

  /* ---- CLASSES & SPECS ------------------------------------------------
     key:     stable id stored in responses (don't change once live)
     name:    display name (safe to change)
     color:   class color
     enabled: false hides the class from the survey
     specs:   [{ key, name, roles:[...] }]  roles = roles that spec can fill;
              the first role is the default for flex/summary purposes.
     WoW Forever reworks trees (e.g. Paladin). Update spec names here as
     Blizzard publishes final talent trees. */
  classes: [
    { key: "warrior", name: "Warrior", color: "#C69B6D", enabled: true, specs: [
      { key: "arms", name: "Arms", roles: ["Melee DPS"] },
      { key: "fury", name: "Fury", roles: ["Melee DPS"] },
      { key: "protection", name: "Protection", roles: ["Tank"] } ] },
    { key: "paladin", name: "Paladin", color: "#F48CBA", enabled: true, specs: [
      { key: "holy", name: "Holy", roles: ["Healer"] },
      { key: "protection", name: "Protection", roles: ["Tank"] },
      { key: "retribution", name: "Retribution", roles: ["Melee DPS"] } ] },
    { key: "hunter", name: "Hunter", color: "#AAD372", enabled: true, specs: [
      { key: "beastmastery", name: "Beast Mastery", roles: ["Ranged DPS"] },
      { key: "marksmanship", name: "Marksmanship", roles: ["Ranged DPS"] },
      { key: "survival", name: "Survival", roles: ["Ranged DPS", "Melee DPS"] } ] },
    { key: "rogue", name: "Rogue", color: "#FFF468", enabled: true, specs: [
      { key: "assassination", name: "Assassination", roles: ["Melee DPS"] },
      { key: "combat", name: "Combat", roles: ["Melee DPS"] },
      { key: "subtlety", name: "Subtlety", roles: ["Melee DPS"] } ] },
    { key: "priest", name: "Priest", color: "#E8E8E8", enabled: true, specs: [
      { key: "discipline", name: "Discipline", roles: ["Healer"] },
      { key: "holy", name: "Holy", roles: ["Healer"] },
      { key: "shadow", name: "Shadow", roles: ["Ranged DPS"] } ] },
    { key: "shaman", name: "Shaman", color: "#2E8FE8", enabled: true, specs: [
      { key: "elemental", name: "Elemental", roles: ["Ranged DPS"] },
      { key: "enhancement", name: "Enhancement", roles: ["Melee DPS", "Tank"] },
      { key: "restoration", name: "Restoration", roles: ["Healer"] } ] },
    { key: "mage", name: "Mage", color: "#3FC7EB", enabled: true, specs: [
      { key: "arcane", name: "Arcane", roles: ["Ranged DPS"] },
      { key: "fire", name: "Fire", roles: ["Ranged DPS"] },
      { key: "frost", name: "Frost", roles: ["Ranged DPS"] } ] },
    { key: "warlock", name: "Warlock", color: "#9A7BD8", enabled: true, specs: [
      { key: "affliction", name: "Affliction", roles: ["Ranged DPS"] },
      { key: "demonology", name: "Demonology", roles: ["Ranged DPS", "Tank"] },
      { key: "destruction", name: "Destruction", roles: ["Ranged DPS"] } ] },
    { key: "druid", name: "Druid", color: "#FF7C0A", enabled: true, specs: [
      { key: "balance", name: "Balance", roles: ["Ranged DPS"] },
      { key: "feral-tank", name: "Feral (Bear)", roles: ["Tank"] },
      { key: "feral-cat", name: "Feral (Cat)", roles: ["Melee DPS"] },
      { key: "restoration", name: "Restoration", roles: ["Healer"] } ] }
  ],

  /* Default launch roster targets (Council can override live). */
  targets: {
    rosterGoal: 40,
    roles: { "Tank": 4, "Healer": 10, "Melee DPS": 13, "Ranged DPS": 13 }
  },

  commitment: [
    { key: "locked", label: "100% main", hint: "This is my character. Not switching." },
    { key: "strong", label: "Strong preference", hint: "I'd switch only if the roster really needs it." },
    { key: "flexible", label: "Flexible", hint: "Happy to play my alternative if it helps." },
    { key: "open", label: "Completely flexible", hint: "Put me wherever the guild needs me." }
  ],

  offspec: [
    { key: "yes", label: "Yes, I'll keep it raid-ready" },
    { key: "some", label: "Some gear, can gear up" },
    { key: "no", label: "No, main spec only" }
  ],

  interests: ["Raiding", "Dungeons", "Battlegrounds", "Arena", "Open World / Farming", "Professions / Economy", "Casual / Social"],

  rosterPrefs: [
    { key: "core", label: "Core Raider", hint: "Every raid night, prepared, consumables." },
    { key: "regular", label: "Regular Raider", hint: "Most raid nights." },
    { key: "casual", label: "Casual Raider", hint: "When schedule allows." },
    { key: "bench", label: "Bench / Flex", hint: "Fill in when a spot opens." },
    { key: "pvp", label: "PvP Focused", hint: "BGs and Arena first." },
    { key: "social", label: "Social", hint: "Here for the crew." }
  ],

  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  dayNames: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],

  professions: ["Alchemy", "Blacksmithing", "Enchanting", "Engineering", "Herbalism", "Leatherworking", "Mining", "Skinning", "Tailoring", "Undecided"],

  profChange: [
    { key: "yes", label: "Yes, whatever the guild needs" },
    { key: "maybe", label: "Maybe, let's talk" },
    { key: "no", label: "No, keeping my picks" }
  ],

  timezones: [
    ["America/Puerto_Rico", "Atlantic: Puerto Rico (AST)"],
    ["America/Halifax", "Atlantic: Canada (AT)"],
    ["America/New_York", "Eastern (ET)"],
    ["America/Chicago", "Central (CT)"],
    ["America/Denver", "Mountain (MT)"],
    ["America/Phoenix", "Arizona (MST)"],
    ["America/Los_Angeles", "Pacific (PT)"],
    ["America/Anchorage", "Alaska (AKT)"],
    ["Pacific/Honolulu", "Hawaii (HST)"],
    ["America/Mexico_City", "Mexico City"],
    ["America/Bogota", "Colombia / Peru"],
    ["America/Caracas", "Venezuela / Bolivia"],
    ["America/Santiago", "Chile"],
    ["America/Argentina/Buenos_Aires", "Argentina"],
    ["America/Sao_Paulo", "Brazil (BRT)"],
    ["Europe/London", "UK / Ireland"],
    ["Europe/Madrid", "Central Europe (CET)"],
    ["Europe/Helsinki", "Eastern Europe (EET)"],
    ["Australia/Sydney", "Australia East"]
  ]
};
