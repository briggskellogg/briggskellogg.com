import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

// Wrangler loads the worker as an ES module; package.json is otherwise CommonJS.
const source = await readFile(new URL("./subscribe.js", import.meta.url), "utf8");
const worker = (await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"))).default;
const ENDPOINT = "https://api.buttondown.com/v1/subscribers";
const ORIGIN = "https://briggskellogg.com";
const EMAIL = "reader+essay@example.com";
const ENV = { BUTTONDOWN_API_KEY: "offline-test-key" };
const CONFIRMATION_ENV = { ...ENV, REQUIRE_CONFIRMATION: "true" };
const active = ["regular", "premium", "gifted", "trialed", "churning", "churned"];
const inactive = ["unactivated", "unsubscribed", "blocked", "complained", "undeliverable", "removed", "paused", "past_due", "unpaid", "upcoming", "unknown"];

function subscriber(type = "regular", extra = {}) {
  return { id: "test-subscriber", email_address: EMAIL, type, ...extra };
}

function reply(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function request(payload = { email: EMAIL, source: "essay" }, options = {}) {
  const method = options.method || "POST";
  return new Request("https://subscribe.example.com", {
    method,
    headers: { Origin: ORIGIN, "Content-Type": "application/json", ...options.headers },
    ...(method === "POST" ? { body: options.raw ?? JSON.stringify(payload) } : {}),
  });
}

function stubFetch(t, responses) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, ...init });
    assert.ok(responses.length, "Unexpected upstream request");
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return typeof next === "function" ? next(url, init) : next;
  });
  return calls;
}

async function result(req = request(), env = ENV) {
  const response = await worker.fetch(req, env);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  return { status: response.status, body: await response.json() };
}

test("new signup is verified and preserves the immediate signup payload", async (t) => {
  const calls = stubFetch(t, [reply(201, subscriber())]);
  const actual = await result(request({ email: "  READER+ESSAY@EXAMPLE.COM  ", source: "archive" }, {
    headers: { "CF-Connecting-IP": "203.0.113.1", Referer: ORIGIN + "/essays/" },
  }));
  assert.deepEqual(actual, { status: 200, body: { ok: true, repeat: false, outcome: "subscribed" } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ENDPOINT);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].headers.Authorization, "Token offline-test-key");
  assert.equal(calls[0].headers["X-Buttondown-Collision-Behavior"], "overwrite");
  assert.equal(calls[0].headers["X-Buttondown-Bypass-Firewall"], undefined);
  assert.deepEqual(JSON.parse(calls[0].body), {
    email_address: EMAIL, type: "regular", tags: ["website", "archive"],
    ip_address: "203.0.113.1", referrer_url: ORIGIN + "/essays/",
  });
});

for (const type of active) {
  test(`accepts verified active state: ${type}`, async (t) => {
    stubFetch(t, [reply(201, subscriber(type))]);
    assert.equal((await result()).body.outcome, "subscribed");
  });
}

for (const type of inactive) {
  test(`does not claim success for state: ${type}`, async (t) => {
    stubFetch(t, [reply(201, subscriber(type))]);
    const actual = await result();
    assert.equal(actual.status, 502);
    assert.equal(actual.body.ok, undefined);
  });
}

for (const payload of [null, [], "text", 17, true]) {
  test(`rejects non-object JSON: ${JSON.stringify(payload)}`, async (t) => {
    const calls = stubFetch(t, []);
    assert.equal((await result(request(payload))).status, 400);
    assert.equal(calls.length, 0);
  });
}

test("rejects malformed JSON without making an upstream request", async (t) => {
  const calls = stubFetch(t, []);
  assert.equal((await result(request(null, { raw: "{broken" }))).status, 400);
  assert.equal(calls.length, 0);
});

for (const email of ["", " ", "reader", "reader@", "reader@example", "reader@ example.com", "one@@example.com"]) {
  test(`rejects invalid address: ${JSON.stringify(email)}`, async (t) => {
    const calls = stubFetch(t, []);
    assert.equal((await result(request({ email }))).status, 400);
    assert.equal(calls.length, 0);
  });
}

test("missing configuration fails without contacting Buttondown", async (t) => {
  const calls = stubFetch(t, []);
  assert.equal((await result(request(), {})).status, 503);
  assert.equal(calls.length, 0);
});

