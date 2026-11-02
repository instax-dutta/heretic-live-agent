import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregate,
  collectModels,
  createRequestGate,
  estimateDownloadsPerSecond,
  fetchAllModels,
  withModelExpansions,
} from "../api/stats-core.js";

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

test("aggregate totals downloads and counts unique creators once", () => {
  const models = [
    { id: "alice/one", downloads: 12, downloadsAllTime: 100 },
    { id: "alice/two", downloads: 3, downloadsAllTime: 40 },
    { id: "bob/three", downloads: 1, downloadsAllTime: 10 },
  ];

  assert.deepEqual(aggregate(models), {
    modelCount: 3,
    allTimeDownloads: 150,
    last30DaysDownloads: 16,
    creatorCount: 2,
    meanLifetimeDownloads: 50,
  });
});

test("aggregate mean lifetime downloads rounds to whole downloads", () => {
  const totals = aggregate([
    { id: "alice/one", downloadsAllTime: 100 },
    { id: "alice/two", downloadsAllTime: 101 },
  ]);

  assert.equal(totals.meanLifetimeDownloads, 101, "201 / 2 = 100.5 must round up");
  assert.equal(aggregate([]).meanLifetimeDownloads, 0);
});

test("estimateDownloadsPerSecond derives the per-second rate from 30-day volume", () => {
  assert.equal(estimateDownloadsPerSecond(2592000), 1);
  assert.equal(estimateDownloadsPerSecond(14438920).toFixed(1), "5.6");
  assert.equal(estimateDownloadsPerSecond(0), 0);
  assert.equal(estimateDownloadsPerSecond(undefined), 0);
  assert.equal(estimateDownloadsPerSecond(-5), 0);
});
