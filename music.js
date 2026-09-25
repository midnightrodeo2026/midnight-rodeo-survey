/* Background music + intro page.
   To change the song, upload a new MP3 to the repo named song.mp3
   (replace the old one). Or change SONG below. */
(() => {
  const SONG = "song.mp3";
  const VOLUME = 0.35;
  const btn = document.getElementById("music-btn");
  const intro = document.getElementById("intro");
  const audio = new Audio(SONG);
  audio.loop = true; audio.volume = VOLUME; audio.preload = "auto";
  const KEY = "mr-music";
  const saved = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (btn) {
    const sync = () => {
      const on = !audio.paused;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on); btn.title = on ? "Pause music" : "Play music";
    };
    btn.hidden = false;
    audio.addEventListener("error", () => { btn.hidden = true; });
    audio.addEventListener("play", sync); audio.addEventListener("pause", sync);
    btn.addEventListener("click", () => {
      if (audio.paused) { audio.play().catch(() => {}); save("on"); } else { audio.pause(); save("off"); }
    });
  }

  // Embers, shockwave and flash bursting out from a point on screen.
  const burst = (x, y) => {
    if (reduce) return;
    const fx = document.createElement("div"); fx.className = "mr-burst";
    fx.style.setProperty("--x", x + "px"); fx.style.setProperty("--y", y + "px");
    let html = '<i class="mr-flash"></i><i class="mr-ring"></i><i class="mr-ring r2"></i>';
    for (let i = 0; i < 44; i++) {
      const ang = Math.random() * Math.PI * 2, dist = 140 + Math.random() * 380;
      html += `<i class="mr-spark" style="--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 90}px;--d:${(0.8 + Math.random() * 0.8).toFixed(2)}s;--s:${(3 + Math.random() * 6).toFixed(1)}px"></i>`;
    }
    fx.innerHTML = html; document.body.appendChild(fx);
    setTimeout(() => fx.remove(), 1800);
  };

  // Intro page: the Enter click starts the music (browsers allow sound after a click)
  // and plays the transition into the survey.
  if (intro) {
    const go = intro.querySelector("#intro-enter");
    go.focus({ preventScroll: true });
    const enter = () => {
      if (intro.classList.contains("leaving")) return;
      if (saved() !== "off") { audio.play().catch(() => {}); save("on"); }
      const r = go.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
      intro.classList.add("leaving");
      document.documentElement.classList.remove("intro-open");
      document.documentElement.classList.add("intro-reveal");
      if (!location.hash || location.hash === "#home") location.hash = "#survey";
      setTimeout(() => { intro.remove(); document.documentElement.classList.remove("intro-reveal"); }, reduce ? 300 : 1400);
    };
    go.addEventListener("click", enter);
    intro.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); } });
  }
})();
