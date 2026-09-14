import test from "node:test";
import assert from "node:assert/strict";
import { isValidUsername, normalizeUsername } from "../shared/username.js";

test("normalizeUsername trims whitespace and an optional at-sign", () => {
  assert.equal(normalizeUsername("  @creator-name  "), "creator-name");
  assert.equal(normalizeUsername(undefined), "");
});

test("isValidUsername accepts the Hugging Face username character set", () => {
  assert.equal(isValidUsername("creator-name_01"), true);
  assert.equal(isValidUsername("a.b"), true);
  assert.equal(isValidUsername(""), false);
  assert.equal(isValidUsername("contains/slash"), false);
  assert.equal(isValidUsername("x".repeat(97)), false);
});
