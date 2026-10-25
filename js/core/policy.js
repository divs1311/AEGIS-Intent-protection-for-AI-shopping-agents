/* Aegis core · policy engine
 *
 * Deterministic and explainable: the same proposal and policy always give the
 * same verdict. No model sits in the decision path. (An LLM could word the
 * explanation in production; it could never change the verdict.)
 *
 * Verdicts:  BLOCK  a rule the user marked as blocking is broken
 *            PAUSE  no hard rule broken, but a material conflict with stated intent
 *            PASS   everything fits; the order goes through with no interruption
 *
 * "Material" is defined by the user's own tolerance: with value first and a 10%
 * tolerance, Aegis pauses only when the chosen offer costs more than 10% above
 * the cheapest comparable offer that meets every rule.
 */
(function (A) {
  "use strict";

  var now = (typeof performance !== "undefined" && performance.now) ? function () { return performance.now(); } : Date.now;

  var DIM = {
    value: { label: "Value for money", better: function (a, b) { return a.price - b.price; } },
    speed: { label: "Fastest delivery", better: function (a, b) { return a.days - b.days || a.price - b.price; } },
    quality: { label: "Top-rated sellers", better: function (a, b) { return b.rating - a.rating || a.price - b.price; } }
  };

  function inr(n) { return "₹" + Math.round(n).toLocaleString("en-IN"); }
  function pct(x) { return (Math.round(x * 1000) / 10).toFixed(1).replace(/\.0$/, "") + "%"; }

  /* Effective priorities for this order: a scoped rule (e.g. gifts with a deadline) overrides the default order. */
  function effectivePriorities(policy, proposal) {
    var ctx = proposal.context || {};
    var scoped = (policy.scoped || []).filter(function (r) {
      return (!r.when.category || r.when.category === proposal.category) && (!r.when.deadline || !!ctx.deadlineDays);
    })[0];
    return { order: scoped ? scoped.priorities : policy.priorities, scoped: scoped || null };
  }

  /* Offers that satisfy every rule the user wrote (cap, rating floor, deadline if given). */
  function compliant(offers, policy, proposal) {
    var ctx = proposal.context || {};
    return offers.filter(function (o) {
      if (policy.rules.capBlocks && o.price > policy.cap) return false;
      if (o.rating < policy.rules.minRating) return false;
      if (ctx.deadlineDays && o.days > ctx.deadlineDays) return false;
      return true;
    });
  }

  /* Prioritised satisficing: keep offers within tolerance on the first priority, then pick the best on the next. */
  function bestFit(offers, order, tolerance) {
    if (!offers.length) return null;
    var first = order[0], pool = offers.slice();
    if (first === "value") {
      var minP = Math.min.apply(null, pool.map(function (o) { return o.price; }));
      pool = pool.filter(function (o) { return o.price <= minP * (1 + tolerance) + 1e-9; });
    } else if (first === "speed") {
      var minD = Math.min.apply(null, pool.map(function (o) { return o.days; }));
      pool = pool.filter(function (o) { return o.days <= minD; });
    } else {
      var maxR = Math.max.apply(null, pool.map(function (o) { return o.rating; }));
      pool = pool.filter(function (o) { return o.rating >= maxR - 0.15; });
    }
    var rest = order.slice(1).concat(["value"]);
    pool.sort(function (a, b) {
      for (var i = 0; i < rest.length; i++) { var d = DIM[rest[i]].better(a, b); if (d) return d; }
      return 0;
    });
    return pool[0];
  }

  /* Is `chosen` inside the user's tolerance band on their first priority? */
  function withinBand(chosen, best, order, tolerance) {
    if (!best) return true;
    var first = order[0];
    if (first === "value") return chosen.price <= best.price * (1 + tolerance) + 1e-9;
    if (first === "speed") return chosen.days <= best.days;
    return chosen.rating >= best.rating - 0.15;
  }

  function evaluate(proposal, policy, ctx) {
    ctx = ctx || {};
    var t0 = now(), checks = [], lap = t0;
    function push(c) { var t = now(); c.ms = t - lap; lap = t; checks.push(c); }

    var chosen = proposal.offers.filter(function (o) { return o.id === proposal.chosenId; })[0];
    var eff = effectivePriorities(policy, proposal);
    var tol = policy.tolerance;
    var autonomy = policy.autonomy[proposal.category] || "ask";
    var catLabel = (A.CATEGORY_LABELS && A.CATEGORY_LABELS[proposal.category]) || proposal.category;

    // 1. Autonomy for this category
    if (autonomy === "never") push({ id: "autonomy", level: "block", rule: catLabel + ": agent may not buy", detail: "You set this category to Never." });
    else if (autonomy === "ask") push({ id: "autonomy", level: "pause", rule: catLabel + ": ask me first", detail: "You review every purchase in this category." });
    else push({ id: "autonomy", level: "pass", rule: catLabel + ": automatic", detail: "Automatic, as long as every other check passes." });

    // 2. Spending cap (a blocking rule by default)
    var overCap = chosen.price > policy.cap;
    if (overCap) push({ id: "cap", level: policy.rules.capBlocks ? "block" : "pause", hard: policy.rules.capBlocks,
      rule: "Never exceed " + inr(policy.cap) + " without my authorization",
      detail: inr(chosen.price) + " is " + inr(chosen.price - policy.cap) + " (" + pct((chosen.price - policy.cap) / policy.cap) + ") over your limit.",
      gap: chosen.price - policy.cap });
    else push({ id: "cap", level: "pass", rule: "Spending cap " + inr(policy.cap), detail: inr(chosen.price) + " is within your limit." });

    // 3. Seller rating floor
    if (chosen.rating < policy.rules.minRating) push({ id: "rating", level: "pause", rule: "Sellers rated " + policy.rules.minRating.toFixed(1) + "★ or higher", detail: chosen.seller + " is rated " + chosen.rating.toFixed(1) + "★." });
    else push({ id: "rating", level: "pass", rule: "Seller rating " + policy.rules.minRating.toFixed(1) + "★+", detail: chosen.seller + " · " + chosen.rating.toFixed(1) + "★." });

    // 4. Deadline from this order's context
    var dl = (proposal.context || {}).deadlineDays;
    if (dl) {
      if (chosen.days > dl) push({ id: "deadline", level: "pause", rule: "Needed within " + dl + (dl === 1 ? " day" : " days"), detail: "Arrives in " + chosen.days + " days." });
      else push({ id: "deadline", level: "pass", rule: "Needed within " + dl + (dl === 1 ? " day" : " days"), detail: "Arrives in " + chosen.days + (chosen.days === 1 ? " day." : " days.") });
    }

    // 5. Intent fit: is the choice inside the user's tolerance on their first priority?
    var pool = compliant(proposal.offers, policy, proposal);
    var best = bestFit(pool, eff.order, tol);
    var fits = withinBand(chosen, best, eff.order, tol);
    var gapR = best ? chosen.price - best.price : 0;
    var gapP = best && chosen.price ? gapR / chosen.price : 0;
    var firstLabel = DIM[eff.order[0]].label;
    if (!best) push({ id: "fit", level: "pause", rule: "Intent fit", detail: "No offer meets every rule. You decide." });
    else if (fits) push({ id: "fit", level: "pass", rule: "Fits your priority: " + firstLabel + (eff.scoped ? " (scoped)" : ""),
      detail: best.id === chosen.id ? "This is the best fit among " + proposal.offers.length + " comparable offers." : "Within your " + pct(tol) + " tolerance of the best fit." });
    else {
      var detail = eff.order[0] === "value"
        ? best.title + " meets the same need and every rule for " + inr(gapR) + " less (" + pct(gapR / best.price) + " above it; your tolerance is " + pct(tol) + ")."
        : eff.order[0] === "speed" ? best.title + " arrives in " + best.days + (best.days === 1 ? " day" : " days") + " instead of " + chosen.days + "."
        : best.title + " has a higher-rated seller.";
      push({ id: "fit", level: (chosen.price > policy.cap && policy.rules.capBlocks) ? "info" : "pause", rule: "Conflicts with your priority: " + firstLabel, detail: detail });
    }

    // 6. Commercial influence: disclosed always; pauses only when the paid offer is also not the best fit
    if (chosen.sponsored) {
      if (!fits && policy.rules.pausePaidMisfit) push({ id: "paid", level: "pause", rule: "Pause paid placements that don't fit", detail: "The seller paid for this offer's placement, and it isn't your best fit." });
      else push({ id: "paid", level: "pass", rule: "Paid placement disclosed", detail: fits ? "Sponsored, but it's also within your priorities." : "Sponsored." });
    }

    // 7. Does the agent's reasoning rest on a guess the user's own choices don't support?
    var cites = (proposal.rationale && proposal.rationale.inferences) || [];
    var weak = cites.filter(function (k) { return ctx.inferenceStatus && ctx.inferenceStatus[k] === "unsupported"; });
    if (weak.length) push({ id: "inference", level: (overCap && policy.rules.capBlocks) ? "info" : "pause", rule: "Relies on an unsupported guess",
      detail: "Kai's reason (“you prefer faster delivery”) isn't supported by the choices you actively made." });
    else if (cites.length) push({ id: "inference", level: "pass", rule: "Agent's reasoning checks out", detail: "The guess it relies on matches your corrected preferences." });

    var verdict = "pass";
    if (checks.some(function (c) { return c.level === "pause"; })) verdict = "pause";
    if (checks.some(function (c) { return c.level === "block"; })) verdict = "block";
    var primary = checks.filter(function (c) { return c.level === "block"; })[0] || checks.filter(function (c) { return c.level === "pause"; })[0] || null;

    return {
      verdict: verdict,
      checks: checks,
      primary: primary,
      failing: checks.filter(function (c) { return c.level === "block" || c.level === "pause"; }),
      chosen: chosen,
      best: best,
      fits: fits,
      gap: { rupees: Math.max(0, gapR), pct: Math.max(0, gapP), above: best && best.price ? Math.max(0, gapR / best.price) : 0 },
      priorities: eff.order,
      scoped: eff.scoped,
      ms: now() - t0
    };
  }

  A.policy = { evaluate: evaluate, bestFit: bestFit, compliant: compliant, effectivePriorities: effectivePriorities, withinBand: withinBand, DIM: DIM, inr: inr, pct: pct };
})(window.Aegis = window.Aegis || {});
