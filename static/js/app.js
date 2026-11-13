
const $ = (id) => document.getElementById(id);



const BG_DARK = {
  colors: ["#84cc16", "#f6f8ff", "#a5ffbb", "#77f838"],
  lightMode: false,
};
const BG_LIGHT = {
  colors: ["#1e3fd8", "#f6f8ff", "#a5d8ff", "#38bdf8"],
  lightMode: true,
};


const SWITCH_COLORS = {
  dark: {
    trackColor: "#27272a",
    trackOnColor: "#f5f5f5",
    thumbColor: "#4e4e51",
    thumbOnColor: "#27272a",
  },
  light: {
    trackColor: "#dfe2ec",
    trackOnColor: "#1c1e28",
    thumbColor: "#ffffff",
    thumbOnColor: "#f5f5f5",
  },
};

const BG_OPTIONS = {
  shape: "horizon",
  characters: " =+xX0S8#@",
  cellSize: 18,
  density: 0.8,
  glyphOpacity: 0.85,
  glow: 0.2,
  depthOfField: 0,
  flicker: 0.2,
  softness: 0.5,
  scale: 1,
  flow: 0.5,
  speed: 1,
  gradientOpacity: 0.9,
  grain: 0.08,
  variation: 0,
  mouseInteraction: true,
  scrambleRadius: 0.1,
  clickEffect: "wave",
  intro: true,
};

let bgApi = null;
let bgEnabled = localStorage.getItem("pikmist-bg") !== "off";
let themeSwitch = null;
let bgSwitch = null;
let nsfwSwitch = null;
let laserApi = null;
let gooeyNav = null;
let currentTheme = localStorage.getItem("pikmist-theme") || "dark";

function createBg(theme) {
  if (bgApi) {
    bgApi.destroy();
    bgApi = null;
  }
  const host = document.getElementById("bg-ascii");
  if (!host || !window.PikMistBackground) return; 
  bgApi = window.PikMistBackground.create(host, {
    ...BG_OPTIONS,
    ...(theme === "light" ? BG_LIGHT : BG_DARK),
  });
}

const LASER_COLORS = { dark: "#14b8a6", light: "#0d9488" };

function createLaser(theme) {
  if (laserApi) {
    laserApi.destroy();
    laserApi = null;
  }
  const host = document.getElementById("laser-flow");
  const composer = document.getElementById("composer");
  if (!host || !composer || !window.PikMistLaserFlow) return;
  laserApi = window.PikMistLaserFlow.create(host, composer, {
    color: LASER_COLORS[theme] || LASER_COLORS.dark,
    theme: theme,
    beamPosition: 0.6,
    intensity: 1.8,
    flare: 1.5,
    spread: 1.5,
    spill: 1,
    fog: 0.2,
    dust: 1.6,
    beamWidth: 1.5,
    streaks: 1.5,
    dots: 1,
    pulse: 1.5,
    speed: 1.5,
    seed: 3,
    mouseInteraction: true,
    intro: true,
  });
}

function applyTheme(t, fromSwitch = false) {
  currentTheme = t;
  document.documentElement.dataset.theme = t;
  if (bgEnabled && bgApi) bgApi.set(t === "light" ? BG_LIGHT : BG_DARK);
  if (bgEnabled && laserApi) laserApi.set({ theme: t, color: LASER_COLORS[t] });
  if (gooeyNav) gooeyNav.setTheme(t);
  const colors = t === "light" ? SWITCH_COLORS.light : SWITCH_COLORS.dark;
  if (themeSwitch) {
    themeSwitch.setColors(colors);
    if (!fromSwitch) themeSwitch.set(t === "dark");
  }
  if (bgSwitch) bgSwitch.setColors(colors);
  if (nsfwSwitch) nsfwSwitch.setColors(colors);
}

function setBgEnabled(en) {
  bgEnabled = en;
  localStorage.setItem("pikmist-bg", en ? "on" : "off");
  if (en) {
    createBg(currentTheme);
    createLaser(currentTheme);
  } else {
    if (bgApi) {
      bgApi.destroy();
      bgApi = null;
    }
    if (laserApi) {
      laserApi.destroy();
      laserApi = null;
    }
  }
}

createBg(currentTheme);
if (bgEnabled) createLaser(currentTheme);
applyTheme(currentTheme);


const themeSwitchMount = document.getElementById("theme-switch");
const bgSwitchMount = document.getElementById("bg-switch");
if (themeSwitchMount && window.createSquishSwitch) {
  themeSwitch = window.createSquishSwitch(themeSwitchMount, {
    checked: currentTheme === "dark",
    speed: 50,
    stretch: 36,
    hoverScale: 1.035,
    colorDuration: 320,
    onChange: (dark) => {
      const t = dark ? "dark" : "light";
      localStorage.setItem("pikmist-theme", t);
      applyTheme(t, true);
    },
  });
}
if (bgSwitchMount && window.createSquishSwitch) {
  bgSwitch = window.createSquishSwitch(bgSwitchMount, {
    checked: bgEnabled,
    speed: 50,
    stretch: 36,
    hoverScale: 1.035,
    colorDuration: 320,
    onChange: setBgEnabled,
  });
  bgSwitch.setColors(SWITCH_COLORS[currentTheme]);
}


