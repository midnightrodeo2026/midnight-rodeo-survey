/* Background music. To change the song, upload a new MP3 to the repo
   named song.mp3 (replace the old one). Or change SONG below. */
(() => {
  const SONG = "song.mp3";
  const VOLUME = 0.35;
  const btn = document.getElementById("music-btn");
  if (!btn) return;
  const audio = new Audio(SONG);
  audio.loop = true; audio.volume = VOLUME; audio.preload = "auto";
  const KEY = "mr-music";
  const saved = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const sync = () => {
    const on = !audio.paused;
    btn.classList.toggle("on", on); if (on) btn.classList.remove("nudge");
    btn.setAttribute("aria-pressed", on); btn.title = on ? "Pause music" : "Play music";
  };
  btn.hidden = false;
  audio.addEventListener("error", () => { btn.hidden = true; });
  audio.addEventListener("play", sync); audio.addEventListener("pause", sync);
  btn.addEventListener("click", () => {
    if (audio.paused) { audio.play().catch(() => {}); save("on"); } else { audio.pause(); save("off"); }
  });
  // Start on page load. Browsers block sound until the visitor clicks, so when
  // the first try is blocked we show an Enter button: clicking it (or anywhere)
  // starts the music and the button disappears.
  if (saved() !== "off") {
    const evs = ["pointerdown", "pointerup", "click", "keydown", "touchend"];
    const off = () => evs.forEach(e => document.removeEventListener(e, start, true));
    const start = e => {
      if (e && btn.contains(e.target)) return;
      if (!audio.paused || saved() === "off") return off();
      audio.play().then(off).catch(() => {});
    };
    // Entry effect: a gold/red shockwave, a flash and flying embers from the button.
    const burst = el => {
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const fx = document.createElement("div"); fx.className = "mr-burst";
      fx.style.setProperty("--x", x + "px"); fx.style.setProperty("--y", y + "px");
      let html = '<i class="mr-flash"></i><i class="mr-ring"></i><i class="mr-ring r2"></i>';
      for (let i = 0; i < 34; i++) {
        const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 320;
        html += `<i class="mr-spark" style="--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 80}px;--d:${(0.7 + Math.random() * 0.7).toFixed(2)}s;--s:${(3 + Math.random() * 5).toFixed(1)}px"></i>`;
      }
      html += '<div class="mr-welcome"><img src="logo.webp" alt="" width="640" height="640"><p>Welcome to the new <b>Forever</b></p></div>';
      fx.innerHTML = html; document.body.appendChild(fx);
      document.body.classList.add("mr-entered"); setTimeout(() => document.body.classList.remove("mr-entered"), 900);
      setTimeout(() => fx.remove(), 3200);
    };
    const gate = () => {
      const g = document.createElement("button");
      g.type = "button"; g.className = "mr-enter"; g.setAttribute("aria-label", "Enter and play music");
      g.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Enter</span>';
      document.body.appendChild(g);
      const hide = () => { g.classList.add("out"); setTimeout(() => g.remove(), 400); };
      g.addEventListener("click", () => { audio.play().catch(() => {}); save("on"); burst(g); hide(); off(); });
      audio.addEventListener("play", hide, { once: true });
    };
    audio.play().catch(() => { btn.classList.add("nudge"); evs.forEach(e => document.addEventListener(e, start, true)); gate(); });
  }
})();
