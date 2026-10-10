import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The API refreshes every 12 hours. This tolerance is deliberately far looser:
// it exists to catch automation that has stopped, not to police the cadence.
const MAX_SNAPSHOT_AGE_DAYS = 30;

const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
const js = readFileSync(resolve(ROOT, "src/main.js"), "utf8");

function region(source, name) {
  const match = source.match(
    new RegExp(`<!--\\s*snapshot:${name}\\s*-->\\s*([\\s\\S]*?)\\s*<!--\\s*/snapshot:${name}\\s*-->`),
  );
  return match?.[1]?.trim() ?? null;
}

// A region wraps one element. Its text content is the published figure; the
// element itself is presentation the browser owns.
function regionText(source, name) {
  return region(source, name)?.replace(/<[^>]*>/g, "").trim() ?? null;
}

// The published figures exist in two files that never import each other: the
// static HTML a crawler reads, and the client fallback used when the API is
// unreachable. Nothing at runtime keeps them in step, so this suite does.
test("the static HTML carries a machine-writable snapshot for every published figure", () => {
  for (const name of ["asof", "lifetime", "d30", "share", "models"]) {
    assert.ok(region(html, name), `index.html is missing the snapshot:${name} region`);
  }
});

test("the client fallback carries a machine-writable snapshot", () => {
  assert.match(js, /^\/\/ snapshot:start$/m);
  assert.match(js, /^\/\/ snapshot:end$/m);
  assert.match(js, /const fallbackAsOf = "\d{4}-\d{2}-\d{2}T[\d:.]+Z";/);
});

test("the static HTML and the client fallback publish the same figures", () => {
  const fallback = js.match(
    /const fallback = \{ modelCount: (\d+), allTimeDownloads: (\d+), last30DaysDownloads: (\d+) \};/,
  );
  assert.ok(fallback, "src/main.js no longer declares a parsable fallback object");

  const [models, lifetime, d30] = fallback.slice(1).map(Number);

  assert.equal(regionText(html, "models"), models.toLocaleString("en-US"));
  assert.equal(regionText(html, "lifetime"), lifetime.toLocaleString("en-US"));
  assert.equal(regionText(html, "d30"), d30.toLocaleString("en-US"));
});

test("the published recent-share matches the published figures", () => {
  const [, lifetime, d30] = js
    .match(/const fallback = \{ modelCount: \d+, allTimeDownloads: (\d+), last30DaysDownloads: (\d+) \};/)
    .map(Number);
  const expected = `${((d30 / lifetime) * 100).toFixed(1)}% of lifetime volume is recent`;
  assert.equal(regionText(html, "share"), expected);
});

test("the snapshot carries a date, so a stale figure is dated rather than silently wrong", () => {
  const stamp = js.match(/const fallbackAsOf = "([^"]+)";/)[1];
  assert.ok(Number.isFinite(new Date(stamp).getTime()), "fallbackAsOf is not a valid date");

  // The date a crawler reads must be the same date the client renders.
  const day = stamp.slice(0, 10);
  const htmlTime = region(html, "asof");
  assert.match(htmlTime, new RegExp(`datetime="${day}`));
  assert.match(htmlTime, new RegExp(`as of ${day}`));
});

test("the published snapshot is recent enough to trust", () => {
  // The real failure mode is not a wrong number but automation that stopped:
  // GitHub disables scheduled workflows after 60 days of repository inactivity,
  // and a token or permission change fails quietly too. This asserts the
  // published snapshot is not older than the tolerance, so a dead refresh
  // surfaces as a failing build rather than as a plausible-looking page.
  const stamp = js.match(/const fallbackAsOf = "([^"]+)";/)[1];
  const ageDays = (Date.now() - new Date(stamp).getTime()) / 86_400_000;

  assert.ok(
    ageDays <= MAX_SNAPSHOT_AGE_DAYS,
    `the published snapshot is ${Math.round(ageDays)} days old (${stamp}); `
    + `the tolerance is ${MAX_SNAPSHOT_AGE_DAYS}. Run update-snapshot.mjs and check the scheduled workflow.`,
  );
});