const nsfwSwitchMount = document.getElementById("nsfw-switch");
if (nsfwSwitchMount && window.createSquishSwitch) {
  nsfwSwitch = window.createSquishSwitch(nsfwSwitchMount, {
    checked: localStorage.getItem("pikmist-nsfw") === "on",
    speed: 50,
    stretch: 36,
    hoverScale: 1.035,
    colorDuration: 320,
    onChange: (on) => localStorage.setItem("pikmist-nsfw", on ? "on" : "off"),
  });
  nsfwSwitch.setColors(SWITCH_COLORS[currentTheme]);
}

const form = $("search-form");
const queryInput = $("query");
const searchBtn = $("search-btn");
const errorBox = $("error-box");

let mode = "username";
let currentTaskId = null;
let pollTimer = null;


const laserHost = document.getElementById("laser-flow");
const NAV_ICONS = {
  username:
    '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  email:
    '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" stroke-width="2"/><path d="M4 7.5l8 5.5 8-5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>',
};

function switchView(nav) {
  if (nav === "settings") {
    $("view-search").classList.remove("active");
    $("view-settings").classList.add("active");
    laserHost.classList.add("hidden"); 
  } else {
    $("view-settings").classList.remove("active");
    $("view-search").classList.add("active");
    laserHost.classList.remove("hidden");
    mode = nav;
    queryInput.placeholder =
      mode === "username"
        ? "Введите ник, например johndoe"
        : "Введите email, например johndoe@gmail.com";
    queryInput.focus();
  }
}

let gooeyMount = document.getElementById("gooey-nav");
if (gooeyMount && window.PikMistGooeyNav) {
  gooeyNav = window.PikMistGooeyNav.create(gooeyMount, {
    items: [
      { label: "По нику", icon: NAV_ICONS.username, value: "username" },
      { label: "По email", icon: NAV_ICONS.email, value: "email" },
      { label: "Настройки", icon: NAV_ICONS.settings, value: "settings" },
    ],
    initialActiveIndex: 0,
    theme: currentTheme,
    size: "sm",
    frame: false,
    particleCount: 15,
    spread: 56,
    animationTime: 600,
    timeVariance: 300,
    gooeyness: 0.5,
    wobble: 0.5,
    hoverEffect: true,
    onChange: (index, item) => {
      
      if (laserApi) laserApi.replay();
      switchView(item.value);
    },
  });
} else {
  
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.nav));
  });
}


fetch("/api/cancel", { method: "POST" }).catch(() => {});


document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => chip.classList.toggle("on"));
});


form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = queryInput.value.trim();
  if (!query) {
    showError("Введите ник или email для поиска");
    return;
  }

  hideError();
  resetResults();
  setBusy(true);

  const options = {};
  document.querySelectorAll(".chip.on").forEach((chip) => {
    options[chip.dataset.opt] = true;
  });
  
  if (nsfwSwitch && nsfwSwitch.on) options.no_nsfw = true;

  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, query, options }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка запроса");

    currentTaskId = data.id;
    showProgress(query);
    pollTimer = setInterval(poll, 1200);
  } catch (err) {
    showError(err.message);
    setBusy(false);
    flashLoaderResult("error");
  }
});


$("site-filter").addEventListener("input", () => {
  applyResultFilter();
});

$("filter-clear").addEventListener("click", () => {
  $("site-filter").value = "";
  applyResultFilter();
  $("site-filter").focus();
});

function applyResultFilter() {
  const q = $("site-filter").value.trim().toLowerCase();
  const cards = document.querySelectorAll("#results .acc-card");
  let visible = 0;

  cards.forEach((card) => {
    const name = (card.dataset.name || "").toLowerCase();
    const cat = (card.dataset.cat || "").toLowerCase();
    const match = !q || name.includes(q) || cat.includes(q);
    card.classList.toggle("hidden", !match);
    if (match) visible++;
  });

  $("results-count").textContent = visible + " / " + cards.length;
  $("filter-clear").classList.toggle("hidden", !q);

  const none = cards.length > 0 && visible === 0;
  let noMatch = document.getElementById("no-filter-match");
  if (none && !noMatch) {
    noMatch = document.createElement("div");
    noMatch.id = "no-filter-match";
    noMatch.className = "no-match";
    noMatch.innerHTML = "Ничего не подходит под «" + escapeHtml(q) + "»";
    $("results").appendChild(noMatch);
  } else if (none) {
    noMatch.querySelector("span") || (noMatch.innerHTML = "Ничего не подходит под «" + escapeHtml(q) + "»");
  } else if (!none && noMatch) {
    noMatch.remove();
  }
}


