#!/usr/bin/env python3
"""Apply performance bundle updates to site HTML pages."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ESSAY_SCRIPT = """\
    <script src="/dispatches.js?v=4"></script>
    <script src="/assets/dispatch-ui.js?v=1" defer></script>
    <script src="/assets/site-chrome.js?v=1" defer></script>
    <script src="/assets/footnotes.js?v=1" defer></script>"""

ESSAYS_INDEX_SCRIPT = """\
    <script src="/dispatches.js?v=4"></script>
    <script src="/assets/dispatch-ui.js?v=1" defer></script>
    <script src="/assets/site-chrome.js?v=1" defer></script>"""

HOME_SCRIPT = """\
    <script src="/assets/home.js?v=1" defer></script>
    <script src="/assets/site-chrome.js?v=1" defer></script>
    <script src="/dispatches.js?v=4"></script>
    <script src="/assets/dispatch-ui.js?v=1" defer></script>"""

INLINE_BLOCK = re.compile(
    r'<script src="/dispatches\.js\?v=3"></script>\s*<script>.*?</script>\s*',
    re.DOTALL,
)

HOME_INLINE = re.compile(
    r'    <script>\s*\(function\(\) \{\s*var carousel = document\.querySelector.*?</script>\s*'
    r'<script src="dispatches\.js\?v=3"></script>\s*<script>.*?Featured essay.*?</script>\s*',
    re.DOTALL,
)

ARCHETYPE = re.compile(r'/assets/archetypes/(instinct|logic|psyche)\.png\?v=2')
HERO_LAZY = re.compile(
    r'(<figure class="essay-figure">\s*<span class="fc fc-tl"></span>.*?\n\s*<img src="[^"]+" alt="[^"]*") loading="lazy">',
    re.DOTALL,
)
FEATURED_LAZY = re.compile(
    r'(<img id="featured-img" src="[^"]+" alt="[^"]*") loading="lazy">'
)


def patch_file(path: Path, kind: str) -> None:
    text = path.read_text(encoding="utf-8")
    original = text

    text = ARCHETYPE.sub(r"/assets/archetypes/\1.webp?v=3", text)

    if kind == "essay":
        text = HERO_LAZY.sub(r'\1 fetchpriority="high" decoding="async">', text)
        text = INLINE_BLOCK.sub(ESSAY_SCRIPT + "\n", text, count=1)
    elif kind == "essays-index":
        text = INLINE_BLOCK.sub(ESSAYS_INDEX_SCRIPT + "\n", text, count=1)
        text = re.sub(r'\s*<script src="/assets/subscribe\.js\?v=4"></script>\s*', "\n", text)
    elif kind == "home":
        text = FEATURED_LAZY.sub(r'\1 fetchpriority="high" decoding="async">', text)
        text = HOME_INLINE.sub(HOME_SCRIPT + "\n", text, count=1)

    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"updated {path.relative_to(ROOT)}")
    else:
        print(f"no changes {path.relative_to(ROOT)}")


def main() -> None:
    patch_file(ROOT / "index.html", "home")
    patch_file(ROOT / "essays/index.html", "essays-index")
    for essay in (ROOT / "essays").glob("*/index.html"):
        patch_file(essay, "essay")


if __name__ == "__main__":
    main()
