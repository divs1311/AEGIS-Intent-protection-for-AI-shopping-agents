"""Aegis prototype: automated tests.

Two layers, both run in a real Chromium page opened from index.html over file:// with the
network switched off:
  1. Engine unit tests (crypto vectors, statistics, policy boundaries, ledger, simulation invariants)
  2. End-to-end checks of every behaviour the README and the 2-pager claim, at 390 px and 1440 px

Usage:   python tests/run_tests.py            writes tests/test_report.md
Needs:   pip install playwright  &&  python -m playwright install chromium
"""
import sys, json, pathlib, datetime
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
BASE = HERE.parent
ROOT = BASE / "index.html"
URL = ROOT.as_uri() + "?notour"
results = []

def check(cid, tag, name, cond, detail=""):
    results.append({"id": cid, "width": tag, "name": name, "pass": bool(cond), "detail": str(detail)})
    print(("PASS " if cond else "FAIL ") + f"{cid} [{tag}] {name}" + (f"  ({detail})" if detail and not cond else ""))

UNIT_JS = r"""
() => {
  const A = window.Aegis, out = [];
  const t = (id, name, ok, d) => out.push({ id, name, ok: !!ok, d: d === undefined ? "" : String(d) });
  // crypto (FIPS 180-4 and RFC 4231 vectors)
  t("U01", "SHA-256 of empty string", A.crypto.sha256("") === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  t("U01", "SHA-256 of 'abc'", A.crypto.sha256("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  t("U01", "SHA-256 of the 448-bit FIPS message", A.crypto.sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq") === "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  t("U01", "SHA-256 of UTF-8 text (₹)", A.crypto.sha256("₹") === "d8c3e87cd7f5b7d388f9dc1e35ccee09640ef3dca63d449d9ef59fc323a87a20");
  t("U02", "HMAC-SHA-256 RFC 4231 case 2", A.crypto.hmacSha256("Jefe", "what do ya want for nothing?") === "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
  t("U02", "Canonical JSON is key-order independent", A.crypto.canonical({ b: 1, a: { d: 2, c: 3 } }) === A.crypto.canonical({ a: { c: 3, d: 2 }, b: 1 }));
  // statistics: Beta(1,6) has closed-form quantiles 1-(1-p)^(1/6)
  const ci = A.stats.betaInterval(1, 6, 0.9), lo = 1 - Math.pow(0.95, 1 / 6), hi = 1 - Math.pow(0.05, 1 / 6);
  t("U03", "Beta(1,6) 90% interval matches closed form within 0.005", Math.abs(ci[0] - lo) < 0.005 && Math.abs(ci[1] - hi) < 0.005, ci.map(x => x.toFixed(4)).join("-") + " vs " + lo.toFixed(4) + "-" + hi.toFixed(4));
  t("U03", "Beta mean", Math.abs(A.stats.betaMean(1, 6) - 1 / 7) < 1e-12);
  const d = A.drift.assess(A.EVIDENCE);
  t("U04", "Drift: agent belief 57%, evidence 14%, flagged unsupported", Math.round(d.agent.mean * 100) === 57 && Math.round(d.evidence.mean * 100) === 14 && d.unsupported, d.agent.mean.toFixed(3) + "/" + d.evidence.mean.toFixed(3));
  t("U04", "Drift: only actively chosen orders count", d.evidence.n === 5 && d.counts.defaulted === 4 && d.counts.context === 1);
  // policy engine
  const pol = JSON.parse(JSON.stringify(A.DEFAULT_POLICY));
  const R = A.REQUESTS;
  const ev = (req, id, p, ctx) => A.policy.evaluate(Object.assign({}, req, { chosenId: id }), p || pol, ctx || { inferenceStatus: { prefers_speed: "supported" } });
  t("U05", "Refill passes", ev(R.refill, "det-a").verdict === "pass");
  t("U05", "Air fryer ₹6,499 pauses (no hard rule broken)", ev(R.fryer, "fry-crisp").verdict === "pause");
  t("U05", "₹17,499 phone blocks on the cap", ev(R.phone, "ph-nova").verdict === "block" && ev(R.phone, "ph-nova").primary.id === "cap");
  t("U05", "Renewal blocks on category autonomy", ev(R.renewal, "ott").verdict === "block" && ev(R.renewal, "ott").primary.id === "autonomy");
  t("U05", "Below-floor seller pauses", ev(R.fryer, "fry-cook").checks.some(c => c.id === "rating" && c.level === "pause"));
  const a1 = JSON.stringify(ev(R.fryer, "fry-crisp").checks.map(c => [c.id, c.level, c.detail]));
  const a2 = JSON.stringify(ev(R.fryer, "fry-crisp").checks.map(c => [c.id, c.level, c.detail]));
  t("U06", "Deterministic: same input gives the same checks", a1 === a2);
  // tolerance boundary: exactly at best*(1+tol) passes, ₹1 above pauses
  const mk = (price) => ({ need: "x", category: "kitchen", rationale: { inferences: [] }, offers: [
    { id: "best", title: "B", price: 10000, days: 1, seller: "s", rating: 4.5, sponsored: false },
    { id: "c", title: "C", price: price, days: 1, seller: "s", rating: 4.5, sponsored: false }] });
  t("U07", "Tolerance boundary: ₹11,000 passes at 10%", ev(mk(11000), "c").verdict === "pass");
  t("U07", "Tolerance boundary: ₹11,001 pauses at 10%", ev(mk(11001), "c").verdict === "pause");
  const p2 = JSON.parse(JSON.stringify(pol)); p2.cap = 10500;
  t("U07", "Cap boundary: ₹10,500 within, ₹10,501 blocks", ev(mk(10500), "c", p2).checks.find(c => c.id === "cap").level === "pass" && ev(mk(10501), "c", p2).verdict === "block");
  const p3 = JSON.parse(JSON.stringify(pol)); p3.scoped = [{ id: "g", label: "g", when: { category: "gifts", deadline: true }, priorities: ["speed", "value", "quality"] }];
  t("U08", "Scoped rule: express gift passes only with the rule", ev(R.gift, "gift-exp", pol).verdict === "pause" && ev(R.gift, "gift-exp", p3).verdict === "pass");
  t("U08", "Unsupported inference pauses an otherwise fitting order", ev(R.gift, "gift-exp", p3, { inferenceStatus: { prefers_speed: "unsupported" } }).verdict === "pause");
  // agent model
  t("U09", "Agent with a drifted belief stretches the cap and picks ₹17,499", A.agent.pick(R.phone.offers, { pSpeed: d.agent.mean }, pol).chosenId === "ph-nova");
  t("U09", "Agent with the corrected belief picks ₹13,299", A.agent.pick(R.phone.offers, { pSpeed: d.evidence.mean }, pol, { respectCap: true }).chosenId === "ph-kite");
  // ledger
  const L = A.ledger.create();
  for (let i = 0; i < 6; i++) L.append({ t: "t" + i, kind: "k", actor: "a", title: "e" + i, outcome: "pass", policyVersion: 1 });
  const ok1 = L.verify().ok; L.entries[2].title = "changed"; const v = L.verify();
  t("U10", "Ledger verifies, then detects tampering at the edited entry", ok1 && !v.ok && v.brokenAt === 3, JSON.stringify(v));
  L.entries[2].title = "e2"; L.entries[4].prev = "00"; const v2 = L.verify();
  t("U10", "Ledger detects a broken link", !v2.ok && v2.brokenAt === 5);
  const sig = A.ledger.countersign({ a: 1 }, "h", "pass", "d");
  t("U11", "Countersignature verifies, and fails if the cart changes", A.ledger.checkSignature(sig) && !A.ledger.checkSignature({ payload: Object.assign({}, sig.payload, { cart: "x" }), sig: sig.sig }));
  // simulation invariants
  const s1 = A.sim.run({ users: 60 }), s2 = A.sim.run({ users: 60 });
  t("U12", "Simulation is reproducible with a fixed seed", JSON.stringify(s1.aegis.weeklyInterruptRate) === JSON.stringify(s2.aegis.weeklyInterruptRate) && s1.aegis.preferenceSafeRate === s2.aegis.preferenceSafeRate);
  let zero = true; [1, 2, 3, 4].forEach(seed => { const r = A.sim.run({ users: 50, seed }); if (r.aegis.hardBreachesPer1000 !== 0 || r.capOnly.hardBreachesPer1000 !== 0) zero = false; });
  t("U12", "Release gate holds: zero hard-rule breaches under Aegis across seeds", zero);
  t("U12", "Agent alone does breach hard rules (the test can fail)", s1.agentOnly.hardBreachesPer1000 > 0);
  return out;
}
"""