async function poll() {
  if (!currentTaskId) return;
  try {
    const res = await fetch(`/api/status/${currentTaskId}`);
    const s = await res.json();

    if (s.total) {
      const pct = Math.min(100, (s.completed / s.total) * 100);
      if (wakeBar) wakeBar.set(pct);
      $("progress-sub").textContent = `Проверено ${s.completed} из ${s.total} сайтов · ${s.elapsed} с`;
    } else {
      $("progress-sub").textContent = `Проверяем сайты… ${s.elapsed} с`;
    }

    if (s.state === "done") {
      clearInterval(pollTimer);
      setBusy(false);
      flashLoaderResult("done");
      $("progress-card").classList.add("hidden");
      render(s);
    } else if (s.state === "error") {
      clearInterval(pollTimer);
      setBusy(false);
      flashLoaderResult("error");
      $("progress-card").classList.add("hidden");
      showError(s.error || "Ошибка поиска");
    } else if (s.state === "cancelled") {
      clearInterval(pollTimer);
      setBusy(false);
      $("progress-card").classList.add("hidden");
      showError("Поиск был отменён");
    }
  } catch (_) {
    
  }
}


let wakeBar = null;
if (window.PikMistWakeProgress) {
  wakeBar = window.PikMistWakeProgress.create($("wake-progress"), {
    bars: 32,
    height: 38,
    restHeight: 12,
    gap: 3,
    sensitivity: 1,
    reach: 6,
    skew: 0.6,
    glide: 0.3,
    smoothing: 100,
    showValue: true,
  });
}

function showProgress(query) {
  $("progress-card").classList.remove("hidden");
  $("progress-query").textContent = query;
  if (wakeBar) wakeBar.reset();
  $("progress-sub").textContent = "Подготовка…";
  
  $("feed").scrollIntoView({ behavior: "smooth", block: "start" });
}

function render(s) {
  const accounts = s.accounts || [];

  if (!accounts.length) {
    $("empty-card").classList.remove("hidden");
  } else {
    $("results-wrap").classList.remove("hidden");
    $("results-title").textContent =
      s.mode === "username"
        ? `Аккаунты с ником «${s.query}»`
        : `Аккаунты с email «${s.query}»`;
    $("results-count").textContent = accounts.length;

    const grid = $("results");
    grid.dataset.filter = "";
    $("site-filter").value = "";
    accounts.forEach((a, i) => {
      const card = document.createElement("div");
      card.className = "acc-card";
      card.style.animationDelay = Math.min(i * 40, 600) + "ms";
      card.dataset.name = a.name || "";
      card.dataset.cat = a.category || "";

      let host = "";
      try { host = new URL(a.url).hostname; } catch (_) {}

      const meta = (a.metadata || [])
        .map(
          (m) =>
            `<div><b>${escapeHtml(m.name)}:</b> <span>${escapeHtml(
              m.value
            )}</span></div>`
        )
        .join("");

      const cat = a.category
        ? `<span class="acc-cat">${escapeHtml(a.category)}</span>`
        : "";

      card.innerHTML = `
        <div class="acc-top">
          <div class="acc-favicon">
            <img src="https://www.google.com/s2/favicons?sz=64&domain=${host}"
                 onerror="this.parentElement.innerHTML='<svg viewBox=\'0 0 24 24\' fill=\'none\'><path d=\'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\'/><path d=\'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\'/></svg>'">
          </div>
          <div class="acc-name">${escapeHtml(a.name)}</div>
        </div>
        ${cat}
        ${meta ? `<div class="acc-meta">${meta}</div>` : ""}
        <a class="acc-link" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">
          Открыть профиль <span>→</span>
        </a>
      `;
      grid.appendChild(card);
    });
  }

  
  if (s.files && s.files.length) {
    const dl = $("downloads");
    dl.classList.remove("hidden");
    dl.innerHTML = `<span class="dl-title">Отчёты:</span>`;
    s.files.forEach((f) => {
      const a = document.createElement("a");
      a.className = "dl-btn";
      a.href = `/download/${currentTaskId}/${f.file}`;
      a.innerHTML = `<span class="ext">↓</span> ${f.label}`;
      dl.appendChild(a);
    });
  }

  
  if (s.ai) {
    $("ai-card").classList.remove("hidden");
    const body = $("ai-body");
    if (s.ai.error) {
      body.innerHTML = `<div class="ai-error">${escapeHtml(s.ai.error)}</div>`;
    } else {
      const r = s.ai.result || {};
      let html = "";

      if (r.summary)
        html += aiBlock("Резюме", `<p>${escapeHtml(r.summary).replace(/\n/g, "<br>")}</p>`);
      if (r.categorization)
        html += aiBlock("Тип профиля", tagRow([r.categorization], "tag"));
      if (r.insights && r.insights.length)
        html += aiBlock("Наблюдения", `<ul>${r.insights.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`);
      if (r.risk_flags && r.risk_flags.length)
        html += aiBlock("Риск-факторы", tagRow(r.risk_flags, "tag risk"));
      if (r.tags && r.tags.length)
        html += aiBlock("Теги", tagRow(r.tags, "tag"));

      body.innerHTML = html;
      if (s.ai.remaining_quota != null)
        $("ai-quota").textContent = `Осталось запросов сегодня: ${s.ai.remaining_quota}`;
    }
  }

  
  if (s.ai && s.passport) renderPassport(s.passport);
}

