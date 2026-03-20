/**
 * MedRAG — script.js
 * Application logic: theme toggle, query history, API fetch, rendering, canvas.
 */

/* ── DOM References ─────────────────────────────────────────── */
const queryInput       = document.getElementById("queryInput");
const submitBtn        = document.getElementById("submitBtn");
const charCount        = document.getElementById("charCount");
const loadingState     = document.getElementById("loadingState");
const loadingSubtext   = document.getElementById("loadingSubtext");
const errorState       = document.getElementById("errorState");
const errorMessage     = document.getElementById("errorMessage");
const errorDismiss     = document.getElementById("errorDismiss");
const resultsSection   = document.getElementById("resultsSection");
const answerContent    = document.getElementById("answerContent");
const sourcesGrid      = document.getElementById("sourcesGrid");
const sourcesCount     = document.getElementById("sourcesCount");
const copyAnswerBtn    = document.getElementById("copyAnswerBtn");
const statDocs         = document.getElementById("stat-docs");
const themeToggle      = document.getElementById("themeToggle");
const themeLabel       = document.getElementById("themeLabel");
const historyPanel     = document.getElementById("historyPanel");
const historyList      = document.getElementById("historyList");
const historyClearBtn  = document.getElementById("historyClearBtn");
const historyCountBadge= document.getElementById("historyCountBadge");

/* ── State ──────────────────────────────────────────────────── */
let loadingMsgTimer  = null;
let loadingMsgIndex  = 0;
let currentAnswer    = "";
let abortController  = null;

/* ── Init ───────────────────────────────────────────────────── */
function init() {
  statDocs.textContent = MEDRAG_CONFIG.indexedDocumentsStat;

  // Theme
  initTheme();

  // Query input
  queryInput.addEventListener("input",   handleQueryInput);
  queryInput.addEventListener("keydown", handleQueryKeydown);
  submitBtn.addEventListener("click",    handleSubmit);

  // Error
  errorDismiss.addEventListener("click", hideError);

  // Copy
  copyAnswerBtn.addEventListener("click", copyAnswer);

  // Suggestion pills
  document.querySelectorAll(".suggestion-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      queryInput.value = pill.dataset.query;
      queryInput.dispatchEvent(new Event("input"));
      queryInput.focus();
    });
  });

  // History
  historyClearBtn.addEventListener("click", clearHistory);
  renderHistory();

  // Canvas
  initBgCanvas();
}

/* ══════════════════════════════════════════════════════════════
   THEME
══════════════════════════════════════════════════════════════ */

function initTheme() {
  // The inline <script> in <head> already applied the correct data-theme attribute
  // to avoid FOUC. We just sync the toggle label here.
  const saved = getSavedTheme();
  syncThemeUI(saved);

  themeToggle.addEventListener("click", toggleTheme);
}

