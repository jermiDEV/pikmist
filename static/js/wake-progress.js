
(function () {
  "use strict";

  const SETTLE = 9.23;
  const FULL_SPEED = 320;
  const MIN_REACH = 1.5;
  const FLAT = 0.002;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smoothstep = (s) => s * s * (3 - 2 * s);

  function create(mount, options = {}) {
    const o = {
      bars: options.bars || 32,
      height: options.height || 38,
      restHeight: options.restHeight ?? 12,
      gap: options.gap ?? 3,
      sensitivity: options.sensitivity ?? 1,
      reach: options.reach ?? 6,
      skew: options.skew ?? 0.6,
      glide: options.glide ?? 0.3,
      smoothing: options.smoothing ?? 100,
      crestColor: options.crestColor || "",
      showValue: options.showValue !== false,
    };
    const rest = Math.min(o.restHeight, o.height - 1) / o.height;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = document.createElement("div");
    root.className = "wake-progress";
    root.style.setProperty("--wp-height", o.height + "px");
    root.style.setProperty("--wp-gap", o.gap + "px");
    root.style.setProperty("--wp-rest", rest);
    if (o.crestColor) root.style.setProperty("--wp-crest", o.crestColor);

    const track = document.createElement("div");
    track.className = "wake-progress__track";

    const barEls = [];
    const crestEls = [];
    for (let i = 0; i < o.bars; i++) {
      const bar = document.createElement("span");
      bar.className = "wake-progress__bar";
      bar.dataset.on = "false";
      if (o.crestColor) {
        const crest = document.createElement("span");
        crest.className = "wake-progress__crest";
        bar.appendChild(crest);
        crestEls.push(crest);
      } else {
        crestEls.push(null);
      }
      barEls.push(bar);
      track.appendChild(bar);
    }
    root.appendChild(track);

    let valueEl = null;
    if (o.showValue) {
      valueEl = document.createElement("span");
      valueEl.className = "wake-progress__value";
      valueEl.setAttribute("aria-hidden", "true");
      valueEl.textContent = "0%";
      root.appendChild(valueEl);
    }

    mount.appendChild(root);

    
    
    const k = (SETTLE / o.glide) * (SETTLE / o.glide);
    const c = 2 * (SETTLE / o.glide);
    
    const wv = 2000 / o.smoothing;
    const kv = wv * wv;
    const cv = 2.5 * wv;

    let target = 0;
    let head = 0;      
    let vel = 0;       
    let sVel = 0;      
    let lastAmp = 0;
    let lastT = 0;
    let raf = 0;
    let running = false;

    function paint() {
      const h = (head / 100) * (o.bars - 1);
      const amp = reduce
        ? 0
        : smoothstep(clamp((Math.abs(sVel) * o.sensitivity) / FULL_SPEED, 0, 1));
      const dir = Math.sign(sVel) || 1;
      const r = MIN_REACH + (o.reach - MIN_REACH) * amp;
      const behind = r * (1 + o.skew);
      const ahead = r * (1 - 0.5 * o.skew);
      const lit = Math.round(h);
      const flat = amp < FLAT && lastAmp < FLAT;

      for (let i = 0; i < o.bars; i++) {
        const el = barEls[i];
        const on = i <= lit ? "true" : "false";
        if (el.dataset.on !== on) el.dataset.on = on;
        if (flat) continue;
        const d = i - h;
        const R = d * dir < 0 ? behind : ahead;
        const lift = Math.abs(d) < R ? amp * Math.cos((Math.PI * d) / (2 * R)) ** 2 : 0;
        el.style.transform = "scaleY(" + (rest + lift * (1 - rest)) + ")";
        const crest = crestEls[i];
        if (crest) crest.style.opacity = String(lift);
      }
      lastAmp = amp;
    }

    function tick(t) {
      if (!lastT) lastT = t;
      const dt = Math.min((t - lastT) / 1000, 0.05);
      lastT = t;

      
      
      const step = 1 / 240;
      const n = Math.max(1, Math.ceil(dt / step));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        
        const a = -k * (head - target) - c * vel;
        vel += a * h;
        head += vel * h;

        
        const sa = -kv * (sVel - vel) - cv * sVel;
        sVel += sa * h;
      }

      paint();

      const settled =
        Math.abs(head - target) < 0.05 &&
        Math.abs(vel) < 1 &&
        Math.abs(sVel) < 0.5;
      if (settled) {
        head = target;
        vel = 0;
        sVel = 0;
        paint();
        running = false;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function ensure() {
      if (running) return;
      running = true;
      lastT = 0;
      raf = requestAnimationFrame(tick);
    }

    function set(pct) {
      target = clamp(pct, 0, 100);
      if (valueEl) valueEl.textContent = Math.round(target) + "%";
      ensure();
    }

    function reset() {
      if (raf) cancelAnimationFrame(raf);
      running = false;
      raf = 0;
      target = 0;
      head = 0;
      vel = 0;
      sVel = 0;
      lastAmp = 0;
      if (valueEl) valueEl.textContent = "0%";
      paint();
    }

    paint();

    return { set, reset, destroy() { if (raf) cancelAnimationFrame(raf); root.remove(); } };
  }

  window.PikMistWakeProgress = { create };
})();
