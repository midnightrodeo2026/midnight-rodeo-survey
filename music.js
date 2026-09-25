/* Background music. To change the song, upload a new MP3 to the repo
   named song.mp3 (replace the old one). Or change SONG below. */
(() => {
  const SONG = "song.mp3";
  const VOLUME = 0.35;
  const btn = document.getElementById("music-btn");
  if (!btn) return;
  const audio = new Audio(SONG);
  audio.loop = true; audio.volume = VOLUME; audio.preload = "metadata";
  const KEY = "mr-music";
  const saved = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const sync = () => { const on = !audio.paused; btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", on); btn.title = on ? "Pause music" : "Play music"; };
  audio.addEventListener("canplay", () => { btn.hidden = false; }, { once: true });
  audio.addEventListener("error", () => { btn.hidden = true; });
  audio.addEventListener("play", sync); audio.addEventListener("pause", sync);
  btn.addEventListener("click", () => {
    if (audio.paused) { audio.play().catch(() => {}); save("on"); } else { audio.pause(); save("off"); }
  });
  // Auto-start on page load unless the visitor turned it off.
  // Browsers block sound until the first click/tap/key, so if the first try is
  // blocked it starts on the visitor's first interaction with the page.
  if (saved() !== "off") {
    const evs = ["pointerdown", "keydown", "touchstart"];
    const start = e => { if (btn.contains(e.target)) return; evs.forEach(e => document.removeEventListener(e, start, true)); if (audio.paused && saved() !== "off") audio.play().catch(() => {}); };
    audio.play().catch(() => { evs.forEach(e => document.addEventListener(e, start, true)); });
  }
})();
