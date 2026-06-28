#!/usr/bin/env python3
"""Keep newsletter box visible on confirm; button + inputs gray out in place."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HTML_FILES = [
    ROOT / "essays/index.html",
    ROOT / "essays/selection/index.html",
    ROOT / "essays/the-students-are-right/index.html",
    ROOT / "essays/americans-europeans-and-autism-oh-my/index.html",
]

OLD_CSS = """        .essay-newsletter.is-confirmed {
            margin-bottom: 2.4rem;
            padding: 0;
            border: none;
            background: transparent;
        }
        .essay-newsletter.is-confirmed .nc {
            display: none;
        }
        .subscribe-confirmed {
            position: relative;
            left: 50%;
            z-index: 2;
            transform: translateX(-50%);
            padding: 0.52rem 1.15rem 0.58rem;
            background: var(--bg);
            border: 1px solid var(--ink-12);
            font-family: var(--font-mono);
            font-size: 0.52rem;
            letter-spacing: 0.24em;
            text-transform: lowercase;
            color: var(--ink-50);
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
        }
        .subscribe-confirmed.is-visible {
            animation: subscribeConfirmedIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .subscribe-confirmed .sc {
            position: absolute;
            width: 6px;
            height: 6px;
            pointer-events: none;
        }
        .subscribe-confirmed .sc-tl { top: -1px; left: -1px; border-top: 1px solid var(--border-50); border-left: 1px solid var(--border-50); }
        .subscribe-confirmed .sc-tr { top: -1px; right: -1px; border-top: 1px solid var(--border-50); border-right: 1px solid var(--border-50); }
        .subscribe-confirmed .sc-bl { bottom: -1px; left: -1px; border-bottom: 1px solid var(--border-50); border-left: 1px solid var(--border-50); }
        .subscribe-confirmed .sc-br { bottom: -1px; right: -1px; border-bottom: 1px solid var(--border-50); border-right: 1px solid var(--border-50); }
        @keyframes subscribeConfirmedIn {
            from {
                opacity: 0;
                transform: translate(-50%, 6px);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .subscribe-confirmed.is-visible {
                animation: none;
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }"""

NEW_CSS = """        .essay-subscribe.is-confirmed .subscribe-label {
            color: var(--ink-25);
        }
        .essay-subscribe.is-confirmed .subscribe-row {
            border-color: var(--ink-12);
        }
        .essay-subscribe.is-confirmed .subscribe-row:focus-within {
            border-color: var(--ink-12);
        }
        .essay-subscribe.is-confirmed input[type="email"] {
            color: var(--ink-25);
            cursor: not-allowed;
        }
        .essay-subscribe.is-confirmed input[type="email"]::placeholder {
            color: var(--ink-12);
        }
        .essay-subscribe.is-confirmed button,
        .essay-subscribe.is-confirmed button:disabled {
            color: var(--ink-25);
            background: var(--ink-06);
            cursor: default;
            pointer-events: none;
        }
        .essay-subscribe.is-confirmed button:hover {
            color: var(--ink-25);
            background: var(--ink-06);
        }"""

CONFIRMED_HTML = """                <div class="subscribe-confirmed" data-subscribe-confirmed hidden role="status">
                    <span class="sc sc-tl"></span>
                    <span class="sc sc-tr"></span>
                    <span class="sc sc-bl"></span>
                    <span class="sc sc-br"></span>
                    confirmed
                </div>
"""


def patch_file(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    original = text

    if OLD_CSS in text:
        text = text.replace(OLD_CSS, NEW_CSS)

    if CONFIRMED_HTML in text:
        text = text.replace(CONFIRMED_HTML, "")

    text = text.replace("/assets/subscribe.js?v=5", "/assets/subscribe.js?v=6")

    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"patched: {path.relative_to(ROOT)}")
    else:
        print(f"unchanged: {path.relative_to(ROOT)}")


def main() -> None:
    for path in HTML_FILES:
        patch_file(path)


if __name__ == "__main__":
    main()
