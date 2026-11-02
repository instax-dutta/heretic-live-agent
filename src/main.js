import Lenis from "lenis";
import { createRequestGate, estimateDownloadsPerSecond } from "../api/stats-core.js";
import { getFigureLabels } from "../shared/figure.js";
import { isValidUsername, normalizeUsername } from "../shared/username.js";

const app = document.querySelector("#app");
const nf = new Intl.NumberFormat("en-US");

// snapshot:start
// Published snapshot used when the upstream API is unreachable, and the only
// figures a text-only retriever ever sees. Refreshed by update-snapshot.mjs;
// `asOf` dates them so a stale snapshot is honest rather than merely wrong.
const fallback = { modelCount: 8612, creatorCount: 1820, allTimeDownloads: 88600442, last30DaysDownloads: 14279009 };
const fallbackAsOf = "2026-11-02T08:03:09.684Z";
// snapshot:end
let state = { scope: "global", loading: true, error: "", data: null, lastUpdated: null, validation: "" };
const requestGate = createRequestGate();

let entranceDone = false;
let scrollObserver = null;

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

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

// A degraded view shows the snapshot's own date rather than a relative "now",
// because that is what the numbers on screen actually are.
function snapshotStamp() {
  const stamp = new Date(fallbackAsOf);
  if (!Number.isFinite(stamp.getTime())) return "published figures";
  return `snapshot ${stamp.toISOString().slice(0, 10)}`;
}

function formatRate(rate) {
  if (!Number.isFinite(rate) || rate < 0.1) return "";
  // The pace is a 30-day average. Whole values above 1; one decimal below so
  // quiet creator views still read honestly instead of rounding to zero.
  if (rate < 1) return rate.toFixed(1);
  return String(Math.max(1, Math.round(rate)));
}

function initSmoothScroll() {
  if (typeof window === "undefined" || prefersReducedMotion()) return null;
  try {
    return new Lenis({ autoRaf: true, lerp: 0.1, smoothWheel: true, smoothTouch: false });
  } catch {
    // Smooth scroll is an enhancement: native scroll stays fully working.
    return null;
  }
}

initSmoothScroll();

