#!/usr/bin/env python3
"""Browser tests: headless chromium against the site served from a /portfolio/ sub-path.
Prints PASS/FAIL/SKIP per AC id; exit 1 on any FAIL."""
import json, os, re, shutil, subprocess, sys, tempfile, threading, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tests" / "out"
CHROME = shutil.which("chromium") or "/usr/bin/chromium"
BASE_FLAGS = ["--headless", "--enable-logging=stderr", "--enable-unsafe-swiftshader",
              "--use-angle=swiftshader", "--virtual-time-budget=12000"]
CDN = "https://cdn.jsdelivr.net/npm/three@0.170.0/package.json"
PROJECTS = json.loads((ROOT / "data/projects.json").read_text())
CV = json.loads((ROOT / "data/cv.json").read_text())
results = []  # True / False / None(skip)

def report(ac, name, ok, msg=""):
    results.append(ok)
    tag = "SKIP" if ok is None else "PASS" if ok else "FAIL"
    print(f"{tag} {ac} {name}" + (f" -- {msg}" if msg and ok is not True else ""))

tmp = Path(tempfile.mkdtemp(prefix="portfolio-qa-"))
(tmp / "site").mkdir()
(tmp / "site" / "portfolio").symlink_to(ROOT)
logf = open(tmp / "server.log", "w+")
srv = subprocess.Popen([sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "-d", str(tmp / "site")],
                       stdout=logf, stderr=subprocess.STDOUT)
# http.server logs to stderr; discover port from its startup line
port = None
for _ in range(50):
    logf.seek(0)
    m = re.search(r"port (\d+)", logf.read())
    if m: port = m.group(1); break
    time.sleep(0.1)
if not port:
    print("FAIL setup could not start http.server"); sys.exit(1)
URL = f"http://127.0.0.1:{port}/portfolio/"
os.environ["PYTHONUNBUFFERED"] = "1"

def chrome(args, url, tag):
    """Run chromium; returns (stdout, stderr). Fresh profile per run."""
    prof = tempfile.mkdtemp(dir=tmp, prefix="prof-")
    p = subprocess.run([CHROME, f"--user-data-dir={prof}", *BASE_FLAGS, *args, url],
                       capture_output=True, text=True, timeout=120)
    (OUT / f"{tag}.stderr.log").write_text(p.stderr)
    return p.stdout, p.stderr

def console_lines(err): return [l for l in err.splitlines() if ":CONSOLE" in l]

def is_site_404(l):
    # Ignore only headless Chromium's own probe of the server-root /favicon.ico (page declares data: icon).
    return " 404 " in l and '"GET /favicon.ico ' not in l


assert is_site_404('"GET /portfolio/js/x.js HTTP/1.1" 404 -')
assert not is_site_404('"GET /favicon.ico HTTP/1.1" 404 -')
assert is_site_404('"GET /portfolio/favicon.ico HTTP/1.1" 404 -')


def server_404s():
    logf.seek(0)
    return [l for l in logf.read().splitlines() if is_site_404(l)]

def attr(dom, name, tag="html"):
    m = re.search(rf"<{tag}\b[^>]*\b{name}=\"([^\"]*)\"", dom)
    return m.group(1) if m else None

def run_dom(args, suffix, tag):
    out, err = chrome(["--dump-dom", *args], URL + suffix, tag)
    return out, console_lines(err)

def fixture(name, text):
    """Copy of the site (symlinks, except data/) with data/projects.json = text; returns its URL."""
    site = tmp / "site" / name / "portfolio"
    (site / "data").mkdir(parents=True)
    for p in ROOT.iterdir():
        if p.name != "data": (site / p.name).symlink_to(p)
    (site / "data" / "cv.json").symlink_to(ROOT / "data" / "cv.json")
    (site / "data" / "projects.json").write_text(text)
    return f"http://127.0.0.1:{port}/{name}/portfolio/"

def fx_run(name, text, hash_=""):
    u = fixture(name, text)
    out, err = chrome(["--dump-dom"], u + hash_, "fx-" + name)
    return out, console_lines(err)

def mk(n): return [{"id": f"p{i}", "title": f"proj {i}", "kind": "board", "summary": "s", "tech": ["x"], "year": 2026} for i in range(n)]
def items(dom):
    m = re.search(r"<[^>]*id=\"room-canvas\"[^>]*>", dom)
    d = re.search(r'data-items="(\d+)"', m.group(0)) if m else None
    return int(d.group(1)) if d else None
def nbuttons(dom): return len(re.findall(r"<button\b[^>]*data-project-id", dom))

