# Precision Trade Lane Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable precision shipping corridors so trade routes follow shared ocean lanes instead of coarse zone-center paths or country-to-country arcs.

**Architecture:** Create a static lane-skeleton manifest loaded by both public and admin pages. The trade engine will normalize that graph, connect nation port anchors into it at solve time, run A* through lane nodes and chokepoints, and fall back to the existing route mesh when the skeleton is unavailable. The map renderer will draw solved lane paths as smooth SVG paths.

**Tech Stack:** Static HTML/JS app, AG-GS trade engine, Node test runner.

---

## File Structure

- Create `site/js/app/tradeLaneSkeleton.js`: static, hand-tunable manifest for major shipping lane nodes, chokepoint nodes, and lane corridor edges.
- Modify `site/index.html`: load `tradeLaneSkeleton.js` before `tradeMap.js`.
- Modify `site/admin/index.html`: load `tradeLaneSkeleton.js` before `tradeMap.js`.
- Modify `site/js/app/tradeMap.js`: expose `tradeLaneSkeleton()`, attach it to `data.tradeNetwork.geography.laneSkeleton`, and render smooth paths.
- Modify `site/js/engine/trade.js`: normalize the skeleton graph, solve A* over it, prefer it over the coarse route mesh, and carry lane metadata through lanes.
- Create `tools/trade-lane-skeleton.test.js`: manifest and HTML load-order coverage.
- Modify `tools/trade-v3-network.test.js`: engine coverage for precision skeleton routing and fallback behavior.
- Modify `tools/trade-map-helper.test.js`: renderer coverage for smooth solved paths.

---

### Task 1: Static Lane Skeleton Manifest

**Files:**
- Create: `site/js/app/tradeLaneSkeleton.js`
- Modify: `site/index.html`
- Modify: `site/admin/index.html`
- Test: `tools/trade-lane-skeleton.test.js`

- [ ] **Step 1: Write the failing manifest/load-order test**

Add `tools/trade-lane-skeleton.test.js`:

```js
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function loadScript(relativePath, sandbox) {
  const code = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInNewContext(code, sandbox, { filename: relativePath });
}

test("precision trade lane skeleton manifest exposes major corridor nodes and edges", () => {
  const sandbox = { globalThis: {} };
  sandbox.window = sandbox.globalThis;
  loadScript("site/js/app/tradeLaneSkeleton.js", sandbox);

  const skeleton = sandbox.globalThis.AGGS_TRADE_LANE_SKELETON;
  assert.equal(skeleton.version, "precision-lane-skeleton-v1");
  assert.ok(Array.isArray(skeleton.nodes));
  assert.ok(Array.isArray(skeleton.edges));
  assert.ok(skeleton.nodes.length >= 12, "major shipping corridors need enough waypoints to bend around continents");
  assert.ok(skeleton.edges.length >= 14, "lane graph should have connected corridor edges");
  assert.ok(skeleton.nodes.some((node) => node.id === "lane:southern_solara_gate"));
  assert.ok(skeleton.nodes.some((node) => node.id === "lane:central_southern_trunk"));
  assert.ok(skeleton.nodes.some((node) => node.id === "lane:eastern_orinian_approach"));
  assert.ok(skeleton.edges.some((edge) => edge.from === "lane:southern_solara_gate" && edge.to === "lane:southwest_khalindar_trunk"));
  assert.ok(skeleton.edges.some((edge) => Array.isArray(edge.path) && edge.path.length >= 2), "edges should carry draw paths, not only endpoints");
});

test("precision trade lane skeleton loads before trade map on public and admin pages", () => {
  const publicHtml = fs.readFileSync(path.join(root, "site/index.html"), "utf8");
  const adminHtml = fs.readFileSync(path.join(root, "site/admin/index.html"), "utf8");

  const publicSkeleton = publicHtml.indexOf("js/app/tradeLaneSkeleton.js?v=20260603-precision-lanes");
  const publicMap = publicHtml.indexOf("js/app/tradeMap.js?");
  const adminSkeleton = adminHtml.indexOf("../js/app/tradeLaneSkeleton.js?v=20260603-precision-lanes");
  const adminMap = adminHtml.indexOf("../js/app/tradeMap.js?");

  assert.ok(publicSkeleton >= 0, "public page should load precision lane skeleton");
  assert.ok(adminSkeleton >= 0, "admin page should load precision lane skeleton");
  assert.ok(publicSkeleton < publicMap, "public skeleton must load before trade map");
  assert.ok(adminSkeleton < adminMap, "admin skeleton must load before trade map");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tools\trade-lane-skeleton.test.js
```