function getSavedTheme() {
  try {
    return localStorage.getItem(MEDRAG_CONFIG.storage.themeKey)
      || MEDRAG_CONFIG.theme.default;
  } catch (e) {
    return MEDRAG_CONFIG.theme.default;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(MEDRAG_CONFIG.storage.themeKey, theme);
  } catch (e) { /* storage unavailable */ }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next    = current === "light" ? "dark" : "light";
  applyTheme(next);
  saveTheme(next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  syncThemeUI(theme);
  // Notify canvas to update its colour scheme
  updateCanvasTheme(theme);
}

function syncThemeUI(theme) {
  const labels = MEDRAG_CONFIG.theme.labels;
  themeLabel.textContent = labels[theme] || "Dark";
  themeToggle.setAttribute("aria-label", `Switch to ${labels[theme]} theme`);
}

/* ══════════════════════════════════════════════════════════════
   QUERY HISTORY
══════════════════════════════════════════════════════════════ */

function loadHistory() {
  try {
    const raw = localStorage.getItem(MEDRAG_CONFIG.storage.historyKey);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveHistoryList(list) {
  try {
    localStorage.setItem(MEDRAG_CONFIG.storage.historyKey, JSON.stringify(list));
  } catch (e) { /* storage unavailable */ }
}

function pushToHistory(query) {
  const list = loadHistory();

  // Remove duplicate if it already exists
  const deduped = list.filter(item => item.query !== query);

  // Prepend new entry
  deduped.unshift({
    query,
    timestamp: Date.now(),
  });

  // Trim to max
  const trimmed = deduped.slice(0, MEDRAG_CONFIG.ui.maxHistoryEntries);
  saveHistoryList(trimmed);
  renderHistory();
}

function clearHistory() {
  saveHistoryList([]);
  renderHistory();
}

function formatRelativeTime(ts) {
  const diffMs  = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr  = Math.floor(diffMin / 60);

  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24)  return `${diffHr}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renderHistory() {
  const list = loadHistory();
  historyCountBadge.textContent = list.length;

  if (list.length === 0) {
    historyPanel.classList.remove("visible");
    return;
  }

  historyPanel.classList.add("visible");
  historyList.innerHTML = "";

  list.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "history-item";
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-label", `Reuse query: ${item.query}`);

    // Icon
    const icon = document.createElement("span");
    icon.className = "history-item-icon";
    icon.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>`;

    // Text
    const text = document.createElement("span");
    text.className = "history-item-text";
    text.textContent = item.query;
    text.title = item.query;

    // Time
    const time = document.createElement("span");
    time.className = "history-item-time";
    time.textContent = formatRelativeTime(item.timestamp);

    // Use button
    const useBtn = document.createElement("button");
    useBtn.className = "history-item-use";
    useBtn.type = "button";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      loadHistoryQuery(item.query);
    });

    row.appendChild(icon);
    row.appendChild(text);
    row.appendChild(time);
    row.appendChild(useBtn);

    // Click entire row to load query
    row.addEventListener("click", () => loadHistoryQuery(item.query));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        loadHistoryQuery(item.query);
      }
    });

    historyList.appendChild(row);
  });
}

function loadHistoryQuery(query) {
  queryInput.value = query;
  queryInput.dispatchEvent(new Event("input"));
  queryInput.focus();
  queryInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ══════════════════════════════════════════════════════════════
   QUERY INPUT
══════════════════════════════════════════════════════════════ */

function handleQueryInput() {
  const len = queryInput.value.length;
  charCount.textContent = Math.min(len, MEDRAG_CONFIG.ui.maxQueryLength);
  updateSubmitState();
}

function handleQueryKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!submitBtn.disabled) handleSubmit();
  }
}

function updateSubmitState() {
  const len = queryInput.value.trim().length;
  submitBtn.disabled = len < MEDRAG_CONFIG.ui.minQueryLength;
}

/* ══════════════════════════════════════════════════════════════
   SUBMIT & FETCH
══════════════════════════════════════════════════════════════ */

