/* Aegis · Ledger: the tamper-evident record of every decision */
(function (A) {
  "use strict";
  var U = A.ui, esc = U.esc, I = U.icon;

  var OUT = { rule: ["info", "Rule"], pass: ["pass", "Passed"], pause: ["pause", "Paused"], block: ["block", "Blocked"], executed: ["pass", "Bought"], exception: ["pause", "Exception"],
    blocked: ["block", "Blocked by you"], rejected: ["block", "Rejected"], correction: ["info", "Correction"], context: ["info", "Context"], feedback: ["info", "Feedback"], superseded: ["info", "Superseded"] };

  function intentMandate(S) {
    var p = S.policy;
    return {
      type: "IntentMandate (modeled on AP2 concepts; not an AP2 implementation)",
      payer: "Riya · UPI Reserve Pay block (simulated)",
      shopping_intent: { categories: Object.keys(p.autonomy).filter(function (k) { return p.autonomy[k] !== "never"; }), max_amount_inr: p.cap, min_seller_rating: p.rules.minRating },
      prompt_playback: "Buy what I ask within " + U.inr(p.cap) + ", value first, and pause if something costs more than " + U.pct(p.tolerance) + " above the best fit.",
      requires_countersignature: "aegis-policy v" + p.version + " (" + U.short(p.hash, 12) + ")",
      ttl: "90 days"
    };
  }

  function render(S, ui) {
    var v = S.ledger.verify(), es = S.ledger.entries;
    var last = S.decisions.filter(function (d) { return d.countersig; })[0];
    var status = v.ok
      ? '<div class="chain chain-ok" data-test="chain-status">' + I("link", 18) + "<div><strong>Chain verified</strong><p>" + v.count + " entries, each linked to the one before. Head <code>" + U.short(v.head, 16) + "</code></p></div></div>"
      : '<div class="chain chain-bad" data-test="chain-status">' + I("block", 18) + "<div><strong>Tampering detected at entry " + v.brokenAt + "</strong><p>Its contents no longer match its hash, so every entry after it fails too. The record can't be quietly rewritten.</p></div></div>";
    var rows = es.slice().reverse().map(function (e) {
      var broken = !v.ok && e.seq >= v.brokenAt, o = OUT[e.outcome] || ["info", e.outcome];
      return '<li class="le' + (broken ? " le-broken" : "") + (S.tamper && S.tamper.seq === e.seq ? " le-tampered" : "") + '"><span class="le-seq">' + e.seq + '</span><div class="le-main"><div class="le-top">' + U.chip(o[0], o[1]) +
        '<span class="le-actor">' + esc(e.actor) + "</span><span class=\"le-t\">" + esc(e.t) + "</span></div><p class=\"le-title\">" + esc(e.title) + "</p><p class=\"le-detail\">" + esc(e.detail) + '</p></div><div class="le-hash"><code title="' + e.hash + '">' + U.short(e.hash, 10) + "</code><small>prev " + U.short(e.prev, 6) + " · v" + e.policyVersion + "</small></div></li>";
    }).join("");
    var sigOk = last ? A.ledger.checkSignature(last.countersig) : null;
    return '<header class="page-head"><h1>Decision ledger</h1><p>Every proposal, verdict, decision and rule change, in a hash-chained log that Riya owns and can export.</p></header>' +
      '<div class="ledger-top">' + status + '<div class="row wrap">' +
      '<button class="btn btn-primary btn-sm" data-action="verify">' + I("refresh", 15) + "Verify chain</button>" +
      (S.tamper ? '<button class="btn btn-ghost btn-sm" data-action="restore">Undo the tampering</button>' : '<button class="btn btn-ghost btn-sm" data-action="tamper"' + (es.length < 2 ? " disabled" : "") + ">Simulate tampering</button>") +
      '<button class="btn btn-ghost btn-sm" data-action="export">' + I("download", 15) + "Download JSON</button></div></div>" +
      (ui.verifiedAt ? '<p class="hint" data-test="verified-note">Re-computed ' + es.length + " SHA-256 hashes in " + ui.verifiedMs.toFixed(2) + " ms.</p>" : "") +
      '<div class="ledger-grid"><section class="panel"><ol class="ledger" data-test="ledger">' + rows + "</ol></section>" +
      '<aside class="panel mandate"><h2>Mandate and countersignature</h2><p class="hint">How Aegis would plug into agent payments: the user pre-signs an intent mandate, and Aegis must countersign each cart before payment. Field names are illustrative.</p>' +
      "<h4>Intent mandate</h4><pre>" + esc(JSON.stringify(intentMandate(S), null, 2)) + "</pre>" +
      (last ? "<h4>Last countersignature</h4><pre data-test=\"countersig\">" + esc(JSON.stringify(last.countersig, null, 2)) + '</pre><p class="sig-check ' + (sigOk ? "ok" : "bad") + '">' + I(sigOk ? "check" : "block", 14) + (sigOk ? "Signature verifies against the cart, policy and verdict" : "Signature does not verify") + "</p>" : '<p class="empty-line">No order has been countersigned yet.</p>') +
      "</aside></div>";
  }

  A.views = A.views || {};
  A.views.ledger = { render: render, intentMandate: intentMandate };
})(window.Aegis = window.Aegis || {});
