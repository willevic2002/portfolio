#!/usr/bin/env python3
"""Static checks (no browser). Prints PASS/FAIL per AC id; exit 1 on any FAIL."""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
results = []

def check(ac, name, fn):
    try:
        err = fn()
    except Exception as e:  # missing file etc.
        err = f"{type(e).__name__}: {e}"
    results.append(err is None or err is True)
    print(f"{'PASS' if results[-1] else 'FAIL'} {ac} {name}" + ("" if results[-1] else f" -- {err}"))

def load(p): return json.loads((ROOT / p).read_text())
def assert_(cond, msg): return None if cond else msg

KINDS = {"chip", "board", "robot", "book", "box"}
YM = re.compile(r"^\d{4}(-\d{2})?$")

def projects_schema():
    ps = load("data/projects.json")
    if not isinstance(ps, list): return "not a list"
    ids = [p.get("id") for p in ps]
    for p in ps:
        if not re.fullmatch(r"[a-z0-9-]+", str(p.get("id", ""))): return f"bad id {p.get('id')}"
        for k in ("title", "summary"):
            if not isinstance(p.get(k), str) or not p[k]: return f"{p['id']}: {k}"
        if not (isinstance(p.get("tech"), list) and all(isinstance(t, str) for t in p["tech"])): return f"{p['id']}: tech"
        if "kind" in p and not isinstance(p["kind"], str): return f"{p['id']}: kind"
        if "year" in p and not isinstance(p["year"], int): return f"{p['id']}: year"
    if len(set(ids)) != len(ids): return "duplicate ids"

def projects_urls():
    for p in load("data/projects.json"):
        if "url" in p and not str(p["url"]).startswith("https://"): return f"{p['id']}: url not https"

def projects_count():
    return assert_(len(load("data/projects.json")) <= 12, ">12 projects (D4: warn => console line)")

def projects_ac4():
    ps = load("data/projects.json")
    return assert_(len(ps) == 5 and any("url" not in p for p in ps), "expect 5 projects, mower without url")

def entry_ok(e):
    if not isinstance(e, dict): return "entry not object"
    if not (YM.match(str(e.get("start", ""))) or str(e.get("start", "")).startswith("TODO")): return f"bad start {e.get('start')}"
    if e.get("end") is not None and not (YM.match(str(e["end"])) or str(e["end"]).startswith("TODO")): return f"bad end {e['end']}"
    for k in ("title", "org"):
        if not isinstance(e.get(k), str): return f"entry {k}"

def cv_schema():
    c = load("data/cv.json")
    for k in ("name", "title", "about"):
        if not isinstance(c.get(k), str) or not c[k]: return f"missing {k}"
    if not isinstance(c.get("contact"), list) or not c["contact"]: return "contact"
    for x in c["contact"]:
        if not (isinstance(x.get("label"), str) and isinstance(x.get("url"), str)): return "contact item"
    for sec in ("education", "experience"):
        if not isinstance(c.get(sec), list): return sec
        for e in c[sec]:
            r = entry_ok(e)
            if r: return f"{sec}: {r}"
    if not isinstance(c.get("skills"), list): return "skills"
    for s in c["skills"]:
        if not (isinstance(s.get("group"), str) and isinstance(s.get("items"), list)): return "skills item"
    for l in c.get("languages", []):
        if not (isinstance(l.get("name"), str) and isinstance(l.get("level"), str)): return "languages item"

def cv_urls():
    for x in load("data/cv.json")["contact"]:
        if not re.match(r"^(https://|mailto:|tel:)", x["url"]): return f"contact url {x['url']}"

def sources():
    return [p for ext in ("html", "js", "css") for p in ROOT.rglob(f"*.{ext}")
            if not any(part in ("tests", "node_modules", ".git", "design", "docs") for part in p.relative_to(ROOT).parts)]

ABS = [
    re.compile(r"""(?:src|href)\s*=\s*["']/(?!/)"""),
    re.compile(r"""fetch\(\s*["'`]/(?!/)"""),
    re.compile(r"""\bimport\s*(?:\(|[^;'"]*?from)?\s*["'`]/(?!/)"""),
    re.compile(r"""url\(\s*["']?/(?!/)"""),
    re.compile(r"""@import\s+["']/(?!/)"""),
]
def no_abs():
    bad = []
    for p in sources():
        for i, line in enumerate(p.read_text().splitlines(), 1):
            if any(r.search(line) for r in ABS): bad.append(f"{p.relative_to(ROOT)}:{i}")
    return assert_(not bad, "root-absolute: " + ", ".join(bad))

def importmap():
    html = (ROOT / "index.html").read_text()
    m = re.search(r'<script[^>]*type=["\']importmap["\'][^>]*>(.*?)</script>', html, re.S)
    if not m: return "no importmap"
    imp = json.loads(m.group(1))["imports"]
    a, b = imp.get("three", ""), imp.get("three/addons/", "")
    if not ("jsdelivr" in a and "three@0.170.0" in a): return f"three -> {a}"
    if not ("jsdelivr" in b and "three@0.170.0" in b): return f"three/addons/ -> {b}"

def no_build():
    return assert_(not (ROOT / "package.json").exists() or "dependencies" not in json.loads((ROOT / "package.json").read_text()), "package.json has runtime deps")

def readme():
    t = (ROOT / "README.md").read_text().lower()
    return assert_("projects.json" in t and "```json" in t and "pages" in t, "README must mention projects.json, a json example, and Pages")

def lang():
    return assert_(re.search(r"<html[^>]*\blang=[\"']sv[\"']", (ROOT / "index.html").read_text()), 'no <html lang="sv">')

check("AC-4", "projects.json schema, unique ids", projects_schema)
check("AC-8", "project urls https", projects_urls)
check("AC-2", "<=12 projects in test data", projects_count)
check("AC-4", "5 initial projects, mower has no url", projects_ac4)
check("AC-1", "cv.json schema", cv_schema)
check("AC-1", "cv contact urls", cv_urls)
check("AC-8", "no root-absolute src/href/fetch/import", no_abs)
check("AC-9", "importmap pins three@0.170.0 (three + addons/)", importmap)
check("AC-9", "no package.json runtime deps", no_build)
check("AC-8", ".nojekyll exists", lambda: assert_((ROOT / ".nojekyll").exists(), "missing"))
check("AC-18", "README documents adding a project", readme)
check("AC-15", '<html lang="sv">', lang)

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
