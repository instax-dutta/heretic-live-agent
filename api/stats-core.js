export async function fetchAllModels(fetchPage, params, options = {}) {
  const models = [];
  let next = params;
  let pageCount = 0;
  const maxPages = options.maxPages || 100;

  while (next) {
    if (pageCount >= maxPages) {
      throw new Error(`Hugging Face pagination exceeded ${maxPages} pages.`);
    }
    const page = await fetchPage(next);
    const pageModels = Array.isArray(page) ? page : page?.models;
    if (!Array.isArray(pageModels)) throw new Error("Hugging Face returned an invalid model list.");
    models.push(...pageModels);
    next = Array.isArray(page) ? null : page.next || null;
    pageCount += 1;
  }

  return models;
}

export function withModelExpansions(value) {
  const url = new URL(value);
  const expandedFields = new Set([
    ...url.searchParams.getAll("expand[]"),
    ...url.searchParams.getAll("expand"),
    "downloads",
    "downloadsAllTime",
    "tags",
  ]);
  url.searchParams.delete("expand");
  url.searchParams.delete("expand[]");
  expandedFields.forEach((field) => url.searchParams.append("expand[]", field));
  return url;
}

export function isHereticModel(model) {
  const id = String(model?.id || "").toLowerCase();
  const tags = Array.isArray(model?.tags) ? model.tags.map((tag) => String(tag).toLowerCase()) : [];
  return tags.includes("heretic") || id.includes("heretic");
}

function toModel(model, source) {
  return {
    id: model.id,
    url: `https://huggingface.co/${model.id}`,
    downloads: Number(model.downloads || 0),
    downloadsAllTime: Number(model.downloadsAllTime ?? model.downloads_all_time ?? 0),
    likes: Number(model.likes || 0),
    source,
  };
}

export function collectModels(tagged, named, { filterHeretic = false } = {}) {
  const models = new Map();
  tagged.forEach((model) => {
    if (!filterHeretic || isHereticModel(model)) models.set(model.id, toModel(model, "tagged"));
  });
  named.forEach((model) => {
    if (!models.has(model.id) && (!filterHeretic || isHereticModel(model))) {
      models.set(model.id, toModel(model, "named"));
    }
  });
  return [...models.values()].sort((a, b) => b.downloadsAllTime - a.downloadsAllTime);
}

export function aggregate(models) {
  return models.reduce((totals, model) => ({
    modelCount: totals.modelCount + 1,
    allTimeDownloads: totals.allTimeDownloads + Number(model.downloadsAllTime || 0),
    last30DaysDownloads: totals.last30DaysDownloads + Number(model.downloads || 0),
  }), { modelCount: 0, allTimeDownloads: 0, last30DaysDownloads: 0 });
}

export function createRequestGate() {
  let currentRequest = 0;
  return {
    start() {
      currentRequest += 1;
      return currentRequest;
    },
    isCurrent(requestId) {
      return requestId === currentRequest;
    },
  };
}

export const SECONDS_PER_DAY = 24 * 60 * 60;
export const LIVE_RATE_WINDOW_DAYS = 30;

export function estimateDownloadsPerSecond(last30DaysDownloads, windowDays = LIVE_RATE_WINDOW_DAYS) {
  const total = Number(last30DaysDownloads || 0);
  const windowSeconds = Number(windowDays || 0) * SECONDS_PER_DAY;
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) return 0;
  return total / windowSeconds;
}

export function estimateLiveTotal(baseTotal, last30DaysDownloads, elapsedSeconds, windowDays = LIVE_RATE_WINDOW_DAYS) {
  const base = Number(baseTotal || 0);
  const elapsed = Number(elapsedSeconds || 0);
  if (!Number.isFinite(base)) return 0;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return Math.floor(base);
  const rate = estimateDownloadsPerSecond(last30DaysDownloads, windowDays);
  return Math.floor(base + rate * elapsed);
}
