import test from "node:test";
import assert from "node:assert/strict";
import { getFigureLabels } from "../shared/figure.js";

test("figure labels describe the global index in global scope", () => {
  const labels = getFigureLabels({ isUser: false, username: "", formattedModelCount: "7,509" });

  assert.equal(labels.captionLeft, "Fig. 1 — Cumulative public downloads, tag-plus-name index");
  assert.equal(labels.captionRight, "Aggregated across every indexed public repository");
  assert.equal(labels.plateFoot, "Combined downloads across 7,509 models");
});

test("figure labels name the creator scope after a lookup", () => {
  const labels = getFigureLabels({ isUser: true, username: "alice", formattedModelCount: "3" });

  assert.ok(labels.captionLeft.includes("@alice"));
  assert.ok(labels.captionRight.includes("@alice"));
  assert.ok(labels.plateFoot.includes("@alice"));
  assert.ok(!labels.captionRight.includes("every indexed public repository"));
});

test("figure labels fall back to global copy without a username", () => {
  const labels = getFigureLabels({ isUser: true, username: "", formattedModelCount: "0" });

  assert.equal(labels.captionRight, "Aggregated across every indexed public repository");
});
