/* Aegis · application state
 *
 * One rule the code enforces everywhere: the user's policy can only be written
 * by the user. Agent attempts are rejected, logged to the ledger and turned
 * into suggestions the user can accept or dismiss.
 */
(function (A) {
  "use strict";

  var C = A.crypto, P = A.policy, L = A.ledger;
  var listeners = [];
  var S;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function policyHash(pol) {
    var p = clone(pol); delete p.version; delete p.hash; delete p.updatedAt; delete p.updatedBy;
    return C.sha256(C.canonical(p));
  }

  var clock;
  function tick() {
    clock.m += 2 + (clock.n++ % 3);
    if (clock.m >= 60) { clock.m -= 60; clock.h++; }
    return "25 Oct, " + String(clock.h).padStart(2, "0") + ":" + String(clock.m).padStart(2, "0");
  }

  function reset() {
    clock = { h: 9, m: 40, n: 0 };
    var pol = clone(A.DEFAULT_POLICY);
    pol.hash = policyHash(pol); pol.updatedAt = "12 Aug, 09:14"; pol.updatedBy = "You";
    S = {
      policy: pol,
      history: [clone(pol)],
      suggestions: [],
      evidence: clone(A.EVIDENCE),
      correction: null,
      agent: { respectCap: false },
      decisions: [],
      activeId: null,
      ledger: L.create(),
      tamper: null,
      lab: null,
      falseHolds: 0
    };
    S.ledger.append({ t: "12 Aug, 09:14", kind: "policy", actor: "You", title: "Rules created (version 1)", detail: "Cap ₹15,000 · value first · 10% tolerance", outcome: "rule", policyVersion: 1 });
    emit();
  }

  function emit() { listeners.forEach(function (fn) { fn(S); }); }
  function subscribe(fn) { listeners.push(fn); }
  function get() { return S; }

  function log(e) { e.t = e.t || tick(); e.policyVersion = S.policy.version; return S.ledger.append(e); }

  /* ---------- agent belief ---------- */
  function drift() { return A.drift.assess(S.evidence); }

  function inferenceStatus() {
    if (S.correction) return { prefers_speed: "corrected" };
    return { prefers_speed: drift().unsupported ? "unsupported" : "supported" };
  }

  function agentBeliefFor(req) {
    var d = drift();
    var scoped = S.policy.scoped.some(function (r) { return r.when.category === req.category && (!r.when.deadline || (req.context && req.context.deadlineDays)); });
    if (scoped) return 0.85;
    if (S.correction === "accepted") return 0.8;
    if (S.correction) return d.evidence.mean;
    return d.agent.mean;
  }

  /* ---------- policy (user-write-only) ---------- */
  function diff(a, b) {
    var out = [];
    if (a.cap !== b.cap) out.push("Cap " + P.inr(a.cap) + " → " + P.inr(b.cap));
    if (a.tolerance !== b.tolerance) out.push("Tolerance " + P.pct(a.tolerance) + " → " + P.pct(b.tolerance));
    if (a.priorities.join() !== b.priorities.join()) out.push("Priority order: " + b.priorities.map(function (k) { return A.PRIORITY_LABELS[k]; }).join(" › "));
    Object.keys(b.rules).forEach(function (k) { if (a.rules[k] !== b.rules[k]) out.push(k === "minRating" ? "Seller floor " + b.rules[k].toFixed(1) + "★" : (k === "capBlocks" ? "Over-cap " + (b.rules[k] ? "blocks" : "pauses") : "Pause paid misfits " + (b.rules[k] ? "on" : "off"))); });
    Object.keys(b.autonomy).forEach(function (k) { if (a.autonomy[k] !== b.autonomy[k]) out.push(A.CATEGORY_LABELS[k] + ": " + b.autonomy[k]); });
    if (a.scoped.length !== b.scoped.length) out.push(b.scoped.length > a.scoped.length ? "Added scoped rule: " + b.scoped[b.scoped.length - 1].label : "Removed a scoped rule");
    return out;
  }

  function writePolicy(next, actor, note) {
    if (actor !== "user") {
      log({ kind: "rejected", actor: A.USER.agent, title: "Kai tried to change your rules", detail: note + " · rejected: agents have read-only access", outcome: "rejected" });
      emit();
      return { ok: false };
    }
    var before = S.policy, changes = diff(before, next);
    if (!changes.length) return { ok: true, unchanged: true };
    var p = clone(next);
    p.version = before.version + 1; p.hash = policyHash(p); p.updatedBy = "You"; p.updatedAt = tick();
    S.policy = p; S.history.push(clone(p));
    log({ t: p.updatedAt, kind: "policy", actor: "You", title: "Rules saved as version " + p.version, detail: changes.join(" · ") + (note ? " · " + note : ""), outcome: "rule" });
    emit();
    return { ok: true, changes: changes };
  }

  /* ---------- requests and decisions ---------- */
  function decide(reqId, overrides) {
    var req = clone(A.REQUESTS[reqId]);
    if (overrides && overrides.context) req.context = overrides.context;
    var belief = agentBeliefFor(req);
    var respectCap = S.agent.respectCap || !!S.correction;
    var pick = A.agent.pick(req.offers, { pSpeed: belief }, S.policy, { respectCap: respectCap, deadlineDays: req.context && req.context.deadlineDays });
    var proposal = Object.assign(req, { chosenId: pick.chosenId });
    if (S.correction && proposal.rationale.inferences.length) proposal.rationale.text = proposal.rationale.text.replace("You've been choosing faster delivery lately, so I picked the quickest well-rated phone.", "Using your corrected preferences.");
    // A newer proposal supersedes an undecided one for the same need.
    S.decisions.forEach(function (d) {
      if (d.reqId === reqId && (d.status === "paused" || d.status === "blocked") && !d.resolution) {
        d.status = "superseded"; d.resolution = { type: "superseded" };
        log({ kind: "decision", actor: "Aegis", title: "Superseded: " + d.proposal.need, detail: "Replaced by a newer proposal; never executed", outcome: "superseded" });
      }
    });
    var ev = P.evaluate(proposal, S.policy, { inferenceStatus: inferenceStatus() });
    ev.benchUs = bench(proposal);
    var rec = {
      id: "D" + (S.decisions.length + 1), reqId: reqId, proposal: proposal, eval: ev, belief: belief, agentScores: pick.scores,
      stretch: pick.stretch, at: tick(), status: ev.verdict === "pass" ? "executed" : ev.verdict === "block" ? "blocked" : "paused",
      policyVersion: S.policy.version, policyHash: S.policy.hash, capAtDecision: S.policy.cap, resolution: null
    };
    rec.decisionHash = C.sha256(C.canonical({ proposal: proposal, policy: S.policy.hash, verdict: ev.verdict }));
    S.decisions.unshift(rec); S.activeId = rec.id;
    var chosen = ev.chosen;
    log({ t: rec.at, kind: "evaluation", actor: "Aegis", title: proposal.need + " · " + P.inr(chosen.price),
      detail: ev.verdict.toUpperCase() + (ev.primary ? " · " + ev.primary.rule : " · all " + ev.checks.length + " checks passed") + " · " + ev.benchUs.toFixed(1) + " µs",
      outcome: ev.verdict });
    if (ev.verdict === "pass") execute(rec, chosen, "auto");
    emit();
    return rec;
  }

  function execute(rec, offer, how) {
    var cart = { need: rec.proposal.need, offerId: offer.id, title: offer.title, price: offer.price, seller: offer.seller, decision: rec.id };
    rec.countersig = L.countersign(cart, S.policy.hash, how === "exception" ? "exception" : "pass", rec.decisionHash);
    rec.executedOffer = offer; rec.status = "executed";
    log({ kind: "execution", actor: how === "auto" ? "Aegis" : "You", title: "Order placed · " + offer.title + " · " + P.inr(offer.price),
      detail: (how === "auto" ? "Countersigned automatically" : how === "exception" ? "One-time exception, rule unchanged" : how === "approved" ? "Approved once, not learned as a preference" : "Edited to a compliant offer") + " · sig " + rec.countersig.sig.slice(0, 10),
      outcome: how === "exception" ? "exception" : "executed" });
  }

  /* Browsers round timers to ~0.1 ms, so time many runs and report the average. */
  function bench(proposal) {
    var n = 300, ctx = { inferenceStatus: inferenceStatus() }, t0 = performance.now();
    for (var i = 0; i < n; i++) P.evaluate(proposal, S.policy, ctx);
    return 1000 * (performance.now() - t0) / n;
  }

  function find(id) { return S.decisions.filter(function (d) { return d.id === id; })[0]; }

  function resolve(id, action, arg) {
    var d = find(id); if (!d || d.resolution) return;
    var ev = d.eval;
    if (action === "block") {
      d.status = "cancelled"; d.resolution = { type: "blocked" };
      if (ev.checks.some(function (c) { return c.id === "cap" && c.level === "block"; })) S.agent.respectCap = true;
      log({ kind: "decision", actor: "You", title: "Blocked · " + d.proposal.need, detail: "Nothing bought. Kai was told which rule applied.", outcome: "blocked" });
    } else if (action === "exception") {
      if (ev.verdict !== "block") return;
      d.resolution = { type: "exception" }; execute(d, ev.chosen, "exception");
    } else if (action === "approve") {
      if (ev.verdict !== "pause") return;
      d.resolution = { type: "approved" }; execute(d, ev.chosen, "approved");
    } else if (action === "edit") {
      var offer = d.proposal.offers.filter(function (o) { return o.id === arg; })[0];
      var ctxNow = d.context ? { deadlineDays: d.context.deadlineDays } : d.proposal.context;
      var test = P.evaluate(Object.assign({}, d.proposal, { chosenId: offer.id, context: ctxNow }), S.policy, { inferenceStatus: { prefers_speed: "supported" } });
      if (test.verdict !== "pass") return { ok: false, eval: test };
      d.resolution = { type: "edited", from: ev.chosen, eval: test };
      if (ev.checks.some(function (c) { return c.id === "cap" && c.level === "block"; })) S.agent.respectCap = true;
      execute(d, offer, "edited");
    } else if (action === "context") {
      d.context = { deadlineDays: 1, label: "Needed by tomorrow" };
      log({ kind: "context", actor: "You", title: "Context for this order: needed by tomorrow", detail: "Applies to this order only; rules unchanged", outcome: "context" });
    } else if (action === "falseHold") {
      d.falseHold = true; S.falseHolds++;
      log({ kind: "feedback", actor: "You", title: "“This pause wasn't needed” · " + d.proposal.need, detail: "Counted toward the false-hold rate; order still awaits your decision", outcome: "feedback" });
    }
    emit();
    return { ok: true };
  }

  /* Offers re-checked against current rules (and this order's context, if the user gave one). */
  function editOptions(d) {
    var ctx = d.context ? { deadlineDays: d.context.deadlineDays } : d.proposal.context;
    return d.proposal.offers.map(function (o) {
      var ev = P.evaluate(Object.assign({}, d.proposal, { chosenId: o.id, context: ctx }), S.policy, { inferenceStatus: { prefers_speed: "supported" } });
      return { offer: o, eval: ev };
    });
  }

  /* ---------- the agent trying to rewrite a rule ---------- */
  function agentEditsRule() {
    var proposed = clone(S.policy); proposed.cap = 18000;
    var res = writePolicy(proposed, "agent", "Raise cap to ₹18,000");
    if (!S.suggestions.some(function (s) { return s.cap === 18000; }))
      S.suggestions.push({ id: "SG1", title: "Raise your cap to ₹18,000", cap: 18000, why: "Your last three electronics purchases averaged ₹16,900." });
    emit();
    return res;
  }

  function acceptSuggestion(id) {
    var sg = S.suggestions.filter(function (s) { return s.id === id; })[0]; if (!sg) return;
    var next = clone(S.policy); next.cap = sg.cap;
    S.suggestions = S.suggestions.filter(function (s) { return s.id !== id; });
    writePolicy(next, "user", "accepted Kai's suggestion");
  }

  function dismissSuggestion(id) {
    S.suggestions = S.suggestions.filter(function (s) { return s.id !== id; });
    log({ kind: "feedback", actor: "You", title: "Dismissed Kai's suggestion", detail: "No rule changed", outcome: "feedback" });
    emit();
  }

  /* ---------- drift correction ---------- */
  function correct(kind) {
    if (S.correction) return;
    S.correction = kind;
    var d = drift();
    log({ kind: "correction", actor: "You",
      title: kind === "rejected" ? "Rejected Kai's guess “prefers faster delivery”" : kind === "scoped" ? "Corrected Kai's guess: speed matters for gifts with a deadline" : "Accepted: fastest delivery is now my first priority",
      detail: "4 tolerated defaults and 1 one-off removed from preference evidence · Kai now uses " + Math.round(d.evidence.mean * 100) + "% (was " + Math.round(d.agent.mean * 100) + "%)",
      outcome: "correction" });
    var next = clone(S.policy);
    if (kind === "scoped") next.scoped.push({ id: "R-gifts", label: "Gifts with a deadline: fastest delivery first", when: { category: "gifts", deadline: true }, priorities: ["speed", "value", "quality"] });
    if (kind === "accepted") next.priorities = ["speed", "value", "quality"];
    if (kind !== "rejected") writePolicy(next, "user", "from the drift report");
    S.agent.respectCap = true;
    emit();
  }

  /* ---------- ledger tamper demo ---------- */
  function tamper() {
    var es = S.ledger.entries;
    var target = es.filter(function (e) { return e.outcome === "blocked" || e.outcome === "block"; })[0] || es[Math.min(1, es.length - 1)];
    if (!target || S.tamper) return;
    S.tamper = { seq: target.seq, original: target.detail, originalTitle: target.title };
    target.title = target.title.replace(/Blocked|BLOCK/, "Approved");
    target.detail = "PASS · rewritten after the fact";
    emit();
  }
  function restore() {
    if (!S.tamper) return;
    var e = S.ledger.entries[S.tamper.seq - 1]; e.detail = S.tamper.original; e.title = S.tamper.originalTitle;
    S.tamper = null; emit();
  }

  function setLab(r) { S.lab = r; emit(); }
  function setActive(id) { S.activeId = id; emit(); }

  reset();

  A.store = {
    get: get, subscribe: subscribe, emit: emit, reset: reset, decide: decide, resolve: resolve, editOptions: editOptions,
    writePolicy: writePolicy, agentEditsRule: agentEditsRule, acceptSuggestion: acceptSuggestion, dismissSuggestion: dismissSuggestion,
    correct: correct, drift: drift, tamper: tamper, restore: restore, setLab: setLab, setActive: setActive, find: find, policyHash: policyHash, clone: clone
  };
})(window.Aegis = window.Aegis || {});
