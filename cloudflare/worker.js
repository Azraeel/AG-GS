const STATE_KEY = "global-ledger-state";
const STATE_META_KEY = `${STATE_KEY}:meta`;
const STATE_DATA_KEY = `${STATE_KEY}:data`;
const STATE_ADMIN_RESPONSE_KEY = `${STATE_KEY}:response:admin`;
const STATE_PUBLIC_RESPONSE_KEY = `${STATE_KEY}:response:public`;
const SNAPSHOT_INDEX_KEY = "global-ledger-state:snapshots";
const SNAPSHOT_PREFIX = "global-ledger-state:snapshot:";
const MAX_SNAPSHOTS = 50;
const DEFAULT_ALLOWED_HOSTS = ["aggsworld.net"];

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

function jsonText(text, init = {}) {
  return new Response(text, {
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
    pathname === "/api/state/meta" ||
    pathname === "/admin/api/state" ||
    pathname === "/admin/api/state/meta" ||
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

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function redactPublicData(data) {
  const meta = { ...(data.meta || {}) };
  delete meta.updatedBy;
  meta.changeHistory = [];
  const redacted = { ...data, meta };
  return redacted;
}

function dataSummary(data) {
  const nations = Array.isArray(data?.nations) ? data.nations : [];
  const archived = new Set(data?.meta?.archivedNationIds || []);
  return {
    nationCount: nations.length,
    activeNationCount: nations.filter((nation) => !archived.has(nation.id)).length
  };
}

function metadataForData(record, data) {
  return {
    revision: number(record?.revision || 0),
    updatedAt: record?.updatedAt || "",
    updatedBy: record?.updatedBy || "",
    revertedFromRevision: record?.revertedFromRevision,
    ...dataSummary(data)
  };
}

function stateResponseText(meta, dataText, isAdmin = false) {
  const updatedBy = isAdmin ? `,"updatedBy":${JSON.stringify(meta.updatedBy || "")}` : "";
  return `{"ok":true,"revision":${number(meta.revision, 1)},"updatedAt":${JSON.stringify(meta.updatedAt || "")}${updatedBy},"data":${dataText}}`;
}

function snapshotSummaryFromMeta(meta, snapshotAt) {
  return {
    revision: number(meta.revision),
    updatedAt: meta.updatedAt || "",
    updatedBy: meta.updatedBy || "",
    snapshotAt,
    nationCount: number(meta.nationCount, 0),
    activeNationCount: number(meta.activeNationCount, number(meta.nationCount, 0))
  };
}

function snapshotResponseText(meta, dataText, snapshotAt) {
  const summary = snapshotSummaryFromMeta(meta, snapshotAt);
  return `{"ok":true,"snapshot":{"revision":${number(summary.revision)},"updatedAt":${JSON.stringify(summary.updatedAt)},"updatedBy":${JSON.stringify(summary.updatedBy)},"snapshotAt":${JSON.stringify(summary.snapshotAt)},"data":${dataText}}}`;
}

async function loadCurrentState(env) {
  const [meta, dataText] = await Promise.all([
    env.AGGS_LEDGER.get(STATE_META_KEY, "json"),
    env.AGGS_LEDGER.get(STATE_DATA_KEY)
  ]);
  if (meta?.revision && dataText) return { meta, dataText };

  const legacyRecord = await env.AGGS_LEDGER.get(STATE_KEY, "json");
  if (!legacyRecord?.data) return { meta: meta || null, dataText: dataText || "" };

  return {
    meta: meta?.revision ? meta : metadataForData(legacyRecord, legacyRecord.data),
    dataText: dataText || JSON.stringify(legacyRecord.data),
    legacyRecord
  };
}

async function loadCurrentMeta(env) {
  const meta = await env.AGGS_LEDGER.get(STATE_META_KEY, "json");
  if (meta?.revision) return meta;

  const legacyRecord = await env.AGGS_LEDGER.get(STATE_KEY, "json");
  if (!legacyRecord?.data) return null;
  const derivedMeta = metadataForData(legacyRecord, legacyRecord.data);
  await env.AGGS_LEDGER.put(STATE_META_KEY, JSON.stringify(derivedMeta));
  return derivedMeta;
}

async function putCurrentState(env, meta, dataText, publicDataText) {
  await Promise.all([
    env.AGGS_LEDGER.put(STATE_META_KEY, JSON.stringify(meta)),
    env.AGGS_LEDGER.put(STATE_DATA_KEY, dataText),
    env.AGGS_LEDGER.put(STATE_ADMIN_RESPONSE_KEY, stateResponseText(meta, dataText, true)),
    env.AGGS_LEDGER.put(STATE_PUBLIC_RESPONSE_KEY, stateResponseText(meta, publicDataText, false))
  ]);
}

async function getState(env, isAdmin = false) {
  const responseKey = isAdmin ? STATE_ADMIN_RESPONSE_KEY : STATE_PUBLIC_RESPONSE_KEY;
  const cachedResponse = await env.AGGS_LEDGER.get(responseKey);
  if (cachedResponse) return jsonText(cachedResponse);

  const current = await loadCurrentState(env);
  if (!current.meta?.revision || !current.dataText) {
    return json(
      {
        ok: false,
        code: "NO_SHARED_STATE",
        message: "No shared ledger state has been published yet."
      },
      { status: 404 }
    );
  }

  const data = current.legacyRecord?.data || parseJson(current.dataText);
  if (!data) return json({ ok: false, message: "Shared ledger state is unreadable." }, { status: 500 });
  const publicDataText = JSON.stringify(redactPublicData(data));
  await putCurrentState(env, current.meta, current.dataText, publicDataText);
  return jsonText(stateResponseText(current.meta, isAdmin ? current.dataText : publicDataText, isAdmin));
}

async function getStateMeta(env, isAdmin = false) {
  const meta = await loadCurrentMeta(env);
  if (!meta?.revision) {
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
    revision: number(meta.revision, 1),
    updatedAt: meta.updatedAt || ""
  };
  if (isAdmin) body.updatedBy = meta.updatedBy || "";
  return json(body);
}

async function getSnapshotIndex(env) {
  const snapshots = await env.AGGS_LEDGER.get(SNAPSHOT_INDEX_KEY, "json");
  return Array.isArray(snapshots) ? snapshots : [];
}

async function rememberSnapshot(env, record, snapshotAt) {
  if (!record?.revision || !record.dataText) return;
  const summary = snapshotSummaryFromMeta(record, snapshotAt);
  await env.AGGS_LEDGER.put(snapshotKey(summary.revision), snapshotResponseText(record, record.dataText, snapshotAt));
  const current = await getSnapshotIndex(env);
  const next = [summary, ...current.filter((item) => number(item.revision) !== summary.revision)]
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
  const snapshotText = await env.AGGS_LEDGER.get(snapshotKey(revision));
  if (!snapshotText) return json({ ok: false, message: "Snapshot was not found." }, { status: 404 });
  return jsonText(snapshotText.startsWith('{"ok":') ? snapshotText : `{"ok":true,"snapshot":${snapshotText}}`);
}

async function putState(request, env) {
  const bodyText = await request.text();
  const body = parseJson(bodyText);
  if (!body?.data?.meta || !Array.isArray(body.data.nations)) {
    return json({ ok: false, message: "Expected AG-GS ledger data." }, { status: 400 });
  }

  const previous = await loadCurrentState(env);
  const updatedAt = new Date().toISOString();
  const updatedBy = actorFromAccess(request);
  if (!updatedBy) {
    return json({ ok: false, message: "Cloudflare Access identity is required for writes." }, { status: 403 });
  }
  const previousRevision = Number(previous.meta?.revision || 0);
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

  await rememberSnapshot(env, previous.meta ? { ...previous.meta, dataText: previous.dataText } : null, updatedAt);
  const meta = metadataForData({ revision, updatedAt, updatedBy }, data);
  const dataText = JSON.stringify(data);
  const publicDataText = JSON.stringify(redactPublicData(data));
  await putCurrentState(env, meta, dataText, publicDataText);
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

  const previous = await loadCurrentState(env);
  if (!previous.meta?.revision || !previous.dataText) {
    return json({ ok: false, message: "No live state exists to revert." }, { status: 404 });
  }

  const previousRevision = number(previous.meta.revision);
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

  const snapshotRaw = await env.AGGS_LEDGER.get(snapshotKey(snapshotRevision));
  const snapshotPayload = parseJson(snapshotRaw);
  const snapshot = snapshotPayload?.snapshot || snapshotPayload;
  if (!snapshot?.data) return json({ ok: false, message: "Snapshot was not found." }, { status: 404 });

  const updatedAt = new Date().toISOString();
  await rememberSnapshot(env, { ...previous.meta, dataText: previous.dataText }, updatedAt);

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
  const meta = metadataForData({ revision, updatedAt, updatedBy, revertedFromRevision: snapshotRevision }, data);
  const dataText = JSON.stringify(data);
  const publicDataText = JSON.stringify(redactPublicData(data));
  await putCurrentState(env, meta, dataText, publicDataText);
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

    if (request.method === "GET" && (url.pathname === "/api/state/meta" || url.pathname === "/admin/api/state/meta")) {
      return getStateMeta(env, isAdminPath(url.pathname));
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
