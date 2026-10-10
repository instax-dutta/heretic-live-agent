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

// The platform rewrites Cache-Control on function responses, so the documented
// 12-hour shared cache was never reaching clients or downstream caches. Split
// the two concerns: the CDN caches the snapshot for 12 hours, while the browser
// revalidates so a reload still sees a fresh edge value.
const CDN_CACHE = "s-maxage=43200, stale-while-revalidate=600";
const CLIENT_CACHE = "public, max-age=0, must-revalidate";

export default async function handler(request, response) {
  response.setHeader("Cache-Control", CLIENT_CACHE);
  response.setHeader("Vercel-CDN-Cache-Control", CDN_CACHE);
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Max-Age", "86400");

  if (request.method === "OPTIONS") {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Vercel-CDN-Cache-Control", "no-store");
    return response.status(204).end();
  }

  if (request.method && request.method !== "GET") {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Vercel-CDN-Cache-Control", "no-store");
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
    // An upstream failure must not be cached at the edge for 12 hours, or the
    // site stays degraded long after Hugging Face has recovered.
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Vercel-CDN-Cache-Control", "no-store");
    console.error(error);
    return response.status(502).json({
      ok: false,
      error: "Hugging Face is temporarily unavailable. Try refreshing in a moment.",
    });
  }
}
