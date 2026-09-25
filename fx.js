/* =====================================================================
   Midnight Rodeo · atmosphere
   1. Smoke: drifting blood-red haze on a canvas behind the page.
   ===================================================================== */
(function () {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 1. Smoke ---------------- */
  function smoke() {
    if (reduce) return;
    const cv = document.createElement("canvas");
    cv.className = "smoke"; cv.setAttribute("aria-hidden", "true");
    document.body.prepend(cv);
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1, parts = [], raf = 0, last = 0;
    const mobile = matchMedia("(max-width: 700px)").matches;
    const COUNT = mobile ? 16 : 30;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = cv.width = Math.floor(innerWidth * dpr);
      H = cv.height = Math.floor(innerHeight * dpr);
    }
    function puff(initial) {
      const r = (120 + Math.random() * 220) * dpr;
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + r * 0.6,
        r,
        vx: (Math.random() - 0.5) * 0.12 * dpr,
        vy: -(0.12 + Math.random() * 0.28) * dpr,
        a: 0, max: 0.08 + Math.random() * 0.1,
        hue: Math.random() < 0.55 ? "150, 22, 28" : "70, 55, 50",
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.002
      };
    }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(50, t - (last || t)); last = t;
      if (mobile && dt < 30) return; // ~30fps on phones
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.rot += p.vr * dt / 16;
        const life = 1 - p.y / H;                      // 0 at bottom → 1 at top
        p.a = p.max * Math.min(1, (1 - Math.abs(life - 0.35) * 1.4) * 1.6);
        if (p.y < -p.r || p.a < -0.02 && life > 0.5) { parts[i] = puff(false); continue; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(${p.hue}, ${Math.max(0, p.a)})`);
        g.addColorStop(1, `rgba(${p.hue}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    size();
    for (let i = 0; i < COUNT; i++) parts.push(puff(true));
    addEventListener("resize", size);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf); else { last = 0; raf = requestAnimationFrame(frame); }
    });
    raf = requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", smoke);
  else smoke();
})();
