
(function () {
  "use strict";

  const PATTERNS = {
    arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
    dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
    ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
    spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
    orbit: {
      3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2 },
      4: {
        cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6],
        loop: 6,
        scale: 1.2,
        lit: 0.45,
      },
    },
    snake: {
      3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
      4: {
        cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12],
        loop: 16,
        scale: 1,
        lit: 0.25,
      },
    },
    sweep: {
      4: {
        cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6],
        loop: 5,
        scale: 1,
        lit: 0.45,
      },
    },
    spin: {
      4: {
        cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2],
        loop: 4,
        scale: 1.6,
        lit: 0.35,
      },
    },
    rain: {
      4: {
        cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6],
        loop: 4,
        scale: 1.2,
        lit: 0.35,
      },
    },
    pulse: {
      4: {
        cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2],
        loop: 2.4,
        scale: 2.5,
        lit: 0.45,
      },
    },
  };
  const DEFAULT_PATTERN = { 3: "orbit", 4: "sweep" };
  const MARKS = {
    3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
    4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] },
  };

  const resolvePattern = (pattern, grid) => {
    if (typeof pattern === "string") {
      const named = PATTERNS[pattern];
      return (named && named[grid]) || PATTERNS[DEFAULT_PATTERN[grid]][grid];
    }
    const cells = Array.from({ length: grid * grid }, (_, i) => pattern.cells[i] ?? null);
    const max = Math.max(0, ...cells.filter((v) => v != null));
    return { cells, loop: pattern.loop ?? max + 4.2, scale: pattern.scale ?? 1, lit: pattern.lit ?? 0.62 };
  };

  const fmt = (ds) =>
    ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`;

  function create(mount, options = {}) {
    const o = {
      label: options.label || "Поиск",
      doneLabel: options.doneLabel || "Готово за",
      errorLabel: options.errorLabel || "Ошибка после",
      pattern: options.pattern || "orbit",
      grid: options.grid === 4 ? 4 : 3,
      shape: options.shape || "round",
      color: options.color || "currentColor",
      doneColor: options.doneColor || "#22c55e",
      errorColor: options.errorColor || "#ef4444",
      cellSize: options.cellSize ?? 6,
      gap: options.gap ?? 2,
      fontSize: options.fontSize ?? 14,
      step: options.step ?? 90,
      idleOpacity: options.idleOpacity ?? 0.15,
      glow: !!options.glow,
      glowColor: options.glowColor || "",
      showTimer: options.showTimer !== false,
    };

    const n = o.grid;
    const pat = resolvePattern(o.pattern, n);
    const marks = MARKS[n];
    const d = o.step * pat.scale;
    const cycle = Math.round(pat.loop * d);

    const root = document.createElement("span");
    root.className = "lattice-loader";
    root.setAttribute("role", "status");
    root.dataset.status = "working";
    root.dataset.shape = o.shape;
    if (o.glow) root.dataset.glow = "";
    const s = root.style;
    s.setProperty("--ll-n", n);
    s.setProperty("--ll-cell", o.cellSize + "px");
    s.setProperty("--ll-gap", o.gap + "px");
    s.setProperty("--ll-font", o.fontSize + "px");
    s.setProperty("--ll-color", o.color);
    s.setProperty("--ll-mark", o.doneColor);
    s.setProperty("--ll-idle", o.idleOpacity);
    s.setProperty("--ll-glow", o.glowColor || o.color);
    s.setProperty("--ll-mark-glow", o.glowColor || o.doneColor);
    s.setProperty("--ll-cycle", cycle + "ms");

    
    const gridEl = document.createElement("span");
    gridEl.className = "lattice-loader__grid";
    gridEl.setAttribute("aria-hidden", "true");

    const run = document.createElement("span");
    run.className = "lattice-loader__layer lattice-loader__run";
    pat.cells.forEach((unit) => {
      const cell = document.createElement("span");
      cell.className = "lattice-loader__cell";
      if (unit == null) {
        cell.dataset.hole = "";
      } else {
        cell.style.animationDelay = Math.round(unit * d) + "ms";
        if (pat.lit && pat.lit !== 0.62)
          cell.dataset.lit = Math.round(pat.lit * 100);
      }
      run.appendChild(cell);
    });

    
    const mark = document.createElement("span");
    mark.className = "lattice-loader__layer lattice-loader__mark";
    pat.cells.forEach((_, i) => {
      const cell = document.createElement("span");
      cell.className = "lattice-loader__cell";
      if (marks.done.includes(i)) cell.dataset.onDone = "";
      if (marks.error.includes(i)) cell.dataset.onError = "";
      mark.appendChild(cell);
    });

    gridEl.appendChild(run);
    gridEl.appendChild(mark);
    root.appendChild(gridEl);

    
    const label = document.createElement("span");
    label.className = "lattice-loader__label";
    label.setAttribute("aria-hidden", "true");
    const texts = {};
    [
      ["working", o.label],
      ["done", o.doneLabel],
      ["error", o.errorLabel],
    ].forEach(([key, text]) => {
      const el = document.createElement("span");
      el.className = "lattice-loader__text";
      el.textContent = text;
      texts[key] = el;
      label.appendChild(el);
    });
    root.appendChild(label);

    let timerEl = null;
    if (o.showTimer) {
      timerEl = document.createElement("span");
      timerEl.className = "lattice-loader__timer";
      timerEl.setAttribute("aria-hidden", "true");
      timerEl.textContent = "0.0s";
      root.appendChild(timerEl);
    }

    mount.appendChild(root);

    
    let status = "idle";
    let timerId = 0;
    let startedAt = 0;
    let ds = 0;

    const paint = (value) => {
      ds = value;
      if (timerEl) timerEl.textContent = fmt(ds);
    };

    function stopTimer() {
      if (timerId) {
        clearInterval(timerId);
        timerId = 0;
      }
    }

    function setStatus(next) {
      if (next === "working") {
        
        status = "working";
        root.dataset.status = "working";
        s.setProperty("--ll-mark", o.doneColor);
        s.setProperty("--ll-mark-glow", o.glowColor || o.doneColor);
        startedAt = performance.now();
        paint(0);
        stopTimer();
        timerId = setInterval(
          () => paint(Math.floor((performance.now() - startedAt) / 100)),
          100
        );
        return;
      }
      if (next === status) return;
      status = next;
      if (next === "done" || next === "error") {
        root.dataset.status = next;
        const markColor = next === "error" ? o.errorColor : o.doneColor;
        s.setProperty("--ll-mark", markColor);
        s.setProperty("--ll-mark-glow", o.glowColor || markColor);
        stopTimer(); 
      } else {
        
        stopTimer();
      }
    }

    
    paint(0);

    return {
      get status() {
        return status;
      },
      get elapsed() {
        return ds / 10;
      },
      setStatus,
      destroy() {
        stopTimer();
        root.remove();
      },
    };
  }

  window.PikMistLatticeLoader = { create };
})();
