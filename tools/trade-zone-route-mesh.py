import json
import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ZONES_SOURCE = ROOT / "site" / "js" / "app" / "tradeZones.js"
OVERLAY_SOURCE = ROOT / "site" / "assets" / "ag-trade-zones.png"
OUTPUT = ROOT / "site" / "js" / "app" / "tradeRouteMesh.js"


ZONE_PATTERN = re.compile(
    r'\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*type:\s*"([^"]+)",\s*color:\s*"#([0-9a-fA-F]{6})",\s*chokepoint:\s*(true|false)\s*\}'
)

FALLBACK_ZONE_POSITIONS = {
    "karthalis": {"x": 86.0, "y": 8.0},
    "newberry_strait": {"x": 9.2, "y": 37.4},
    "corvessa": {"x": 97.0, "y": 39.0},
    "mare_solthar": {"x": 94.0, "y": 30.0},
    "caldran_ocean": {"x": 23.0, "y": 82.0},
    "crownward": {"x": 99.0, "y": 70.0},
    "sea_of_xanaqu": {"x": 38.0, "y": 74.0},
    "the_storm_expanse": {"x": 56.0, "y": 82.0},
}


def title_error(message):
    raise SystemExit(f"trade-zone-route-mesh: {message}")


def read_zones():
    source = ZONES_SOURCE.read_text(encoding="utf-8")
    zones = []
    for match in ZONE_PATTERN.finditer(source):
        zones.append(
            {
                "id": match.group(1),
                "label": match.group(2),
                "type": match.group(3),
                "color": f"#{match.group(4).lower()}",
                "chokepoint": match.group(5) == "true",
            }
        )
    if not zones:
        title_error("no zones found in tradeZones.js")
    return zones


def rgb_from_hex(value):
    clean = value.lstrip("#")
    return tuple(int(clean[index : index + 2], 16) for index in (0, 2, 4))


def sample_overlay(zones):
    image = Image.open(OVERLAY_SOURCE).convert("RGB")
    width, height = image.size
    pixels = image.load()
    by_rgb = {rgb_from_hex(zone["color"]): zone for zone in zones}
    stats = {
        zone["id"]: {
            "sum_x": 0,
            "sum_y": 0,
            "count": 0,
            "min_x": width,
            "min_y": height,
            "max_x": 0,
            "max_y": 0,
        }
        for zone in zones
    }

    for y in range(height):
        for x in range(width):
            zone = by_rgb.get(pixels[x, y])
            if not zone:
                continue
            entry = stats[zone["id"]]
            entry["sum_x"] += x
            entry["sum_y"] += y
            entry["count"] += 1
            entry["min_x"] = min(entry["min_x"], x)
            entry["min_y"] = min(entry["min_y"], y)
            entry["max_x"] = max(entry["max_x"], x)
            entry["max_y"] = max(entry["max_y"], y)

    nodes = []
    for zone in zones:
        entry = stats[zone["id"]]
        if entry["count"] <= 0:
            fallback = FALLBACK_ZONE_POSITIONS.get(zone["id"])
            if not fallback:
                title_error(f"zone color {zone['color']} for {zone['id']} was not found in {OVERLAY_SOURCE.name}")
            x = fallback["x"]
            y = fallback["y"]
            sample_count = 0
            bounds = {"x": round(x - 0.5, 3), "y": round(y - 0.5, 3), "width": 1, "height": 1}
            source = "fallback-anchor"
        else:
            x = round((entry["sum_x"] / entry["count"]) / width * 100, 3)
            y = round((entry["sum_y"] / entry["count"]) / height * 100, 3)
            sample_count = entry["count"]
            bounds = {
                "x": round(entry["min_x"] / width * 100, 3),
                "y": round(entry["min_y"] / height * 100, 3),
                "width": round((entry["max_x"] - entry["min_x"] + 1) / width * 100, 3),
                "height": round((entry["max_y"] - entry["min_y"] + 1) / height * 100, 3),
            }
            source = "overlay-color"
        nodes.append({
            "id": f"zone:{zone['id']}",
            "zoneId": zone["id"],
            "label": zone["label"],
            "type": zone["type"],
            "color": zone["color"],
            "chokepoint": zone["chokepoint"],
            "x": x,
            "y": y,
            "sampleCount": sample_count,
            "source": source,
            "bounds": bounds,
        })
    return width, height, nodes


def distance(left, right):
    dx = left["x"] - right["x"]
    dy = left["y"] - right["y"]
    return (dx * dx + dy * dy) ** 0.5


def edge_cost(left, right):
    base = distance(left, right)
    if left["type"] == "strait" or right["type"] == "strait":
        return base * 0.82
    return base


def build_edges(nodes):
    edge_map = {}
    for node in nodes:
        ranked = sorted(
            (other for other in nodes if other["id"] != node["id"]),
            key=lambda other: distance(node, other),
        )
        for other in ranked[:5]:
            key = tuple(sorted([node["id"], other["id"]]))
            chokepoints = [
                candidate["zoneId"]
                for candidate in (node, other)
                if candidate["type"] == "strait" or candidate.get("chokepoint")
            ]
            edge_map[key] = {
                "from": key[0],
                "to": key[1],
                "mode": "maritime",
                "cost": round(edge_cost(node, other), 3),
                "chokepoints": chokepoints,
            }
    return sorted(edge_map.values(), key=lambda edge: (edge["from"], edge["to"]))


def write_manifest(width, height, nodes, edges):
    manifest = {
        "version": "map-derived-overlay-v1",
        "sourceAsset": "assets/ag-trade-zones.png",
        "width": width,
        "height": height,
        "nodes": nodes,
        "edges": edges,
    }
    body = json.dumps(manifest, indent=2)
    OUTPUT.write_text(
        "(function () {\n"
        "  const root = typeof window !== \"undefined\" ? window : globalThis;\n\n"
        f"  root.AGGS_TRADE_ROUTE_MESH = {body};\n"
        "})();\n",
        encoding="utf-8",
    )


def main():
    zones = read_zones()
    width, height, nodes = sample_overlay(zones)
    edges = build_edges(nodes)
    write_manifest(width, height, nodes, edges)
    print(f"Wrote {OUTPUT.relative_to(ROOT)} with {len(nodes)} nodes and {len(edges)} edges")


if __name__ == "__main__":
    main()
