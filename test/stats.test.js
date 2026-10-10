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
    assert.equal(response.headers["access-control-allow-methods"], "GET, HEAD, OPTIONS");
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

test("never lets the CDN cache a failed response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("upstream down"); };

  try {
    // An upstream failure cached for 12 hours would leave the site degraded
    // long after Hugging Face recovered, so every error path resets the CDN
    // header as well as the client one.
    for (const request of [{ method: "GET", query: {} }, { method: "POST", query: {} }]) {
      const response = createResponse();
      await statsHandler(request, response);

      assert.equal(response.headers["cache-control"], "no-store");
      assert.equal(response.headers["vercel-cdn-cache-control"], "no-store");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("answers HEAD with the same status and headers as GET, but no body", async () => {
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
    await statsHandler({ method: "HEAD", query: {} }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.ended, true);
    assert.equal(response.body, undefined, "a HEAD response must not carry a body");
    // Mirroring GET means it must actually check upstream, otherwise a
    // revalidation probe answers 200 while GET is returning 502.
    assert.ok(fetchCalls > 0, "HEAD must run the same path as GET");
    assert.equal(response.headers["vercel-cdn-cache-control"], "s-maxage=43200, stale-while-revalidate=600");
    assert.equal(response.headers["cache-control"], "public, max-age=0, must-revalidate");
    assert.equal(response.headers["access-control-allow-methods"], "GET, HEAD, OPTIONS");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("HEAD reports the same failures as GET, still without a body", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, headers: { get: () => "" }, json: async () => [] });

  try {
    const invalid = createResponse();
    await statsHandler({ method: "HEAD", query: { username: "bad name!" } }, invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.body, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const failing = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("upstream down"); };
  try {
    const response = createResponse();
    await statsHandler({ method: "HEAD", query: {} }, response);

    assert.equal(response.statusCode, 502);
    assert.equal(response.body, undefined);
    // The edge must still refuse to hold a failure, on the HEAD path too.
    assert.equal(response.headers["vercel-cdn-cache-control"], "no-store");
    assert.equal(response.headers["cache-control"], "no-store");
  } finally {
    globalThis.fetch = failing;
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
    // The CDN caches the snapshot for 12 hours; the client revalidates so a
    // reload still sees a fresh edge value. Both must be stated explicitly
    // because the platform rewrites Cache-Control on function responses.
    assert.equal(response.headers["vercel-cdn-cache-control"], "s-maxage=43200, stale-while-revalidate=600");
    assert.equal(response.headers["cache-control"], "public, max-age=0, must-revalidate");
    assert.equal(response.headers["access-control-allow-origin"], "*");
    assert.equal(response.headers["access-control-allow-methods"], "GET, HEAD, OPTIONS");
    assert.equal(response.headers["access-control-allow-headers"], "Content-Type");
    assert.equal(response.headers["access-control-max-age"], "86400");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