function renderPassport(p) {
  const card = $("passport-card");
  card.classList.remove("hidden");

  
  const photo = $("passport-photo");
  photo.innerHTML = "";
  const initial = (p.name || p.query || "?")[0].toUpperCase();
  if (p.avatar) {
    const img = document.createElement("img");
    img.src = p.avatar;
    img.alt = "Аватар";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      img.remove();
      photo.innerHTML = `<span class="passport__initial">${escapeHtml(initial)}</span>`;
    };
    photo.appendChild(img);
  } else {
    photo.innerHTML = `<span class="passport__initial">${escapeHtml(initial)}</span>`;
  }

  const birth = p.birth
    ? `~${p.birth.year}` +
      (p.birth.source ? `<small>${escapeHtml(p.birth.source)}${p.birth.confidence === "low" ? " · предположительно" : ""}</small>` : "")
    : "не определена";
  const rows = [
    ["Полное имя", p.name || "не определено", p.name_source],
    ["Дата рождения", birth, null],
    ["Телефон", p.phone || "не найден", p.phone_source],
    ["Локация", p.location || "не определена", null],
    [p.mode === "username" ? "Ник" : "Email", p.query, null],
    ["Аккаунтов найдено", String(p.sites_count || 0), null],
  ];
  $("passport-fields").innerHTML = rows
    .map(
      ([label, value, source]) => `
      <div class="passport__field">
        <span class="passport__label">${label}</span>
        <span class="passport__value">${escapeHtml(String(value))}${
        source ? `<small>· ${escapeHtml(source)}</small>` : ""
      }</span>
      </div>`
    )
    .join("");

  const cats = (p.top_categories || [])
    .map(([c, n]) => `<span class="tag">${escapeHtml(c)} · ${n}</span>`)
    .join("");
  $("passport-foot").innerHTML = cats
    ? `<span class="passport__cats-label">Категории:</span>${cats}`
    : "";
}

function aiBlock(title, content) {
  return `<div class="ai-block"><h4>${title}</h4>${content}</div>`;
}

function tagRow(items, cls) {
  return `<div class="tags-row">${items
    .map((t) => `<span class="${cls}">${escapeHtml(String(t))}</span>`)
    .join("")}</div>`;
}

function resetResults() {
  ["results-wrap", "ai-card", "empty-card", "downloads", "passport-card"].forEach((id) =>
    $(id).classList.add("hidden")
  );
  $("results").innerHTML = "";
  $("ai-body").innerHTML = "";
  $("downloads").innerHTML = "";
  $("ai-quota").textContent = "";
  $("passport-photo").innerHTML = "";
  $("passport-fields").innerHTML = "";
  $("passport-foot").innerHTML = "";
}


let searchLoader = null;
let loaderTimer = null;
if (searchBtn && window.PikMistLatticeLoader) {
  searchLoader = window.PikMistLatticeLoader.create(searchBtn, {
    label: "Поиск",
    doneLabel: "Готово за",
    errorLabel: "Ошибка после",
    pattern: "orbit",
    grid: 3,
    shape: "round",
    doneColor: "#22c55e",
    errorColor: "#ef4444",
    color: "currentColor",
    cellSize: 6,
    gap: 2,
    fontSize: 14,
    idleOpacity: 0.15,
    glow: false,
    showTimer: true,
  });
}

function flashLoaderResult(status) {
  if (!searchLoader) return;
  clearTimeout(loaderTimer);
  searchBtn.classList.add("busy");
  searchLoader.setStatus(status);
  loaderTimer = setTimeout(() => {
    searchBtn.classList.remove("busy");
    searchLoader.setStatus("idle");
  }, 2200);
}

function setBusy(busy) {
  searchBtn.disabled = busy;
  if (busy) {
    clearTimeout(loaderTimer);
    searchBtn.classList.add("busy");
    if (searchLoader) searchLoader.setStatus("working");
  } else {
    searchBtn.classList.remove("busy");
    if (searchLoader) searchLoader.setStatus("idle"); 
  }
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
