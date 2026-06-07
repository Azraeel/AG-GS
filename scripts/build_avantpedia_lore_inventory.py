import argparse
import json
import os
import re
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path


IGNORED_PREFIXES = ("File_", "Template_", "Module_", "Category_")
LINK_RE = re.compile(r"\[\[([^|\]#]+)")
YEAR_RE = re.compile(r"\b(1[0-9]{3}|20[0-2][0-9])\b")
CATEGORY_RE = re.compile(r"\[\[Category:([^\]|]+)")

CANON_WARNING_PATTERNS = {
    "western_alliance": re.compile(r"\bWestern Alliance\b", re.I),
    "maritime_equity_protocol": re.compile(r"\bMaritime Equity Protocol\b", re.I),
    "aggpi_1995_foundation": re.compile(r"AGGPI\s+was\s+founded\s+in\s+1995|Established.*1995", re.I | re.S),
    "solara_not_united": re.compile(r"Solara.*not socially unified|Solara.*politically divided", re.I | re.S),
}

COUNTRY_WORDS = (
    "Empire",
    "Republic",
    "Federation",
    "Union",
    "Kingdom",
    "Duchy",
    "Tsardom",
    "Sultanate",
    "Emirates",
    "State",
    "Commonwealth",
    "Caliphate",
)

IDEA_WORDS = (
    "ism",
    "Cult",
    "Temple",
    "Religion",
    "Language",
    "Alphabet",
    "Principles",
    "Manifesto",
)

EVENT_WORDS = (
    "War",
    "Campaign",
    "Invasion",
    "Treaty",
    "Conference",
    "Confederence",
    "Coup",
    "Revolution",
)


def title_from_path(path: Path) -> str:
    return path.stem.replace("_", " ")


def slugify(title: str) -> str:
    slug = title.lower()
    slug = re.sub(r"['’]", "", slug)
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def classify_page(title: str, text: str) -> str:
    if any(word in title for word in EVENT_WORDS):
        return "event"
    if any(word in title for word in COUNTRY_WORDS) or "{{Infobox country" in text or "{{infobox country" in text:
        return "country"
    if any(word in title for word in IDEA_WORDS):
        return "culture-idea"
    if "Private Military" in title or "Organization" in title or "AGGPI" in title:
        return "organization"
    if title.startswith("List of"):
        return "index"
    return "article"