Expected: FAIL because `site/js/app/tradeLaneSkeleton.js` does not exist.

- [ ] **Step 3: Add the lane skeleton manifest**

Create `site/js/app/tradeLaneSkeleton.js` with this shape and initial corridor. Coordinates are percent-of-map coordinates, matching existing geography and route mesh data.

```js
(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  root.AGGS_TRADE_LANE_SKELETON = {
    version: "precision-lane-skeleton-v1",
    map: { width: 8800, height: 5806 },
    nodes: [
      { id: "lane:southern_solara_gate", label: "Solara Gate", type: "lane", x: 7.5, y: 88.2, zones: ["mare_solthar"] },
      { id: "lane:southwest_khalindar_trunk", label: "Southwest Khalindar Trunk", type: "lane", x: 21.5, y: 83.4, zones: ["the_storm_expanse"] },
      { id: "lane:xanaqu_south_approach", label: "Xanaqu South Approach", type: "lane", x: 35.5, y: 78.8, zones: ["sea_of_xanaqu"] },
      { id: "lane:central_southern_trunk", label: "Central Southern Trunk", type: "lane", x: 48.8, y: 74.2, zones: ["okeanus"] },
      { id: "lane:orinian_bend", label: "Orinian Bend", type: "lane", x: 64.8, y: 67.6, zones: ["orion"] },
      { id: "lane:eastern_orinian_approach", label: "Eastern Orinian Approach", type: "lane", x: 72.8, y: 47.5, zones: ["orion"] },
      { id: "lane:volgastan_southern_approach", label: "Volgastan Southern Approach", type: "lane", x: 83.3, y: 62.7, zones: ["orion"] },
      { id: "lane:far_east_gate", label: "Far East Gate", type: "lane", x: 96.4, y: 55.5, zones: ["whitewater"] },
      { id: "lane:western_far_coast", label: "Western Far Coast", type: "lane", x: 4.8, y: 47.2, zones: ["vesperan_strait"] },
      { id: "lane:western_south_gate", label: "Western South Gate", type: "lane", x: 6.1, y: 64.8, zones: ["vesperan_strait"] },
      { id: "choke:vesperan_strait", label: "Vesperan Strait", type: "chokepoint", chokepoint: true, zoneId: "vesperan_strait", x: 6.7, y: 72.5, zones: ["vesperan_strait"] },
      { id: "choke:boynak_canal", label: "Boynak Canal", type: "chokepoint", chokepoint: true, zoneId: "boynak_canal", x: 4.4, y: 52.0, zones: ["boynak_canal"] }
    ],
    edges: [
      { from: "lane:southern_solara_gate", to: "lane:southwest_khalindar_trunk", class: "coastal", cost: 13.8, zones: ["mare_solthar", "the_storm_expanse"], path: [{ x: 7.5, y: 88.2 }, { x: 13.2, y: 88.6 }, { x: 21.5, y: 83.4 }] },
      { from: "lane:southwest_khalindar_trunk", to: "lane:xanaqu_south_approach", class: "open_ocean", cost: 14.4, zones: ["the_storm_expanse", "sea_of_xanaqu"], path: [{ x: 21.5, y: 83.4 }, { x: 28.7, y: 82.5 }, { x: 35.5, y: 78.8 }] },
      { from: "lane:xanaqu_south_approach", to: "lane:central_southern_trunk", class: "open_ocean", cost: 13.8, zones: ["sea_of_xanaqu", "okeanus"], path: [{ x: 35.5, y: 78.8 }, { x: 42.1, y: 77.2 }, { x: 48.8, y: 74.2 }] },
      { from: "lane:central_southern_trunk", to: "lane:orinian_bend", class: "open_ocean", cost: 17.2, zones: ["okeanus", "orion"], path: [{ x: 48.8, y: 74.2 }, { x: 57.5, y: 73.8 }, { x: 64.8, y: 67.6 }] },
      { from: "lane:orinian_bend", to: "lane:eastern_orinian_approach", class: "coastal", cost: 15.6, zones: ["orion"], path: [{ x: 64.8, y: 67.6 }, { x: 68.2, y: 59.2 }, { x: 72.8, y: 47.5 }] },
      { from: "lane:orinian_bend", to: "lane:volgastan_southern_approach", class: "open_ocean", cost: 18.2, zones: ["orion"], path: [{ x: 64.8, y: 67.6 }, { x: 74.5, y: 68.2 }, { x: 83.3, y: 62.7 }] },
      { from: "lane:volgastan_southern_approach", to: "lane:far_east_gate", class: "coastal", cost: 14.8, zones: ["orion", "whitewater"], path: [{ x: 83.3, y: 62.7 }, { x: 90.5, y: 60.2 }, { x: 96.4, y: 55.5 }] },
      { from: "lane:western_far_coast", to: "choke:boynak_canal", class: "canal", cost: 5.2, zones: ["boynak_canal"], chokepoints: ["boynak_canal"], path: [{ x: 4.8, y: 47.2 }, { x: 4.4, y: 52.0 }] },
      { from: "choke:boynak_canal", to: "lane:western_south_gate", class: "canal", cost: 8.2, zones: ["vesperan_strait"], chokepoints: ["boynak_canal"], path: [{ x: 4.4, y: 52.0 }, { x: 5.2, y: 58.7 }, { x: 6.1, y: 64.8 }] },
      { from: "lane:western_south_gate", to: "choke:vesperan_strait", class: "strait", cost: 8.0, zones: ["vesperan_strait"], chokepoints: ["vesperan_strait"], path: [{ x: 6.1, y: 64.8 }, { x: 6.7, y: 72.5 }] },
      { from: "choke:vesperan_strait", to: "lane:southern_solara_gate", class: "strait", cost: 15.0, zones: ["vesperan_strait", "mare_solthar"], chokepoints: ["vesperan_strait"], path: [{ x: 6.7, y: 72.5 }, { x: 6.9, y: 80.1 }, { x: 7.5, y: 88.2 }] },
      { from: "lane:western_south_gate", to: "lane:southwest_khalindar_trunk", class: "open_ocean", cost: 19.2, zones: ["vesperan_strait", "the_storm_expanse"], path: [{ x: 6.1, y: 64.8 }, { x: 12.5, y: 72.4 }, { x: 21.5, y: 83.4 }] },
      { from: "lane:eastern_orinian_approach", to: "lane:far_east_gate", class: "coastal", cost: 24.0, zones: ["orion", "whitewater"], path: [{ x: 72.8, y: 47.5 }, { x: 84.6, y: 43.8 }, { x: 96.4, y: 55.5 }] },
      { from: "lane:xanaqu_south_approach", to: "lane:eastern_orinian_approach", class: "open_ocean", cost: 39.0, zones: ["sea_of_xanaqu", "okeanus", "orion"], path: [{ x: 35.5, y: 78.8 }, { x: 52.0, y: 71.0 }, { x: 64.0, y: 54.0 }, { x: 72.8, y: 47.5 }] }
    ]
  };
})();
```

