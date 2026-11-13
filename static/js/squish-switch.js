
(function () {
  'use strict';

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  
  function createSquishSwitch(mount, opts = {}) {
    const o = {
      checked: !!opts.checked,
      label: opts.label || "",
      disabled: !!opts.disabled,
      trackColor: opts.trackColor || "#27272a",
      trackOnColor: opts.trackOnColor || "#f5f5f5",
      thumbColor: opts.thumbColor || "",
      thumbOnColor: opts.thumbOnColor || "",
      width: opts.width || 76,
      height: opts.height || 38,
      radius: opts.radius ?? 19,
      speed: clamp(opts.speed ?? 50, 0, 100),
      stretch: clamp(opts.stretch ?? 36, 0, 100) / 100,
      hoverScale: opts.hoverScale ?? 1.035,
      colorDuration: opts.colorDuration ?? 320,
      onChange: typeof opts.onChange === "function" ? opts.onChange : null,
    };

    const inset = Math.max(3, Math.round(o.height * 0.11));
    const thumb = o.height - inset * 2;
    const min = inset;
    const max = o.width - inset - thumb;
    const mid = (min + max) / 2;
    const trackRadius = Math.min(o.radius, o.height / 2);
    const thumbRadius = Math.max(2, trackRadius - inset);

    
    const root = document.createElement("span");
    root.className = "squish-switch-root";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "squish-switch";
    btn.setAttribute("role", "switch");
    btn.setAttribute("aria-checked", "false");
    if (o.disabled) btn.setAttribute("aria-disabled", "true");

    const track = document.createElement("span");
    track.className = "squish-switch__track";
    const thumbEl = document.createElement("span");
    thumbEl.className = "squish-switch__thumb";
    track.appendChild(thumbEl);
    btn.appendChild(track);
    root.appendChild(btn);

    if (o.label) {
      const labelEl = document.createElement("label");
      labelEl.className = "squish-switch__label";
      labelEl.textContent = o.label;
      root.appendChild(labelEl);
      const id = "ss-" + Math.random().toString(36).slice(2, 9);
      btn.id = id;
      labelEl.htmlFor = id;
    }
    mount.appendChild(root);

    const thumbColor = o.thumbColor || `color-mix(in srgb, ${o.trackOnColor} 19%, ${o.trackColor})`;
    const s = btn.style;
    s.setProperty("--ss-w", o.width + "px");
    s.setProperty("--ss-h", o.height + "px");
    s.setProperty("--ss-inset", inset + "px");
    s.setProperty("--ss-thumb", thumb + "px");
    s.setProperty("--ss-r", trackRadius + "px");
    s.setProperty("--ss-thumb-r", thumbRadius + "px");
    s.setProperty("--ss-track", o.trackColor);
    s.setProperty("--ss-track-on", o.trackOnColor);
    s.setProperty("--ss-thumb-color", thumbColor);
    s.setProperty("--ss-thumb-on", o.thumbOnColor || o.trackColor);
    s.setProperty("--ss-fade", o.colorDuration + "ms");

    
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const STRETCH_SPEED = 600;

    let on = o.checked;
    let x = on ? max : min;
    let v = 0;
    let target = x;
    let swell = 1;
    let swellTarget = 1;
    let raf = 0;
    let lastT = 0;
    let dragging = false;
    let grip = null;
    let skipClick = false;

    btn.dataset.on = on ? "" : undefined;

    function applyVisual() {
      
      const sx = 1 + Math.min(0.4, Math.abs(v) / STRETCH_SPEED) * o.stretch;
      const sy = swell / sx;
      thumbEl.style.transform = `translateX(${x - inset}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    }
    thumbEl.style.transformOrigin = "center";

    function physics(dt) {
      
      const stiffness = 170 - (50 - o.speed) * 1.1;
      const damping = 21.5;
      const mass = 0.9;
      const F = -stiffness * (x - target) - damping * v;
      v += (F / mass) * dt;
      x += v * dt;
      
      swell += (swellTarget - swell) * (1 - Math.exp(-dt * 14));
    }

    function settled() {
      return Math.abs(x - target) < 0.05 && Math.abs(v) < 2 && Math.abs(swell - swellTarget) < 0.001;
    }

    function loop(now) {
      raf = 0;
      if (!lastT) lastT = now;
      const dt = clamp((now - lastT) / 1000, 0.001, 0.05);
      lastT = now;

      if (!dragging) physics(dt);
      else swell += (swellTarget - swell) * (1 - Math.exp(-dt * 14));

      applyVisual();

      if (!dragging && settled()) {
        if (!dragging && !grip) {
          x = target;
          v = 0;
          swell = swellTarget;
          applyVisual();
          return; 
        }
      }
      raf = requestAnimationFrame(loop);
    }

    function wake() {
      lastT = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    }

    if (reduce) {
      
      applyVisual = applyVisual; 
    }

    function render() {
      if (reduce) {
        thumbEl.style.transform = `translateX(${(on ? max : min) - inset}px)`;
      }
      applyVisual();
    }

    function commit(next) {
      if (next === on) return;
      on = next;
      btn.dataset.on = on ? "" : undefined;
      btn.setAttribute("aria-checked", String(on));
      target = on ? max : min;
      if (reduce) x = target;
      render();
      wake();
      if (o.onChange) o.onChange(on);
    }

    
    const TAP_SLOP = { fine: 4, coarse: 8 };

    const localX = (clientX) => {
      const rect = track.getBoundingClientRect();
      const scale = rect.width / (track.offsetWidth || rect.width) || 1;
      return (clientX - rect.left) / scale;
    };

    btn.addEventListener("pointerdown", (e) => {
      if (o.disabled || grip || e.button !== 0) return;
      grip = {
        id: e.pointerId,
        grab: null,
        moved: false,
        startX: e.clientX,
        onAtPress: on,
        slop: e.pointerType === "touch" ? TAP_SLOP.coarse : TAP_SLOP.fine,
      };
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (_) {}
      dragging = true;
      btn.dataset.held = "";
      wake();
    });

    btn.addEventListener("pointermove", (e) => {
      const g = grip;
      if (!g || g.id !== e.pointerId) return;
      const lx = localX(e.clientX);
      if (g.grab === null) {
        g.grab = lx - x;
        return;
      }
      if (!g.moved && Math.abs(e.clientX - g.startX) > g.slop) g.moved = true;
      if (!g.moved) return;
      const nx = clamp(lx - g.grab, min, max);
      
      const now = performance.now();
      const dt = Math.max(4, now - (g.lastT || now - 16)) / 1000;
      v = v * 0.6 + ((nx - x) / dt) * 0.4;
      g.lastT = now;
      x = nx;
      commit(nx > mid);
      applyVisual();
    });

    const finish = (e, cancelled) => {
      const g = grip;
      if (!g || g.id !== e.pointerId) return;
      grip = null;
      try {
        btn.releasePointerCapture(e.pointerId);
      } catch (_) {}
      if (cancelled) commit(g.onAtPress);
      else if (!g.moved) commit(!on);
      skipClick = true;
      setTimeout(() => {
        skipClick = false;
      }, 0);
      dragging = false;
      delete btn.dataset.held;
      
      target = on ? max : min;
      wake();
    };

    btn.addEventListener("pointerup", (e) => finish(e, false));
    btn.addEventListener("pointercancel", (e) => finish(e, true));

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && grip) {
        finish({ pointerId: grip.id, currentTarget: btn }, true);
      }
    });

    btn.addEventListener("click", () => {
      if (skipClick) {
        skipClick = false;
        return;
      }
      if (!o.disabled) commit(!on);
    });

    btn.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse" && !o.disabled) {
        swellTarget = o.hoverScale;
        wake();
      }
    });
    btn.addEventListener("pointerleave", () => {
      swellTarget = 1;
      wake();
    });

    render();

    
    return {
      get on() {
        return on;
      },
      set(checked) {
        commit(!!checked);
      },
      setColors(colors) {
        if (!colors) return;
        if (colors.trackColor) s.setProperty("--ss-track", colors.trackColor);
        if (colors.trackOnColor) s.setProperty("--ss-track-on", colors.trackOnColor);
        if (colors.thumbColor) s.setProperty("--ss-thumb-color", colors.thumbColor);
        if (colors.thumbOnColor) s.setProperty("--ss-thumb-on", colors.thumbOnColor);
      },
      destroy() {
        if (raf) cancelAnimationFrame(raf);
        root.remove();
      },
    };
  }

  window.createSquishSwitch = createSquishSwitch;
})();