for (const body of [null, [], {}, { id: "test" }, subscriber("regular", { id: "" }), subscriber("regular", { email_address: "somebody-else@example.com" })]) {
  test(`does not accept incomplete or mismatched successful response: ${JSON.stringify(body)}`, async (t) => {
    stubFetch(t, [reply(201, body)]);
    const actual = await result();
    assert.equal(actual.status, 502);
    assert.equal(actual.body.ok, undefined);
  });
}

test("non-JSON success is not reported as subscribed", async (t) => {
  stubFetch(t, [new Response("upstream HTML", { status: 200 })]);
  assert.equal((await result()).status, 502);
});

test("409 is success only after a verified read-only lookup", async (t) => {
  const calls = stubFetch(t, [reply(409, { code: "collision" }), reply(200, subscriber())]);
  assert.deepEqual(await result(), { status: 200, body: { ok: true, repeat: true, outcome: "subscribed" } });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "GET");
  assert.equal(calls[1].url, ENDPOINT + "/" + encodeURIComponent(EMAIL));
  assert.equal(calls[1].body, undefined);
  assert.equal(calls[1].headers["X-Buttondown-Collision-Behavior"], undefined);
});

for (const type of inactive) {
  test(`409 lookup preserves inactive state without claiming success: ${type}`, async (t) => {
    const calls = stubFetch(t, [reply(409, {}), reply(200, subscriber(type))]);
    const actual = await result();
    assert.equal(actual.status, 409);
    assert.equal(actual.body.ok, undefined);
    assert.equal(calls.length, 2);
  });
}

for (const status of [404, 429, 503]) {
  test(`409 lookup failure remains failure: ${status}`, async (t) => {
    stubFetch(t, [reply(409, {}), reply(status, { detail: "upstream failure" })]);
    assert.equal((await result()).status, status === 404 ? 409 : status);
  });
}

test("409 lookup with malformed JSON remains failure", async (t) => {
  stubFetch(t, [reply(409, {}), new Response("not JSON", { status: 200 })]);
  assert.equal((await result()).status, 409);
});

test("upstream rate limit remains an error without retrying", async (t) => {
  const calls = stubFetch(t, [reply(429, { detail: "Slow down" })]);
  assert.deepEqual(await result(), { status: 429, body: { error: "Slow down" } });
  assert.equal(calls.length, 1);
});

test("upstream network failure becomes a controlled response", async (t) => {
  stubFetch(t, [new TypeError("fetch failed")]);
  assert.equal((await result()).status, 502);
});

test("lookup network failure becomes a controlled response", async (t) => {
  stubFetch(t, [reply(409, {}), new TypeError("fetch failed")]);
  assert.equal((await result()).status, 502);
});

test("existing firewall retry behavior is preserved and verified", async (t) => {
  const calls = stubFetch(t, [reply(403, { code: "subscriber_blocked" }), reply(201, subscriber())]);
  assert.equal((await result()).body.outcome, "subscribed");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].headers["X-Buttondown-Bypass-Firewall"], "true");
});

test("second blocked response is not retried or claimed successful", async (t) => {
  const calls = stubFetch(t, [reply(403, { code: "subscriber_blocked" }), reply(403, { code: "subscriber_blocked" })]);
  assert.equal((await result()).status, 403);
  assert.equal(calls.length, 2);
});

test("a hung request is aborted and answered after ten seconds", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let started;
  const hasStarted = new Promise((resolve) => { started = resolve; });
  let requestSignal;
  stubFetch(t, [(_, init) => {
    requestSignal = init.signal;
    started();
    return new Promise(() => {});
  }]);
  const pending = result();
  await hasStarted;
  t.mock.timers.tick(9999);
  assert.equal(requestSignal.aborted, false);
  t.mock.timers.tick(1);
  const actual = await pending;
  assert.equal(requestSignal.aborted, true);
  assert.equal(actual.status, 504);
  assert.equal(actual.body.ok, undefined);
});

test("timeout also covers a stalled response body", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let started;
  const hasStarted = new Promise((resolve) => { started = resolve; });
  stubFetch(t, [{ ok: true, status: 201, json: () => {
    started();
    return new Promise(() => {});
  } }]);
  const pending = result();
  await hasStarted;
  t.mock.timers.tick(10000);
  assert.equal((await pending).status, 504);
});