try:
    cdn_ok = subprocess.run(["curl", "-sfI", "-m", "8", CDN], capture_output=True).returncode == 0
    names = ["backwall", "desk", "monitor", "pc", "drawers", "chair", "lamp", "window", "radiator", "shelf"]

    # 1 WebGL
    if not cdn_ok:
        for ac in ("AC-2", "AC-17", "AC-3", "AC-11", "AC-14"):
            report(ac, "WebGL run (jsdelivr unreachable)", None)
    else:
        dom, con = run_dom([], "", "webgl")
        report("AC-1", "data-cv=ready, CV name present", attr(dom, "data-cv") == "ready" and CV["name"] in dom,
               f"data-cv={attr(dom,'data-cv')}")
        report("AC-9", "data-room=ready", attr(dom, "data-room") == "ready", f"data-room={attr(dom,'data-room')}")
        nbtn = len(re.findall(r"<button\b[^>]*data-project-id", dom))
        report("AC-2", "list buttons == len(projects)", nbtn == len(PROJECTS), f"{nbtn} vs {len(PROJECTS)}")
        m = re.search(r"<[^>]*id=\"room-canvas\"[^>]*>", dom)
        tagtxt = m.group(0) if m else ""
        di = re.search(r'data-items="(\d+)"', tagtxt)
        report("AC-2", "#room-canvas data-items == len(projects)", bool(di) and int(di.group(1)) == len(PROJECTS), tagtxt[:200])
        do = re.search(r'data-objects="([^"]*)"', tagtxt)
        have = set(do.group(1).split(",")) if do else set()
        report("AC-17", "data-objects has all named objects", set(names) <= have, f"missing {set(names)-have}")
        report("AC-8", "WebGL run: no :CONSOLE lines", not con, "; ".join(con[:5]))

        # 3 deep links
        first = PROJECTS[0]
        dom, con = run_dom([], f"#p={first['id']}", "deeplink")
        m = re.search(r"<[^>]*id=\"project-panel\".*?</aside>", dom, re.S)
        report("AC-5", "deep link panel contains title", bool(m) and first["title"] in m.group(0))
        report("AC-8", "deep link: no :CONSOLE lines", not con, "; ".join(con[:5]))
        nourl = next((p for p in PROJECTS if "url" not in p), None)
        if nourl:
            dom, con = run_dom([], f"#p={nourl['id']}", "deeplink-nourl")
            m = re.search(r"<[^>]*id=\"project-panel\".*?</aside>", dom, re.S)
            report("AC-5", "no-url deep link says 'ingen publik länk'", bool(m) and "ingen publik länk" in m.group(0))

        # malformed hash
        dom, con = run_dom([], "#p=%E0", "badhash")
        report("AC-5", "malformed #p=%E0: data-room=ready, no :CONSOLE lines", attr(dom, "data-room") == "ready" and not con,
               f"data-room={attr(dom,'data-room')} {'; '.join(con[:3])}")

        # 4 reduced motion: deep link brings the room into frame
        def shoot(i, budget, url, extra=()):
            f = OUT / f"reduced-{i}.png"; f.unlink(missing_ok=True)
            chrome(["--force-prefers-reduced-motion", f"--virtual-time-budget={budget}", "--window-size=1280,2600",
                    f"--screenshot={f}", *extra], url, f"reduced-{i}")
            return f.read_bytes() if f.exists() else None
        link = URL + f"#p={first['id']}"
        # Both shots after the room has loaded: virtual time doesn't reliably wait for the ~1 MB three.js CDN
        # fetch, so a 3 s shot could catch "loading" vs "ready" (timing, not motion). We assert no motion over time.
        a, b = shoot(0, 8000, link), shoot(1, 14000, link)
        none = shoot(2, 9000, link, ["--disable-3d-apis"])
        report("AC-11", "reduced motion: room-in-frame screenshots at different times byte-identical",
               a is not None and a == b,
               "screenshot missing" if a is None or b is None else f"screenshots differ ({len(a)} vs {len(b)} bytes)")
        report("AC-11", "screenshot is non-trivial and differs from no-room page",
               bool(a) and none is not None and len(a) > 100000 and a != none,
               f"size={len(a) if a else None}, same-as-fallback={a == none}")

        # fixtures: project data edge cases
        dom, con = fx_run("fx0", "[]")
        report("AC-2", "0 projects: 'inga projekt än', data-items=0, no console", "inga projekt än" in dom and items(dom) == 0 and not con,
               f"items={items(dom)} {con[:2]}")
        dom, con = fx_run("fx12", json.dumps(mk(12)))
        report("AC-2", "12 projects: items=12, 12 buttons, no console", items(dom) == 12 and nbuttons(dom) == 12 and not con,
               f"items={items(dom)} btn={nbuttons(dom)} {con[:2]}")
        dom, con = fx_run("fx14", json.dumps(mk(14)))
        report("AC-2", "14 projects: items=12, 14 buttons, exactly one console warn",
               items(dom) == 12 and nbuttons(dom) == 14 and len(con) == 1 and "projects: 14" in con[0],
               f"items={items(dom)} btn={nbuttons(dom)} {con[:3]}")
        bad = mk(3) + [{"title": "no id", "kind": "board", "summary": "s", "tech": [], "year": 1}, {**mk(1)[0]}, {**mk(1)[0], "id": 5}]
        dom, con = fx_run("fxbad", json.dumps(bad))
        report("AC-2", "malformed entries dropped (3 valid left), no crash, data-cv=ready",
               attr(dom, "data-cv") == "ready" and nbuttons(dom) == 3 and items(dom) == 3 and not [l for l in con if "Uncaught" in l],
               f"cv={attr(dom,'data-cv')} btn={nbuttons(dom)} items={items(dom)} {con[:2]}")
        dom, con = fx_run("fxjson", "{not json")
        report("AC-2", "malformed JSON: data-cv=ready, error notice, no uncaught",
               attr(dom, "data-cv") == "ready" and "[error]" in dom and not [l for l in con if "Uncaught" in l],
               f"cv={attr(dom,'data-cv')} {con[:2]}")

    # 2 Fallback (no CDN needed)
    dom, con = run_dom(["--disable-3d-apis"], "", "fallback")
    report("AC-10", "fallback: data-room=fallback", attr(dom, "data-room") == "fallback", f"data-room={attr(dom,'data-room')}")
    nbtn = len(re.findall(r"<button\b[^>]*data-project-id", dom))
    report("AC-10", "fallback: list + CV present", nbtn == len(PROJECTS) and CV["name"] in dom, f"{nbtn} buttons")
    m = re.search(r"<[^>]*id=\"room-note\"[^>]*>(.*?)</", dom, re.S)
    report("AC-10", "fallback: #room-note has text", bool(m) and bool(re.sub(r"<[^>]+>", "", m.group(1)).strip()))
    report("AC-10", "fallback: no :CONSOLE lines", not con, "; ".join(con[:5]))

    # layout
    dom, con = run_dom([], "tests/layout.html", "layout")
    m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    try:
        import html as H
        data = json.loads(H.unescape(m.group(1)))
        if "error" in data: raise ValueError(data["error"])
        rows_exp = {"0": 1, "1": 1, "6": 1, "7": 2, "12": 2}
        bad = []
        for n, exp in rows_exp.items():
            raw, slots = data[n]["raw"], data[n]["slots"]
            rows = raw.get("rows") if isinstance(raw, dict) else None
            if isinstance(rows, list): rows = len(rows)
            if rows is None:
                rows = len({s.get("row", s.get("r")) for s in slots}) or 1
            if rows != exp: bad.append(f"n={n}: rows {rows} != {exp}")
            by = {}
            for s in slots: by.setdefault(s.get("row", s.get("r", 0)), []).append(s["x"])
            if len(slots) != int(n): bad.append(f"n={n}: {len(slots)} slots")
            for r, xs in by.items():
                xs.sort()
                if any(b - a < 0.18 - 1e-6 for a, b in zip(xs, xs[1:])): bad.append(f"n={n} row {r}: overlap")
        report("AC-2", "layoutShelf rows (1,1,1,2,2), no overlap", not bad, "; ".join(bad))
    except Exception as e:
        report("AC-2", "layoutShelf rows (1,1,1,2,2), no overlap", False, f"{type(e).__name__}: {e}")

    # 5 mobile
    shot = OUT / "mobile.png"; shot.unlink(missing_ok=True)
    chrome(["--window-size=375,812", f"--screenshot={shot}"], URL, "mobile")
    report("AC-14", "mobile screenshot >20KB", shot.exists() and shot.stat().st_size > 20000)
    dom, con = run_dom([], "tests/probe.html", "probe")
    m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    try:
        import html as H
        d = json.loads(H.unescape(m.group(1)))
        report("AC-14", "375px: no horizontal scroll", d["scrollWidth"] <= d["clientWidth"], str(d))
    except Exception as e:
        report("AC-14", "375px: no horizontal scroll", False, f"probe: {e}")

    f404 = server_404s()
    report("AC-8", "server log has no 404", not f404, "; ".join(f404[:5]))
finally:
    srv.terminate()
    shutil.rmtree(tmp, ignore_errors=True)

print(f"\n{sum(1 for r in results if r)} pass, {sum(1 for r in results if r is False)} fail, {sum(1 for r in results if r is None)} skip")
sys.exit(1 if any(r is False for r in results) else 0)
