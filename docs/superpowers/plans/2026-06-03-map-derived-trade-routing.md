# Map-Derived Trade Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace simple trade-route arcs with A* routes built from map-derived nodes and the player-drawn sea/strait overlay.

**Architecture:** Generate a static trade route mesh from `site/js/app/tradeZones.js` and `site/assets/ag-trade-zones.png`, then let the trade engine solve lanes with A*. The app renderer draws `lane.routePath` polylines when present and falls back to the old curve only for unmapped routes.

**Tech Stack:** Static HTML/JS app, Node test runner, Python/Pillow for the route mesh generator.

---

### Task 1: Generated Zone Route Mesh

**Files:**
- Create: `tools/trade-zone-route-mesh.py`
- Create: `site/js/app/tradeRouteMesh.js`
- Modify: `site/index.html`
- Modify: `site/admin/index.html`
- Test: `tools/trade-route-mesh.test.js`

- [x] Write a failing test that expects a route mesh manifest with zone nodes, strait nodes, weighted edges, and `map-derived-overlay-v1`.
- [x] Implement the Python generator to sample `site/assets/ag-trade-zones.png` by manifest color, compute centroids/bounds, and connect nearby zones.
- [x] Generate `site/js/app/tradeRouteMesh.js`.
- [x] Load `tradeRouteMesh.js` before `tradeMap.js` in both HTML entrypoints.

### Task 2: A* Route Solving In Engine

**Files:**
- Modify: `site/js/engine/trade.js`
- Test: `tools/trade-v3-network.test.js`

- [x] Write a failing test with a small `routeMesh` where the direct edge is expensive and A* must choose the cheaper multi-node path.
- [x] Add mesh normalization, node lookup, A* frontier scoring, and route reconstruction.
- [x] Feed solved distance, zones, straits, and path points into `bestRouteForLane`.
- [x] Keep the existing route candidate system as fallback when mesh data is absent.

### Task 3: Draw Solved Paths

**Files:**
- Modify: `site/js/app/tradeMap.js`
- Test: `tools/trade-map-helper.test.js`

- [x] Write a failing test where lane `routePath` points produce a polyline path instead of a quadratic arc.
- [x] Add `routePolylinePath` and use it inside `routesForRows`.
- [x] Keep the old curved route as fallback when a lane lacks path points.

### Task 4: Verify

**Files:**
- Test all touched code.

- [x] Run focused tests: `node --test tools\trade-route-mesh.test.js tools\trade-map-helper.test.js tools\trade-v3-network.test.js`
- [x] Run full suite: `node --test tools\*.test.js`
- [x] Run syntax checks for changed JS files.
- [ ] Commit and push to `preview/trade-v3-generator`.