def run(width, height, tag):
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": width, "height": height}, offline=True, accept_downloads=True)
        page = ctx.new_page()
        errors, requests = [], []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("request", lambda r: requests.append(r.url) if not r.url.startswith(("file:", "data:", "blob:")) else None)

        def fresh(route="checkout"):
            page.goto(URL + "#" + route); page.reload(); page.wait_for_timeout(200)
        def go(route): page.evaluate(f"location.hash = '{route}'"); page.wait_for_timeout(120)
        def req(rid): go("checkout"); page.click(f"[data-action=request][data-id={rid}]"); page.wait_for_timeout(150)
        st = lambda expr: page.evaluate(f"(() => {{ const S = Aegis.store.get(); return {expr}; }})()")
        verdict = lambda: page.get_attribute("[data-test=decision]", "data-verdict")
        dtext = lambda: page.inner_text("[data-test=decision]")

        if tag == "1440px":
            page.goto(URL); page.wait_for_timeout(200)
            for u in page.evaluate(UNIT_JS):
                check(u["id"], "engine", u["name"], u["ok"], u["d"])

        # welcome card on first open
        page.goto(ROOT.as_uri()); page.wait_for_timeout(200)
        has_welcome = page.locator("[data-test=tour-start]").count() == 1
        page.click("[data-action=tourExit]"); page.wait_for_timeout(100)
        check("E01", tag, "Welcome card offers the tour, and can be dismissed", has_welcome and page.locator(".welcome").count() == 0)

        fresh(); req("refill")
        check("E02", tag, "Routine refill passes silently and is countersigned", verdict() == "pass" and "Bought automatically" in dtext() and st("!!S.decisions[0].countersig") and page.locator("[data-badge=checkout]").first.is_hidden())

        fresh(); req("fryer")
        t = dtext()
        check("E03", tag, "₹6,499 air fryer is paused, not blocked, and flagged as something a cap would miss", verdict() == "pause" and "A spending limit alone would have let it through" in t and "₹1,500" in t and page.locator("[data-action=exception]").count() == 0)
        page.click("[data-action=openEdit]"); page.wait_for_timeout(120)
        sel = page.locator(".opt.sel").inner_text()
        page.click("[data-action=confirmEdit]"); page.wait_for_timeout(150)
        t = dtext()
        check("E04", tag, "Choosing the best fit (₹4,999) passes; memory panel shows rules unchanged", "HomeChef" in sel and "Your edited choice passed every check" in t and page.locator("[data-test=memory]").count() == 1 and st("S.policy.version") == 1)

        fresh(); req("phone")
        t = dtext()
        check("E05", tag, "₹17,499 phone is blocked before payment with the exact gap", verdict() == "block" and "₹2,499" in t and page.locator("[data-action=exception]").count() == 1 and st("S.decisions[0].eval.chosen.id") == "ph-nova")
        page.click("[data-action=exception]"); page.wait_for_timeout(100)
        disabled = page.is_disabled("[data-modal=ok]")
        page.keyboard.press("Escape"); page.wait_for_timeout(100)
        check("E06", tag, "Exception dialog: confirm disabled until ticked; Escape cancels", disabled and page.locator("#modal").is_hidden() and st("S.decisions[0].status") == "blocked")
        page.click("[data-action=exception]"); page.wait_for_timeout(100)
        page.check("#ack"); page.click("[data-modal=ok]"); page.wait_for_timeout(150)
        t = dtext()
        check("E07", tag, "One-time exception buys this order only; cap and version unchanged", "one-time exception" in t.lower() and st("S.policy.cap") == 15000 and st("S.policy.version") == 1 and st("S.decisions[0].resolution.type") == "exception")

        fresh(); req("phone")
        page.click("[data-action=context]"); page.wait_for_timeout(150)
        sel = page.locator(".opt.sel").inner_text()
        page.click("[data-action=confirmEdit]"); page.wait_for_timeout(150)
        check("E08", tag, "“Need it by tomorrow” picks the ₹14,999 next-day option for this order only", "14,999" in sel and st("S.decisions[0].executedOffer.id") == "ph-kite-exp" and st("S.policy.version") == 1)

        fresh(); req("phone"); page.click("[data-action=resolve][data-kind=block]"); page.wait_for_timeout(120)
        blocked = st("S.decisions[0].status") == "cancelled"
        req("phone")
        check("E09", tag, "After a block, Kai respects the cap, but its speed guess still gets a ₹14,999 pick paused", blocked and st("S.decisions[0].eval.chosen.id") == "ph-kite-exp" and verdict() == "pause")

        fresh(); req("fryer"); page.click("[data-action=resolve][data-kind=approve]"); page.wait_for_timeout(120)
        check("E10", tag, "Approve once buys it without learning a preference", "Approved once" in dtext() and "Not learned" in dtext() and st("S.policy.version") == 1)

        fresh(); req("fryer"); page.click("[data-action=falseHold]"); page.wait_for_timeout(120)
        check("E11", tag, "“This pause wasn't needed” is logged; the order still waits", page.locator("[data-test=fh-done]").count() == 1 and st("S.decisions[0].status") == "paused" and st("S.falseHolds") == 1)

        fresh(); req("ruleEdit")
        api = page.evaluate("(() => { const p = JSON.parse(JSON.stringify(Aegis.store.get().policy)); p.cap = 99999; return Aegis.store.writePolicy(p, 'agent', 'direct').ok; })()")
        check("E12", tag, "Kai can't change a rule, in the UI or via the store; it becomes a suggestion", page.locator("[data-test=rule-reject]").count() == 1 and api is False and st("S.policy.cap") == 15000 and st("S.suggestions.length") == 1)
        go("rules"); page.click("[data-action=acceptSuggestion]"); page.wait_for_timeout(120)
        check("E13", tag, "Only the user's acceptance raises the cap (version 2, new fingerprint)", st("S.policy.cap") == 18000 and st("S.policy.version") == 2 and st("S.history[0].hash !== S.history[1].hash"))
        req("phone")
        check("E14", tag, "With the higher cap the same phone is paused, not blocked", verdict() == "pause")

        fresh(); go("rules")
        page.evaluate("(() => { const r = document.getElementById('tolRange'); r.value = 0.2; r.dispatchEvent(new Event('input', {bubbles: true})); r.dispatchEvent(new Event('change', {bubbles: true})); })()")
        page.wait_for_timeout(100); page.click("[data-action=savePolicy]"); page.wait_for_timeout(120)
        check("E15", tag, "Editing tolerance and saving creates version 2 with a new hash", st("S.policy.version") == 2 and abs(st("S.policy.tolerance") - 0.2) < 1e-9 and st("S.history[0].hash !== S.history[1].hash"))

        fresh(); go("drift")
        hero = page.inner_text("[data-test=drift-hero]")
        page.click("[data-action=correct][data-v=scoped]"); page.wait_for_timeout(150)
        ok_scoped = st("S.policy.scoped.length") == 1 and page.locator("[data-test=drift-resolved]").count() == 1
        page.click("[data-action=rerun][data-id=phone]"); page.wait_for_timeout(150)
        ph = (verdict(), st("S.decisions[0].eval.chosen.id"))
        req("gift")
        check("E16", tag, "Drift shows 57% vs 14%; scoped correction makes the next phone (₹13,299) and the gift pass", "57%" in hero and "14%" in hero and ok_scoped and ph == ("pass", "ph-kite") and verdict() == "pass")

        fresh(); go("drift"); page.click("[data-action=correct][data-v=rejected]"); page.wait_for_timeout(120); req("gift")
        check("E17", tag, "After an outright rejection, Kai picks the cheaper frame that still meets Friday (₹1,249), and it passes", verdict() == "pass" and st("S.decisions[0].eval.chosen.id") == "gift-2d")

        fresh(); req("fryer"); req("fryer")
        check("E18", tag, "A newer proposal supersedes an undecided one, logged as never executed", st("S.decisions[1].status") == "superseded" and st("S.ledger.entries.some(e => e.outcome === 'superseded')"))

        fresh(); req("phone"); go("ledger")
        ok0 = "Chain verified" in page.inner_text("[data-test=chain-status]")
        page.click("[data-action=tamper]"); page.wait_for_timeout(100)
        bad = page.inner_text("[data-test=chain-status]")
        page.click("[data-action=restore]"); page.wait_for_timeout(100)
        ok2 = "Chain verified" in page.inner_text("[data-test=chain-status]")
        check("E19", tag, "Ledger verifies, detects tampering at the edited entry, and recovers", ok0 and "Tampering detected at entry" in bad and ok2)
        with page.expect_download() as dl:
            page.click("[data-action=export]")
        data = json.loads(pathlib.Path(dl.value.path()).read_text())
        check("E20", tag, "Ledger downloads as JSON with policy versions and a verification result", data["verification"]["ok"] and len(data["ledger"]) == data["verification"]["count"] >= 2 and "policyVersions" in data)

        fresh(); req("refill"); go("ledger")
        check("E21", tag, "Countersignature on a bought order verifies", "Signature verifies" in page.inner_text(".mandate"))

        fresh(); go("lab"); page.click("[data-test=lab-run]"); page.wait_for_timeout(4000)
        tbl = page.inner_text("[data-test=lab-table]")
        r1 = st("S.lab.aegis.preferenceSafeRate"); hb = st("S.lab.aegis.hardBreachesPer1000")
        page.click("[data-test=lab-run]"); page.wait_for_timeout(4000)
        r2 = st("S.lab.aegis.preferenceSafeRate")
        curve = page.locator("svg[aria-label='Trade-off between interruptions and mismatches']").count()
        check("E22", tag, "Lab runs the real engine: zero breaches under Aegis, reproducible, trade-off curve drawn", "Preference-safe purchases" in tbl and hb == 0 and r1 == r2 and curve == 1)

        fresh(); page.click("[data-action=tourStart]"); page.wait_for_timeout(120)
        steps = 0
        for i in range(11):
            if page.locator("[data-test=tour-do]").count(): page.click("[data-test=tour-do]"); page.wait_for_timeout(4200 if i == 10 else 200)
            steps += 1
            if page.locator("[data-test=tour-next]").count(): page.click("[data-test=tour-next]"); page.wait_for_timeout(120)
        end = st("({ v: S.policy.version, last: S.decisions[0] && S.decisions[0].eval.verdict, lab: !!S.lab, ok: S.ledger.verify().ok })")
        check("E23", tag, "Guided tour runs all 11 steps end to end", steps == 11 and end["lab"] and end["ok"] and end["last"] == "pass")

        fresh(); page.focus("[data-action=request][data-id=refill]"); page.keyboard.press("Enter"); page.wait_for_timeout(150)
        check("E24", tag, "Keyboard: Enter on a focused request runs it", verdict() == "pass")

        fresh(); req("phone"); bad = []
        for r in ["checkout", "rules", "drift", "ledger", "lab"]:
            go(r)
            if r == "lab": page.click("[data-test=lab-run]"); page.wait_for_timeout(4000)
            sw, cw = page.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
            if sw > cw: bad.append(f"{r} {sw}>{cw}")
        check("E25", tag, "No horizontal scrolling on any of the five screens", not bad, "; ".join(bad))
        check("E26", tag, "Offline: zero network requests", not requests, "; ".join(requests[:3]))
        check("E27", tag, "No JavaScript errors", not errors, "; ".join(errors[:3]))
        b.close()

import os
run(1440, 900, "1440px")
if not os.environ.get("AEGIS_FAST"):
    run(390, 844, "390px")
failed = [r for r in results if not r["pass"]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")

lines = ["# Aegis prototype: test report", "",
         f"Run {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} · Chromium via Playwright · network off · 1440 px and 390 px", "",
         f"**{len(results) - len(failed)} of {len(results)} checks passed.**", "", "| ID | Where | Check | Result |", "|---|---|---|---|"]
for r in results:
    lines.append(f"| {r['id']} | {r['width']} | {r['name']} | {'pass' if r['pass'] else 'FAIL ' + r['detail']} |")
lines += ["", "Not covered: browsers other than Chromium; screen readers; real agents, payments or stores (none exist; all data is simulated)."]
(HERE / "test_report.md").write_text("\n".join(lines) + "\n")
sys.exit(1 if failed else 0)
