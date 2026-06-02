# Unified Trade Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the first shippable trade-only world canvas inside the existing Trade Network view.

**Architecture:** Add geography-aware lane scoring to Trade V3, expose reusable trade-map data/render helpers, and replace the Trade Network first screen with a full canvas that preserves the existing lane table below it. The real full-size map can be dropped into the map asset slot later; this slice ships with generated SVG territory shapes so the UI and click behavior are functional now.

**Tech Stack:** Static HTML/CSS/JS, Node test runner, existing AG-GS engine globals.

---

### Task 1: Geography-Aware Trade Engine

**Files:**
- Modify: `site/js/engine/trade.js`
- Test: `tools/trade-v3-network.test.js`

- [x] **Step 1: Write failing geography tests**

Add tests that create `data.tradeNetwork.geography` and assert a nearby/regional partner outranks a far partner with similar economics, while a strong coastal hub keeps broader reach.

- [x] **Step 2: Run trade tests and verify failure**

Run: `node --test tools\trade-v3-network.test.js`
Expected: the new geography assertions fail before implementation.

- [x] **Step 3: Implement geography helpers**

Add normalized geography parsing, distance scoring, route scoring, and apply the multiplier inside `laneAffinity`.

- [x] **Step 4: Run trade tests and verify pass**

Run: `node --test tools\trade-v3-network.test.js tools\population-model.test.js`
Expected: all tests pass.

### Task 2: Trade Map Data And Public Canvas

**Files:**
- Create: `site/js/app/tradeMap.js`
- Modify: `site/index.html`
- Modify: `site/admin/index.html`
- Modify: `site/app.js`
- Modify: `site/styles.css`

- [x] **Step 1: Add trade map helper**

Create a browser global with seed territory shapes, route curve generation, selected-nation map state, and fallback notices for the missing real map asset.

- [x] **Step 2: Load helper before app**

Add `js/app/tradeMap.js` before `app.js` on public and admin pages.

- [x] **Step 3: Render canvas above lane table**

Update `renderTradeNetwork()` to render the unified map canvas, clickable SVG territories, route overlays, selected nation summary, public/admin mode labels, and the existing trade generator/table as detail tools.

- [x] **Step 4: Add territory click handling**

Handle `[data-trade-map-nation]` clicks by updating `state.selectedNation` and rerendering.

- [x] **Step 5: Style the canvas**

Add responsive CSS so the map is the dominant surface, not a card stack, with slim controls and floating selected-country details.

### Task 3: Verification And Commit

**Files:**
- Modify: `site/js/app/config.js` only if a label needs adjustment.

- [x] **Step 1: Run syntax checks**

Run: `node --check site\app.js`, `node --check site\js\app\tradeMap.js`, `node --check site\js\engine\trade.js`.

- [x] **Step 2: Run tests**

Run: `node --test tools\trade-v3-network.test.js tools\population-model.test.js`

- [x] **Step 3: Browser smoke**

Start a local static server, open the admin Trade Network view, verify the map renders, territory click changes the selected nation, and console has no errors.

- [x] **Step 4: Commit**

Commit the implementation with a focused message.

