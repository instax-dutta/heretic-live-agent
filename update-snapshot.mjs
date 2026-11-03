#!/usr/bin/env node
/**
 * Refresh the published snapshot and the static data files.
 *
 * GitHub Pages cannot run the old serverless function, so this script does the
 * Hugging Face work ahead of time. It writes:
 *
 *   public/data/stats.json   global totals for the page and machine readers
 *   public/data/models.json  the complete deduplicated model list for machines
 *   public/data/models/*.json  one shard per first character for creator lookup
 *   index.html               the crawlable figures behind snapshot markers
 *   src/main.js              the client fallback used when data files fail
 *   public/sitemap.xml       the honest lastmod for the page
 *
 * It is idempotent: when the model list has not changed it reuses the previous
 * timestamp and writes no file, so a scheduled run produces no empty commit.
 *
 * Usage:
 *   node update-snapshot.mjs [--dry-run]
 *
 * Exits non-zero on any upstream problem, so a failed run is visible in CI.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { aggregate, collectModels, fetchAllModels, withModelExpansions } from "./shared/stats-core.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const HF_API = "https://huggingface.co/api/models";
const FETCH_TIMEOUT_MS = 25000;
const MAX_PAGES = 100;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

const nf = new Intl.NumberFormat("en-US");

function fail(message) {
  console.error(`update-snapshot: ${message}`);
  process.exit(1);
}

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

function readIfExists(rel) {
  const path = resolve(ROOT, rel);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

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

async function fetchModels() {
  const common = { sort: "downloads", direction: "-1", limit: "1000" };
  const [tagged, named] = await Promise.all([
    getModels({ ...common, filter: "heretic" }),
    getModels({ ...common, search: "heretic" }),
  ]);
  return collectModels(tagged, named);
}

/**
 * Replace the lines between two whole-line markers, preserving the indentation
 * of the opening marker. `innerLines` is written without any leading
 * whitespace; this function owns all indentation.
 */
function replaceMarkedRegion(source, startMarker, endMarker, innerLines) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.trim() === startMarker);
  if (start === -1) fail(`could not find the marker ${startMarker}`);

  let end = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === endMarker) { end = i; break; }
  }
  if (end === -1) fail(`could not find the closing marker ${endMarker} for ${startMarker}`);

  const indent = (lines[start].match(/^\s*/) || [""])[0];
  const block = [
    indent + startMarker,
    ...innerLines.map((line) => (line === "" ? "" : indent + line)),
    indent + endMarker,
  ];
  lines.splice(start, end - start + 1, ...block);
  return lines.join("\n");
}

let models;
try {
  models = await fetchModels();
} catch (error) {
  fail(`could not read Hugging Face: ${error.message}`);
}

const totals = aggregate(models);
const sane = Number.isFinite(totals.modelCount) && totals.modelCount > 0
  && Number.isFinite(totals.creatorCount) && totals.creatorCount > 0
  && Number.isFinite(totals.allTimeDownloads) && totals.allTimeDownloads > 0
  && Number.isFinite(totals.last30DaysDownloads);
if (!sane) fail("Hugging Face returned a malformed totals block");

const publicModels = models.map(({ id, downloads, downloadsAllTime }) => ({
  id,
  downloads,
  downloadsAllTime,
}));
const modelsPayload = JSON.stringify(publicModels);

// Reuse the previous timestamp when the model list is unchanged, so an
// unchanged run writes nothing and does not create an empty commit.
const existingModels = readIfExists("public/data/models.json");
let updatedAt = new Date().toISOString();
if (existingModels) {
  try {
    const existing = JSON.parse(existingModels);
    if (JSON.stringify(existing.models) === modelsPayload && existing.updatedAt) {
      updatedAt = existing.updatedAt;
    }
  } catch {
    // A malformed or missing file just means this run writes a fresh one.
  }
}

const iso = new Date(updatedAt).toISOString();
const day = iso.slice(0, 10);
const share = ((totals.last30DaysDownloads / totals.allTimeDownloads) * 100).toFixed(1);

const stats = {
  ok: true,
  scope: "global",
  username: null,
  updatedAt: iso,
  totals,
  source: "Hugging Face Hub API · heretic tag + name search",
};
const statsJson = `${JSON.stringify(stats, null, 2)}\n`;
const modelsJson = `${JSON.stringify({ updatedAt: iso, models: publicModels })}\n`;

