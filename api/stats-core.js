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
