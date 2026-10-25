/* Aegis · app controller: routing, events, tour */
(function () {
  "use strict";
  var A = window.Aegis, S = A.store, U = A.ui, V = A.views;
  var main = document.getElementById("main"), insp = document.getElementById("inspector"), tourEl = document.getElementById("tourRoot");
  var ROUTES = ["checkout", "rules", "drift", "ledger", "lab"];

  var ui = {
    route: "checkout", draft: null, editFor: null, editSel: null, justDecided: null, ruleEditNotice: false,
    tour: -1, tourDone: {}, verifiedAt: null, verifiedMs: 0,
    labParams: { seed: A.sim.DEFAULTS.seed, users: A.sim.DEFAULTS.users, tolerance: 0.10, correctionRate: 0.6 }, labBusy: false, labSweep: null
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function route() { var h = (location.hash || "").slice(1); return ROUTES.indexOf(h) > -1 ? h : "checkout"; }
  function go(r) { if (location.hash !== "#" + r) location.hash = r; else render(); window.scrollTo(0, 0); }

  function render() {
    var st = S.get();
    ui.route = route();
    if (!ui.draft) ui.draft = clone(st.policy);
    main.innerHTML = V[ui.route].render(st, ui);
    insp.innerHTML = V.inspector.render(st);
    document.getElementById("sheetBody").innerHTML = V.inspector.render(st);
    tourEl.innerHTML = V.tour.render(ui);
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      var on = a.getAttribute("data-nav") === ui.route;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var waiting = st.decisions.filter(function (d) { return (d.status === "paused" || d.status === "blocked") && !d.resolution; }).length;
    document.querySelectorAll("[data-badge=checkout]").forEach(function (b) { b.textContent = waiting || ""; b.hidden = !waiting; });
    var unsup = !st.correction;
    document.querySelectorAll("[data-badge=drift]").forEach(function (b) { b.hidden = !unsup; });
    var chainOk = st.ledger.verify().ok;
    document.querySelectorAll("[data-badge=ledger]").forEach(function (b) { b.hidden = chainOk; });
    document.getElementById("chainPill").innerHTML = chainOk ? U.icon("link", 13) + "Chain verified" : U.icon("block", 13) + "Chain broken";
    document.getElementById("chainPill").className = "pill " + (chainOk ? "pill-ok" : "pill-bad");
    ui.justDecided = null;
  }

  var toastT;
  function toast(msg, kind) {
    var t = document.getElementById("toast");
    t.className = "toast show " + (kind || ""); t.textContent = msg;
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = "toast"; }, 3000);
  }

  /* ---------- exception dialog ---------- */
  function exceptionDialog(d) {
    var m = document.getElementById("modal"), ok = m.querySelector("[data-modal=ok]"), box;
    var over = d.eval.chosen.price - S.get().policy.cap;
    m.querySelector(".modal-body").innerHTML = "<h3>Allow this one order?</h3><p>" + U.esc(d.eval.chosen.title) + " costs " + U.inr(d.eval.chosen.price) + ", which is " + U.inr(over) + " over your cap.</p><ul><li>Covers this order only.</li><li>Your " + U.inr(S.get().policy.cap) + " cap stays exactly as it is.</li><li>Kai is told it was an exception, not a new preference.</li></ul>" +
      '<label class="ack"><input type="checkbox" id="ack"> I\'m choosing to exceed my cap for this order only.</label>';
    m.hidden = false; box = document.getElementById("ack"); ok.disabled = true;
    box.onchange = function () { ok.disabled = !box.checked; };
    ok.onclick = function () { m.hidden = true; S.resolve(d.id, "exception"); toast("Exception authorised · order placed", "warn"); };
    m.querySelector("[data-modal=cancel]").onclick = function () { m.hidden = true; };
    box.focus();
  }

  /* ---------- actions ---------- */
  function request(id) {
    ui.editFor = null; ui.editSel = null;
    if (id === "ruleEdit") { S.agentEditsRule(); ui.ruleEditNotice = true; ui.draft = clone(S.get().policy); go("checkout"); toast("Rule change rejected · your cap is unchanged", "bad"); return; }
    ui.ruleEditNotice = false;
    var rec = S.decide(id);
    ui.justDecided = rec.id;
    go("checkout");
    var v = rec.eval.verdict;
    toast(v === "pass" ? "Passed · countersigned and bought" : v === "pause" ? "Paused · needs your decision" : "Blocked before payment", v === "pass" ? "ok" : v === "pause" ? "warn" : "bad");
    return rec;
  }

  var H = {
    request: function (el) { request(el.dataset.id); },
    select: function (el) { ui.editFor = null; ui.editSel = null; S.setActive(el.dataset.id); },
    resolve: function (el) {
      S.resolve(el.dataset.id, el.dataset.kind); ui.editFor = null;
      toast({ block: "Blocked · nothing bought", approve: "Approved once · order placed" }[el.dataset.kind] || "Done", el.dataset.kind === "block" ? "bad" : "ok");
    },
    exception: function (el) { exceptionDialog(S.find(el.dataset.id)); },
    openEdit: function (el) {
      ui.editFor = el.dataset.id;
      var d = S.find(el.dataset.id), best = S.editOptions(d).filter(function (x) { return x.eval.verdict === "pass"; })[0];
      ui.editSel = best ? best.offer.id : null; render();
      setTimeout(function () { var e = document.querySelector("[data-test=edit-panel]"); if (e && e.scrollIntoView) e.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 20);
    },
    closeEdit: function () { ui.editFor = null; ui.editSel = null; render(); },
    pick: function (el) { if (el.getAttribute("aria-disabled") === "true") { toast("That offer breaks one of your rules", "bad"); return; } ui.editSel = el.dataset.id; render(); },
    confirmEdit: function (el) {
      var r = S.resolve(el.dataset.id, "edit", ui.editSel);
      if (r && r.ok) { ui.editFor = null; ui.editSel = null; toast("Your choice passed every check · bought", "ok"); render(); }
      else toast("That offer still breaks a rule", "bad");
    },
    context: function (el) { S.resolve(el.dataset.id, "context"); H.openEdit(el); },
    falseHold: function (el) { S.resolve(el.dataset.id, "falseHold"); toast("Logged as a possible false hold", "ok"); },

    prioUp: function (el) { var i = +el.dataset.i, p = ui.draft.priorities; p.splice(i - 1, 0, p.splice(i, 1)[0]); render(); },
    prioDown: function (el) { var i = +el.dataset.i, p = ui.draft.priorities; p.splice(i + 1, 0, p.splice(i, 1)[0]); render(); },
    autonomy: function (el) { ui.draft.autonomy[el.dataset.cat] = el.dataset.v; render(); },
    minRating: function (el) { ui.draft.rules.minRating = parseFloat(el.dataset.v); render(); },
    removeScoped: function (el) { ui.draft.scoped.splice(+el.dataset.i, 1); render(); },
    discard: function () { ui.draft = clone(S.get().policy); render(); },
    savePolicy: function () {
      var r = S.writePolicy(clone(ui.draft), "user");
      ui.draft = clone(S.get().policy); render();
      if (r.ok && !r.unchanged) toast("Saved as version " + S.get().policy.version, "ok");
    },
    acceptSuggestion: function (el) { S.acceptSuggestion(el.dataset.id); ui.draft = clone(S.get().policy); ui.ruleEditNotice = false; toast("You raised the cap to ₹18,000", "ok"); },
    dismissSuggestion: function (el) { S.dismissSuggestion(el.dataset.id); ui.ruleEditNotice = false; },

    correct: function (el) { S.correct(el.dataset.v); ui.draft = clone(S.get().policy); toast("Correction saved · Kai's record updated", "ok"); },
    rerun: function (el) { request(el.dataset.id); },

    verify: function () {
      var t0 = performance.now(); S.get().ledger.verify(); ui.verifiedMs = performance.now() - t0; ui.verifiedAt = Date.now(); render();
      toast(S.get().ledger.verify().ok ? "Chain verified" : "Tampering detected", S.get().ledger.verify().ok ? "ok" : "bad");
    },
    tamper: function () { S.tamper(); ui.verifiedAt = null; toast("An entry was edited after the fact", "bad"); },
    restore: function () { S.restore(); toast("Original entry restored", "ok"); },
    export: function () {
      var st = S.get();
      var blob = new Blob([JSON.stringify({ exportedFrom: "Aegis prototype (simulated data)", policy: st.policy, policyVersions: st.history, ledger: st.ledger.entries, verification: st.ledger.verify() }, null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "aegis-ledger.json"; document.body.appendChild(a); a.click(); a.remove();
      toast("Ledger downloaded", "ok");
    },

    labRun: function () { runLab(); },
    labSeed: function () { ui.labParams.seed = (ui.labParams.seed * 48271) % 2147483647; runLab(); },
    labUsers: function (el) { ui.labParams.users = +el.dataset.v; render(); },

    tourStart: function () { ui.tour = 0; ui.tourDone = {}; enterStep(); },
    tourExit: function () { ui.tour = null; render(); },
    tourNext: function () { if (ui.tour < V.tour.STEPS.length - 1) { ui.tour++; enterStep(); } },
    tourBack: function () { if (ui.tour > 0) { ui.tour--; enterStep(); } },
    tourDo: function () { doStep(V.tour.STEPS[ui.tour]); ui.tourDone[ui.tour] = true; render(); },
    sheet: function () { var s = document.getElementById("sheet"); s.hidden = !s.hidden; },
    sheetClose: function () { document.getElementById("sheet").hidden = true; },
    reset: function () { S.reset(); ui.draft = clone(S.get().policy); ui.editFor = null; ui.ruleEditNotice = false; ui.labSweep = null; ui.tour = null; ui.tourDone = {}; go("checkout"); toast("Demo reset", "ok"); }
  };

  function enterStep() { var s = V.tour.STEPS[ui.tour]; if (s.go) go(s.go); render(); }

  function doStep(s) {
    var r = s.run.split(":");
    if (r[0] === "request") request(r[1]);
    else if (r[0] === "editBest") {
      var d = S.get().decisions.filter(function (x) { return x.reqId === "fryer" && !x.resolution; })[0];
      if (d) { var best = S.editOptions(d).filter(function (x) { return x.eval.verdict === "pass"; })[0]; S.resolve(d.id, "edit", best.offer.id); S.setActive(d.id); }
      go("checkout");
    } else if (r[0] === "correct") { if (!S.get().correction) S.correct(r[1]); ui.draft = clone(S.get().policy); go("drift"); }
    else if (r[0] === "rerunBoth") { request("gift"); request("phone"); }
    else if (r[0] === "verify") { go("ledger"); H.verify(); }
    else if (r[0] === "labRun") { go("lab"); runLab(); }
  }

  function runLab() {
    ui.labBusy = true; ui.labSweep = null; render();
    setTimeout(function () {
      var r = A.sim.run(ui.labParams); S.setLab(r); ui.labBusy = false; render();
      setTimeout(function () { ui.labSweep = A.sim.sweep(ui.labParams); render(); }, 30);
    }, 30);
  }

  /* ---------- event wiring ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el || el.tagName === "INPUT") return;
    if (el.disabled) return;
    var fn = H[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el); }
  });

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "capRange") { ui.draft.cap = +t.value; document.getElementById("capVal").textContent = U.inr(ui.draft.cap); refreshSavebar(); }
    if (t.id === "tolRange") {
      ui.draft.tolerance = Math.round(+t.value * 1000) / 1000;
      document.getElementById("tolVal").textContent = U.pct(ui.draft.tolerance);
      document.getElementById("tolHint").textContent = "If the best-value option costs ₹10,000, Kai may pay up to " + U.inr(10000 * (1 + ui.draft.tolerance)) + " for something faster without asking. Above that, Aegis pauses.";
      refreshSavebar();
    }
    if (t.id === "labTol") { ui.labParams.tolerance = Math.round(+t.value * 1000) / 1000; document.getElementById("labTolV").textContent = U.pct(ui.labParams.tolerance); }
    if (t.id === "labCorr") { ui.labParams.correctionRate = Math.round(+t.value * 10) / 10; document.getElementById("labCorrV").textContent = Math.round(ui.labParams.correctionRate * 100) + "%"; }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.action === "toggle") { ui.draft.rules[t.dataset.key] = t.checked; render(); }
    if (t.id === "capRange" || t.id === "tolRange") render();
  });
  function refreshSavebar() {
    var bar = document.querySelector("[data-test=savebar]"); if (!bar) return;
    var n = V.rules.diffLines(S.get().policy, ui.draft).length;
    bar.classList.toggle("dirty", n > 0);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var m = document.getElementById("modal"); if (!m.hidden) { m.hidden = true; return; }
      var sh = document.getElementById("sheet"); if (!sh.hidden) { sh.hidden = true; return; }
      if (ui.tour === -1) { ui.tour = null; render(); }
    }
  });

  window.addEventListener("hashchange", function () { ui.editFor = null; render(); window.scrollTo(0, 0); });
  S.subscribe(function () { render(); });
  A.charts.bindTooltips(document.body);
  if (/[?&]notour/.test(location.search)) ui.tour = null;
  render();

  A.app = { ui: ui, request: request, handlers: H, render: render, runLab: runLab };
})();
