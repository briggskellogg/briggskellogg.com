/**
 * Cloudflare Worker: POST /api/subscribe
 * Proxies newsletter signups to Buttondown's API (no embed Turnstile step).
 *
 * Deploy:
 *   cd worker && wrangler secret put BUTTONDOWN_API_KEY && wrangler deploy
 *
 * Route in Cloudflare dashboard: briggskellogg.com/api/subscribe*
 */

const ALLOWED_ORIGINS = new Set([
  "https://briggskellogg.com",
  "https://www.briggskellogg.com",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
  "http://localhost:8910",
  "http://127.0.0.1:8910",
]);

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

    const email = String(payload.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Please enter a valid email address." }, 400, origin);
    }

    const source = String(payload.source || "website").slice(0, 64);
    const clientIp =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
      "";

    const subscriberBody = {
      email_address: email,
      tags: ["website", source],
    };
    if (clientIp) {
      subscriberBody.ip_address = clientIp;
    }

    const response = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: "Token " + env.BUTTONDOWN_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Buttondown-Collision-Behavior": "overwrite",
      },
      body: JSON.stringify(subscriberBody),
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }

    if (response.ok) {
      return json(
        {
          ok: true,
          message: "Check your inbox for a confirmation link to finish subscribing.",
        },
        200,
        origin
      );
    }

    if (response.status === 409) {
      return json(
        {
          ok: true,
          message: "You're already on the list — check your inbox for the confirmation link if you haven't clicked it yet.",
        },
        200,
        origin
      );
    }

    if (data.code === "subscriber_blocked") {
      return json(
        {
          error:
            "Buttondown's firewall blocked this signup. Try again in a few minutes, or email me@briggskellogg.com and I'll add you manually.",
        },
        403,
        origin
      );
    }

    const detail =
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.code === "string" && data.code.replace(/_/g, " ")) ||
      "Unable to subscribe right now. Please try again later.";

    return json({ error: detail }, response.status >= 400 ? response.status : 502, origin);
  },
};