- [ ] **Step 4: Load the manifest before `tradeMap.js`**

In `site/index.html`, add:

```html
<script src="js/app/tradeLaneSkeleton.js?v=20260603-precision-lanes"></script>
```

Place it after `tradeRouteMesh.js` and before `tradeMap.js`.

In `site/admin/index.html`, add:

```html
<script src="../js/app/tradeLaneSkeleton.js?v=20260603-precision-lanes"></script>
```

Place it after `tradeRouteMesh.js` and before `tradeMap.js`.

- [ ] **Step 5: Run the manifest test to verify it passes**

Run:

```powershell
node --test tools\trade-lane-skeleton.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add site\js\app\tradeLaneSkeleton.js site\index.html site\admin\index.html tools\trade-lane-skeleton.test.js
git commit -m "Add precision trade lane skeleton manifest"
```

---

### Task 2: Attach Skeleton Data To Trade Geography

**Files:**
- Modify: `site/js/app/tradeMap.js`
- Test: `tools/trade-map-helper.test.js`

- [ ] **Step 1: Write the failing helper test**

In `tools/trade-map-helper.test.js`, add:

```js
test("trade map helper attaches precision lane skeleton to geography", () => {
  const previousSkeleton = global.AGGS_TRADE_LANE_SKELETON;
  global.AGGS_TRADE_LANE_SKELETON = {
    version: "unit-test-lanes",
    nodes: [{ id: "lane:test", type: "lane", x: 20, y: 70 }],
    edges: []
  };
  const data = {
    nations: [{ id: "solara", name: "Solara", color: "#c2b72e" }],
    tradeNetwork: { geography: { nations: {} } }
  };

  try {
    TradeMap.ensureGeography(data);
  } finally {
    global.AGGS_TRADE_LANE_SKELETON = previousSkeleton;
  }

  assert.equal(data.tradeNetwork.geography.laneSkeleton.version, "unit-test-lanes");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tools\trade-map-helper.test.js
```