for (const flag of [undefined, "false", "TRUE", true]) {
  test(`confirmation flow requires explicit string true: ${String(flag)}`, async (t) => {
    const calls = stubFetch(t, [reply(201, subscriber())]);
    assert.equal((await result(request(), { ...ENV, REQUIRE_CONFIRMATION: flag })).body.outcome, "subscribed");
    assert.equal(calls[0].method, "POST");
    assert.equal(JSON.parse(calls[0].body).type, "regular");
  });
}

test("confirmation mode creates a new pending subscriber after a 404 lookup", async (t) => {
  const calls = stubFetch(t, [reply(404, {}), reply(201, subscriber("unactivated"))]);
  assert.deepEqual(await result(request(), CONFIRMATION_ENV), {
    status: 200, body: { ok: true, repeat: false, outcome: "confirmation_sent" },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].url, ENDPOINT + "/" + encodeURIComponent(EMAIL));
  assert.equal(calls[1].method, "POST");
  assert.equal(calls[1].url, ENDPOINT);
  assert.equal(JSON.parse(calls[1].body).type, "unactivated");
  assert.equal(calls[1].headers["X-Buttondown-Collision-Behavior"], undefined);
  assert.equal(calls[1].headers["X-Buttondown-Bypass-Firewall"], undefined);
});

for (const type of active) {
  test(`confirmation mode leaves existing active subscriber untouched: ${type}`, async (t) => {
    const calls = stubFetch(t, [reply(200, subscriber(type))]);
    assert.deepEqual(await result(request(), CONFIRMATION_ENV), {
      status: 200, body: { ok: true, repeat: true, outcome: "subscribed" },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "GET");
  });
}

for (const type of inactive.filter((type) => type !== "unactivated")) {
  test(`confirmation mode preserves existing state without writes: ${type}`, async (t) => {
    const calls = stubFetch(t, [reply(200, subscriber(type))]);
    const actual = await result(request(), CONFIRMATION_ENV);
    assert.equal(actual.status, 409);
    assert.equal(actual.body.ok, undefined);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "GET");
  });
}

test("confirmation mode sends a reminder for an existing pending subscriber", async (t) => {
  const calls = stubFetch(t, [reply(200, subscriber("unactivated")), reply(200, {})]);
  assert.deepEqual(await result(request(), CONFIRMATION_ENV), {
    status: 200, body: { ok: true, repeat: true, outcome: "confirmation_sent" },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, ENDPOINT + "/" + encodeURIComponent(EMAIL) + "/send-reminder");
  assert.equal(calls[1].method, "POST");
  assert.equal(calls[1].body, undefined);
  assert.equal(calls[1].headers["X-Buttondown-Collision-Behavior"], undefined);
  assert.equal(calls[1].headers["X-Buttondown-Bypass-Firewall"], undefined);
});

for (const status of [401, 403, 409, 429, 500]) {
  test(`confirmation mode preserves reminder error: ${status}`, async (t) => {
    const calls = stubFetch(t, [reply(200, subscriber("unactivated")), reply(status, { detail: "Reminder not accepted" })]);
    const actual = await result(request(), CONFIRMATION_ENV);
    assert.equal(actual.status, status);
    assert.equal(actual.body.ok, undefined);
    assert.equal(calls.length, 2);
  });
}

for (const body of [null, [], { error: "failed" }, { code: "not_sent" }]) {
  test(`confirmation mode rejects invalid successful reminder response: ${JSON.stringify(body)}`, async (t) => {
    stubFetch(t, [reply(200, subscriber("unactivated")), reply(200, body)]);
    assert.equal((await result(request(), CONFIRMATION_ENV)).status, 502);
  });
}

test("confirmation mode rejects non-JSON reminder success", async (t) => {
  stubFetch(t, [reply(200, subscriber("unactivated")), new Response("HTML", { status: 200 })]);
  assert.equal((await result(request(), CONFIRMATION_ENV)).status, 502);
});

test("confirmation mode requires the documented reminder status", async (t) => {
  stubFetch(t, [reply(200, subscriber("unactivated")), new Response(null, { status: 204 })]);
  assert.equal((await result(request(), CONFIRMATION_ENV)).status, 502);
});

for (const body of [null, {}, subscriber("regular", { email_address: "other@example.com" })]) {
  test(`confirmation mode rejects unverifiable existing subscriber: ${JSON.stringify(body)}`, async (t) => {
    const calls = stubFetch(t, [reply(200, body)]);
    assert.equal((await result(request(), CONFIRMATION_ENV)).status, 502);
    assert.equal(calls.length, 1);
  });
}

for (const body of [null, {}, subscriber("regular"), subscriber("blocked"), subscriber("unactivated", { email_address: "other@example.com" })]) {
  test(`confirmation mode rejects unverifiable pending creation: ${JSON.stringify(body)}`, async (t) => {
    stubFetch(t, [reply(404, {}), reply(201, body)]);
    assert.equal((await result(request(), CONFIRMATION_ENV)).status, 502);
  });
}

for (const status of [401, 403, 429, 503]) {
  test(`confirmation mode does not create after unsuccessful lookup: ${status}`, async (t) => {
    const calls = stubFetch(t, [reply(status, { detail: "Lookup failed" })]);
    assert.equal((await result(request(), CONFIRMATION_ENV)).status, status);
    assert.equal(calls.length, 1);
  });
}

test("confirmation mode does not bypass Buttondown's firewall", async (t) => {
  const calls = stubFetch(t, [reply(404, {}), reply(403, { code: "subscriber_blocked" })]);
  assert.equal((await result(request(), CONFIRMATION_ENV)).status, 403);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => !call.headers["X-Buttondown-Bypass-Firewall"]));
});

