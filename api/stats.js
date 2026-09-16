import { aggregate, collectModels, fetchAllModels, withModelExpansions } from "./stats-core.js";
import { isValidUsername, normalizeUsername } from "../shared/username.js";

const HF_API = "https://huggingface.co/api/models";
const FETCH_TIMEOUT_MS = 25000;
const MAX_PAGES = 100;

function getNextLink(response) {
  const link = response.headers.get("link") || "";
  const match = link.match(/<([^>]+)>;\s*rel=["']next["']/i);
  return match?.[1] || null;
}

async function getModels(params) {
  return fetchAllModels(async (pageParams) => {
    const url = typeof pageParams === "string" ? withModelExpansions(pageParams) : new URL(HF_API);
    if (typeof pageParams !== "string") {
      Object.entries(pageParams).forEach(([key, value]) => url.searchParams.set(key, value));
      url.searchParams.append("expand[]", "downloads");
      url.searchParams.append("expand[]", "downloadsAllTime");
      url.searchParams.append("expand[]", "tags");
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`Hugging Face returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Hugging Face returned an invalid model list.");
    return { models: data, next: getNextLink(response) };
  }, params, { maxPages: MAX_PAGES });
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=600");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Max-Age", "86400");

  if (request.method === "OPTIONS") {
    response.setHeader("Cache-Control", "no-store");
    return response.status(204).end();
  }

  if (request.method && request.method !== "GET") {
    response.setHeader("Cache-Control", "no-store");
    return response.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const username = normalizeUsername(request.query?.username);
  if (username && !isValidUsername(username)) {
    return response.status(400).json({ error: "Enter a valid Hugging Face username." });
  }

  try {
    const common = { sort: "downloads", direction: "-1", limit: "1000" };
    const [tagged, named] = await Promise.all([
      getModels({ ...common, filter: "heretic", ...(username ? { author: username } : {}) }),
      getModels({ ...common, search: "heretic", ...(username ? { author: username } : {}) }),
    ]);

    const list = collectModels(tagged, named, { filterHeretic: Boolean(username) });
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
