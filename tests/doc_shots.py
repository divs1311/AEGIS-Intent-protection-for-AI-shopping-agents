"""Capture the prototype screenshots used in the PDF appendix (390 px wide)."""
import pathlib, sys
from playwright.sync_api import sync_playwright
U = (pathlib.Path(__file__).resolve().parents[1] / "index.html").as_uri() + "?notour"
O = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "shots"); O.mkdir(parents=True, exist_ok=True)
HIDE = ".tabbar,.toast,.topbar,.tour{display:none!important} body{padding-bottom:0!important}"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 390, "height": 360}, device_scale_factor=2.5)
    def snap(name, sel, off=8):
        pg.add_style_tag(content=HIDE); pg.wait_for_timeout(150)
        y = pg.evaluate(f"document.querySelector('{sel}').getBoundingClientRect().top + scrollY - {off}")
        pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(120)
        pg.screenshot(path=str(O / f"{name}.png"))
    pg.goto(U + "#rules"); pg.wait_for_timeout(300); snap("p1-rules", ".panel:nth-of-type(1)", 8)
    pg.goto(U + "#checkout"); pg.wait_for_timeout(200); pg.click("[data-action=request][data-id=fryer]"); pg.wait_for_timeout(700); snap("p2b-fryer-guard", ".receipt-foot", 175)
    pg.click("[data-action=request][data-id=phone]"); pg.wait_for_timeout(700); snap("p3-phone", ".receipt-foot", 120)
    pg.evaluate("location.hash='drift'"); pg.wait_for_timeout(300); snap("p5-drift", "[data-test=drift-hero]", 6)
    pg.click("[data-action=correct][data-v=scoped]"); pg.wait_for_timeout(200)
    pg.click("[data-action=rerun][data-id=phone]"); pg.wait_for_timeout(800); snap("p6-rerun", ".receipt", 6)
    pg.evaluate("location.hash='ledger'"); pg.wait_for_timeout(300); pg.click("[data-action=tamper]"); pg.wait_for_timeout(200); snap("p7-ledger", "[data-test=chain-status]", 6)
    b.close()
