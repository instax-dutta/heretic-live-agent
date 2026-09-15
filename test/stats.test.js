import test from "node:test";
import assert from "node:assert/strict";
import statsHandler from "../api/stats.js";

function createResponse() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("publishes stats with a 12-hour shared cache", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => "" },
    json: async () => [],
  });

  try {
    const response = createResponse();
    await statsHandler({ query: {} }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "s-maxage=43200, stale-while-revalidate=600");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
