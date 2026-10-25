/* Aegis · Checkout: Kai's proposals and Aegis's decisions */
(function (A) {
  "use strict";
  var U = A.ui, esc = U.esc, I = U.icon;

  var REQS = [
    { id: "refill", label: "Detergent refill", note: "₹549 · routine" },
    { id: "fryer", label: "Air fryer", note: "within the cap" },
    { id: "phone", label: "New phone", note: "₹15,000 cap" },
    { id: "gift", label: "Gift by Friday", note: "has a deadline" },
    { id: "renewal", label: "Streaming renewal", note: "subscription" },
    { id: "ruleEdit", label: "Kai edits a rule", note: "raise the cap" }
  ];

  function statusChip(d) {
    var map = { executed: ["pass", d.resolution ? (d.resolution.type === "exception" ? "Exception · bought" : d.resolution.type === "approved" ? "Approved once" : "Edited · bought") : "Bought automatically"],
      paused: ["pause", "Waiting for you"], blocked: ["block", "Blocked · waiting"], cancelled: ["block", "Blocked by you"], superseded: ["info", "Superseded"] };
    var m = map[d.status] || ["info", d.status];
    return U.chip(m[0], m[1]);
  }

  function feed(S) {
    if (!S.decisions.length) return '<p class="empty-line">No proposals yet. Ask Kai to buy something.</p>';
    return '<ol class="feed" data-test="feed">' + S.decisions.map(function (d) {
      var o = d.executedOffer || d.eval.chosen;
      return '<li><button class="feed-item' + (d.id === S.activeId ? " on" : "") + '" data-action="select" data-id="' + d.id + '">' +
        '<span class="feed-thumb">' + U.thumb(o.thumb) + '</span><span class="feed-main"><strong>' + esc(d.proposal.need) + "</strong><small>" + U.inr(o.price) + " · " + esc(d.at.split(", ")[1]) + "</small></span>" + statusChip(d) + "</button></li>";
    }).join("") + "</ol>";
  }

  function offerLine(o, opts) {
    opts = opts || {};
    return '<div class="offer' + (opts.muted ? " offer-muted" : "") + '"><span class="offer-thumb">' + U.thumb(o.thumb) + '</span><span class="offer-main">' +
      (o.sponsored ? '<span class="tag tag-paid">' + I("tag", 12) + "Paid placement</span>" : "") +
      "<strong>" + esc(o.title) + '</strong><small>' + esc(o.seller) + " · " + o.rating.toFixed(1) + "★ · " + U.days(o.days) + '</small></span><span class="offer-price">' + U.inr(o.price) + "</span></div>";
  }

  function trace(ev) {
    var lvl = { pass: "check", pause: "pause", block: "block", info: "info" };
    return '<ol class="trace" data-test="trace">' + ev.checks.map(function (c) {
      return '<li class="tr-' + c.level + '"><span class="tr-ic">' + I(lvl[c.level], 15) + '</span><span class="tr-main"><strong>' + esc(c.rule) + "</strong><small>" + esc(c.detail) + "</small></span></li>";
    }).join("") + '</ol><p class="trace-foot">' + ev.checks.length + " checks in " + (ev.benchUs || 0).toFixed(1) + " µs (average of 300 runs in this browser). Deterministic: the same order and rules always give the same verdict.</p>";
  }

  function memory(d, S) {
    var r = d.resolution, pol = S.policy, kept = [], same = [];
    if (d.status === "executed" && !r) { kept = ["This order and Aegis's countersignature"]; same = ["Your rules (version " + d.policyVersion + ")", "Nothing learned from this order"]; }
    else if (r && r.type === "approved") { kept = ["Your approval of this one order"]; same = ["Your rules (version " + pol.version + ")", "Not learned as a liking for this brand or for paid placements"]; }
    else if (r && r.type === "exception") { kept = ["One exception for this order only (" + U.inr(d.executedOffer.price) + ")"]; same = ["Your " + U.inr(pol.cap) + " cap", "Not used as evidence that you prefer speed or premium"]; }
    else if (r && r.type === "edited") { kept = ["Your edited choice" + (d.context ? ", and this order's context (needed by tomorrow)" : "")]; same = ["Your rules (version " + pol.version + ")", d.context ? "The deadline applied to this order only" : "No guess about you changed"]; }
    else if (r && r.type === "blocked") { kept = ["The blocked order and the rule that applied", "Kai was told why, and won't stretch your cap again"]; same = ["Your rules (version " + pol.version + ")"]; }
    else if (r && r.type === "superseded") { kept = ["A newer proposal replaced this one; it never executed"]; same = ["Your rules"]; }
    else return "";
    return '<div class="memory" data-test="memory"><h4>What Aegis remembers</h4><ul>' +
      kept.map(function (t) { return '<li class="m-kept">' + I("check", 14) + esc(t) + "</li>"; }).join("") +
      same.map(function (t) { return '<li class="m-same">' + I("lock", 14) + "<span><b>Unchanged:</b> " + esc(t) + "</span></li>"; }).join("") + "</ul></div>";
  }

  function headline(d) {
    var ev = d.eval;
    if (d.status === "superseded") return { t: "Replaced by a newer proposal", s: "Nothing was bought." };
    if (d.resolution) {
      var r = d.resolution.type;
      if (r === "blocked") return { t: "You blocked it. Nothing was bought.", s: "Kai was told which rule applied." };
      if (r === "exception") return { t: "Bought as a one-time exception", s: "Your cap is unchanged and no agent can change it." };
      if (r === "approved") return { t: "Approved once and bought", s: "It won't be read as a new preference." };
      if (r === "edited") return { t: "Your edited choice passed every check", s: "Bought for " + U.inr(d.executedOffer.price) + ", " + U.inr(Math.max(0, d.resolution.from.price - d.executedOffer.price)) + " less than Kai's pick." };
    }
    if (ev.verdict === "pass") return { t: "Bought automatically", s: "Every check passed, so Aegis stayed out of the way." };
    if (ev.verdict === "block") return { t: "Blocked before payment", s: esc(ev.primary.detail) };
    var capOk = ev.chosen.price <= (d.capAtDecision || 15000);
    return { t: "Paused: this doesn't match what you said", s: "No hard rule is broken" + (capOk ? ". A spending limit alone would have let it through." : ".") };
  }

  function actions(d, S, ui) {
    if (d.resolution || d.status === "executed" || d.status === "superseded") return "";
    var ev = d.eval, hard = ev.verdict === "block" && ev.checks.some(function (c) { return c.id === "cap" && c.level === "block"; });
    var autonomyBlock = ev.verdict === "block" && !hard;
    var html = '<div class="actions" data-test="actions">';
    if (autonomyBlock) {
      html += '<p class="act-note">' + I("lock", 14) + "Your rules say Kai may not buy in this category. Change it on Your rules if you want it automatic.</p>";
      html += '<button class="btn btn-ghost" data-action="resolve" data-kind="block" data-id="' + d.id + '">Dismiss</button></div>';
      return html;
    }
    html += hard ? '<button class="btn btn-quiet" data-action="exception" data-id="' + d.id + '">' + I("user", 16) + "Allow once</button>"
      : '<button class="btn btn-quiet" data-action="resolve" data-kind="approve" data-id="' + d.id + '">' + I("check", 16) + "Approve as proposed</button>";
    html += '<button class="btn btn-primary" data-action="openEdit" data-id="' + d.id + '">' + I("edit", 16) + "Choose another offer</button>";
    html += '<button class="btn btn-danger" data-action="resolve" data-kind="block" data-id="' + d.id + '">' + I("block", 16) + "Block</button></div>";
    if (d.proposal.category === "electronics" && hard && !d.context) html += '<button class="ctx-ask" data-action="context" data-id="' + d.id + '">' + I("clock", 15) + "<span><b>Need it by tomorrow?</b> Tell Aegis, for this order only, and it finds an option that fits.</span></button>";
    if (!hard && !d.falseHold) html += '<button class="link-btn" data-action="falseHold" data-id="' + d.id + '">This pause wasn\'t needed</button>';
    if (d.falseHold) html += '<p class="fh-done" data-test="fh-done">' + I("check", 14) + "Logged as a possible false hold. The order still waits for your decision.</p>";
    if (ui.editFor === d.id) html += editPanel(d, ui);
    return html;
  }

  function editPanel(d, ui) {
    var opts = A.store.editOptions(d);
    return '<div class="edit" data-test="edit-panel"><h4>' + (d.context ? "Offers that arrive by tomorrow and fit your rules" : "Every offer, re-checked against your rules") + "</h4>" +
      opts.map(function (x) {
        var o = x.offer, ok = x.eval.verdict === "pass", sel = ui.editSel === o.id;
        var reason = ok ? "Passes every check" : (x.eval.primary ? x.eval.primary.rule : "Needs review");
        return '<button class="opt' + (sel ? " sel" : "") + (ok ? "" : " opt-no") + '" data-action="pick" data-id="' + o.id + '"' + (ok ? "" : " aria-disabled=\"true\"") + '>' +
          '<span class="opt-main"><strong>' + esc(o.title) + "</strong><small>" + esc(o.seller) + " · " + U.days(o.days) + " · " + o.rating.toFixed(1) + "★" + (o.sponsored ? " · paid" : "") + '</small></span><span class="opt-price">' + U.inr(o.price) + "</span>" +
          U.chip(ok ? "pass" : (x.eval.verdict === "block" ? "block" : "pause"), reason.length > 34 ? reason.slice(0, 32) + "…" : reason) + "</button>";
      }).join("") +
      '<div class="row"><button class="btn btn-primary" data-action="confirmEdit" data-id="' + d.id + '"' + (ui.editSel ? "" : " disabled") + ">Buy the selected offer</button>" +
      '<button class="btn btn-ghost" data-action="closeEdit">Cancel</button></div></div>';
  }

  function detail(d, S, ui) {
    var ev = d.eval, o = d.executedOffer || ev.chosen, h = headline(d), v = d.status === "executed" ? "pass" : d.status === "paused" ? "pause" : (d.status === "superseded" ? "pause" : "block");
    var sealVerdict = d.status === "executed" ? "pass" : ev.verdict;
    var alt = ev.best && ev.best.id !== ev.chosen.id ? ev.best : null;
    return '<article class="decision v-' + v + '" data-test="decision" data-verdict="' + ev.verdict + '">' +
      '<div class="kai"><span class="kai-av">' + I("bot", 16) + '</span><div><p class="kai-who">Kai proposes · ' + esc(d.proposal.need) + '</p><p class="kai-say">“' + esc(d.proposal.rationale.text) + "”</p>" +
      (ev.checks.some(function (c) { return c.id === "inference" && c.level !== "pass"; }) ? '<p class="kai-flag">' + I("flag", 13) + "Relies on a guess about you, not a rule you set. <a href=\"#drift\">See the evidence</a></p>" : "") + "</div></div>" +
      '<div class="receipt"><div class="receipt-body">' + offerLine(ev.chosen) +
      (alt && !(d.resolution && d.resolution.type === "edited") ? '<p class="alt-label">Best fit for your rules</p>' + offerLine(alt, { muted: true }) : "") +
      (d.resolution && d.resolution.type === "edited" ? '<p class="alt-label">You chose instead</p>' + offerLine(d.executedOffer, { muted: true }) : "") +
      '<dl class="totals"><div><dt>Your cap</dt><dd>' + U.inr(S.policy.cap) + "</dd></div><div><dt>Kai's pick</dt><dd>" + U.inr(ev.chosen.price) + "</dd></div>" +
      (ev.gap.rupees ? "<div><dt>Above best fit</dt><dd class=\"gap\">" + U.inr(ev.gap.rupees) + " (" + U.pct(ev.gap.above) + ")</dd></div>" : "<div><dt>Above best fit</dt><dd>₹0</dd></div>") + "</dl></div>" +
      '<div class="receipt-foot"><div class="verdict-text" data-test="verdict"><h3>' + h.t + "</h3><p>" + h.s + '</p><p class="meta-line">Decision ' + U.short(d.decisionHash, 10) + " · policy v" + d.policyVersion + " · checked in " + (ev.benchUs || 0).toFixed(1) + " µs</p></div>" +
      '<div class="seal-wrap">' + U.seal(sealVerdict, d.countersig ? d.countersig.sig : d.decisionHash, { animate: ui.justDecided === d.id }) + "</div></div></div>" +
      actions(d, S, ui) + memory(d, S) +
      '<div class="split"><section class="panel-sub"><h4>Why: every check Aegis ran</h4>' + trace(ev) + "</section>" +
      '<section class="panel-sub"><h4>Where Kai\'s pick sits among ' + d.proposal.offers.length + " comparable offers</h4>" + A.charts.offerMap(d, { policy: S.policy }) +
      '<p class="legend"><span class="lg lg-guess"></span>Kai\'s pick <span class="lg lg-rule"></span>Best fit for your rules <span class="lg lg-other"></span>Other offer <span class="lg lg-out"></span>Breaks a rule</p></section></div>' +
      "</article>";
  }

  function render(S, ui) {
    var active = S.decisions.filter(function (d) { return d.id === S.activeId; })[0];
    return '<header class="page-head"><h1>Agent checkout</h1><p>Kai, Riya\'s shopping agent, proposes purchases. Aegis checks each one against her rules before any money moves.</p></header>' +
      '<section class="launcher" aria-label="Ask Kai to buy"><h2>Ask Kai to buy</h2><div class="req-grid">' + REQS.map(function (r) {
        return '<button class="req" data-action="request" data-id="' + r.id + '"><strong>' + r.label + "</strong><small>" + r.note + "</small></button>";
      }).join("") + "</div></section>" +
      (ui.ruleEditNotice ? '<div class="notice notice-block" data-test="rule-reject">' + I("lock", 18) + '<div><strong>Rejected: Kai can\'t change your rules.</strong><p>Kai asked to raise your cap to ₹18,000. Your cap stays ' + U.inr(S.policy.cap) + '. It\'s saved as a suggestion that only you can accept.</p><a class="btn btn-ghost btn-sm" href="#rules">Review the suggestion</a></div></div>' : "") +
      '<div class="checkout-grid"><section class="feed-col" aria-label="Decisions"><h2>Decisions</h2>' + feed(S) + "</section>" +
      '<section class="detail-col" aria-live="polite">' + (active ? detail(active, S, ui) : '<div class="empty"><p>Pick a request above. Kai will propose a purchase and Aegis will check it.</p></div>') + "</section></div>";
  }

  A.views = A.views || {};
  A.views.checkout = { render: render };
})(window.Aegis = window.Aegis || {});
