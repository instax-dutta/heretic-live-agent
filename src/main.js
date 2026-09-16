import { createRequestGate, estimateDownloadsPerSecond, estimateLiveTotal } from "../api/stats-core.js";
import { isValidUsername, normalizeUsername } from "../shared/username.js";
import "./style.css";

const app = document.querySelector("#app");
const nf = new Intl.NumberFormat("en-US");

const fallback = { modelCount: 7509, allTimeDownloads: 64904090, last30DaysDownloads: 14438920 };
let state = { scope: "global", loading: true, error: "", data: null, lastUpdated: null, validation: "" };
const requestGate = createRequestGate();
let liveTickerId = null;
let liveBase = null;

function format(value) {
  return nf.format(Number(value || 0));
}

function pct(a, b) {
  return b ? Math.min(100, (a / b) * 100) : 0;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function timeAgo(value) {
  if (!value) return "not yet refreshed";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "not yet refreshed";
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} hr ago`;
}

function formatRate(rate) {
  if (!Number.isFinite(rate) || rate < 0.1) return "";
  return rate >= 10 ? String(Math.round(rate)) : rate.toFixed(1);
}

function stopLiveTicker() {
  if (liveTickerId !== null) {
    clearInterval(liveTickerId);
    liveTickerId = null;
  }
  liveBase = null;
  tracePoints = [];
}

function startLiveTicker(totals) {
  stopLiveTicker();
  const rate = estimateDownloadsPerSecond(totals?.last30DaysDownloads);
  if (!rate || rate <= 0) return;
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    } catch {
      // If matchMedia throws, fall through and still tick.
    }
  }
  // Anchor the estimate at render time: the API total is a point-in-time
  // snapshot (refreshed every 12h), so we count forward from display time.
  liveBase = {
    total: Number(totals.allTimeDownloads || 0),
    last30DaysDownloads: Number(totals.last30DaysDownloads || 0),
    startedAt: Date.now(),
  };
  if (typeof setInterval !== "function") return;
  tracePoints = [liveBase.total];
  drawTrace();
  liveTickerId = setInterval(() => {
    const el = document.querySelector("#live-total");
    if (!el || !liveBase) {
      stopLiveTicker();
      return;
    }
    const elapsedSeconds = (Date.now() - liveBase.startedAt) / 1000;
    const current = estimateLiveTotal(liveBase.total, liveBase.last30DaysDownloads, elapsedSeconds);
    el.textContent = format(current);
    tracePoints.push(current);
    if (tracePoints.length > TRACE_MAX_POINTS) tracePoints.shift();
    drawTrace();
  }, 1000);
}

let tracePoints = [];
const TRACE_MAX_POINTS = 120;

function drawTrace() {
  if (typeof document === "undefined") return;
  if (!liveBase) return;
  const canvas = document.querySelector("#live-trace");
  if (!canvas || tracePoints.length === 0) return;
  const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const styles = typeof getComputedStyle === "function" ? getComputedStyle(canvas) : null;
  const accent = styles ? styles.getPropertyValue("--accent").trim() || "#b2341c" : "#b2341c";
  const grid = "rgba(246, 241, 231, 0.14)";
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    const y = Math.round((height / 4) * i) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  const min = tracePoints[0];
  const max = tracePoints[tracePoints.length - 1];
  const span = Math.max(1, max - min);
  // Parametric raise: the ink weight follows the download pace, so a faster
  // ecosystem literally draws a heavier line.
  const pace = liveBase ? estimateDownloadsPerSecond(liveBase.last30DaysDownloads) : 0;
  const pad = 6;
  const xStep = tracePoints.length > 1 ? (width - pad * 2) / (TRACE_MAX_POINTS - 1) : 0;
  const x0 = width - pad - xStep * (tracePoints.length - 1);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5 + Math.min(2, pace / 5);
  ctx.lineJoin = "round";
  ctx.beginPath();
  tracePoints.forEach((point, i) => {
    const x = x0 + xStep * i;
    const y = height - pad - ((point - min) / span) * (height - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const lastX = width - pad;
  const lastY = height - pad - ((max - min) / span) * (height - pad * 2);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("resize", drawTrace);
}

function render() {
  const totals = state.data?.totals || fallback;
  const isUser = state.scope === "user";
  const models = state.data?.models || [];
  const maxDownloads = models[0]?.downloadsAllTime || 1;
  const username = state.data?.username || "";
  const recentShare = totals.allTimeDownloads
    ? ((totals.last30DaysDownloads / totals.allTimeDownloads) * 100).toFixed(1)
    : 0;
  const liveRate = estimateDownloadsPerSecond(totals.last30DaysDownloads);
  const liveRateLabel = formatRate(liveRate);

  app.innerHTML = `
    <main class="shell">
      <header class="masthead">
        <div class="dateline">
          <span>Public model index — Hugging Face Hub API</span>
          <a class="hub-link" href="https://huggingface.co/models?search=heretic" target="_blank" rel="noreferrer">
            Browse Hugging Face <span aria-hidden="true">↗</span>
          </a>
        </div>
        <a class="nameplate" href="/" aria-label="Heretic Live home">Heretic <span aria-hidden="true">/</span> Live</a>
      </header>

      <section class="front" aria-labelledby="page-title">
        <h1 id="page-title">How far is <em>Heretic</em> spreading?</h1>
        <p class="standfirst">A live read on public Heretic models on Hugging Face, counted by tag and name so the long tail remains visible.</p>
        <div class="press-line">
          <span class="stamp ${state.error ? "warn" : "live"}">${state.error ? "Degraded data" : "Live data"}</span>
          <span>Updated ${timeAgo(state.lastUpdated)} · Refreshes every 12 hours</span>
        </div>
      </section>

      <figure class="figure" aria-labelledby="fig-caption">
        <figcaption id="fig-caption"><span>Fig. 1 — Cumulative public downloads, tag-plus-name index</span><span>Aggregated across every indexed public repository</span></figcaption>
        <div class="plate">
          <div class="plate-label">All-time downloads</div>
          <p class="live-total" id="live-total" aria-live="off" aria-atomic="false">${format(totals.allTimeDownloads)}</p>
          <canvas id="live-trace" aria-hidden="true"></canvas>
          <div class="pace-line"><span class="live-dot" aria-hidden="true"></span>${liveRateLabel ? `<span><strong>+~${liveRateLabel}/sec</strong> · 30-day pace, inked live</span>` : `<span>Pace unavailable for this view</span>`}</div>
          <div class="plate-foot">Combined downloads across ${format(totals.modelCount)} models</div>
        </div>
      </figure>

      <ul class="ledger" aria-label="Recent activity and index size">
        <li>
          <span class="ledger-label">Last 30 days</span>
          <span class="ledger-value">${format(totals.last30DaysDownloads)}</span>
          <span class="ledger-note">${recentShare}% of lifetime volume is recent</span>
        </li>
        <li>
          <span class="ledger-label">Models tracked</span>
          <span class="ledger-value">${format(totals.modelCount)}</span>
          <span class="ledger-note">Tag and name discovery, deduplicated</span>
        </li>
      </ul>

      <section class="inquiry" aria-labelledby="lookup-title">
        <div class="inquiry-copy">
          <h2 id="lookup-title">Inspect a creator</h2>
          <p>Enter a Hugging Face username to rank their public Heretic models by reach.</p>
        </div>
        <form id="lookup-form" class="lookup-form" novalidate>
          <label for="username">Hugging Face username</label>
          <div class="input-row">
            <span class="at" aria-hidden="true">@</span>
            <input id="username" name="username" placeholder="username" value="${escapeHtml(isUser ? username : "")}" autocomplete="off" spellcheck="false" aria-describedby="lookup-help lookup-error" />
            <button type="submit" ${state.loading && isUser ? "disabled" : ""}>
              ${state.loading && isUser ? "Loading" : "Inspect profile"}<span aria-hidden="true">→</span>
            </button>
          </div>
          <div id="lookup-help" class="form-help">Leave blank to return to the global index.</div>
          <div id="lookup-error" class="form-error" role="alert">${escapeHtml(state.validation)}</div>
        </form>
      </section>

      ${state.error ? `<div class="correction" role="status"><strong>Correction — live refresh unavailable.</strong> The latest published snapshot is still shown. <button id="retry" type="button">Retry connection</button></div>` : ""}
      ${isUser && state.loading ? renderLoading(username) : ""}
      ${isUser && !state.loading && state.data ? renderUser(models, username, maxDownloads) : renderMethod()}

      <footer class="imprint">
        <span>Heretic / Live</span>
        <span>Public metadata only. No login required.</span>
        <a href="https://github.com/p-e-w/heretic/issues/450" target="_blank" rel="noreferrer">Read the methodology ↗</a>
      </footer>
    </main>`;

  document.querySelector("#lookup-form").addEventListener("submit", handleLookup);
  document.querySelector("#retry")?.addEventListener("click", () => fetchStats(state.scope === "user" ? username : undefined));
  document.querySelector("#clear")?.addEventListener("click", () => fetchStats());
  startLiveTicker(totals);
}

function renderMethod() {
  return `<section class="methods-note" aria-labelledby="method-title">
    <div class="section-head">
      <h2 id="method-title">How the index works</h2>
      <p>The count favors coverage over a narrow snapshot of popular repositories.</p>
    </div>
    <div class="methods-body">
      <p>Heretic models are discovered in two passes: repositories carrying the <code>heretic</code> tag, plus repositories with “heretic” in their name. Repository IDs are deduplicated before totals are calculated.</p>
      <ol class="method-list" aria-label="Index methodology">
        <li><strong>01</strong><span>Find tagged repositories</span></li>
        <li><strong>02</strong><span>Search model names</span></li>
        <li><strong>03</strong><span>Deduplicate repository IDs</span></li>
      </ol>
    </div>
  </section>`;
}

function renderLoading(username) {
  return `<section class="results" aria-live="polite" aria-busy="true">
    <div class="section-head">
      <h2>Inspecting @${escapeHtml(username)}</h2><p>Reading public model metadata from Hugging Face.</p>
    </div>
    <div class="loading-list" aria-label="Loading creator models">
      <span></span><span></span><span></span>
    </div>
  </section>`;
}

function renderUser(models, username, maxDownloads) {
  if (!models.length) {
    return `<section class="empty-state" aria-labelledby="empty-title">
      <div class="empty-mark" aria-hidden="true">∅</div>
      <div class="empty-copy"><h2 id="empty-title">No Heretic models found for @${escapeHtml(username)}.</h2><p>We checked both the <strong>heretic</strong> tag and model names. Confirm the username or that the repositories are public.</p><button class="text-button" id="clear" type="button">Return to global index</button></div>
    </section>`;
  }

  return `<section class="results" aria-labelledby="results-title">
    <div class="result-head">
      <div><h2 id="results-title">${models.length} model${models.length === 1 ? "" : "s"} for @${escapeHtml(username)}</h2><p>Ranked by lifetime downloads. Recent activity is shown at right.</p></div>
      <span class="profile-stamp">Public profile</span>
    </div>
    <div class="model-list" role="list" aria-label="Heretic models by lifetime downloads">
      ${models.slice(0, 8).map((model, i) => `<a class="model-row" role="listitem" id="model-${i + 1}" href="${escapeHtml(model.url)}" target="_blank" rel="noreferrer">
        <span class="rank">${String(i + 1).padStart(2, "0")}</span>
        <span class="model-name">${escapeHtml(model.id.split("/").pop())}<small>${escapeHtml(model.id)}</small></span>
        <span class="bar-wrap" aria-hidden="true"><span class="bar" style="width:${pct(model.downloadsAllTime, maxDownloads)}%"></span></span>
        <span class="model-number">${format(model.downloadsAllTime)}<small>${format(model.downloads)} last 30 days</small></span>
        <span class="arrow" aria-hidden="true">↗</span>
      </a>`).join("")}
    </div>
  </section>`;
}

async function fetchStats(username) {
  const requestId = requestGate.start();
  state = { ...state, loading: true, error: "", validation: "", scope: username ? "user" : "global" };
  render();

  try {
    const response = await fetch(`/api/stats${username ? `?username=${encodeURIComponent(username)}` : ""}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    if (!requestGate.isCurrent(requestId)) return;
    state = { ...state, loading: false, data, lastUpdated: data.updatedAt };
  } catch (error) {
    if (!requestGate.isCurrent(requestId)) return;
    state = { ...state, loading: false, error: error.message, data: { totals: fallback, username, models: [] }, lastUpdated: null };
  }
  render();
}

async function handleLookup(event) {
  event.preventDefault();
  const value = normalizeUsername(new FormData(event.currentTarget).get("username"));
  if (!value) return fetchStats();
  if (!isValidUsername(value)) {
    requestGate.start();
    state = { ...state, validation: "Use a valid Hugging Face username." };
    render();
    document.querySelector("#username")?.focus();
    return;
  }
  fetchStats(value);
}

render();
fetchStats();
