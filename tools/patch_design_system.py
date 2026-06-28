#!/usr/bin/env python3
"""Align site fonts and light-mode colors with the unified design system."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HTML_FILES = [
    ROOT / "index.html",
    ROOT / "essays/index.html",
    ROOT / "essays/selection/index.html",
    ROOT / "essays/the-students-are-right/index.html",
    ROOT / "essays/americans-europeans-and-autism-oh-my/index.html",
]

GOOGLE_FONTS = (
    r'<link href="https://fonts\.googleapis\.com/css2\?[^"]+" rel="stylesheet">'
)

FONT_REPLACEMENTS = [
    ("'Courier Prime', 'Courier New', Courier, monospace", "var(--font-mono)"),
    (
        "'Newsreader', 'IM Fell English', Georgia, 'Times New Roman', serif",
        "var(--font-body)",
    ),
    ("'Newsreader', 'IM Fell English', Georgia, serif", "var(--font-body)"),
    ("'Newsreader', Georgia, 'Times New Roman', serif", "var(--font-body)"),
    ("'Newsreader', var(--font-display)", "var(--font-body)"),
    ("'IM Fell English', Georgia, 'Times New Roman', serif", "var(--font-display)"),
    ("'IM Fell English', Georgia, serif", "var(--font-display)"),
]

LIGHT_COLOR_REPLACEMENTS = [
    ('content="#E9DFC9"', 'content="#F4F0E4"'),
    ("--bg:        #E9DFC9;", "--bg:        #F4F0E4;"),
    ("--bg-raised: #F3ECDB;", "--bg-raised: #FAF8F2;"),
    ("--border:    #717D85;", "--border:    #9DA3AB;"),
    ("--border-80: rgba(113, 125, 133, 1.0);", "--border-80: rgba(157, 163, 171, 1.0);"),
    ("--border-50: rgba(113, 125, 133, 0.60);", "--border-50: rgba(157, 163, 171, 0.60);"),
    ("--border-25: rgba(113, 125, 133, 0.36);", "--border-25: rgba(157, 163, 171, 0.36);"),
    ("--border-20: rgba(113, 125, 133, 0.28);", "--border-20: rgba(157, 163, 171, 0.28);"),
    ("--border-12: rgba(113, 125, 133, 0.16);", "--border-12: rgba(157, 163, 171, 0.16);"),
    ("--border-30: rgba(113, 125, 133, 0.42);", "--border-30: rgba(157, 163, 171, 0.42);"),
    ("--light-glow:    rgba(113, 125, 133, 0.8);", "--light-glow:    rgba(157, 163, 171, 0.8);"),
    ("rgba(113, 125, 133,", "rgba(157, 163, 171,"),
    ("background: #E9DFC9;", "background: #F4F0E4;"),
]


def design_system_link(path: Path) -> str:
    href = "/assets/design-system.css?v=1" if "essays" in path.parts else "assets/design-system.css?v=1"
    return f'<link rel="stylesheet" href="{href}">'


def patch_file(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    original = text

    import re

    text = re.sub(GOOGLE_FONTS, design_system_link(path), text)

    for old, new in FONT_REPLACEMENTS:
        text = text.replace(old, new)

    if "essays" in path.parts:
        for old, new in LIGHT_COLOR_REPLACEMENTS:
            text = text.replace(old, new)

    if text == original:
        print(f"unchanged: {path.relative_to(ROOT)}")
    else:
        path.write_text(text, encoding="utf-8")
        print(f"patched:   {path.relative_to(ROOT)}")


def main() -> None:
    for path in HTML_FILES:
        patch_file(path)

    editor = ROOT / "tools/essay_editor.html"
    if editor.exists():
        text = editor.read_text(encoding="utf-8")
        text = text.replace("background: #E9DFC9;", "background: #F4F0E4;")
        text = text.replace("'Courier New', monospace", "var(--font-mono)")
        if "design-system.css" not in text:
            text = text.replace(
                "<title>Essay editor",
                '<link rel="stylesheet" href="/assets/design-system.css?v=1">\n<title>Essay editor',
            )
        editor.write_text(text, encoding="utf-8")
        print("patched:   tools/essay_editor.html")


if __name__ == "__main__":
    main()
