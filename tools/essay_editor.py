#!/usr/bin/env python3
"""
Local visual editor for Briggs Kellogg essays.

Run from the repo root (or anywhere):

    python3 tools/essay_editor.py

then open http://localhost:8910 in a browser.

It lists every essay, loads each one with its real styling, lets you edit
the prose and footnotes inline, manage footnote archetype colors, and Save
(which rewrites the essay's .essay-body / .essay-notes blocks in place and
makes a git commit — optionally a push).

Nothing else in the file is touched: only the inner HTML of the
`.essay-body` and `.essay-notes` containers is replaced.
"""

import codecs
import json
import os
import re
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PORT = 8910
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ESSAYS_DIR = os.path.join(REPO_ROOT, "essays")
DISPATCHES = os.path.join(REPO_ROOT, "dispatches.js")
HERE = os.path.dirname(os.path.abspath(__file__))


# ----------------------------------------------------------------------------
# Essay file helpers
# ----------------------------------------------------------------------------

def list_essays():
    """Every essays/<slug>/index.html that is an actual essay (has data-essay-id)."""
    out = []
    for name in sorted(os.listdir(ESSAYS_DIR)):
        path = os.path.join(ESSAYS_DIR, name, "index.html")
        if not os.path.isfile(path):
            continue
        text = read(path)
        m = re.search(r'data-essay-id="([^"]+)"', text)
        if not m:
            continue  # essays/index.html (archive) has no essay id
        eid = m.group(1)
        title = title_of(text, eid)
        out.append({"id": eid, "title": title, "slug": name})
    return out


def title_of(text, fallback):
    m = re.search(r'<h1 class="essay-title">(.*?)</h1>', text, re.S)
    if m:
        return re.sub(r"\s+", " ", m.group(1)).strip()
    return fallback


def path_for(eid):
    for name in os.listdir(ESSAYS_DIR):
        path = os.path.join(ESSAYS_DIR, name, "index.html")
        if not os.path.isfile(path):
            continue
        if re.search(r'data-essay-id="%s"' % re.escape(eid), read(path)):
            return path
    return None


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def find_div(text, class_name):
    """Return (inner_start, inner_end) for the first <div class="...class_name...">,
    matching nested <div> correctly. None if not found."""
    open_pat = re.compile(
        r'<div\b[^>]*\bclass="[^"]*\b' + re.escape(class_name) + r'\b[^"]*"[^>]*>'
    )
    m = open_pat.search(text)
    if not m:
        return None
    inner_start = m.end()
    token = re.compile(r"<div\b|</div>")
    depth = 1
    i = inner_start
    while True:
        tm = token.search(text, i)
        if not tm:
            return None
        if tm.group() == "</div>":
            depth -= 1
            if depth == 0:
                return (inner_start, tm.start())
        else:
            depth += 1
        i = tm.end()


def extract_style(text):
    m = re.search(r"<style>(.*?)</style>", text, re.S)
    return m.group(1) if m else ""


def get_essay_payload(eid):
    path = path_for(eid)
    if not path:
        return None
    text = read(path)
    body = find_div(text, "essay-body")
    notes = find_div(text, "essay-notes")
    if not body or not notes:
        return None
    return {
        "id": eid,
        "title": title_of(text, eid),
        "style": extract_style(text),
        "bodyInner": text[body[0]:body[1]],
        "notesInner": text[notes[0]:notes[1]],
        "meta": get_meta(eid) or {"slug": eid, "title": "", "image": "", "status": "draft"},
    }


