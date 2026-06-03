# Precision Trade Lane Skeleton Design

## Goal

Upgrade trade routes from coarse zone-to-zone A* paths into precise, major shipping lanes that look like intentional world trade corridors. The route should behave like the user sketch: ports feed into shared ocean lanes, lanes bend around continents, lanes pass through straits/canals when appropriate, and the visible line avoids land.

This is trade-only. It does not add war, blockade simulation UI, or separate geography lore.

## Recommended Approach

Use a hybrid lane skeleton:

- Keep the player-drawn sea zone and strait overlay as the authority for water, straits, and canals.
- Add a lightweight set of reusable lane spine points for major world shipping corridors.
- Connect each nation to one or more port/coast anchors.
- Snap a route from origin port to the nearest useful lane spine, follow the lane spine across the map, then exit toward the destination port.
- Use A* over this combined graph so blocked straits, denied land transit, and future route penalties can still change the chosen path.

This avoids two bad extremes: pure grid A* that looks robotic, and fully manual country-to-country routes that become impossible to maintain.

## Data Model

The route graph should have three node types:

- `port`: nation-specific coast or port anchor.
- `lane`: major ocean corridor waypoint.
- `chokepoint`: strait or canal node from the sea-zone manifest.

Edges should include:

- port-to-lane access edges,
- lane-to-lane corridor edges,
- lane-to-chokepoint edges,
- chokepoint-to-lane exit edges.

Each edge stores map distance, zone/chokepoint ids, and a route class such as `open_ocean`, `coastal`, `strait`, or `canal`.

## Route Solving

For each trade lane between two countries:

1. Select the best origin anchor and destination anchor.
2. Run A* through the lane skeleton.
3. Apply penalties for canals, narrow straits, long detours, blocked access, sanctions, or tariff-heavy partner routes.
4. Return a smoothed `routePath` for rendering and a structured list of route nodes/zones for calculations.

The route solver should continue falling back to the current route mesh if the lane skeleton is missing or incomplete.

## Rendering

The map renderer should draw the solved `routePath` as a smooth SVG path, not a country-to-country arc. The path can use cubic smoothing between lane points, but the coordinates must still follow the solved route order.

Routes should visually reuse shared corridors. If ten nations use the same major shipping lane, their lines should overlap or run very close together instead of each inventing a separate arc.

## Admin Control

The first version should be code-side/manual, not a new bulky editor. The graph can live in a static JS manifest so we can tune the major corridors quickly. Later, an admin tool can let the user draw lane spines directly on the map.

The manifest should make it easy to:

- add a lane waypoint,
- connect two lane waypoints,
- mark a route segment as passing through a strait/canal,
- tune route cost without changing country trade stats.

## Testing

Tests should cover:

- A* prefers a multi-point lane spine over a direct but invalid/expensive route.
- Routes expose `routePath`, route node ids, zones, chokepoints, and distance.
- The renderer uses the precision path instead of drawing fallback arcs.
- The system still works if a country lacks a custom port anchor.

## Success Criteria

The trade map should feel like a grand-strategy logistics map. A route from Solara toward Orinian/Volgastan should visibly travel along the southern ocean corridor, bend through the central sea, then rise toward the eastern continent instead of drawing a simple arc across the map.