function render() {
  const totals = state.data?.totals || fallback;
  const isUser = state.scope === "user";
  // A failed lookup falls back to the published GLOBAL snapshot. Attaching a
  // creator's name to global totals would be a lie, so the degraded state
  // always speaks in global scope and says the data is a snapshot.
  const degraded = Boolean(state.error);
  const creatorScope = isUser && !degraded;
  const models = state.data?.models || [];
  const maxDownloads = models[0]?.downloadsAllTime || 1;
  const username = state.data?.username || "";
  const recentShare = totals.allTimeDownloads
    ? ((totals.last30DaysDownloads / totals.allTimeDownloads) * 100).toFixed(1)
    : "0.0";
  const paceRate = estimateDownloadsPerSecond(totals.last30DaysDownloads);
  const paceLabel = formatRate(paceRate);
  const figure = getFigureLabels({
    isUser: creatorScope,
    username: escapeHtml(username),
    formattedModelCount: format(totals.modelCount),
  });
  const scopeTag = degraded ? "global snapshot" : figure.captionRight;
  const figLabel = degraded ? "All-time downloads · last published" : figure.captionLeft;

  app.innerHTML = `
    <div class="page">
      <aside class="rail">
        <a class="rail-mark" href="/" aria-label="Heretic Live home">Heretic <em>/</em> Live</a>
        <div class="rail-foot">
          <span class="rail-tag">${paceLabel ? "30-day pace" : "Public index"}</span>
        </div>
      </aside>

      <main class="main">
        <header class="head reveal">
          <h1>How far is <em>Heretic</em> spreading?</h1>
          <p class="dateline">Public model index · Hugging Face Hub API<br>
            ${state.error ? '<span class="stamp warn">Degraded data</span> ' : ""}<span class="scope-tag">${scopeTag}</span> · ${degraded ? snapshotStamp() : `Updated ${timeAgo(state.lastUpdated)}`} · refreshes every 12 hours
          </p>
        </header>

        <section class="figure reveal" aria-labelledby="fig-label">
          <div class="figure-l">
            <p class="fig-label" id="fig-label">${figLabel}</p>
            <p class="figure-total">${format(totals.allTimeDownloads)}</p>
            <div class="pace">
              ${paceLabel ? `+${paceLabel}/sec <span>· 30-day average</span>` : "Pace unavailable for this view"}
            </div>
            <p class="figure-sub">${figure.plateFoot}</p>
          </div>
          <p class="estimator-note"><span>${degraded
            ? "These are the last published figures. The upstream API is unavailable, so they are dated rather than current."
            : "All-time downloads are summed from public Hugging Face metadata and refreshed every 12 hours."}</span></p>
        </section>

        <ul class="rows reveal">
          <li class="row">
            <span class="row-label">Last 30 days</span>
            <span class="row-value">${format(totals.last30DaysDownloads)}</span>
            <span class="row-note">${recentShare}% of lifetime volume is recent</span>
          </li>
          <li class="row">
            <span class="row-label">Models tracked</span>
            <span class="row-value">${format(totals.modelCount)}</span>
            <span class="row-note">Tag and name discovery, deduplicated by repository ID</span>
          </li>
          ${!creatorScope && totals.creatorCount ? `<li class="row">
            <span class="row-label">Unique creators</span>
            <span class="row-value">${format(totals.creatorCount)}</span>
            <span class="row-note">Distinct Hugging Face accounts and organizations publishing the indexed repositories</span>
          </li>` : ""}
        </ul>

        <section class="query reveal" aria-labelledby="lookup-title">
          <div>
            <h2 id="lookup-title">Inspect a creator</h2>
            <p>Enter a Hugging Face username to rank their public Heretic models by reach.</p>
          </div>
          <form id="lookup-form" class="lookup-form" novalidate>
            <label for="username">Hugging Face username</label>
            <div class="input-row">
              <span class="at" aria-hidden="true">@</span>
              <input id="username" name="username" placeholder="username" value="${escapeHtml(isUser ? username : "")}" autocomplete="off" spellcheck="false" aria-describedby="lookup-help lookup-error" />
              <button type="submit" ${state.loading && isUser ? "disabled" : ""}>${state.loading && isUser ? "Reading" : "Inspect profile"}</button>
            </div>
            <div id="lookup-help" class="form-help">Leave blank to return to the global index.</div>
            <div id="lookup-error" class="form-error" role="alert">${escapeHtml(state.validation)}</div>
          </form>
        </section>

        ${state.error ? `<div class="correction reveal" role="status"><strong>Correction — refresh unavailable.</strong> The latest published snapshot is still shown.<button data-action="retry" type="button">Retry connection</button></div>` : ""}
        ${isUser && state.loading ? renderLoading(username) : ""}
        ${isUser && !state.loading && degraded
          ? renderUnavailable(username)
          : isUser && !state.loading && state.data
            ? renderUser(models, username, maxDownloads)
            : renderMethod()}

        <footer class="imprint">
          <span>Heretic / Live</span>
          <span>Public metadata only. No login required.</span>
          <span class="imprint-links">
            <a href="https://huggingface.co/models?search=heretic" target="_blank" rel="noreferrer">Browse Hugging Face ↗</a>
            <a href="https://github.com/p-e-w/heretic/issues/450" target="_blank" rel="noreferrer">Read the methodology ↗</a>
          </span>
        </footer>
      </main>
    </div>`;

  document.querySelector("#lookup-form").addEventListener("submit", handleLookup);
  document.querySelectorAll('[data-action="retry"]').forEach((el) =>
    el.addEventListener("click", () => fetchStats(state.scope === "user" ? username : undefined)));
  document.querySelectorAll('[data-action="clear"]').forEach((el) =>
    el.addEventListener("click", () => fetchStats()));
  revealOnScroll();
}

/* Entrance choreography runs once. Every later render lands immediately, so
   switching scope never replays the opening and no section can be left
   stranded at opacity 0 if the observer never fires. */