def do_save(payload):
    """Apply body/footnotes + metadata edits, return a change/commit summary."""
    eid = payload.get("id", "")
    path = path_for(eid)
    if not path:
        raise ValueError("unknown essay id: %s" % eid)
    text = read(path)
    cur = get_meta(eid) or {"title": "", "image": "", "status": "draft"}
    meta = payload.get("meta") or {}

    body_span = find_div(text, "essay-body")
    notes_span = find_div(text, "essay-notes")
    if not body_span or not notes_span:
        raise ValueError("could not locate essay body/notes")

    new_body = payload.get("bodyInner")
    new_notes = payload.get("notesInner")
    body_changed = new_body is not None and new_body != text[body_span[0]:body_span[1]]
    notes_changed = new_notes is not None and new_notes != text[notes_span[0]:notes_span[1]]

    new_title = (meta.get("title") or "").strip()
    new_image = (meta.get("image") or "").strip()
    new_status = (meta.get("status") or "").strip()
    new_slug = (meta.get("slug") or eid).strip()
    title_changed = new_title and new_title != cur.get("title", "")
    image_changed = new_image and new_image != cur.get("image", "")
    status_changed = new_status and new_status != cur.get("status", "")
    slug_changed = new_slug and new_slug != eid

    # ---- rewrite the essay HTML (only the parts that changed) ----
    if notes_changed:
        ns = find_div(text, "essay-notes")
        text = text[:ns[0]] + new_notes + text[ns[1]:]
    if body_changed:
        bs = find_div(text, "essay-body")
        text = text[:bs[0]] + new_body + text[bs[1]:]
    if title_changed or image_changed:
        text = set_html_meta(text,
                             title=new_title if title_changed else None,
                             image=new_image if image_changed else None)
    if slug_changed:
        text = set_html_slug(text, new_slug)

    html_touched = body_changed or notes_changed or title_changed or image_changed or slug_changed
    if html_touched:
        write(path, text)

    # ---- rename the folder if the slug changed ----
    if slug_changed:
        old_dir = os.path.dirname(path)
        new_dir = os.path.join(ESSAYS_DIR, new_slug)
        if os.path.exists(new_dir):
            raise ValueError("a folder essays/%s already exists" % new_slug)
        mv = git("mv", os.path.relpath(old_dir, REPO_ROOT),
                 os.path.relpath(new_dir, REPO_ROOT))
        if mv.returncode != 0:
            raise ValueError("git mv failed: " + mv.stderr)

    # ---- dispatches.js metadata ----
    fields = {}
    if title_changed:
        fields["title"] = js_escape(new_title)
    if image_changed:
        fields["image"] = js_escape(new_image)
    if status_changed:
        fields["status"] = new_status
    if slug_changed:
        fields["id"] = new_slug
        fields["url"] = "/essays/%s/" % new_slug
    if fields:
        set_dispatch_fields(eid, fields)

    # ---- build the automated commit message ----
    parts = []
    if body_changed:
        parts.append("revise text")
    if notes_changed:
        parts.append("update footnotes")
    if title_changed:
        parts.append('retitle to \u201C%s\u201D' % new_title)
    if image_changed:
        parts.append("swap lead image")
    if status_changed:
        parts.append("bump to %s" % version_short(new_status))
    if slug_changed:
        parts.append("rename slug \u2192 %s" % new_slug)

    message = ("Edit %s: %s" % (eid, "; ".join(parts))) if parts else None
    return {"changed": bool(parts), "message": message, "newSlug": new_slug if slug_changed else eid}


def git(*args):
    return subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, text=True
    )


# ----------------------------------------------------------------------------
# Metadata: dispatches.js entry + the matching spots in the essay HTML
# ----------------------------------------------------------------------------

def js_unescape(s):
    """'You\\u2019re' -> 'You’re' (dispatches.js string -> display text)."""
    try:
        return codecs.decode(s, "unicode_escape")
    except Exception:
        return s


def js_escape(s):
    """Display text -> dispatches.js single-quoted string body (\\uXXXX style)."""
    out = []
    for ch in s:
        o = ord(ch)
        if ch == "'":
            out.append("\\'")
        elif ch == "\\":
            out.append("\\\\")
        elif o < 128:
            out.append(ch)
        else:
            out.append("\\u%04X" % o)
    return "".join(out)


def html_entities(s):
    """Display text -> HTML using the source's named-entity house style."""
    return (
        s.replace("&", "&amp;")
        .replace("\u2019", "&rsquo;").replace("\u2018", "&lsquo;")
        .replace("\u201C", "&ldquo;").replace("\u201D", "&rdquo;")
        .replace("\u2014", "&mdash;").replace("\u2013", "&ndash;")
        .replace("\u2026", "&hellip;")
    )


def dispatch_span(text, eid):
    """(start, end) of the {...} object whose id is eid, in dispatches.js text."""
    m = re.search(r"id:\s*'%s'" % re.escape(eid), text)
    if not m:
        return None
    start = text.rfind("{", 0, m.start())
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return (start, i + 1)
    return None


def block_get(block, field):
    m = re.search(field + r":\s*'((?:\\.|[^'\\])*)'", block)
    return m.group(1) if m else None


def block_set(block, field, raw_value):
    """Replace the first top-level `field: '...'` value (raw_value pre-escaped)."""
    pat = re.compile(field + r"(:\s*')(?:\\.|[^'\\])*(')")
    return pat.sub(lambda m: field + m.group(1) + raw_value + m.group(2), block, count=1)


def get_meta(eid):
    dtext = read(DISPATCHES)
    span = dispatch_span(dtext, eid)
    if not span:
        return None
    block = dtext[span[0]:span[1]]
    return {
        "slug": eid,
        "title": js_unescape(block_get(block, "title") or ""),
        "image": block_get(block, "image") or "",
        "status": block_get(block, "status") or "draft",
        "number": (re.search(r"number:\s*(\d+)", block) or [None, "?"])[1]
        if re.search(r"number:\s*(\d+)", block) else "?",
        "date": js_unescape(block_get(block, "date") or ""),
    }


