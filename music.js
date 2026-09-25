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
  // Start on page load unless the visitor turned it off. Browsers block sound
  // until the visitor clicks, taps or presses a key, so if the first try is
  // blocked, the music starts on their first click/tap anywhere on the page.
  if (saved() !== "off") {
    const evs = ["pointerdown", "pointerup", "click", "keydown", "touchend"];
    const off = () => evs.forEach(e => document.removeEventListener(e, start, true));
    const start = e => {
      if (e && btn.contains(e.target)) return;
      if (!audio.paused || saved() === "off") return off();
      audio.play().then(off).catch(() => {});
    };
    audio.play().catch(() => { btn.classList.add("nudge"); evs.forEach(e => document.addEventListener(e, start, true)); });
  }
})();
