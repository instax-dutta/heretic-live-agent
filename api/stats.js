const HF_API = "https://huggingface.co/api/models";
const FETCH_TIMEOUT_MS = 25000;

function normalize(value) {
  return String(value || "").trim().replace(/^@/, "");
}

function isHereticModel(model) {
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

async function getModels(params) {
  const url = new URL(HF_API);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.append("expand[]", "downloads");
  url.searchParams.append("expand[]", "downloadsAllTime");
  url.searchParams.append("expand[]", "tags");
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Hugging Face returned ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function aggregate(models) {
  return models.reduce((totals, model) => ({
    modelCount: totals.modelCount + 1,
    allTimeDownloads: totals.allTimeDownloads + model.downloadsAllTime,
    last30DaysDownloads: totals.last30DaysDownloads + model.downloads,
  }), { modelCount: 0, allTimeDownloads: 0, last30DaysDownloads: 0 });
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  response.setHeader("Access-Control-Allow-Origin", "*");

  const username = normalize(request.query?.username);
  if (username && !/^[a-zA-Z0-9._-]{1,96}$/.test(username)) {
    return response.status(400).json({ error: "Enter a valid Hugging Face username." });
  }

  try {
    const common = { sort: "downloads", direction: "-1", limit: "1000" };
    const [tagged, named] = await Promise.all([
      getModels({ ...common, filter: "heretic", ...(username ? { author: username } : {}) }),
      getModels({ ...common, search: "heretic", ...(username ? { author: username } : {}) }),
    ]);

    const models = new Map();
    tagged.forEach((model) => {
      if (!username || isHereticModel(model)) models.set(model.id, toModel(model, "tagged"));
    });
    named.forEach((model) => {
      if (!models.has(model.id) && (!username || isHereticModel(model))) {
        models.set(model.id, toModel(model, "named"));
      }
    });

    const list = [...models.values()].sort((a, b) => b.downloadsAllTime - a.downloadsAllTime);
    return response.status(200).json({
      ok: true,
      scope: username ? "user" : "global",
      username: username || null,
      updatedAt: new Date().toISOString(),
      totals: aggregate(list),
      models: username ? list : undefined,
      source: "Hugging Face Hub API · heretic tag + name search",
    });
  } catch (error) {
    console.error(error);
    return response.status(502).json({
      ok: false,
      error: "Hugging Face is temporarily unavailable. Try refreshing in a moment.",
    });
  }
}