async function handleSubmit() {
  const query = queryInput.value.trim();
  if (!query || query.length < MEDRAG_CONFIG.ui.minQueryLength) return;

  hideError();
  hideResults();
  setLoading(true);

  // Save to history before fetch
  pushToHistory(query);

  if (abortController) abortController.abort();
  abortController = new AbortController();

  const { baseUrl, queryEndpoint, method, headers, timeoutMs } = MEDRAG_CONFIG.api;

  let timeoutId;
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
  }

  try {
    const response = await fetch(`${baseUrl}${queryEndpoint}`, {
      method,
      headers,
      body: JSON.stringify({ query }),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Server returned ${response.status}${errText ? ": " + errText : ""}`);
    }

    const data = await response.json();
    handleSuccess(data);

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      showError("Request timed out. The MedRAG server did not respond in time.");
    } else {
      showError(err.message || "An unexpected error occurred. Please try again.");
    }
  } finally {
    setLoading(false);
  }
}

/* ── Success Handler ────────────────────────────────────────── */
function handleSuccess(data) {
  const answer  = (data.answer  || "").trim();
  const sources = Array.isArray(data.sources) ? data.sources : [];

  if (!answer && sources.length === 0) {
    showError("No results returned for this query. Please try rephrasing.");
    return;
  }

  currentAnswer = answer;
  answerContent.innerHTML = formatAnswer(answer);
  renderSources(sources);
  showResults();

  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

/* ── Answer Formatter ───────────────────────────────────────── */
function formatAnswer(text) {
  if (!text) return "<p>No answer content available.</p>";

  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  return paragraphs.map(para => {
    if (/^[-•*]\s/.test(para)) {
      const items = para.split("\n")
        .filter(l => /^[-•*]\s/.test(l.trim()))
        .map(l => `<li>${escHtml(l.replace(/^[-•*]\s+/, ""))}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }

    if (/^\d+\.\s/.test(para)) {
      const items = para.split("\n")
        .filter(l => /^\d+\.\s/.test(l.trim()))
        .map(l => `<li>${escHtml(l.replace(/^\d+\.\s+/, ""))}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    }

    const html = escHtml(para)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,     "<em>$1</em>")
      .replace(/`(.+?)`/g,       "<code>$1</code>")
      .replace(/\n/g, "<br />");

    return `<p>${html}</p>`;
  }).join("");
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Source Renderer ────────────────────────────────────────── */
function renderSources(sources) {
  sourcesGrid.innerHTML = "";

  if (sources.length === 0) {
    document.getElementById("sourcesBlock").style.display = "none";
    return;
  }

  document.getElementById("sourcesBlock").style.removeProperty("display");
  sourcesCount.textContent = `${sources.length} reference${sources.length !== 1 ? "s" : ""}`;

  const limitedSources = sources.slice(0, 2);

  sourcesCount.textContent= `${limitedSources.length} reference${limitedSources.length !== 1 ? "s" : ""}`;

  limitedSources.forEach((src, idx) => {
    const card = buildSourceCard(src, idx);
    card.style.animationDelay = `${idx * MEDRAG_CONFIG.ui.sourceStaggerDelayMs}ms`;
    sourcesGrid.appendChild(card);
  });
}

function buildSourceCard(src, index) {
  const rawCat  = (src.category || "general").toLowerCase().trim();
  const catLabel = MEDRAG_CONFIG.categoryLabels[rawCat] || capitalize(rawCat);

  const card = document.createElement("div");
  card.className = "source-card";
  card.setAttribute("role", "article");
  card.setAttribute("aria-label", `Source ${index + 1}: ${src.source}`);

  const refNum = document.createElement("span");
  refNum.className = "source-ref-num";
  refNum.textContent = `[${index + 1}]`;

  const topRow = document.createElement("div");
  topRow.className = "source-card-top";

  const docIcon = document.createElement("div");
  docIcon.className = "source-doc-icon";
  docIcon.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>`;

  const docName = document.createElement("div");
  docName.className = "source-doc-name";
  docName.textContent = src.source || "Unknown document";

  topRow.appendChild(docIcon);
  topRow.appendChild(docName);

  const metaRow = document.createElement("div");
  metaRow.className = "source-card-meta";

  if (src.page !== undefined && src.page !== null) {
    const pagePill = document.createElement("div");
    pagePill.className = "source-page";
    pagePill.innerHTML = `
      <span class="source-page-label">Page</span>
      <span class="source-page-num">${src.page}</span>`;
    metaRow.appendChild(pagePill);
  }

  const catBadge = document.createElement("span");
  catBadge.className = "category-badge";
  catBadge.setAttribute("data-cat", rawCat);
  catBadge.textContent = catLabel;
  metaRow.appendChild(catBadge);

  card.appendChild(refNum);
  card.appendChild(topRow);
  card.appendChild(metaRow);

  card.style.cursor = "pointer";
  card.onclick = () => {
    const fileUrl = `http://127.0.0.1:8000/files/${src.category}/${src.source}#page=${src.page}`;
    window.open(fileUrl, "_blank");
};

  return card;
}

/* ── Copy Answer ────────────────────────────────────────────── */
function copyAnswer() {
  if (!currentAnswer) return;

  navigator.clipboard.writeText(currentAnswer).then(() => {
    copyAnswerBtn.classList.add("copied");
    const orig = copyAnswerBtn.innerHTML;
    copyAnswerBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>Copied!</span>`;
    setTimeout(() => {
      copyAnswerBtn.classList.remove("copied");
      copyAnswerBtn.innerHTML = orig;
    }, MEDRAG_CONFIG.ui.copyToastDurationMs);
  }).catch(() => {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = currentAnswer;
    Object.assign(ta.style, { position: "absolute", opacity: "0", top: "-9999px" });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}

/* ── UI State Helpers ───────────────────────────────────────── */
function setLoading(on) {
  if (on) {
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
    loadingState.classList.add("visible");
    loadingMsgIndex = 0;
    loadingSubtext.textContent = MEDRAG_CONFIG.loadingMessages[0];
    startLoadingMessages();
  } else {
    submitBtn.classList.remove("loading");
    updateSubmitState();
    loadingState.classList.remove("visible");
    stopLoadingMessages();
  }
}

function startLoadingMessages() {
  const msgs = MEDRAG_CONFIG.loadingMessages;
  loadingMsgTimer = setInterval(() => {
    loadingMsgIndex = (loadingMsgIndex + 1) % msgs.length;
    loadingSubtext.style.opacity = "0";
    setTimeout(() => {
      loadingSubtext.textContent = msgs[loadingMsgIndex];
      loadingSubtext.style.opacity = "1";
    }, 240);
  }, MEDRAG_CONFIG.ui.loadingMessageIntervalMs);
}

function stopLoadingMessages() {
  clearInterval(loadingMsgTimer);
  loadingMsgTimer = null;
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.add("visible");
}

function hideError() { errorState.classList.remove("visible"); }

function showResults()  { resultsSection.classList.add("visible"); }
function hideResults()  {
  resultsSection.classList.remove("visible");
  answerContent.innerHTML = "";
  sourcesGrid.innerHTML   = "";
  currentAnswer           = "";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ══════════════════════════════════════════════════════════════
   BACKGROUND CANVAS — theme-aware particle network
══════════════════════════════════════════════════════════════ */

let canvasNodes     = [];
let canvasAnimId    = null;
let canvasTheme     = "light";

// Colour sets per theme
const CANVAS_COLORS = {
  light: {
    teal: [0, 143, 120],
    blue: [26, 102, 212],
  },
  dark: {
    teal: [0, 212, 170],
    blue: [79, 142, 247],
  },
};

function updateCanvasTheme(theme) {
  canvasTheme = theme;
  // Re-assign node hues to new colour set
  const colors = CANVAS_COLORS[theme];
  canvasNodes.forEach(n => {
    n.hue = Math.random() > 0.5 ? colors.teal : colors.blue;
  });
}

function initBgCanvas() {
  const canvas = document.getElementById("bgCanvas");
  const ctx    = canvas.getContext("2d");

  const NODE_COUNT = 55;
  const MAX_DIST   = 140;
  canvasTheme = document.documentElement.getAttribute("data-theme") || "light";

  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createNodes() {
    const colors = CANVAS_COLORS[canvasTheme];
    canvasNodes = Array.from({ length: NODE_COUNT }, () => ({
      x:   Math.random() * W,
      y:   Math.random() * H,
      vx:  (Math.random() - 0.5) * 0.32,
      vy:  (Math.random() - 0.5) * 0.32,
      r:   Math.random() * 1.6 + 0.7,
      hue: Math.random() > 0.5 ? colors.teal : colors.blue,
    }));
  }

  function lerp3(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < canvasNodes.length; i++) {
      for (let j = i + 1; j < canvasNodes.length; j++) {
        const dx   = canvasNodes[i].x - canvasNodes[j].x;
        const dy   = canvasNodes[i].y - canvasNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.18;
          const [r,g,b] = lerp3(canvasNodes[i].hue, canvasNodes[j].hue, 0.5);
          ctx.beginPath();
          ctx.moveTo(canvasNodes[i].x, canvasNodes[i].y);
          ctx.lineTo(canvasNodes[j].x, canvasNodes[j].y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth   = 0.65;
          ctx.stroke();
        }
      }
    }

    canvasNodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${n.hue[0]},${n.hue[1]},${n.hue[2]},0.5)`;
      ctx.fill();
    });
  }

  function move() {
    canvasNodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -20)   n.x = W + 20;
      if (n.x > W + 20) n.x = -20;
      if (n.y < -20)   n.y = H + 20;
      if (n.y > H + 20) n.y = -20;
    });
  }

  function loop() {
    move();
    draw();
    canvasAnimId = requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    cancelAnimationFrame(canvasAnimId);
    resize();
    loop();
  });

  resize();
  createNodes();
  loop();
}

/* ── Boot ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", init);
