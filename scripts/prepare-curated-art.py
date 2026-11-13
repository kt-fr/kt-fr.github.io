#!/usr/bin/env python3
"""Fetch third-party, human-authored public-domain/CC0 SVGs for this personal site.

Original files are downloaded without generated redraws.  Provenance and the
upstream license are in public/img/bench/CURATED-SOURCES.md.  Failed downloads
never replace existing art.  We render downloaded SVGs as external <img> files,
not inline HTML.  Inspect each original before publication.

Use: python3 scripts/prepare-curated-art.py
"""
from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/img/bench/curated"


def commons(filename):
    return "https://commons.wikimedia.org/wiki/Special:Redirect/file/" + quote(filename)

# Hand-curated from verified source pages, not AI-generated artwork.
ART = {
    "football": (commons("Soccerball.svg"), "https://commons.wikimedia.org/wiki/File:Soccerball.svg"),
    "volleyball": (commons("Volleyball (transparent).svg"), "https://commons.wikimedia.org/wiki/File:Volleyball_(transparent).svg"),
    "shuttle": ("https://freesvg.org/download/99145", "https://freesvg.org/shuttlecock"),
    "paddles": ("https://freesvg.org/download/97261", "https://freesvg.org/paddle"),
    "knight": (commons("Chess white knight.svg"), "https://commons.wikimedia.org/wiki/File:Chess_white_knight.svg"),
    "dumbbells": ("https://freesvg.org/download/66771", "https://freesvg.org/dumbbell-drawing"),
}


def validate_svg(data: bytes) -> None:
    if not (100 <= len(data) <= 2_000_000):
        raise ValueError("Unexpected SVG file size")
    # Basic SVG hygiene; source SVGs are used only as <img> assets.
    low = data.lower()
    for unsafe in (b"<script", b"<foreignobject", b"<iframe", b"javascript:", b"<image", b"<!entity", b"<!doctype"):
        if unsafe in low:
            raise ValueError(f"SVG contains blocked feature: {unsafe.decode()}")
    root = ET.fromstring(data)
    if root.tag.rsplit("}",1)[-1].lower() != "svg":
        raise ValueError("Response does not contain an SVG document")
    for element in root.iter():
        for key, value in element.attrib.items():
            # Block potentially active SVG attributes and externally loaded resources.
            k = key.rsplit("}",1)[-1].lower()
            if k.startswith("on") or (k == "href" and not value.lstrip().startswith("#")):
                raise ValueError(f"SVG contains blocked attribute: {k}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="List art sources without downloading")
    parser.add_argument("--refresh", action="store_true", help="Redownload existing assets")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    failed = []
    for name,(url,source) in ART.items():
        path = OUT / f"{name}.svg"
        if args.list:
            print(f"{name:12} {source}")
            continue
        if path.exists() and not args.refresh:
            print(f"{name:12} cached: {path.relative_to(ROOT)}")
            continue
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0 (Kartik Tagore personal portfolio; licensed art review)", "Accept": "image/svg+xml,application/octet-stream;q=0.9,*/*;q=0.5"})
            with urlopen(request, timeout=22) as response:
                data = response.read(2_000_001)
            validate_svg(data)
            path.write_bytes(data)
            print(f"{name:12} saved: {path.relative_to(ROOT)} ({len(data):,} bytes)")
        except (HTTPError, URLError, TimeoutError, ValueError, ET.ParseError, OSError) as e:
            failed.append(name)
            print(f"{name:12} not downloaded: {e}", file=sys.stderr)
            print(f"   Manual download: {source}", file=sys.stderr)
    if not args.list:
        print(f"\n{len(ART)-len(failed)}/{len(ART)} curated SVGs ready; old art remains as fallback.")
        print("Review source art and licenses in public/img/bench/CURATED-SOURCES.md")
        print("Restart `pnpm dev` after installing new assets.")
    # Useful even when one host fails: no broken references are introduced.
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
