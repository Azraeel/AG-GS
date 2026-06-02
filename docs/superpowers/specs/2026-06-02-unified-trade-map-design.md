# Unified Trade Map Design

## Summary

AG-GS should add a trade-only world map experience built around the full-size world map. The map becomes a shared public/admin surface: players can browse nations and visible trade routes, while admins can edit geography, ports, route corridors, and special trade relationships. This phase does not include War Room tooling, combat overlays, fronts, naval zones, or air zones.

The core design is:

```text
full-size world map image
+ extracted country territory hitmap
+ nation geography metadata
+ trade lane overlays
+ admin trade editing tools
```

The same geography data should power the UI and the Trade V3 math so trade is no longer a geography-blind global spreadsheet.

## Goals

- Let users click actual territories on the world map, not separate markers.
- Show a unified trade canvas instead of separate panel-heavy pages.
- Make trade lanes feel geographically plausible: regional trade first, major ocean hubs still global, small inland states less globally connected.
- Give admins tools to correct the model without editing a 50 by 50 matrix.
- Preserve manual control for lore-critical relationships such as one country exporting most of its goods to one partner.
- Keep the public and admin experiences on the same underlying map/data model.

## Non-Goals

- No war front, naval war, air war, blockade-combat, or War Room implementation in this phase.
- No full resource/sector economy model yet.
- No requirement to perfectly trace every border before the feature can ship.
- No 50 by 50 manual trade matrix as the primary workflow.

## User Experience

### Public Trade Map

Public users get the full-map trade experience through the existing Trade Network view. The first implementation should evolve that tab into the map canvas rather than adding another disconnected page. Deep links can be added later, but they are not required for the first build. A compact top control changes the visible trade layer, such as:

- World overview
- Trade routes
- Import partners
- Export partners
- Ports and chokepoints

Clicking a country selects that territory and opens a slim floating command surface with the nation name, trade flow, major partners, route exposure, trade policy, and port access. This should feel like an overlay attached to the map, not a separate boxed dashboard.

### Admin Trade Map

Admins use the same Trade Network canvas from the admin app. Admin mode adds editing controls:

- Match extracted country shapes to nation ids.
- Adjust country anchors and route labels.
- Set coastal/landlocked status.
- Set port strength and chokepoint access.
- Generate import/export lanes from geography.
- Lock or override important trade relationships.
- Preview how geography changes affect trade before applying.

The admin workflow should focus on correcting high-impact exceptions instead of forcing manual entry for every possible country pair.

## Map And Shape Architecture

The visible map should remain a normal image asset. Interactivity comes from a separate territory hit layer above it.

```text
map image -> shape extractor -> territory polygons -> nation id mapping -> clickable SVG/canvas layer
```

The first extraction pass should use the full-size map image to find colored country regions and convert them into rough polygons. Borders, labels, islands, and tiny enclaves will need cleanup, so the extractor should produce editable output rather than pretending to be perfect.

Each territory shape should store:

- `id`: stable shape id
- `nationId`: existing AG-GS nation id after mapping
- `path`: SVG path or polygon points
- `bbox`: bounding box for hit testing and viewport fitting
- `centroid`: map coordinate used for labels and route curves
- `confidence`: extraction confidence
- `needsReview`: whether admin cleanup is recommended

If a nation has multiple islands or disconnected territories, those shapes can share one `nationId`.

## Geography Data

Each nation should get a small geography profile that is reusable by the trade model:

```js
{
  nationId: "solara",
  region: "southwest_ocean",
  x: 84,
  y: 912,
  coastal: true,
  landlocked: false,
  portStrength: 9,
  chokepoints: ["solara_basin"],
  routeAccess: ["ocean", "deep_ocean"],
  tradeHubWeight: 1.25
}
```

Coordinates should use normalized map space, not screen pixels, so zooming and responsive layouts do not change the data. The map UI can convert normalized coordinates into viewport coordinates.

## Trade Model Integration

The trade engine should add a geography multiplier to the existing economic and policy model.

```text
lane score =
  economic fit
  x import/export demand fit
  x policy/tariff fit
  x geography fit
  x route access fit
  x manual override
```

The geography fit should reward:

- Same region or nearby region trade.
- Coastal-to-coastal trade when both countries have port access.
- Major trade hubs connecting distant regions.
- Land routes between adjacent inland states.
- Admin-defined corridors and chokepoints.

The geography fit should penalize:

- Distant countries with weak route access.
- Landlocked countries trying to maintain many distant partners.
- Isolated countries without strong ports or hub status.
- Routes blocked by targeted embargo or sanctions.

This should reduce the current issue where every nation appears to trade with every major hub, while still allowing large powers and port-heavy economies to have broad global reach.

## Trade Lanes And Overrides

Trade lanes should be generated from the model, then editable.

Generated lane data should track:

- importer
- exporter
- import share
- export share
- flow
- route type
- route distance
- route confidence
- source: generated or manual
- locked: true/false

Manual overrides should be used for lore-important cases:

- "Khalindar exports 80% to Xanaqu"
- "Aurendale tariffs only Solara"
- "This country has one dominant regional partner"
- "This route should be hidden or treated as indirect"

Overrides should change the lane without requiring admins to edit every other country in the matrix. The generator should rebalance the remaining unlocked share around the locked lanes.

## UI Principles

- The map is the page, not a header above a table.
- Details should appear as floating overlays, inline route labels, and compact command controls.
- Avoid separate panels that make the page feel like several dashboards glued together.
- Use thin modern controls for mode switching and filters.
- Public and admin views should look like the same product; admin adds tools instead of changing the entire layout.
- Territory hover should highlight the exact country shape and show the nation name.
- Selected trade lanes should be visually distinct from background lanes.

## Error Handling

- If a country shape cannot be mapped confidently, show it in admin review mode and keep it non-public until mapped.
- If a nation has no shape yet, it can still appear in tables and search, but the map should mark it as unmapped.
- If the full map image fails to load, fall back to the current trade network/table view.
- If generated lanes create impossible or strange results, the admin UI should expose low-confidence lanes for review.
- If shape extraction produces fragmented islands or label artifacts, the cleanup tool should allow merging, deleting, or remapping shapes.

## Testing

Tests should cover:

- Shape data validation: every public shape has a valid `nationId`.
- Geography normalization: coordinates stay within the map bounds.
- Trade generation: nearby/connected nations rank higher than distant unconnected nations when economic factors are similar.
- Hub behavior: major port economies can still maintain broader reach.
- Override behavior: locked lanes preserve requested shares and rebalance the rest.
- UI interaction: clicking a territory selects the correct nation.
- Public/admin permissions: public users cannot edit map geography or trade overrides.

## Implementation Phases

### Phase 1: Asset And Data Foundation

Add the map asset, geography schema, shape schema, and a first extraction/cleanup workflow. The goal is a validated data file with clickable country shapes tied to existing nation ids.

### Phase 2: Public Trade Canvas

Build the public map view with territory hover, territory selection, route overlays, and compact trade details.

### Phase 3: Admin Trade Editing

Add admin-only tools for mapping shapes, editing geography metadata, locking trade lanes, and previewing generated changes.

### Phase 4: Geography-Aware Trade Generation

Update Trade V3 so geography affects lane ranking, visible direct partners, import/export concentration, and generated route shares.

### Phase 5: Polish And Calibration

Tune the math against known world examples, improve route rendering, add search/filter ergonomics, and make low-confidence lanes easy for admins to review.
