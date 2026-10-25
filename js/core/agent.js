/* Aegis core · simulated shopping agent ("Kai") and preference-drift detector
 *
 * The agent is a deliberately simple stand-in for a real shopping agent. It
 * scores offers with its own utility: a learned belief about how much the user
 * values speed, a taste for premium tiers, and a small bonus for paid
 * placements (the commercial nudge). It also "stretches" the user's cap when it
 * believes speed matters a lot: the preference-laundering failure mode.
 *
 * The drift detector compares two estimates of the same quantity, "when faster
 * delivery costs extra, does the user pay for it?":
 *   - the agent's belief: every completed order counts, recency-weighted,
 *     provenance-blind (tolerated defaults look like choices);
 *   - the evidence Aegis accepts: only choices the user actively made,
 *     excluding one-off contexts, as a Beta posterior with a 90% interval.
 * A guess is flagged "unsupported" when the agent's belief falls outside that interval.
 */
(function (A) {
  "use strict";

  var S = A.stats;

  /* ---------- Agent ---------- */
  function agentUtility(o, ctx) {
    var p = ctx.pSpeed, minP = ctx.minPrice;
    var priceScore = minP / o.price;
    var speedScore = Math.max(0, 1 - (o.days - ctx.minDays) / 7);
    return (1 - p) * priceScore + p * speedScore + 0.12 * (o.tier || 2) / 3 + (o.sponsored ? ctx.sponsorBonus : 0);
  }

  /* Returns {chosen, scores, effectiveCap} */
  function agentPick(offers, belief, policy, opts) {
    opts = opts || {};
    var p = belief.pSpeed;
    // The laundering failure: a strong speed belief quietly turns the cap into a soft target.
    var stretch = opts.respectCap ? 0 : Math.max(0, (p - 0.3) * 0.7);
    var effCap = policy.cap * (1 + stretch);
    var pool = offers.filter(function (o) { return o.price <= effCap && o.rating >= policy.rules.minRating; });
    if (opts.deadlineDays) { var f = pool.filter(function (o) { return o.days <= opts.deadlineDays; }); if (f.length) pool = f; }
    if (!pool.length) pool = offers.slice();
    var ctx = {
      pSpeed: p, sponsorBonus: opts.sponsorBonus == null ? 0.08 : opts.sponsorBonus,
      minPrice: Math.min.apply(null, pool.map(function (o) { return o.price; })),
      minDays: Math.min.apply(null, pool.map(function (o) { return o.days; }))
    };
    var scores = pool.map(function (o) { return { id: o.id, u: agentUtility(o, ctx) }; }).sort(function (a, b) { return b.u - a.u; });
    return { chosenId: scores[0].id, scores: scores, effectiveCap: effCap, stretch: stretch };
  }

  /* ---------- Drift detector ---------- */
  var DECAY = 0.82;

  function agentBelief(events) {
    // Provenance-blind, recency-weighted: what a naive learner concludes from every completed order.
    var a = 1, b = 1, n = events.length;
    events.forEach(function (e, i) {
      var w = Math.pow(DECAY, n - 1 - i);
      if (e.outcome === "express") a += w; else b += w;
    });
    return { a: a, b: b, mean: a / (a + b) };
  }

  function evidenceBelief(events, opts) {
    opts = opts || {};
    // Only choices the user actively made; defaults they merely tolerated and one-off contexts are excluded.
    var used = events.filter(function (e) { return e.provenance === "chosen"; });
    var a = 1, b = 1;
    used.forEach(function (e) { if (e.outcome === "express") a += 1; else b += 1; });
    var ci = S.betaInterval(a, b, 0.9);
    return { a: a, b: b, mean: a / (a + b), ci: ci, n: used.length };
  }

  function assess(events) {
    var ag = agentBelief(events), ev = evidenceBelief(events);
    var outside = ag.mean < ev.ci[0] || ag.mean > ev.ci[1];
    var counts = { chosen: 0, defaulted: 0, context: 0 };
    events.forEach(function (e) { counts[e.provenance] = (counts[e.provenance] || 0) + 1; });
    var expressByDefault = events.filter(function (e) { return e.outcome === "express" && e.provenance === "defaulted"; }).length;
    var expressAll = events.filter(function (e) { return e.outcome === "express"; }).length;
    return {
      agent: ag, evidence: ev, unsupported: outside,
      probAgentTooHigh: S.betaTail(ev.a, ev.b, ag.mean),
      counts: counts, expressByDefault: expressByDefault, expressAll: expressAll
    };
  }

  /* Running agent belief after each event, for the timeline chart. */
  function trajectory(events) {
    var out = [];
    for (var i = 1; i <= events.length; i++) {
      var sub = events.slice(0, i);
      out.push({ i: i, id: events[i - 1].id, agent: agentBelief(sub).mean, evidence: evidenceBelief(sub).mean, provenance: events[i - 1].provenance });
    }
    return out;
  }

  A.agent = { pick: agentPick, utility: agentUtility };
  A.drift = { agentBelief: agentBelief, evidenceBelief: evidenceBelief, assess: assess, trajectory: trajectory, DECAY: DECAY };
})(window.Aegis = window.Aegis || {});
