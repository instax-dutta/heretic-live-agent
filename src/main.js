import { createRequestGate } from "../api/stats-core.js";
import { isValidUsername, normalizeUsername } from "../shared/username.js";
import "./style.css";

const app = document.querySelector("#app");
const nf = new Intl.NumberFormat("en-US");

const fallback = { modelCount: 7509, allTimeDownloads: 64904090, last30DaysDownloads: 14438920 };
let state = { scope: "global", loading: true, error: "", data: null, lastUpdated: null, validation: "" };
const requestGate = createRequestGate();

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
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} hr ago`;
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

  app.innerHTML = `
    <main class="shell">
      <nav class="topbar" aria-label="Primary navigation">
        <a class="brand" href="/" aria-label="Heretic Live home">
          <span class="brand-mark" aria-hidden="true">H</span>
          <span>HERETIC<span class="slash">/</span>LIVE</span>
        </a>
        <a class="hub-link" href="https://huggingface.co/models?search=heretic" target="_blank" rel="noreferrer">
          Browse Hugging Face <span aria-hidden="true">↗</span>
        </a>
      </nav>

      <section class="hero" aria-labelledby="page-title">
        <div class="eyebrow">PUBLIC MODEL INDEX</div>
        <h1 id="page-title">How far is <em>Heretic</em> spreading?</h1>
        <p class="lede">A live read on public Heretic models on Hugging Face, counted by tag and name so the long tail remains visible.</p>
        <div class="source-line">
          <span class="status-pill ${state.error ? "warn" : "ok"}">${state.error ? "DEGRADED DATA" : "LIVE DATA"}</span>
          <span>Hugging Face Hub API</span>
          <span class="source-refresh">Updated ${timeAgo(state.lastUpdated)}</span>
        </div>
      </section>

      <section class="data-section" aria-labelledby="reach-title">
        <div class="section-heading">
          <div>
            <h2 id="reach-title">Current reach</h2>
            <p>Aggregated across every indexed public repository.</p>
          </div>
          <span class="refresh-note">Refreshes every 12 hours</span>
        </div>
        <div class="stats-grid">
          <article class="stat-card primary-stat">
            <div class="stat-label">ALL-TIME DOWNLOADS</div>
            <div class="stat-value">${format(totals.allTimeDownloads)}</div>
            <div class="stat-foot">Combined downloads across ${format(totals.modelCount)} models</div>
          </article>
          <article class="stat-card">
            <div class="stat-label">LAST 30 DAYS</div>
            <div class="stat-value">${format(totals.last30DaysDownloads)}</div>
            <div class="stat-foot">${recentShare}% of lifetime volume is recent</div>
          </article>
          <article class="stat-card">
            <div class="stat-label">MODELS TRACKED</div>
            <div class="stat-value">${format(totals.modelCount)}</div>
            <div class="stat-foot">Tag and name discovery, deduplicated</div>
          </article>
        </div>
      </section>

      <section class="lookup-panel" aria-labelledby="lookup-title">
        <div class="lookup-copy">
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

      ${state.error ? `<div class="notice error" role="status"><strong>Live refresh unavailable.</strong> The latest published snapshot is still shown. <button id="retry" type="button">Retry connection</button></div>` : ""}
      ${isUser && state.loading ? renderLoading(username) : ""}
      ${isUser && !state.loading && state.data ? renderUser(models, username, maxDownloads) : renderMethod()}

      <footer>
        <span>HERETIC / LIVE</span>
        <span>Public metadata only. No login required.</span>
        <a href="https://github.com/p-e-w/heretic/issues/450" target="_blank" rel="noreferrer">Read the methodology ↗</a>
      </footer>
    </main>`;

  document.querySelector("#lookup-form").addEventListener("submit", handleLookup);
  document.querySelector("#retry")?.addEventListener("click", () => fetchStats(state.scope === "user" ? username : undefined));
  document.querySelector("#clear")?.addEventListener("click", () => fetchStats());
}

function renderMethod() {
  return `<section class="method-section" aria-labelledby="method-title">
    <div class="section-heading">
      <div>
        <h2 id="method-title">How the index works</h2>
        <p>The count favors coverage over a narrow snapshot of popular repositories.</p>
      </div>
    </div>
    <div class="method-content">
      <p>Heretic models are discovered in two passes: repositories carrying the <code>heretic</code> tag, plus repositories with “heretic” in their name. Repository IDs are deduplicated before totals are calculated.</p>
      <div class="method-list" aria-label="Index methodology">
        <div><strong>01</strong><span>Find tagged repositories</span></div>
        <div><strong>02</strong><span>Search model names</span></div>
        <div><strong>03</strong><span>Deduplicate repository IDs</span></div>
      </div>
    </div>
  </section>`;
}

function renderLoading(username) {
  return `<section class="results-section" aria-live="polite" aria-busy="true">
    <div class="section-heading">
      <div><h2>Inspecting @${escapeHtml(username)}</h2><p>Reading public model metadata from Hugging Face.</p></div>
    </div>
    <div class="loading-list" aria-label="Loading creator models">
      <span></span><span></span><span></span>
    </div>
  </section>`;
}

function renderUser(models, username, maxDownloads) {
  if (!models.length) {
    return `<section class="empty-state" aria-labelledby="empty-title">
      <div class="empty-icon" aria-hidden="true">0</div>
      <div><h2 id="empty-title">No Heretic models found for @${escapeHtml(username)}.</h2><p>We checked both the <strong>heretic</strong> tag and model names. Confirm the username or that the repositories are public.</p><button class="text-button" id="clear" type="button">Return to global index</button></div>
    </section>`;
  }

  return `<section class="results-section" aria-labelledby="results-title">
    <div class="section-heading result-heading">
      <div><h2 id="results-title">${models.length} model${models.length === 1 ? "" : "s"} for @${escapeHtml(username)}</h2><p>Ranked by lifetime downloads. Recent activity is shown at right.</p></div>
      <span class="profile-badge">PUBLIC PROFILE</span>
    </div>
    <div class="model-list" role="list" aria-label="Heretic models by lifetime downloads">
      ${models.slice(0, 8).map((model, i) => `<a class="model-row" role="listitem" href="${escapeHtml(model.url)}" target="_blank" rel="noreferrer">
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
