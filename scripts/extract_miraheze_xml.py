import argparse
import gzip
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


KEEP_NAMESPACES = {
    "0": "Main",
    "6": "File",
    "10": "Template",
    "12": "Help",
    "14": "Category",
    "828": "Module",
}


def safe_filename(title: str) -> str:
    name = title.strip().replace(" ", "_")
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    name = name.strip("._") or "Untitled"
    return f"{name[:180]}.wiki"


def open_dump(path: Path):
    if path.suffix.lower() == ".gz":
        return gzip.open(path, "rb")
    return path.open("rb")


def unique_path(output_dir: Path, filename: str, used: set[str]) -> Path:
    path = output_dir / filename
    if filename not in used and not path.exists():
        used.add(filename)
        return path

    stem = Path(filename).stem
    suffix = Path(filename).suffix
    counter = 2
    while True:
        candidate = f"{stem[:170]}_{counter}{suffix}"
        path = output_dir / candidate
        if candidate not in used and not path.exists():
            used.add(candidate)
            return path
        counter += 1


def extract_pages(dump_path: Path, output_dir: Path, clean: bool = False) -> tuple[int, int, dict[str, int]]:
    if clean and output_dir.exists():
        shutil.rmtree(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    counts_by_namespace = {namespace: 0 for namespace in KEEP_NAMESPACES}
    count = 0
    skipped = 0
    used_filenames: set[str] = set()

    with open_dump(dump_path) as handle:
        context = ET.iterparse(handle, events=("start", "end"))
        _, root = next(context)

        ns_prefix = ""
        if root.tag.startswith("{"):
            ns_prefix = root.tag.split("}")[0] + "}"

        for event, elem in context:
            if event != "end" or elem.tag != f"{ns_prefix}page":
                continue

            title_el = elem.find(f"{ns_prefix}title")
            ns_el = elem.find(f"{ns_prefix}ns")
            revision_el = elem.find(f"{ns_prefix}revision")
            text_el = revision_el.find(f"{ns_prefix}text") if revision_el is not None else None

            title = title_el.text if title_el is not None and title_el.text else "Untitled"
            namespace = ns_el.text if ns_el is not None and ns_el.text else "0"
            text = text_el.text if text_el is not None and text_el.text else ""

            if namespace in KEEP_NAMESPACES:
                filename = safe_filename(title)
                path = unique_path(output_dir, filename, used_filenames)
                path.write_text(text, encoding="utf-8")
                count += 1
                counts_by_namespace[namespace] += 1
            else:
                skipped += 1

            elem.clear()
            root.clear()

    return count, skipped, counts_by_namespace


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract useful pages from a Miraheze/MediaWiki XML dump.")
    parser.add_argument("dump_path", type=Path, help="Path to the MediaWiki XML dump, optionally .gz")
    parser.add_argument("output_dir", type=Path, help="Directory where .wiki files should be written")
    parser.add_argument("--clean", action="store_true", help="Delete the output directory before extracting")
    args = parser.parse_args()

    if not args.dump_path.exists():
        print(f"Dump not found: {args.dump_path}", file=sys.stderr)
        return 1

    count, skipped, counts_by_namespace = extract_pages(args.dump_path, args.output_dir, clean=args.clean)

    print(f"Extracted {count} pages.")
    print(f"Skipped {skipped} pages from ignored namespaces.")
    print(f"Output folder: {args.output_dir}")
    print("Kept namespaces:")
    for namespace, label in KEEP_NAMESPACES.items():
        print(f"  {namespace} {label}: {counts_by_namespace[namespace]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
