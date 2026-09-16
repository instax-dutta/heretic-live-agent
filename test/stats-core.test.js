import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregate,
  collectModels,
  createRequestGate,
  estimateDownloadsPerSecond,
  fetchAllModels,
  sampleDownloadEvents,
  withModelExpansions,
} from "../api/stats-core.js";

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("fetchAllModels follows the Hub next-page URL and preserves all models", async () => {
  const pages = [
    { models: [{ id: "one" }, { id: "two" }], next: "https://huggingface.co/api/models?cursor=cursor-2" },
    { models: [{ id: "three" }], next: null },
  ];
  const seenRequests = [];

  const models = await fetchAllModels(async (request) => {
    seenRequests.push(request);
    return pages[seenRequests.length - 1];
  }, { filter: "heretic" });

  assert.deepEqual(models, [{ id: "one" }, { id: "two" }, { id: "three" }]);
  assert.deepEqual(seenRequests, [
    { filter: "heretic" },
    "https://huggingface.co/api/models?cursor=cursor-2",
  ]);
});

test("withModelExpansions preserves cursor parameters and adds required fields", () => {
  const url = withModelExpansions("https://huggingface.co/api/models?cursor=next&expand[]=downloads");

  assert.equal(url.searchParams.get("cursor"), "next");
  assert.deepEqual(url.searchParams.getAll("expand[]").sort(), ["downloads", "downloadsAllTime", "tags"]);
});

test("collectModels deduplicates tagged and named results and ranks by lifetime downloads", () => {
  const tagged = [
    { id: "creator/older", downloads: 4, downloadsAllTime: 20, tags: ["heretic"] },
    { id: "creator/shared", downloads: 8, downloadsAllTime: 80, tags: ["heretic"] },
  ];
  const named = [
    { id: "creator/shared", downloads: 9, downloadsAllTime: 90, tags: ["heretic"] },
    { id: "creator/newer", downloads: 5, downloadsAllTime: 50, tags: ["heretic"] },
  ];

  assert.deepEqual(collectModels(tagged, named).map(({ url, ...model }) => model), [
    { id: "creator/shared", downloads: 8, downloadsAllTime: 80, likes: 0, source: "tagged" },
    { id: "creator/newer", downloads: 5, downloadsAllTime: 50, likes: 0, source: "named" },
    { id: "creator/older", downloads: 4, downloadsAllTime: 20, likes: 0, source: "tagged" },
  ]);
});

test("createRequestGate only accepts the most recent request", () => {
  const gate = createRequestGate();
  const first = gate.start();
  const second = gate.start();

  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);
});

test("aggregate totals numeric download values without mutating models", () => {
  const models = [
    { downloads: 12, downloadsAllTime: 100 },
    { downloads: 3, downloadsAllTime: 40 },
  ];

  assert.deepEqual(aggregate(models), {
    modelCount: 2,
    allTimeDownloads: 140,
    last30DaysDownloads: 15,
  });
});

test("estimateDownloadsPerSecond derives the per-second rate from 30-day volume", () => {
  assert.equal(estimateDownloadsPerSecond(2592000), 1);
  assert.equal(estimateDownloadsPerSecond(14438920).toFixed(1), "5.6");
  assert.equal(estimateDownloadsPerSecond(0), 0);
  assert.equal(estimateDownloadsPerSecond(undefined), 0);
  assert.equal(estimateDownloadsPerSecond(-5), 0);
});

test("sampleDownloadEvents returns nothing for empty rates or intervals", () => {
  assert.equal(sampleDownloadEvents(0, 1), 0);
  assert.equal(sampleDownloadEvents(5.57, 0), 0);
  assert.equal(sampleDownloadEvents(-2, 1), 0);
  assert.equal(sampleDownloadEvents(5.57, -1), 0);
});

test("sampleDownloadEvents emits whole downloads averaging the 30-day rate", () => {
  const random = mulberry32(42);
  const draws = Array.from({ length: 2000 }, () => sampleDownloadEvents(5.57, 1, random));

  assert.ok(draws.every((n) => Number.isInteger(n) && n >= 0));
  assert.ok(new Set(draws).size > 3);
  const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
  assert.ok(Math.abs(mean - 5.57) < 0.3, `mean ${mean} drifts from 5.57`);
});

test("sampleDownloadEvents stays near the mean for large rates", () => {
  const random = mulberry32(7);
  const draws = Array.from({ length: 500 }, () => sampleDownloadEvents(200, 1, random));
  const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
  assert.ok(draws.every((n) => Number.isInteger(n) && n >= 0));
  assert.ok(Math.abs(mean - 200) < 10, `mean ${mean} drifts from 200`);
});

test("sampleDownloadEvents is reproducible with the same seed", () => {
  const first = Array.from({ length: 20 }, () => sampleDownloadEvents(5.57, 1, mulberry32(99)));
  const second = Array.from({ length: 20 }, () => sampleDownloadEvents(5.57, 1, mulberry32(99)));
  assert.deepEqual(first, second);
});