def request_json(url: str, headers: dict[str, str] | None = None) -> dict:
    request = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(request, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_live_slugs() -> tuple[set[str] | None, str]:
    access_id = os.environ.get("AGGS_CF_ACCESS_CLIENT_ID")
    access_secret = os.environ.get("AGGS_CF_ACCESS_CLIENT_SECRET")
    attempts = []

    if access_id and access_secret:
        attempts.append((
            "admin API with Cloudflare Access service token",
            "https://aggsworld.net/admin/api/state",
            {
                "CF-Access-Client-Id": access_id,
                "CF-Access-Client-Secret": access_secret,
            },
        ))

    attempts.append(("public API", "https://aggsworld.net/api/state", {}))

    errors = []
    payload = None
    for label, url, headers in attempts:
        try:
            payload = request_json(url, headers)
            break
        except urllib.error.HTTPError as error:
            errors.append(f"{label}: HTTP {error.code}")
        except Exception as error:
            errors.append(f"{label}: {error.__class__.__name__}")

    if payload is None:
        return None, "unavailable (" + "; ".join(errors) + ")"

    pages = payload.get("data", {}).get("wiki", {}).get("pages", {})
    slugs = {
        page.get("slug") or slug
        for slug, page in pages.items()
        if isinstance(page, dict) and not page.get("archived")
    }
    return slugs, f"available ({len(slugs)} non-archived wiki pages)"


def page_records(page_dir: Path, live_slugs: set[str] | None) -> list[dict]:
    records = []
    for path in sorted(page_dir.glob("*.wiki")):
        if path.name.startswith(IGNORED_PREFIXES):
            continue

        text = path.read_text(encoding="utf-8", errors="replace")
        title = title_from_path(path)
        years = sorted({int(match) for match in YEAR_RE.findall(text)})
        links = sorted({
            link.strip()
            for link in LINK_RE.findall(text)
            if not link.strip().startswith(("File:", "Category:", "Template:", "Module:"))
        })
        categories = sorted(set(CATEGORY_RE.findall(text)))
        warnings = [
            key
            for key, pattern in CANON_WARNING_PATTERNS.items()
            if pattern.search(text)
        ]
        record = {
            "title": title,
            "slug": slugify(title),
            "sourcePath": str(path).replace("\\", "/"),
            "bytes": path.stat().st_size,
            "class": classify_page(title, text),
            "years": years,
            "pre1995Years": [year for year in years if year <= 1994],
            "links": links,
            "categories": categories,
            "canonWarnings": warnings,
            "alreadyLive": None if live_slugs is None else slugify(title) in live_slugs,
        }
        records.append(record)
    return records


def relevance_score(record: dict) -> int:
    title = record["title"]
    score = 0
    score += min(record["bytes"] // 1000, 12)
    if record["pre1995Years"]:
        score += 10
    if any(1937 <= year <= 1994 for year in record["years"]):
        score += 8
    if any(word in title for word in ("Vesperan", "Solara", "Khalindar", "Zhensanov", "AGGPI")):
        score += 6
    if record["class"] == "event":
        score += 5
    if record["canonWarnings"]:
        score += 3
    return score


def build_backlog(records: list[dict]) -> dict:
    for record in records:
        record["score"] = relevance_score(record)

    relevant = [
        record for record in records
        if record["pre1995Years"]
        or any(word in record["title"] for word in ("Vesperan", "Solara", "Khalindar", "Zhensanov", "AGGPI"))
        or record["class"] == "event"
    ]
    relevant.sort(key=lambda record: (-record["score"], record["title"]))

    link_counts = Counter()
    source_links = defaultdict(list)
    existing_titles = {record["title"] for record in records}
    existing_slugs = {record["slug"] for record in records}

    for record in relevant:
        for link in record["links"]:
            link_title = link.replace("_", " ")
            if link_title not in existing_titles and slugify(link_title) not in existing_slugs:
                link_counts[link_title] += 1
                source_links[link_title].append(record["title"])

    bridge_candidates = [
        {
            "title": title,
            "mentions": count,
            "sources": source_links[title][:8],
            "reason": "missing linked page in 1994-and-back source set",
        }
        for title, count in link_counts.most_common(80)
    ]

    seeded_bridge_pages = [
        {
            "title": "Post-Avant Great War settlement",
            "reason": "Needed to connect the 1949 imperial collapse, reparations disputes, decolonization, and the 1990 Solara-Khalindar War.",
        },
        {
            "title": "Continuation War",
            "reason": "Mentioned by the Avant Great War page as the 1949-1951 rogue Vesperan resistance period.",
        },
        {
            "title": "United Alignment of Nations",
            "reason": "Primary winning coalition of the Avant Great War; needed before country/event pages can coherently reference postwar occupation policy.",
        },
        {
            "title": "Imperial Pact",
            "reason": "Primary opposing coalition in the Avant Great War and framework for Vesperan-aligned states.",
        },
        {
            "title": "Imperial Council",
            "reason": "Canon decision body for Khalindar and useful for Solara-Khalindar War linked context.",
        },
        {
            "title": "Khalindarian reparations dispute",
            "reason": "Direct trigger for the Solara-Khalindar War and bridge from the Avant Great War settlement to 1990.",
        },
        {
            "title": "Albroke",
            "reason": "Opening strike location and missing anchor for Solara-Khalindar War geography.",
        },
        {
            "title": "Congrave",
            "reason": "Central Solaran city/capital theater for the 1990-1994 war.",
        },
        {
            "title": "Vesperan occupation system",
            "reason": "Needed to connect Vesperan Empire, Veszprem, Malonia, Belcanto, Mariposa, and post-1949 liberation pages.",
        },
    ]

    return {
        "relevantPages": relevant,
        "missingLinkedPages": bridge_candidates,
        "seededBridgePages": seeded_bridge_pages,
    }


def write_markdown(records: list[dict], backlog: dict, live_status: str, output_path: Path) -> None:
    lines = []
    lines.append("# Avantpedia 1994-And-Back Porting Inventory")
    lines.append("")
    lines.append("Generated from `Miraheza-Avant-Wiki/pages`. This is a source/backlog document, not live AGGSWorld publication.")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Main/source articles scanned: {len(records)}")
    lines.append(f"- Pages with 1994-and-back relevance: {len(backlog['relevantPages'])}")
    lines.append(f"- Live AGGSWorld check: {live_status}")
    if all(record["alreadyLive"] is not None for record in records):
        lines.append(f"- Already live on AGGSWorld: {sum(1 for record in records if record['alreadyLive'])}")
    lines.append("")

    class_counts = Counter(record["class"] for record in records)
    lines.append("## Source Page Classes")
    lines.append("")
    for key, count in sorted(class_counts.items()):
        lines.append(f"- {key}: {count}")
    lines.append("")

    lines.append("## Highest Priority Source Pages")
    lines.append("")
    lines.append("| Priority | Source page | Class | Years | Live? | Canon warnings |")
    lines.append("|---:|---|---|---|---|---|")
    for idx, record in enumerate(backlog["relevantPages"][:35], start=1):
        years = ", ".join(map(str, record["years"][:12]))
        if len(record["years"]) > 12:
            years += ", ..."
        warnings = ", ".join(record["canonWarnings"]) if record["canonWarnings"] else "-"
        live = "unknown" if record["alreadyLive"] is None else ("yes" if record["alreadyLive"] else "no")
        lines.append(f"| {idx} | `{record['title']}` | {record['class']} | {years or '-'} | {live} | {warnings} |")
    lines.append("")

    lines.append("## Seeded Bridge Pages To Draft")
    lines.append("")
    for item in backlog["seededBridgePages"]:
        lines.append(f"- **{item['title']}**: {item['reason']}")
    lines.append("")

    lines.append("## Frequent Missing Linked Pages")
    lines.append("")
    lines.append("| Mentions | Missing page | Source examples |")
    lines.append("|---:|---|---|")
    for item in backlog["missingLinkedPages"][:40]:
        sources = ", ".join(item["sources"])
        lines.append(f"| {item['mentions']} | `{item['title']}` | {sources} |")
    lines.append("")

    lines.append("## Canon Warnings To Resolve Before Drafting")
    lines.append("")
    warning_records = [record for record in records if record["canonWarnings"]]
    if not warning_records:
        lines.append("- None found.")
    else:
        for record in warning_records:
            lines.append(f"- `{record['title']}`: {', '.join(record['canonWarnings'])}")
    lines.append("")

    lines.append("## Proposed First Batch")
    lines.append("")
    lines.append("Draft these as local AGGSWorld-ready pages first, then review before live publish:")
    lines.append("")
    first_batch = [
        "Avant Great War",
        "Vesperan Empire",
        "Post-Avant Great War settlement",
        "Continuation War",
        "United Alignment of Nations",
        "Imperial Pact",
        "Solaran-Khalindarian Conference of 1940",
        "Khalindarian reparations dispute",
        "Imperial Council",
        "Avant Garde Global Peace Initiative",
    ]
    for title in first_batch:
        lines.append(f"- {title}")
    lines.append("")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a local Avantpedia lore-port inventory.")
    parser.add_argument("--page-dir", type=Path, default=Path("Miraheza-Avant-Wiki/pages"))
    parser.add_argument("--out-dir", type=Path, default=Path("Miraheza-Avant-Wiki/porting"))
    args = parser.parse_args()

    live_slugs, live_status = fetch_live_slugs()
    records = page_records(args.page_dir, live_slugs)
    backlog = build_backlog(records)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    (args.out_dir / "lore_inventory.json").write_text(
        json.dumps({"liveStatus": live_status, "records": records, "backlog": backlog}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    write_markdown(records, backlog, live_status, args.out_dir / "1994_backlog.md")

    print(f"Scanned {len(records)} source articles.")
    print(f"Relevant 1994-and-back pages: {len(backlog['relevantPages'])}.")
    print(f"Live AGGSWorld check: {live_status}.")
    print(f"Wrote {args.out_dir / 'lore_inventory.json'}")
    print(f"Wrote {args.out_dir / '1994_backlog.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
