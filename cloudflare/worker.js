const STATE_KEY = "global-ledger-state";
const SNAPSHOT_INDEX_KEY = "global-ledger-state:snapshots";
const SNAPSHOT_PREFIX = "global-ledger-state:snapshot:";
const MAX_SNAPSHOTS = 50;
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

function snapshotKey(revision) {
  return `${SNAPSHOT_PREFIX}${revision}`;
}

function isApiPath(pathname) {
  return (
    pathname === "/api/state" ||
    pathname === "/admin/api/state" ||
    pathname === "/admin/api/snapshots" ||
    pathname === "/admin/api/revert" ||
    /^\/admin\/api\/snapshots\/\d+$/.test(pathname)
  );
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

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function snapshotSummary(snapshot) {
  const nations = Array.isArray(snapshot.data?.nations) ? snapshot.data.nations : [];
  const archived = new Set(snapshot.data?.meta?.archivedNationIds || []);
  return {
    revision: number(snapshot.revision),
    updatedAt: snapshot.updatedAt || "",
    updatedBy: snapshot.updatedBy || "",
    snapshotAt: snapshot.snapshotAt || "",
    nationCount: nations.length,
    activeNationCount: nations.filter((nation) => !archived.has(nation.id)).length
  };
}

async function getSnapshotIndex(env) {
  const snapshots = await env.AGGS_LEDGER.get(SNAPSHOT_INDEX_KEY, "json");
  return Array.isArray(snapshots) ? snapshots : [];
}

async function rememberSnapshot(env, record, snapshotAt) {
  if (!record?.data || !record.revision) return;
  const snapshot = {
    revision: number(record.revision),
    updatedAt: record.updatedAt || "",
    updatedBy: record.updatedBy || "",
    snapshotAt,
    data: record.data
  };
  await env.AGGS_LEDGER.put(snapshotKey(snapshot.revision), JSON.stringify(snapshot));
  const current = await getSnapshotIndex(env);
  const next = [snapshotSummary(snapshot), ...current.filter((item) => number(item.revision) !== snapshot.revision)]
    .sort((left, right) => number(right.revision) - number(left.revision))
    .slice(0, MAX_SNAPSHOTS);
  await env.AGGS_LEDGER.put(SNAPSHOT_INDEX_KEY, JSON.stringify(next));
}

async function getSnapshots(env) {
  return json({ ok: true, snapshots: await getSnapshotIndex(env), maxSnapshots: MAX_SNAPSHOTS });
}

async function getSnapshot(env, pathname) {
  const revision = number(pathname.split("/").pop(), NaN);
  if (!Number.isFinite(revision)) return json({ ok: false, message: "Snapshot revision is required." }, { status: 400 });
  const snapshot = await env.AGGS_LEDGER.get(snapshotKey(revision), "json");
  if (!snapshot?.data) return json({ ok: false, message: "Snapshot was not found." }, { status: 404 });
  return json({ ok: true, snapshot });
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

  await rememberSnapshot(env, previous, updatedAt);
  const record = { revision, updatedAt, updatedBy, data };
  await env.AGGS_LEDGER.put(STATE_KEY, JSON.stringify(record));
  return json({ ok: true, revision, updatedAt, updatedBy });
}

async function revertState(request, env) {
  const body = await request.json().catch(() => null);
  const snapshotRevision = number(body?.snapshotRevision, NaN);
  if (!Number.isFinite(snapshotRevision)) {
    return json({ ok: false, message: "snapshotRevision is required." }, { status: 400 });
  }

  const updatedBy = actorFromAccess(request);
  if (!updatedBy) {
    return json({ ok: false, message: "Cloudflare Access identity is required for writes." }, { status: 403 });
  }

  const previous = await env.AGGS_LEDGER.get(STATE_KEY, "json");
  if (!previous?.data) {
    return json({ ok: false, message: "No live state exists to revert." }, { status: 404 });
  }

  const previousRevision = number(previous.revision);
  const submittedRevision = body.revision === null || body.revision === undefined ? null : number(body.revision, NaN);
  if (!Number.isFinite(submittedRevision) || submittedRevision !== previousRevision) {
    return json(
      {
        ok: false,
        code: "REVISION_CONFLICT",
        message: "Live state changed before this revert. Reload snapshots and try again.",
        revision: previousRevision
      },
      { status: 409 }
    );
  }

  const snapshot = await env.AGGS_LEDGER.get(snapshotKey(snapshotRevision), "json");
  if (!snapshot?.data) return json({ ok: false, message: "Snapshot was not found." }, { status: 404 });

  const updatedAt = new Date().toISOString();
  await rememberSnapshot(env, previous, updatedAt);

  const data = clone(snapshot.data);
  data.meta = data.meta || {};
  data.meta.updatedAt = updatedAt;
  data.meta.updatedBy = updatedBy;
  data.meta.changeHistory = [
    {
      key: `snapshot-revert:${snapshotRevision}:${Date.now()}`,
      nationId: "",
      nationName: "Global Ledger",
      dataset: "state",
      field: "revert",
      label: "Reverted Snapshot",
      beforeValue: `Revision #${previousRevision}`,
      afterValue: `Revision #${snapshotRevision}`,
      changedAt: updatedAt,
      changes: [],
      deltas: []
    },
    ...(Array.isArray(data.meta.changeHistory) ? data.meta.changeHistory : [])
  ].slice(0, 60);

  const revision = previousRevision + 1;
  const record = { revision, updatedAt, updatedBy, data, revertedFromRevision: snapshotRevision };
  await env.AGGS_LEDGER.put(STATE_KEY, JSON.stringify(record));
  return json({ ok: true, revision, updatedAt, updatedBy, revertedFromRevision: snapshotRevision });
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

    if (!isApiPath(url.pathname)) {
      return json({ ok: false, message: "Not found." }, { status: 404 });
    }

    if (!env.AGGS_LEDGER) {
      return json({ ok: false, message: "AGGS_LEDGER KV binding is not configured." }, { status: 500 });
    }

    if (isAdminPath(url.pathname) && !actorFromAccess(request)) {
      return json({ ok: false, message: "Cloudflare Access identity is required." }, { status: 403 });
    }

    if (request.method === "GET" && (url.pathname === "/api/state" || url.pathname === "/admin/api/state")) {
      return getState(env, isAdminPath(url.pathname));
    }

    if (request.method === "GET" && url.pathname === "/admin/api/snapshots") return getSnapshots(env);

    if (request.method === "GET" && url.pathname.startsWith("/admin/api/snapshots/")) {
      return getSnapshot(env, url.pathname);
    }

    if (request.method === "PUT") {
      if (url.pathname !== "/admin/api/state") {
        return json({ ok: false, message: "Use the protected admin API path for writes." }, { status: 405 });
      }
      return putState(request, env);
    }

    if (request.method === "POST" && url.pathname === "/admin/api/revert") return revertState(request, env);

    return json({ ok: false, message: "Method not allowed." }, { status: 405 });
  }
};
