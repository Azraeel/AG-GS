const STATE_KEY = "global-ledger-state";
const DEFAULT_ALLOWED_HOSTS = ["aggsworld.net"];

function json(body, init = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

function isStatePath(pathname) {
  return pathname === "/api/state" || pathname === "/admin/api/state";
}

function isAdminPath(pathname) {
  return pathname.startsWith("/admin/api/");
}

function isAllowedHost(hostname, env) {
  const configured = String(env.ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const allowed = configured.length ? configured : DEFAULT_ALLOWED_HOSTS;
  return allowed.includes(hostname.toLowerCase());
}

function actorFromAccess(request) {
  const email =
    request.headers.get("cf-access-authenticated-user-email") ||
    request.headers.get("Cf-Access-Authenticated-User-Email");
  const jwt =
    request.headers.get("cf-access-jwt-assertion") ||
    request.headers.get("Cf-Access-Jwt-Assertion");
  if (!email && !jwt) return null;
  return email || "access-authenticated-admin";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function redactPublicData(data) {
  const redacted = clone(data);
  if (redacted.meta) {
    delete redacted.meta.updatedBy;
    redacted.meta.changeHistory = [];
  }
  return redacted;
}

async function getState(env, isAdmin = false) {
  const record = await env.AGGS_LEDGER.get(STATE_KEY, "json");
  if (!record?.data) {
    return json(
      {
        ok: false,
        code: "NO_SHARED_STATE",
        message: "No shared ledger state has been published yet."
      },
      { status: 404 }
    );
  }
  const body = {
    ok: true,
    revision: record.revision || 1,
    updatedAt: record.updatedAt,
    data: isAdmin ? record.data : redactPublicData(record.data)
  };
  if (isAdmin) body.updatedBy = record.updatedBy;
  return json(body);
}

async function putState(request, env) {
  const body = await request.json().catch(() => null);
  if (!body?.data?.meta || !Array.isArray(body.data.nations)) {
    return json({ ok: false, message: "Expected AG-GS ledger data." }, { status: 400 });
  }

  const previous = await env.AGGS_LEDGER.get(STATE_KEY, "json");
  const updatedAt = new Date().toISOString();
  const updatedBy = actorFromAccess(request);
  if (!updatedBy) {
    return json({ ok: false, message: "Cloudflare Access identity is required for writes." }, { status: 403 });
  }
  const previousRevision = Number(previous?.revision || 0);
  const submittedRevision = body.revision === null || body.revision === undefined ? null : Number(body.revision);
  if (previousRevision && (!Number.isFinite(submittedRevision) || submittedRevision !== previousRevision)) {
    return json(
      {
        ok: false,
        code: "REVISION_CONFLICT",
        message: "Live state changed before this publish. Reload the live state and apply the edit again.",
        revision: previousRevision
      },
      { status: 409 }
    );
  }

  const revision = previousRevision + 1;
  const data = body.data;
  data.meta.updatedAt = updatedAt;
  data.meta.updatedBy = updatedBy;

  const record = { revision, updatedAt, updatedBy, data };
  await env.AGGS_LEDGER.put(STATE_KEY, JSON.stringify(record));
  return json({ ok: true, revision, updatedAt, updatedBy });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!isAllowedHost(url.hostname, env)) {
      return new Response("Not found.", {
        status: 404,
        headers: { "cache-control": "no-store" }
      });
    }

    if (!isStatePath(url.pathname)) {
      return json({ ok: false, message: "Not found." }, { status: 404 });
    }

    if (!env.AGGS_LEDGER) {
      return json({ ok: false, message: "AGGS_LEDGER KV binding is not configured." }, { status: 500 });
    }

    if (request.method === "GET") return getState(env, isAdminPath(url.pathname));

    if (request.method === "PUT") {
      if (!isAdminPath(url.pathname)) {
        return json({ ok: false, message: "Use the protected admin API path for writes." }, { status: 405 });
      }
      return putState(request, env);
    }

    return json({ ok: false, message: "Method not allowed." }, { status: 405 });
  }
};
