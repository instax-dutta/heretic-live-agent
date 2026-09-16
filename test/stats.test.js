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
    end() {
      this.ended = true;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("answers CORS preflight without contacting Hugging Face", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      status: 200,
      headers: { get: () => "" },
      json: async () => [],
    };
  };

  try {
    const response = createResponse();
    await statsHandler({ method: "OPTIONS", query: {} }, response);

    assert.equal(response.statusCode, 204);
    assert.equal(response.ended, true);
    assert.equal(fetchCalls, 0);
    assert.equal(response.headers["access-control-allow-origin"], "*");
    assert.equal(response.headers["access-control-allow-methods"], "GET, OPTIONS");
    assert.equal(response.headers["access-control-allow-headers"], "Content-Type");
    assert.equal(response.headers["access-control-max-age"], "86400");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects non-GET methods without contacting Hugging Face", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      status: 200,
      headers: { get: () => "" },
      json: async () => [],
    };
  };

  try {
    const response = createResponse();
    await statsHandler({ method: "POST", query: {} }, response);

    assert.equal(response.statusCode, 405);
    assert.equal(fetchCalls, 0);
    assert.equal(response.body.error, "Method not allowed. Use GET.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

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
    assert.equal(response.headers["access-control-allow-origin"], "*");
    assert.equal(response.headers["access-control-allow-methods"], "GET, OPTIONS");
    assert.equal(response.headers["access-control-allow-headers"], "Content-Type");
    assert.equal(response.headers["access-control-max-age"], "86400");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