for (const status of [400, 409]) {
  test(`confirmation mode verifies a concurrent active signup after collision ${status}`, async (t) => {
    const calls = stubFetch(t, [reply(404, {}), reply(status, {}), reply(200, subscriber("premium"))]);
    assert.deepEqual(await result(request(), CONFIRMATION_ENV), {
      status: 200, body: { ok: true, repeat: true, outcome: "subscribed" },
    });
    assert.deepEqual(calls.map((call) => call.method), ["GET", "POST", "GET"]);
  });

  test(`confirmation mode verifies and reminds a concurrent pending signup after collision ${status}`, async (t) => {
    const calls = stubFetch(t, [reply(404, {}), reply(status, {}), reply(200, subscriber("unactivated")), reply(200, {})]);
    assert.equal((await result(request(), CONFIRMATION_ENV)).body.outcome, "confirmation_sent");
    assert.equal(calls.length, 4);
    assert.equal(calls[3].url.endsWith("/send-reminder"), true);
  });

  test(`confirmation mode does not retry creation for an unverified collision ${status}`, async (t) => {
    const calls = stubFetch(t, [reply(404, {}), reply(status, { detail: "Creation failed" }), reply(404, {})]);
    const actual = await result(request(), CONFIRMATION_ENV);
    assert.equal(actual.status, status);
    assert.equal(actual.body.ok, undefined);
    assert.equal(calls.length, 3);
  });
}

test("confirmation mode preserves a suppressed state found after concurrent creation", async (t) => {
  const calls = stubFetch(t, [reply(404, {}), reply(409, {}), reply(200, subscriber("unsubscribed"))]);
  assert.equal((await result(request(), CONFIRMATION_ENV)).status, 409);
  assert.equal(calls.length, 3);
});

for (const step of ["lookup", "create", "reminder"]) {
  test(`confirmation mode catches network failure during ${step}`, async (t) => {
    const responses = step === "lookup" ? [] : step === "create" ? [reply(404, {})] : [reply(200, subscriber("unactivated"))];
    stubFetch(t, [...responses, new TypeError("fetch failed")]);
    assert.equal((await result(request(), CONFIRMATION_ENV)).status, 502);
  });
}

test("confirmation lookup and reminder share a single ten-second deadline", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let lookupStarted;
  const hasLookupStarted = new Promise((resolve) => { lookupStarted = resolve; });
  let reminderStarted;
  const hasReminderStarted = new Promise((resolve) => { reminderStarted = resolve; });
  let requestSignal;
  stubFetch(t, [
    () => {
      lookupStarted();
      return new Promise((resolve) => setTimeout(() => resolve(reply(200, subscriber("unactivated"))), 6000));
    },
    (_, init) => {
      requestSignal = init.signal;
      reminderStarted();
      return new Promise(() => {});
    },
  ]);
  const pending = result(request(), CONFIRMATION_ENV);
  await hasLookupStarted;
  t.mock.timers.tick(6000);
  await hasReminderStarted;
  t.mock.timers.tick(3999);
  assert.equal(requestSignal.aborted, false);
  t.mock.timers.tick(1);
  assert.equal((await pending).status, 504);
  assert.equal(requestSignal.aborted, true);
});