def set_dispatch_fields(eid, fields):
    """fields: {name: raw_escaped_value}. Updates the entry in dispatches.js."""
    dtext = read(DISPATCHES)
    span = dispatch_span(dtext, eid)
    if not span:
        raise ValueError("no dispatches.js entry for %s" % eid)
    block = dtext[span[0]:span[1]]
    for name, val in fields.items():
        block = block_set(block, name, val)
    write(DISPATCHES, dtext[:span[0]] + block + dtext[span[1]:])


def version_short(status):
    if not status or status == "draft":
        return "v0"
    if status == "finalized":
        return "final"
    if status.startswith("patch-"):
        return "v" + status[6:]
    return status


def list_images():
    out = []
    for f in sorted(os.listdir(REPO_ROOT)):
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            out.append("/" + f)
    assets = os.path.join(REPO_ROOT, "assets")
    for root, _dirs, files in os.walk(assets):
        for f in sorted(files):
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                rel = os.path.relpath(os.path.join(root, f), REPO_ROOT)
                out.append("/" + rel.replace(os.sep, "/"))
    return out


def set_html_meta(text, title=None, image=None):
    if title is not None:
        th = html_entities(title)
        text = re.sub(r'(<h1 class="essay-title">).*?(</h1>)',
                      lambda m: m.group(1) + th + m.group(2), text, flags=re.S, count=1)
        text = re.sub(r'(<title>).*?(</title>)',
                      lambda m: m.group(1) + th + " &mdash; Briggs Kellogg" + m.group(2), text, count=1)
        text = re.sub(r'(<meta property="og:title" content=").*?(">)',
                      lambda m: m.group(1) + th + " &mdash; Briggs Kellogg" + m.group(2), text, count=1)
    if image is not None:
        text = re.sub(r'(<figure class="essay-figure">.*?<img src=")[^"]*(")',
                      lambda m: m.group(1) + image + m.group(2), text, flags=re.S, count=1)
    return text


def set_html_slug(text, new_slug):
    text = re.sub(r'(data-essay-id=")[^"]*(")',
                  lambda m: m.group(1) + new_slug + m.group(2), text, count=1)
    text = re.sub(r'(<meta property="og:url" content="https://briggskellogg\.com/essays/)[^"/]*(/?">)',
                  lambda m: m.group(1) + new_slug + m.group(2), text, count=1)
    text = re.sub(r'(content="https://briggskellogg\.com/assets/og/)[^"]*(\.jpg")',
                  lambda m: m.group(1) + new_slug + m.group(2), text)
    return text


# ----------------------------------------------------------------------------
# HTTP server
# ----------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass  # quiet

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body)
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/", "/index.html"):
            return self._send(200, read(os.path.join(HERE, "essay_editor.html")),
                              "text/html; charset=utf-8")
        if u.path == "/api/essays":
            return self._send(200, list_essays())
        if u.path == "/api/images":
            return self._send(200, list_images())
        if u.path == "/api/essay":
            eid = parse_qs(u.query).get("id", [""])[0]
            data = get_essay_payload(eid)
            if not data:
                return self._send(404, {"error": "not found"})
            return self._send(200, data)
        # serve repo assets (images) so the iframe preview can show photos
        rel = u.path.lstrip("/")
        fpath = os.path.join(REPO_ROOT, rel)
        if os.path.isfile(fpath) and os.path.abspath(fpath).startswith(REPO_ROOT):
            ext = os.path.splitext(fpath)[1].lower()
            ctype = {
                ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
                ".js": "text/javascript",
            }.get(ext, "application/octet-stream")
            with open(fpath, "rb") as f:
                return self._send(200, f.read(), ctype)
        return self._send(404, {"error": "not found"})

    def do_POST(self):
        u = urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except Exception as e:
            return self._send(400, {"error": "bad json: %s" % e})

        if u.path == "/api/save":
            try:
                outcome = do_save(payload)
            except Exception as e:
                return self._send(400, {"error": str(e)})
            result = {
                "committed": False, "pushed": False, "log": "",
                "message": outcome["message"], "newSlug": outcome["newSlug"],
            }
            if not outcome["changed"]:
                result["log"] = "no changes to commit"
                return self._send(200, result)
            add = git("add", "-A", "essays", "dispatches.js")
            if add.returncode != 0:
                result["log"] = add.stderr
                return self._send(500, result)
            cm = git("commit", "-m", outcome["message"])
            result["committed"] = cm.returncode == 0
            result["log"] = (cm.stdout + cm.stderr).strip()
            if result["committed"] and payload.get("push"):
                ps = git("push", "origin", "HEAD")
                result["pushed"] = ps.returncode == 0
                result["log"] += "\n" + (ps.stdout + ps.stderr).strip()
            return self._send(200, result)

        return self._send(404, {"error": "not found"})


def main():
    os.chdir(REPO_ROOT)
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("Essay editor running at  http://localhost:%d" % PORT)
    print("Repo root:", REPO_ROOT)
    print("Press Ctrl+C to stop.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
