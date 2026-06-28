#!/usr/bin/env python3
"""Fix archetype cache bust, subscribe confirmed markup/CSS, script tags."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CONFIRMED_BOX = """
                <div class="subscribe-confirmed" data-subscribe-confirmed hidden role="status">
                    <span class="sc sc-tl"></span>
                    <span class="sc sc-tr"></span>
                    <span class="sc sc-bl"></span>
                    <span class="sc sc-br"></span>
                    confirmed
                </div>"""

CSS_OLD = """        .essay-newsletter.is-confirmed {
            margin-bottom: 2.4rem;
        }
        .subscribe-confirmed {
            position: absolute;
            left: 50%;
            bottom: 0;
            transform: translate(-50%, calc(100% - 1px));
            padding: 0.52rem 1.15rem 0.58rem;
            background: var(--bg);
            border: 1px solid var(--ink-12);
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            font-size: 0.52rem;
            letter-spacing: 0.24em;
            text-transform: lowercase;
            color: var(--ink-50);
            opacity: 0;
            pointer-events: none;
        }"""

CSS_NEW = """        .essay-newsletter.is-confirmed {
            margin-bottom: 2.4rem;
            padding-top: 1.15rem;
            padding-bottom: 0;
        }
        .essay-newsletter.is-confirmed .nc-bl,
        .essay-newsletter.is-confirmed .nc-br {
            opacity: 0;
        }
        .subscribe-confirmed {
            position: absolute;
            left: 50%;
            bottom: 0;
            z-index: 2;
            transform: translate(-50%, calc(100% - 1px));
            padding: 0.52rem 1.15rem 0.58rem;
            background: var(--bg);
            border: 1px solid var(--ink-12);
            font-family: 'Courier Prime', 'Courier New', Courier, monospace;
            font-size: 0.52rem;
            letter-spacing: 0.24em;
            text-transform: lowercase;
            color: var(--ink-50);
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
        }"""

ESSAY_SCRIPTS = """    <script src="/dispatches.js?v=4"></script>
    <script src="/assets/dispatch-ui.js?v=1" defer></script>
    <script src="/assets/site-chrome.js?v=1" defer></script>
    <script src="/assets/footnotes.js?v=1" defer></script>
    <script src="/assets/subscribe.js?v=5"></script>"""


def patch_file(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    original = text

    text = text.replace("/assets/archetypes/instinct.webp?v=3", "/assets/archetypes/instinct.webp?v=4")
    text = text.replace("/assets/archetypes/logic.webp?v=3", "/assets/archetypes/logic.webp?v=4")
    text = text.replace("/assets/archetypes/psyche.webp?v=3", "/assets/archetypes/psyche.webp?v=4")
    text = text.replace("/assets/subscribe.js?v=4", "/assets/subscribe.js?v=5")

    if "essay-newsletter" in text and CSS_OLD in text:
        text = text.replace(CSS_OLD, CSS_NEW)

    if "data-subscribe-form" in text and "data-subscribe-confirmed" not in text:
        text = text.replace(
            "                </form>\n            </section>",
            "                </form>" + CONFIRMED_BOX + "\n            </section>",
            1,
        )

    if "/assets/footnotes.js?v=1" in text:
        text = re.sub(
            r'\s*<script src="/dispatches\.js\?v=4"></script>\s*'
            r'<script src="/assets/dispatch-ui\.js\?v=1" defer></script>\s*'
            r'<script src="/assets/site-chrome\.js\?v=1" defer></script>\s*'
            r'<script src="/assets/footnotes\.js\?v=1" defer></script>\s*'
            r'<script src="/assets/subscribe\.js\?v=[45]"></script>',
            "\n" + ESSAY_SCRIPTS + "\n",
            text,
            count=1,
        )

    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"updated {path.relative_to(ROOT)}")


def main() -> None:
    for path in [
        ROOT / "index.html",
        ROOT / "essays/index.html",
        ROOT / "essays/selection/index.html",
        ROOT / "essays/the-students-are-right/index.html",
        ROOT / "essays/americans-europeans-and-autism-oh-my/index.html",
    ]:
        patch_file(path)


if __name__ == "__main__":
    main()