function revealOnScroll() {
  if (typeof document === "undefined") return;
  const targets = [...document.querySelectorAll(".reveal:not(.in)")];
  if (entranceDone || prefersReducedMotion() || typeof IntersectionObserver !== "function") {
    targets.forEach((el) => el.classList.add("in"));
    entranceDone = true;
    return;
  }
  targets.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i, 5) * 60}ms`;
  });
  if (!scrollObserver) {
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
  }
  targets.forEach((el) => scrollObserver.observe(el));
  // Anything already on screen at first paint should not wait for a scroll.
  requestAnimationFrame(() => {
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
    });
  });
  // Final safety sweep: nothing may stay invisible because a frame was missed.
  setTimeout(() => {
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => el.classList.add("in"));
    entranceDone = true;
  }, 1600);
}

// The methodology, the entity disclaimer, and the outbound links must exist in
// this template as well as in the static fallback in index.html. The fallback
// is discarded the moment this runs, so a link that lives only there is a link
// no visitor and no rendering crawler ever sees.
function renderMethod() {
  return `<section class="methods reveal" aria-labelledby="method-title">
    <div class="methods-copy">
      <div class="section-head">
        <h2 id="method-title">How the index works</h2>
        <p>The count favors coverage over a narrow snapshot of popular repositories.</p>
      </div>
      <p class="methods-body">Heretic models are discovered in two passes over the public Hugging Face Hub API: repositories carrying the <code>heretic</code> tag, plus repositories with "heretic" in their name. The two result sets are merged and deduplicated by repository ID before any total is calculated, so the count favors coverage over a narrow snapshot of popular repositories.</p>
      <p class="methods-body">The totals above are aggregate download counts for public repositories. The <a href="/api/stats" rel="noreferrer">JSON endpoint</a> is the authoritative machine-readable surface, carries an <code>updatedAt</code> timestamp, and accepts <code>?username=</code> for a creator-scoped readout. A summary for language models is at <a href="/llms.txt" rel="noreferrer">/llms.txt</a>.</p>
      <p class="provenance">Heretic Live is an independent, unaffiliated third-party index. It is not operated or endorsed by the Heretic maintainers. The counting approach and the original reference figures come from <a href="https://github.com/p-e-w/heretic/issues/450" target="_blank" rel="noreferrer">p-e-w/heretic#450</a>, and the upstream models themselves are at <a href="https://huggingface.co/models?search=heretic" target="_blank" rel="noreferrer">huggingface.co/models?search=heretic</a>.</p>
    </div>
    <ol class="method-list" aria-label="Index methodology">
      <li><b>01</b><span>Find tagged repositories</span></li>
      <li><b>02</b><span>Search model names</span></li>
      <li><b>03</b><span>Deduplicate repository IDs</span></li>
    </ol>
  </section>`;
}

function renderLoading(username) {
  return `<section class="results" aria-live="polite" aria-busy="true">
    <div class="result-head">
      <div>
        <h2>Inspecting @${escapeHtml(username)}</h2>
        <p>Reading public model metadata from Hugging Face.</p>
      </div>
    </div>
    <div class="loading-list" aria-label="Loading creator models"><span></span><span></span><span></span></div>
  </section>`;
}

// A failed lookup is not an empty result. Saying "no models found" when the
// upstream never answered would turn a transport failure into a false claim
// about a real creator's public work.
function renderUnavailable(username) {
  return `<section class="empty-state" aria-labelledby="unavailable-title">
    <div class="empty-mark" aria-hidden="true">&#8709;</div>
    <div class="empty-copy">
      <h2 id="unavailable-title">Could not check @${escapeHtml(username)}.</h2>
      <p>Hugging Face did not respond, so this creator has not been inspected. The global figures above are the last published snapshot, not @${escapeHtml(username)}'s.</p>
      <button class="text-button" data-action="retry" type="button">Retry connection</button>
      <button class="text-button" data-action="clear" type="button">Return to global index</button>
    </div>
  </section>`;
}

function renderUser(models, username, maxDownloads) {
  if (!models.length) {
    return `<section class="empty-state" aria-labelledby="empty-title">
      <div class="empty-mark" aria-hidden="true">&#8709;</div>
      <div class="empty-copy">
        <h2 id="empty-title">No Heretic models found for @${escapeHtml(username)}.</h2>
        <p>We checked both the <strong>heretic</strong> tag and model names. Confirm the username or that the repositories are public.</p>
        <button class="text-button" data-action="clear" type="button">Return to global index</button>
      </div>
    </section>`;
  }

  return `<section class="results reveal" aria-labelledby="results-title">
    <div class="result-head">
      <div>
        <h2 id="results-title">${models.length} model${models.length === 1 ? "" : "s"} for @${escapeHtml(username)}</h2>
        <p>Ranked by lifetime downloads, with the 30-day figure under each total.</p>
        <button class="text-button" data-action="clear" type="button">Return to global index</button>
      </div>
      <span class="stamp">Public profile</span>
    </div>
    <div class="model-list" role="list" aria-label="Heretic models by lifetime downloads">
      ${models.slice(0, 8).map((model, i) => `<a class="model-row" role="listitem" id="model-${i + 1}" href="${escapeHtml(model.url)}" target="_blank" rel="noreferrer">
        <span class="rank">${String(i + 1).padStart(2, "0")}</span>
        <span class="model-name">${escapeHtml(model.id.split("/").pop())}<small>${escapeHtml(model.id)}</small></span>
        <span class="bar-wrap" aria-hidden="true"><span class="bar" style="width:${pct(model.downloadsAllTime, maxDownloads)}%"></span></span>
        <span class="model-number">${format(model.downloadsAllTime)}<small>${format(model.downloads)} last 30 days</small></span>
        <span class="arrow" aria-hidden="true">&#8599;</span>
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