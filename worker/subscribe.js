/**
 * Cloudflare Worker: POST /api/subscribe
 * Proxies newsletter signups to Buttondown's API (no embed Turnstile step).
 *
 * Deploy:
 *   cd worker && wrangler secret put BUTTONDOWN_API_KEY && wrangler deploy
 *
 * Route in Cloudflare dashboard: briggskellogg.com/api/subscribe*
 *
 * REQUIRE_CONFIRMATION="true" opts into double opt-in; unset keeps direct signup.
 * Confirmation mode reads the current subscriber before writing, never overwrites
 * an existing state, and leaves Buttondown's firewall intact. `confirmation_sent`
 * means Buttondown accepted a new unactivated subscriber or its reminder request;
 * it does not prove mailbox delivery or the subscriber's later confirmation.
 * API contracts:
 * https://docs.buttondown.com/api-subscribers-create
 * https://docs.buttondown.com/api-subscribers-retrieve
 * https://docs.buttondown.com/api-subscribers-reminder
 */

const ALLOWED_ORIGINS = new Set([
  "https://briggskellogg.com",
  "https://www.briggskellogg.com",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
  "http://localhost:8910",
  "http://127.0.0.1:8910",
]);

const BUTTONDOWN_SUBSCRIBERS = "https://api.buttondown.com/v1/subscribers";
const UPSTREAM_TIMEOUT_MS = 10000;
const ACTIVE_SUBSCRIBER_TYPES = new Set([
  "regular", "premium", "gifted", "trialed", "churning", "churned",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSubscriber(data, email) {
  return isRecord(data) &&
    typeof data.id === "string" && Boolean(data.id.trim()) &&
    typeof data.email_address === "string" &&
    data.email_address.trim().toLowerCase() === email;
}

function isActiveSubscriber(data, email) {
  return isSubscriber(data, email) && ACTIVE_SUBSCRIBER_TYPES.has(data.type);
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://briggskellogg.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin),
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    if (!env.BUTTONDOWN_API_KEY) {
      return json({ error: "Subscribe API is not configured." }, 503, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return json({ error: "Invalid request body." }, 400, origin);
    }

    if (!isRecord(payload)) {
      return json({ error: "Invalid request body." }, 400, origin);
    }

    const email = String(payload.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Please enter a valid email address." }, 400, origin);
    }

    const source = String(payload.source || "website").slice(0, 64);
    const clientIp =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
      "";
    const referrer = String(request.headers.get("Referer") || "").slice(0, 512);

    const requireConfirmation = env.REQUIRE_CONFIRMATION === "true";
    const subscriberBody = {
      email_address: email,
      type: requireConfirmation ? "unactivated" : "regular",
      tags: ["website", source],
    };
    if (clientIp) {
      subscriberBody.ip_address = clientIp;
    }
    if (referrer) {
      subscriberBody.referrer_url = referrer;
    }

    const controller = new AbortController();
    let timedOut = false;
    let deadlineTimer;
    const deadline = new Promise((_, reject) => {
      deadlineTimer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error("Subscribe request timed out."));
      }, UPSTREAM_TIMEOUT_MS);
    });

    async function requestButtondown(url, init) {
      const response = await fetch(url, { ...init, signal: controller.signal });
      let data = {};
      let validJson = false;
      try {
        const body = await response.json();
        if (isRecord(body)) {
          data = body;
          validJson = true;
        }
      } catch (_) {
        // A success status alone cannot prove that a subscriber was added.
      }
      return { response, data, validJson };
    }

    async function createSubscriber(bypassFirewall) {
      const headers = {
        Authorization: "Token " + env.BUTTONDOWN_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (!requireConfirmation) headers["X-Buttondown-Collision-Behavior"] = "overwrite";
      if (bypassFirewall && !requireConfirmation) {
        headers["X-Buttondown-Bypass-Firewall"] = "true";
      }

      return requestButtondown(BUTTONDOWN_SUBSCRIBERS, {
        method: "POST",
        headers,
        body: JSON.stringify(subscriberBody),
      });
    }

    function subscribed(repeat) {
      return json({ ok: true, repeat, outcome: "subscribed" }, 200, origin);
    }

    function confirmationSent(repeat) {
      return json({ ok: true, repeat, outcome: "confirmation_sent" }, 200, origin);
    }

    function upstreamFailure(response, data) {
      const detail =
        (typeof data.detail === "string" && data.detail) ||
        (typeof data.code === "string" && data.code.replace(/_/g, " ")) ||
        "Unable to subscribe right now. Please try again later.";
      return json({ error: detail }, response.status >= 400 ? response.status : 502, origin);
    }

    function retrieveSubscriber() {
      return requestButtondown(BUTTONDOWN_SUBSCRIBERS + "/" + encodeURIComponent(email), {
        method: "GET",
        headers: {
          Authorization: "Token " + env.BUTTONDOWN_API_KEY,
          Accept: "application/json",
        },
      });
    }

    async function handleExistingConfirmationSubscriber(existing) {
      if (!existing.response.ok) return upstreamFailure(existing.response, existing.data);
      if (!isSubscriber(existing.data, email)) {
        return json({ error: "Unable to verify your subscription. Please try again later." }, 502, origin);
      }
      if (isActiveSubscriber(existing.data, email)) return subscribed(true);
      if (existing.data.type !== "unactivated") {
        // A public signup must not restore unsubscribed or suppressed accounts.
        return json({ error: "This subscription cannot be changed by the signup form." }, 409, origin);
      }

      const reminder = await requestButtondown(
        BUTTONDOWN_SUBSCRIBERS + "/" + encodeURIComponent(email) + "/send-reminder",
        {
          method: "POST",
          headers: {
            Authorization: "Token " + env.BUTTONDOWN_API_KEY,
            Accept: "application/json",
          },
        }
      );
      // Buttondown documents 200 + {} for an accepted reminder, not a subscriber.
      if (reminder.response.status === 200 && reminder.validJson && !reminder.data.error && !reminder.data.code) {
        return confirmationSent(true);
      }
      return upstreamFailure(reminder.response, reminder.data);
    }

    async function subscribeWithConfirmation() {
      const existing = await retrieveSubscriber();
      if (existing.response.status !== 404) {
        return handleExistingConfirmationSubscriber(existing);
      }

      // No collision overwrite or firewall bypass: preserve concurrent signups too.
      const created = await createSubscriber(false);
      if (created.response.ok) {
        if (isSubscriber(created.data, email) && created.data.type === "unactivated") {
          return confirmationSent(false);
        }
        return json({ error: "Unable to verify your subscription. Please try again later." }, 502, origin);
      }

      // A simultaneous request may create the subscriber after our first lookup.
      if (created.response.status === 400 || created.response.status === 409) {
        const concurrent = await retrieveSubscriber();
        if (concurrent.response.ok) return handleExistingConfirmationSubscriber(concurrent);
      }
      return upstreamFailure(created.response, created.data);
    }

    async function subscribe() {
      let { response, data } = await createSubscriber(false);

      if (data.code === "subscriber_blocked") {
        ({ response, data } = await createSubscriber(true));
      }

      if (response.ok) {
        if (isActiveSubscriber(data, email)) return subscribed(false);
        return json({ error: "Unable to verify your subscription. Please try again later." }, 502, origin);
      }

      if (response.status === 409) {
        const existing = await retrieveSubscriber();
        if (existing.response.ok && isActiveSubscriber(existing.data, email)) {
          return subscribed(true);
        }
        return json(
          { error: "Unable to verify your subscription. Please try again later." },
          existing.response.status >= 400 && existing.response.status !== 404 ? existing.response.status : 409,
          origin
        );
      }

      if (data.code === "subscriber_blocked") {
        return json(
          {
            error:
              "Signup was blocked — email me@briggskellogg.com and I'll add you manually.",
          },
          403,
          origin
        );
      }

      return upstreamFailure(response, data);
    }

    try {
      return await Promise.race([requireConfirmation ? subscribeWithConfirmation() : subscribe(), deadline]);
    } catch (_) {
      return json(
        { error: timedOut ? "Subscription request timed out. Please try again later." : "Unable to subscribe right now. Please try again later." },
        timedOut ? 504 : 502,
        origin
      );
    } finally {
      clearTimeout(deadlineTimer);
    }
  },
};