Expected: FAIL because `tradeMap.js` does not expose or attach `laneSkeleton`.

- [ ] **Step 3: Add the loader function and geography attachment**

In `site/js/app/tradeMap.js`, add next to `tradeRouteMesh()`:

```js
function tradeLaneSkeleton() {
  return root.AGGS_TRADE_LANE_SKELETON || null;
}
```

Inside `ensureGeography(data)`, after attaching `routeMesh`, add:

```js
const laneSkeleton = tradeLaneSkeleton();
if (laneSkeleton) data.tradeNetwork.geography.laneSkeleton = laneSkeleton;
```

In the exported `root.AGGS_TRADE_MAP` object, add:

```js
tradeLaneSkeleton,
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```powershell
node --test tools\trade-map-helper.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add site\js\app\tradeMap.js tools\trade-map-helper.test.js
git commit -m "Attach precision lane skeleton to trade geography"
```

---

### Task 3: Engine Solves Routes Through Lane Skeleton

**Files:**
- Modify: `site/js/engine/trade.js`
- Test: `tools/trade-v3-network.test.js`

- [ ] **Step 1: Write the failing engine test**

In `tools/trade-v3-network.test.js`, add:

```js
test("Trade route network prefers precision lane skeleton over coarse route mesh", () => {
  const data = buildLargeTradeV3Scenario(2);
  const [exporter, importer] = data.nations.map((nation) => nation.id);
  for (const id of [exporter, importer]) {
    data.trade[id].tradeFlow = 1000000;
    data.trade[id].importReliance = 100;
    data.trade[id].exportReliance = 100;
    data.trade[id].economicTradeDiversity = 100;
    data.trade[id].tradePolicy = "Free Trade";
    data.trade[id].tariffRate = 3;
  }
  data.trade[exporter].exportReliance = 220;
  data.trade[importer].importReliance = 220;
  data.tradeNetwork = {
    geography: {
      map: { squareMilesPerMapUnit: 10000 },
      laneSkeleton: {
        version: "unit-test-precision-lanes",
        nodes: [
          { id: "lane:west_gate", type: "lane", x: 20, y: 70, zones: ["west_sea"] },
          { id: "lane:south_trunk", type: "lane", x: 45, y: 82, zones: ["south_sea"] },
          { id: "lane:east_gate", type: "lane", x: 80, y: 70, zones: ["east_sea"] }
        ],
        edges: [
          { from: "lane:west_gate", to: "lane:south_trunk", cost: 28, zones: ["west_sea", "south_sea"], path: [{ x: 20, y: 70 }, { x: 32, y: 82 }, { x: 45, y: 82 }] },
          { from: "lane:south_trunk", to: "lane:east_gate", cost: 30, zones: ["south_sea", "east_sea"], path: [{ x: 45, y: 82 }, { x: 64, y: 82 }, { x: 80, y: 70 }] }
        ]
      },
      routeMesh: {
        version: "unit-test-coarse-mesh",
        nodes: [
          { id: "zone:west_sea", zoneId: "west_sea", type: "sea_zone", x: 20, y: 50 },
          { id: "zone:east_sea", zoneId: "east_sea", type: "sea_zone", x: 80, y: 50 }
        ],
        edges: [{ from: "zone:west_sea", to: "zone:east_sea", cost: 30 }]
      },
      nations: {
        [exporter]: { x: 18, y: 68, coastal: true, portStrength: 8, routeAccess: ["ocean"], primaryPort: { x: 18, y: 68 } },
        [importer]: { x: 82, y: 68, coastal: true, portStrength: 8, routeAccess: ["ocean"], primaryPort: { x: 82, y: 68 } }
      }
    }
  };

  Engine.recalculateAll(data);
  const network = Engine.calculateTradeNetwork(data);
  const lane = network.lanes.find((entry) => entry.importerId === importer && entry.exporterId === exporter);

  assert.equal(lane.routeMode, "maritime");
  assert.equal(lane.routeMeshVersion, "unit-test-precision-lanes");
  assert.ok(lane.routeNodes.includes("lane:south_trunk"), `expected precision route through south trunk: ${lane.routeNodes.join(" > ")}`);
  assert.deepEqual(lane.routeZones, ["west_sea", "south_sea", "east_sea"]);
  assert.ok(lane.routePath.some((point) => point.y >= 80), "precision route should visibly bend through the southern lane");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tools\trade-v3-network.test.js
```

Expected: FAIL because the engine ignores `geography.laneSkeleton`.

- [ ] **Step 3: Add lane skeleton normalization**

In `site/js/engine/trade.js`, add a new function near `routeMeshForData(data)`:

```js
function laneSkeletonForData(data) {
  const skeleton = tradeNetworkState(data).geography?.laneSkeleton;
  if (!skeleton || typeof skeleton !== "object" || Array.isArray(skeleton)) return null;
  const nodes = Array.isArray(skeleton.nodes)
    ? skeleton.nodes
        .map((node) => ({
          id: String(node.id || ""),
          label: String(node.label || node.id || ""),
          type: String(node.type || "lane"),
          zoneId: String(node.zoneId || ""),
          chokepoint: node.chokepoint === true || String(node.type || "") === "chokepoint",
          zones: Array.isArray(node.zones) ? node.zones.map((id) => String(id)).filter(Boolean) : [],
          x: clamp(number(node.x, NaN), 0, 100),
          y: clamp(number(node.y, NaN), 0, 100)
        }))
        .filter((node) => node.id && Number.isFinite(node.x) && Number.isFinite(node.y))
    : [];
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const adjacency = Object.fromEntries(nodes.map((node) => [node.id, []]));
  for (const edge of Array.isArray(skeleton.edges) ? skeleton.edges : []) {
    const from = String(edge.from || "");
    const to = String(edge.to || "");
    if (!nodeById[from] || !nodeById[to]) continue;
    const fallbackCost = mapDistanceUnits(nodeById[from], nodeById[to], { width: 100, height: 100 }, false);
    const entry = {
      id: to,
      from,
      to,
      cost: Math.max(0.01, number(edge.cost, fallbackCost)),
      class: String(edge.class || "open_ocean"),
      zones: Array.isArray(edge.zones) ? edge.zones.map((id) => String(id)).filter(Boolean) : [],
      chokepoints: Array.isArray(edge.chokepoints) ? edge.chokepoints.map((id) => String(id)).filter(Boolean) : [],
      path: Array.isArray(edge.path)
        ? edge.path
            .map((point) => ({ x: clamp(number(point?.x, NaN), 0, 100), y: clamp(number(point?.y, NaN), 0, 100) }))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
        : []
    };
    adjacency[from].push(entry);
    adjacency[to].push({ ...entry, id: from, from: to, to: from, path: entry.path.slice().reverse() });
  }
  if (!nodes.length) return null;
  return {
    version: skeleton.version || "precision-lane-skeleton",
    nodes,
    nodeById,
    adjacency,
    entryLimit: Math.max(1, Math.min(6, number(skeleton.entryLimit, 4)))
  };
}
```

- [ ] **Step 4: Add A* lane skeleton solving**

Add these helpers near `solveRouteMeshPath`:

```js
function nearestLaneSkeletonEntries(skeleton, point) {
  return skeleton.nodes
    .filter((node) => node.type !== "blocked")
    .map((node) => ({
      id: node.id,
      cost: Math.max(0.01, pointDistanceUnits(node, point) * (node.type === "chokepoint" ? 1.18 : 1)),
      chokepoints: [],
      zones: node.zones || [],
      path: []
    }))
    .sort((left, right) => left.cost - right.cost)
    .slice(0, skeleton.entryLimit);
}

function edgeKey(from, to) {
  return `${from}>${to}`;
}

function buildSolvedLanePath(ids, pointById, edgeByStep) {
  const points = [];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    const point = pointById[id];
    if (!point) continue;
    if (!points.length) points.push({ x: roundPercent(point.x), y: roundPercent(point.y) });
    if (index >= ids.length - 1) continue;
    const edge = edgeByStep.get(edgeKey(id, ids[index + 1]));
    const edgePoints = edge?.path?.length ? edge.path : [pointById[ids[index + 1]]];
    for (const edgePoint of edgePoints) {
      const next = { x: roundPercent(edgePoint.x), y: roundPercent(edgePoint.y) };
      const previous = points[points.length - 1];
      if (!previous || previous.x !== next.x || previous.y !== next.y) points.push(next);
    }
  }
  return points;
}

function solveLaneSkeletonPath(skeleton, startPoint, endPoint) {
  if (!skeleton || !startPoint || !endPoint || !skeleton.nodes.length) return null;
  const startId = "__lane_start";
  const endId = "__lane_end";
  const pointById = {
    [startId]: startPoint,
    [endId]: endPoint,
    ...Object.fromEntries(skeleton.nodes.map((node) => [node.id, node]))
  };
  const open = new Set([startId]);
  const closed = new Set();
  const cameFrom = new Map();
  const gScore = new Map([[startId, 0]]);
  const edgeByStep = new Map();
  const routeChokes = new Map();
  const routeZones = new Map();

  function heuristic(id) {
    return pointDistanceUnits(pointById[id], endPoint);
  }

  function neighbors(id) {
    if (id === startId) return nearestLaneSkeletonEntries(skeleton, startPoint);
    if (id === endId) return [];
    const base = skeleton.adjacency[id] || [];
    const list = base.slice();
    const exitCost = pointDistanceUnits(pointById[id], endPoint);
    if (exitCost <= 18) {
      list.push({ id: endId, cost: Math.max(0.01, exitCost), chokepoints: [], zones: [], path: [endPoint] });
    }
    return list;
  }

  while (open.size) {
    let current = null;
    let currentScore = Infinity;
    for (const id of open) {
      const score = (gScore.get(id) ?? Infinity) + heuristic(id);
      if (score < currentScore) {
        current = id;
        currentScore = score;
      }
    }
    if (current === endId) {
      const ids = [];
      let cursor = endId;
      while (cursor) {
        ids.unshift(cursor);
        cursor = cameFrom.get(cursor);
      }
      const routeNodes = ids.filter((id) => id !== startId && id !== endId);
      const chokepoints = [...new Set(routeNodes
        .map((id) => skeleton.nodeById[id])
        .filter((node) => node?.chokepoint)
        .map((node) => node.zoneId || node.id)
        .concat(ids.flatMap((id) => routeChokes.get(id) || [])))];
      const zones = [...new Set(ids.flatMap((id) => routeZones.get(id) || skeleton.nodeById[id]?.zones || []))];
      return {
        distanceUnits: roundPercent(gScore.get(endId) ?? 0),
        routePath: buildSolvedLanePath(ids, pointById, edgeByStep),
        routeNodes,
        routeZones: zones,
        chokepoints,
        routeMeshVersion: skeleton.version
      };
    }
    open.delete(current);
    closed.add(current);
    for (const neighbor of neighbors(current)) {
      if (closed.has(neighbor.id)) continue;
      const tentative = (gScore.get(current) ?? Infinity) + Math.max(0.01, number(neighbor.cost, 0));
      if (tentative >= (gScore.get(neighbor.id) ?? Infinity)) continue;
      cameFrom.set(neighbor.id, current);
      edgeByStep.set(edgeKey(current, neighbor.id), neighbor);
      routeChokes.set(neighbor.id, neighbor.chokepoints || []);
      routeZones.set(neighbor.id, neighbor.zones || []);
      gScore.set(neighbor.id, tentative);
      open.add(neighbor.id);
    }
  }
  return null;
}
```

- [ ] **Step 5: Prefer skeleton routes before coarse mesh routes**

Add a cached helper:

```js
function cachedLaneSkeletonPath(context, startPoint, endPoint) {
  if (!context.laneSkeleton) return null;
  const key = `${roundPercent(startPoint.x)},${roundPercent(startPoint.y)}>${roundPercent(endPoint.x)},${roundPercent(endPoint.y)}`;
  if (context.laneSkeletonCache.has(key)) return context.laneSkeletonCache.get(key);
  const route = solveLaneSkeletonPath(context.laneSkeleton, startPoint, endPoint);
  context.laneSkeletonCache.set(key, route);
  return route;
}
```

In `bestRouteForLane`, change:

```js
const { geography, scale, transitPolicies, chokepoints, routeMesh } = context;
```

to:

```js
const { geography, scale, transitPolicies, chokepoints, routeMesh, laneSkeleton } = context;
```

Inside the port-to-port loop, replace `meshRoute` selection with:

```js
const startPoint = routePointForGeography(exportPort.port);
const endPoint = routePointForGeography(importPort.port);
const precisionRoute = exportPort.portId === importPort.portId
  ? null
  : cachedLaneSkeletonPath(context, startPoint, endPoint);
const meshRoute = precisionRoute || (exportPort.portId === importPort.portId
  ? null
  : cachedRouteMeshPath(context, startPoint, endPoint));
```

In `buildRouteNetwork`, add:

```js
const laneSkeleton = laneSkeletonForData(data);
const context = { geography, scale, transitPolicies, chokepoints, routeMesh, laneSkeleton, routeMeshCache: new Map(), laneSkeletonCache: new Map() };
```

Return route network metadata:

```js
laneSkeleton: laneSkeleton ? { version: laneSkeleton.version, nodeCount: laneSkeleton.nodes.length } : null,
```

- [ ] **Step 6: Run the engine test to verify it passes**

Run:

```powershell
node --test tools\trade-v3-network.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add site\js\engine\trade.js tools\trade-v3-network.test.js
git commit -m "Route trade lanes through precision skeleton"
```

---

### Task 4: Smooth Solved Route Rendering

**Files:**
- Modify: `site/js/app/tradeMap.js`
- Test: `tools/trade-map-helper.test.js`

- [ ] **Step 1: Write the failing smooth-path test**

Update the existing solved-route test in `tools/trade-map-helper.test.js` so it expects cubic smoothing:

```js
assert.match(routes[0].path, / C /, "precision routes should render as smooth cubic paths");
assert.doesNotMatch(routes[0].path, / Q /, "solved routes should not use fallback quadratic arcs");
```

Keep the existing routePath fixture with at least three points.

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```powershell
node --test tools\trade-map-helper.test.js
```

Expected: FAIL because `routePolylinePath()` currently emits `L` line segments.

- [ ] **Step 3: Replace polyline output with smoothed cubic output**

In `site/js/app/tradeMap.js`, replace `routePolylinePath(points = [])` with:

```js
function routePolylinePath(points = []) {
  const config = mapConfig();
  const validPoints = points
    .map((point) => ({
      x: Number(point?.x),
      y: Number(point?.y)
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({
      x: clamp((point.x / 100) * config.width, 0, config.width),
      y: clamp((point.y / 100) * config.height, 0, config.height)
    }));
  if (validPoints.length < 2) return "";
  if (validPoints.length === 2) {
    return validPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
  }
  const commands = [`M ${validPoints[0].x.toFixed(2)} ${validPoints[0].y.toFixed(2)}`];
  for (let index = 0; index < validPoints.length - 1; index += 1) {
    const previous = validPoints[Math.max(0, index - 1)];
    const current = validPoints[index];
    const next = validPoints[index + 1];
    const after = validPoints[Math.min(validPoints.length - 1, index + 2)];
    const tension = 0.22;
    const controlOne = {
      x: current.x + (next.x - previous.x) * tension,
      y: current.y + (next.y - previous.y) * tension
    };
    const controlTwo = {
      x: next.x - (after.x - current.x) * tension,
      y: next.y - (after.y - current.y) * tension
    };
    commands.push(`C ${controlOne.x.toFixed(2)} ${controlOne.y.toFixed(2)} ${controlTwo.x.toFixed(2)} ${controlTwo.y.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`);
  }
  return commands.join(" ");
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```powershell
node --test tools\trade-map-helper.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add site\js\app\tradeMap.js tools\trade-map-helper.test.js
git commit -m "Smooth precision trade route rendering"
```

---

### Task 5: Full Verification And Preview

**Files:**
- Verify all touched code.

- [ ] **Step 1: Run syntax checks**

Run:

```powershell
node --check site\js\app\tradeLaneSkeleton.js
node --check site\js\app\tradeMap.js
node --check site\js\engine\trade.js
```

Expected: no syntax errors.

- [ ] **Step 2: Run focused tests**

Run:

```powershell
node --test tools\trade-lane-skeleton.test.js tools\trade-map-helper.test.js tools\trade-v3-network.test.js
```

Expected: all focused tests pass.

- [ ] **Step 3: Run the full test suite**

Run:

```powershell
node --test tools\*.test.js
```

Expected: all tests pass.

- [ ] **Step 4: Check for whitespace errors**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors other than existing line-ending warnings if Git reports CRLF normalization.

- [ ] **Step 5: Start a local static server**

Run:

```powershell
$listener = Start-Process -FilePath "python" -ArgumentList "-m http.server 62035 --directory site" -WindowStyle Hidden -PassThru
```

Open:

```text
http://127.0.0.1:62035/admin/
```

Expected: admin page loads and Trade Network routes are visible.

- [ ] **Step 6: Browser smoke check**

Using the in-app browser, verify:

- the Trade Network tab opens,
- a selected nation shows routes,
- route SVG paths contain `C` cubic commands for solved routes,
- there are no console errors from missing `tradeLaneSkeleton.js`.

- [ ] **Step 7: Push branch**

Run:

```powershell
git push
```

Expected: `preview/trade-v3-generator` updates on GitHub.
