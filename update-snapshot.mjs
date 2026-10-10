#!/usr/bin/env node
/**
 * Refresh the published snapshot in the static HTML and the client fallback.
 *
 * The homepage is a static build, but it publishes figures that change every 12
 * hours. A crawler reading the served HTML sees those figures and nothing else,
 * so if they are never refreshed the site confidently serves a wrong number to
 * every AI agent that reads it. This script fetches the live API and rewrites
 * both copies from a single source.
 *
 * Every machine-written value sits inside a uniquely named marker pair, so the
 * rewrite does not depend on document order and a missing region fails loudly
 * rather than landing in the wrong element.
 *
 * The script is idempotent: when nothing changed it writes no file at all, so a
 * scheduled run that finds no new data does not produce an empty commit.
 *
 * Usage:
 *   node update-snapshot.mjs [--api <url>] [--dry-run]
 *
 * Exits non-zero on any upstream problem, so a failed run is visible in CI
 * rather than silently leaving the previous figures in place.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
// The marker stands in for the element it wraps, so the replacement
// sits at the marker's own indentation rather than a level deeper.
const INDENT_STEP = "";

const args = process.argv.slice(2);
const apiFlag = args.indexOf("--api");
const API = apiFlag !== -1 ? args[apiFlag + 1] : "https://heretic.sdad.pro/api/stats";
const DRY_RUN = args.includes("--dry-run");

const nf = new Intl.NumberFormat("en-US");

function fail(message) {
  console.error(`update-snapshot: ${message}`);
  process.exit(1);
}

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
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
    ...innerLines.map((line) => (line === "" ? "" : indent + INDENT_STEP + line)),
    indent + endMarker,
  ];
  lines.splice(start, end - start + 1, ...block);
  return lines.join("\n");
}

async function fetchSnapshot() {
  let response;
  try {
    response = await fetch(API, { headers: { accept: "application/json" } });
  } catch (error) {
    fail(`could not reach ${API}: ${error.message}`);
  }
  if (!response.ok) fail(`${API} returned HTTP ${response.status}`);

  let data;
  try {
    data = await response.json();
  } catch (error) {
    fail(`${API} did not return JSON: ${error.message}`);
  }

  const t = data?.totals;
  const sane = t
    && Number.isFinite(t.modelCount) && t.modelCount > 0
    && Number.isFinite(t.allTimeDownloads) && t.allTimeDownloads > 0
    && Number.isFinite(t.last30DaysDownloads);
  if (!sane) fail(`${API} returned a malformed totals block`);
  if (!data.updatedAt || !Number.isFinite(new Date(data.updatedAt).getTime())) {
    fail(`${API} returned an unusable updatedAt timestamp`);
  }
  return { totals: t, updatedAt: data.updatedAt };
}

const { totals, updatedAt } = await fetchSnapshot();

const stamp = new Date(updatedAt);
const iso = stamp.toISOString();
const day = iso.slice(0, 10);
const share = ((totals.last30DaysDownloads / totals.allTimeDownloads) * 100).toFixed(1);

const htmlBefore = read("index.html");
const jsBefore = read("src/main.js");

// A snapshot older than the published one means the upstream cache handed back
// something stale; writing it would move the figures backwards.
const published = jsBefore.match(/const fallbackAsOf = "([^"]+)";/)?.[1];
if (published && new Date(published).getTime() > stamp.getTime()) {
  console.log(`update-snapshot: published ${published} is newer than upstream ${iso}; nothing to do`);
  process.exit(0);
}

let html = htmlBefore;
const htmlRegions = [
  ["asof", `<time datetime="${iso.slice(0, 19)}Z">as of ${day}</time>`],
  ["lifetime", `<p class="live-total">${nf.format(totals.allTimeDownloads)}</p>`],
  ["d30", `<span class="row-value">${nf.format(totals.last30DaysDownloads)}</span>`],
  ["share", `<span class="row-note">${share}% of lifetime volume is recent</span>`],
  ["models", `<span class="row-value">${nf.format(totals.modelCount)}</span>`],
];
for (const [name, inner] of htmlRegions) {
  html = replaceMarkedRegion(html, `<!-- snapshot:${name} -->`, `<!-- /snapshot:${name} -->`, [inner]);
}

const js = replaceMarkedRegion(jsBefore, "// snapshot:start", "// snapshot:end", [
  "// Published snapshot used when the upstream API is unreachable, and the only",
  "// figures a text-only retriever ever sees. Refreshed by update-snapshot.mjs;",
  "// `asOf` dates them so a stale snapshot is honest rather than merely wrong.",
  `const fallback = { modelCount: ${totals.modelCount}, allTimeDownloads: ${totals.allTimeDownloads}, last30DaysDownloads: ${totals.last30DaysDownloads} };`,
  `const fallbackAsOf = "${iso}";`,
]);

const changed = html !== htmlBefore || js !== jsBefore;

if (DRY_RUN) {
  console.log("update-snapshot: dry run, no files written");
  console.log(`  models ${nf.format(totals.modelCount)}`);
  console.log(`  lifetime ${nf.format(totals.allTimeDownloads)}`);
  console.log(`  30 days ${nf.format(totals.last30DaysDownloads)} (${share}%)`);
  console.log(`  as of ${iso}`);
  console.log(`  would change files: ${changed}`);
  process.exit(0);
}

if (!changed) {
  console.log(`update-snapshot: already current as of ${iso}; no files written`);
  process.exit(0);
}

writeFileSync(resolve(ROOT, "index.html"), html);
writeFileSync(resolve(ROOT, "src/main.js"), js);
console.log(`update-snapshot: wrote snapshot as of ${iso}`);
console.log(`  models ${nf.format(totals.modelCount)} | lifetime ${nf.format(totals.allTimeDownloads)} | 30 days ${nf.format(totals.last30DaysDownloads)} (${share}%)`);