/* Aegis core · simulation lab
 *
 * A synthetic population of shoppers delegates purchases to a drifting agent.
 * The same world (users, catalogues, random draws) is replayed under three regimes:
 *   A  agent only            every proposal executes
 *   B  spending cap only     over-cap proposals are declined and the agent retries within the cap
 *                            (a static mandate limit, as in today's agent-payment controls)
 *   C  Aegis                 the real policy engine (js/core/policy.js) decides pass / pause / block
 *
 * Ground truth comes from each simulated user's TRUE tolerance, which the stated
 * tolerance only approximates. Everything here is an assumption-driven model to
 * explore trade-offs, not a forecast of real-world performance.
 */
(function (A) {
  "use strict";

  var P = A.policy, AG = A.agent, ST = A.stats;

  var DEFAULTS = { seed: 20261025, users: 240, orders: 36, weeks: 12, tolerance: 0.10, correctionRate: 0.6, overrideRate: 0.35, sponsorShare: 0.25, sponsorBonus: 0.05 };

  /* ---------- world generation (shared by every regime) ---------- */
  function makeWorld(prm) {
    var rnd = ST.mulberry32(prm.seed), users = [], u, i, j;
    function U(a, b) { return a + (b - a) * rnd(); }
    var cats = ["essentials", "kitchen", "electronics", "gifts"];
    for (u = 0; u < prm.users; u++) {
      var r = rnd(), first = r < 0.7 ? "value" : r < 0.9 ? "speed" : "quality";
      var order = first === "value" ? ["value", "speed", "quality"] : first === "speed" ? ["speed", "value", "quality"] : ["quality", "value", "speed"];
      var user = {
        id: u, order: order, trueTol: U(0.05, 0.15),
        cap: [5000, 10000, 15000, 25000][Math.floor(rnd() * 4)],
        pSpeedTrue: first === "speed" ? 0.8 : first === "quality" ? 0.3 : 0.12,
        orders: []
      };
      for (i = 0; i < prm.orders; i++) {
        var base = Math.exp(U(Math.log(250), Math.log(Math.min(user.cap * 1.05, 22000))));
        var offers = [];
        for (j = 0; j < 4; j++) {
          var sp = rnd() < prm.sponsorShare;
          var prem = U(0, 0.24) + (sp ? 0.05 : 0);
          var days = Math.max(1, Math.round(5 - prem * 14 + U(-1, 1)));
          offers.push({ id: "o" + j, title: "Offer " + (j + 1), price: Math.round(base * (1 + prem)), days: days,
            seller: "Seller " + j, rating: Math.round(U(3.7, 4.8) * 10) / 10, sponsored: sp, tier: sp ? 3 : 2 });
        }
        user.orders.push({
          week: Math.floor(i * prm.weeks / prm.orders), category: cats[Math.floor(rnd() * cats.length)], offers: offers,
          drawDefault: rnd(), drawOverride: rnd(), drawCorrect: rnd()
        });
      }
      users.push(user);
    }
    return users;
  }

  var ciCache = {};
  function evidenceCI(a, b) { var k = a + "," + b; return ciCache[k] || (ciCache[k] = ST.betaInterval(a, b, 0.9)); }

  /* ---------- one regime over the shared world ---------- */
  function runRegime(world, prm, regime, tol) {
    var m = { orders: 0, executed: 0, safe: 0, autonomousSafe: 0, interrupts: 0, interruptsMaterial: 0, falseHolds: 0,
      hardBreaches: 0, mismatchesExecuted: 0, overspend: 0, evals: 0, evalMs: 0, corrections: 0, cancelled: 0,
      weekly: [], weeklyOrders: [] };
    for (var w = 0; w < prm.weeks; w++) { m.weekly.push(0); m.weeklyOrders.push(0); }

    world.forEach(function (user) {
      var events = [], corrected = false;
      var truthPolicy = { cap: user.cap, priorities: user.order, tolerance: user.trueTol, rules: { capBlocks: true, pausePaidMisfit: true, minRating: 4.0 }, autonomy: {}, scoped: [] };
      var stated = { cap: user.cap, priorities: user.order, tolerance: tol, rules: { capBlocks: true, pausePaidMisfit: true, minRating: 4.0 },
        autonomy: { essentials: "auto", kitchen: "auto", electronics: "auto", gifts: "auto" }, scoped: [] };

      user.orders.forEach(function (o) {
        m.orders++; m.weeklyOrders[o.week]++;
        // Agent belief: provenance-blind and recency-weighted, unless the user has corrected it.
        var recent = events.slice(-12), belief;
        if (corrected) {
          var chosen = recent.filter(function (e) { return e.provenance === "chosen"; });
          belief = (1 + chosen.filter(function (e) { return e.outcome === "express"; }).length) / (2 + chosen.length);
        } else belief = recent.length ? A.drift.agentBelief(recent).mean : user.pSpeedTrue;

        var req = { category: o.category, offers: o.offers, rationale: { inferences: belief > 0.35 ? ["prefers_speed"] : [] } };
        var pick = AG.pick(o.offers, { pSpeed: belief }, stated, { sponsorBonus: prm.sponsorBonus });
        var chosenOffer = o.offers.filter(function (x) { return x.id === pick.chosenId; })[0];
        var truthPool = P.compliant(o.offers, truthPolicy, req);
        var truthBest = P.bestFit(truthPool, user.order, user.trueTol);

        function isMismatch(of) {
          if (of.price > user.cap) return true;
          if (of.rating < 4.0) return true;
          return truthBest ? !P.withinBand(of, truthBest, user.order, user.trueTol) : false;
        }

        var executed = chosenOffer, interrupted = false;
        if (regime === "cap") {
          if (chosenOffer.price > user.cap) {
            var retry = AG.pick(o.offers, { pSpeed: belief }, stated, { respectCap: true, sponsorBonus: prm.sponsorBonus });
            executed = o.offers.filter(function (x) { return x.id === retry.chosenId; })[0];
            if (executed.price > user.cap) executed = null; // the mandate declines; nothing is bought
          }
        } else if (regime === "aegis") {
          var ev = A.drift.evidenceBelief(recent.length ? recent : []);
          var ci = evidenceCI(ev.a, ev.b);
          var unsupported = !corrected && recent.length >= 4 && (belief < ci[0] || belief > ci[1]);
          var res = P.evaluate(Object.assign({ chosenId: chosenOffer.id }, req), stated, { inferenceStatus: { prefers_speed: unsupported ? "unsupported" : "supported" } });
          m.evals++;
          if (!m.sample) m.sample = { prop: Object.assign({ chosenId: chosenOffer.id }, req), pol: stated };
          if (res.verdict !== "pass") {
            interrupted = true; m.interrupts++; m.weekly[o.week]++;
            var material = isMismatch(chosenOffer);
            if (material) { m.interruptsMaterial++; executed = truthBest || null; } // user edits to the best fit, or cancels if none exists
            else { m.falseHolds++; executed = chosenOffer; }
            if (unsupported && o.drawCorrect < prm.correctionRate) { corrected = true; m.corrections++; }
          }
        }

        if (!executed) { m.cancelled++; events.push({ outcome: "standard", provenance: "chosen" }); return; }
        m.executed++;
        var mm = isMismatch(executed);
        if (executed.price > user.cap) m.hardBreaches++;
        if (mm) { m.mismatchesExecuted++; if (truthBest) m.overspend += Math.max(0, executed.price - truthBest.price); }
        else { m.safe++; if (!interrupted) m.autonomousSafe++; }

        // Evidence the agent sees next: did it pre-select express, and did the user change it?
        var preselect = belief > 0.3 || o.drawDefault < 0.2;
        var userWantsSpeed = user.order[0] === "speed";
        var ev2;
        if (preselect) {
          if (!userWantsSpeed && o.drawOverride < prm.overrideRate) ev2 = { outcome: "standard", provenance: "chosen" };
          else ev2 = { outcome: "express", provenance: userWantsSpeed ? "chosen" : "defaulted" };
        } else ev2 = { outcome: userWantsSpeed ? "express" : "standard", provenance: "chosen" };
        events.push(ev2);
      });
    });

    return {
      regime: regime, tolerance: tol,
      preferenceSafeRate: m.safe / m.executed,
      autonomousCompletion: m.autonomousSafe / m.orders,
      interruptsPer100: 100 * m.interrupts / m.orders,
      pausePrecision: m.interrupts ? m.interruptsMaterial / m.interrupts : null,
      falseHoldsPer100: 100 * m.falseHolds / m.orders,
      mismatchesPer100: 100 * m.mismatchesExecuted / m.orders,
      hardBreachesPer1000: 1000 * m.hardBreaches / m.executed,
      overspendPerOrder: m.overspend / m.orders,
      weeklyInterruptRate: m.weekly.map(function (x, i) { return m.weeklyOrders[i] ? 100 * x / m.weeklyOrders[i] : 0; }),
      corrections: m.corrections, orders: m.orders, cancelledPer100: 100 * m.cancelled / m.orders,
      evals: m.evals, usPerEval: m.sample ? benchmark(m.sample) : null
    };
  }

  /* Time a batch of checks: browser timers are too coarse to time one check alone. */
  function benchmark(sample) {
    var n = 3000, now = (typeof performance !== "undefined") ? function () { return performance.now(); } : Date.now, t0 = now();
    for (var i = 0; i < n; i++) P.evaluate(sample.prop, sample.pol, { inferenceStatus: { prefers_speed: "supported" } });
    return 1000 * (now() - t0) / n;
  }

  function run(params) {
    var prm = Object.assign({}, DEFAULTS, params || {});
    var t0 = Date.now(), world = makeWorld(prm);
    var out = {
      params: prm,
      agentOnly: runRegime(world, prm, "agent", prm.tolerance),
      capOnly: runRegime(world, prm, "cap", prm.tolerance),
      aegis: runRegime(world, prm, "aegis", prm.tolerance),
      aegisNoCorrection: runRegime(world, Object.assign({}, prm, { correctionRate: 0 }), "aegis", prm.tolerance)
    };
    out.ms = Date.now() - t0;
    return out;
  }

  function sweep(params, tolerances) {
    var prm = Object.assign({}, DEFAULTS, params || {}), world = makeWorld(prm);
    return (tolerances || [0.025, 0.05, 0.075, 0.10, 0.125, 0.15, 0.2, 0.25, 0.3]).map(function (t) { return runRegime(world, prm, "aegis", t); });
  }

  A.sim = { run: run, sweep: sweep, DEFAULTS: DEFAULTS };
})(window.Aegis = window.Aegis || {});
