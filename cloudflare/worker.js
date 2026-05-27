const STATE_KEY = "global-ledger-state";

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

async function getState(env) {
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
  return json({
    ok: true,
    revision: record.revision || 1,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
    data: record.data
  });
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
  const revision = Number(previous?.revision || 0) + 1;
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

    if (!isStatePath(url.pathname)) {
      return json({ ok: false, message: "Not found." }, { status: 404 });
    }

    if (!env.AGGS_LEDGER) {
      return json({ ok: false, message: "AGGS_LEDGER KV binding is not configured." }, { status: 500 });
    }

    if (request.method === "GET") return getState(env);

    if (request.method === "PUT") {
      if (!isAdminPath(url.pathname)) {
        return json({ ok: false, message: "Use the protected admin API path for writes." }, { status: 405 });
      }
      return putState(request, env);
    }

    return json({ ok: false, message: "Method not allowed." }, { status: 405 });
  }
};