// Creator lookup only needs the models whose namespace starts with the same
// character as the username. Shards keep that request small; models.json stays
// as the complete machine-readable list.
const SHARD_KEYS = [..."abcdefghijklmnopqrstuvwxyz0123456789", "_"];
const shards = new Map(SHARD_KEYS.map((key) => [key, []]));
for (const model of publicModels) {
  const first = String(model.id || "").charAt(0).toLowerCase();
  const key = shards.has(first) ? first : "_";
  shards.get(key).push(model);
}
const shardFiles = new Map(
  [...shards].map(([key, shardModels]) => [
    `public/data/models/${key}.json`,
    `${JSON.stringify({ updatedAt: iso, models: shardModels })}\n`,
  ]),
);

const htmlBefore = read("index.html");
const jsBefore = read("src/main.js");
const sitemapBefore = read("public/sitemap.xml");
const statsBefore = readIfExists("public/data/stats.json");
const modelsBefore = readIfExists("public/data/models.json");

// A snapshot older than the published one means something is wrong with the
// clock or the data source. Never move the figures backwards in time.
const published = jsBefore.match(/const fallbackAsOf = "([^"]+)";/)?.[1];
if (published && new Date(published).getTime() > new Date(updatedAt).getTime()) {
  console.log(`update-snapshot: published ${published} is newer than upstream ${iso}; nothing to do`);
  process.exit(0);
}

let html = htmlBefore;
const htmlRegions = [
  ["asof", `<time datetime="${iso.slice(0, 19)}Z">as of ${day}</time>`],
  ["lifetime", `<p class="figure-total">${nf.format(totals.allTimeDownloads)}</p>`],
  ["d30", `<span class="row-value">${nf.format(totals.last30DaysDownloads)}</span>`],
  ["share", `<span class="row-note">${share}% of lifetime volume is recent</span>`],
  ["models", `<span class="row-value">${nf.format(totals.modelCount)}</span>`],
  ["creators", `<span class="row-value">${nf.format(totals.creatorCount)}</span>`],
];
for (const [name, inner] of htmlRegions) {
  html = replaceMarkedRegion(html, `<!-- snapshot:${name} -->`, `<!-- /snapshot:${name} -->`, [inner]);
}

const js = replaceMarkedRegion(jsBefore, "// snapshot:start", "// snapshot:end", [
  "// Published snapshot used when the data files are unreachable, and the only",
  "// figures a text-only retriever ever sees. Refreshed by update-snapshot.mjs;",
  "// `asOf` dates them so a stale snapshot is honest rather than merely wrong.",
  `const fallback = { modelCount: ${totals.modelCount}, creatorCount: ${totals.creatorCount}, allTimeDownloads: ${totals.allTimeDownloads}, last30DaysDownloads: ${totals.last30DaysDownloads} };`,
  `const fallbackAsOf = "${iso}";`,
]);

const sitemap = replaceMarkedRegion(
  sitemapBefore,
  "<!-- snapshot:lastmod -->",
  "<!-- /snapshot:lastmod -->",
  [`<lastmod>${iso.slice(0, 19)}Z</lastmod>`],
);

let shardsChanged = false;
for (const [rel, content] of shardFiles) {
  if (readIfExists(rel) !== content) { shardsChanged = true; break; }
}

const changed = html !== htmlBefore
  || js !== jsBefore
  || sitemap !== sitemapBefore
  || statsJson !== statsBefore
  || modelsJson !== modelsBefore
  || shardsChanged;

if (DRY_RUN) {
  console.log("update-snapshot: dry run, no files written");
  console.log(`  models ${nf.format(totals.modelCount)}`);
  console.log(`  creators ${nf.format(totals.creatorCount)}`);
  console.log(`  lifetime ${nf.format(totals.allTimeDownloads)}`);
  console.log(`  30 days ${nf.format(totals.last30DaysDownloads)} (${share}%)`);
  console.log(`  mean ${nf.format(totals.meanLifetimeDownloads)}`);
  console.log(`  as of ${iso}`);
  console.log(`  would change files: ${changed}`);
  process.exit(0);
}

if (!changed) {
  console.log(`update-snapshot: already current as of ${iso}; no files written`);
  process.exit(0);
}

mkdirSync(resolve(ROOT, "public/data/models"), { recursive: true });
writeFileSync(resolve(ROOT, "public/data/stats.json"), statsJson);
writeFileSync(resolve(ROOT, "public/data/models.json"), modelsJson);
for (const [rel, content] of shardFiles) writeFileSync(resolve(ROOT, rel), content);
writeFileSync(resolve(ROOT, "index.html"), html);
writeFileSync(resolve(ROOT, "src/main.js"), js);
writeFileSync(resolve(ROOT, "public/sitemap.xml"), sitemap);
console.log(`update-snapshot: wrote snapshot as of ${iso}`);
console.log(`  models ${nf.format(totals.modelCount)} | creators ${nf.format(totals.creatorCount)} | lifetime ${nf.format(totals.allTimeDownloads)} | 30 days ${nf.format(totals.last30DaysDownloads)} (${share}%)`);
