/* Aegis · Drift: Kai's guesses about Riya, and the evidence behind them */
(function (A) {
  "use strict";
  var U = A.ui, esc = U.esc, I = U.icon;

  var PROV = {
    chosen: { label: "You chose", cls: "p-chosen", counts: true },
    defaulted: { label: "Kai's default, unchanged", cls: "p-default", counts: false },
    context: { label: "One-off: gift deadline", cls: "p-context", counts: false }
  };

  function render(S) {
    var dr = A.store.drift(), traj = A.drift.trajectory(S.evidence);
    var am = Math.round(dr.agent.mean * 100), em = Math.round(dr.evidence.mean * 100), lo = Math.round(dr.evidence.ci[0] * 100), hi = Math.round(dr.evidence.ci[1] * 100);
    var status;
    if (!S.correction) {
      status = '<div class="drift-hero" data-test="drift-hero"><div class="dh-col dh-guess"><p class="dh-k">Kai believes</p><p class="dh-n">' + am + '%</p><p class="dh-s">of the time Riya pays extra for faster delivery</p></div>' +
        '<div class="dh-mid">' + U.chip("pause", "Unsupported guess") + '<p>Kai\'s ' + am + "% sits outside the " + lo + "–" + hi + "% range her own choices support. The chance her real rate is that high is about " + (dr.probAgentTooHigh * 100).toFixed(1) + "%.</p></div>" +
        '<div class="dh-col dh-rule"><p class="dh-k">Her own choices say</p><p class="dh-n">' + em + '%</p><p class="dh-s">90% range ' + lo + "–" + hi + "%, from " + dr.evidence.n + " active choices</p></div></div>";
    } else {
      var msg = { rejected: "You rejected the guess. Kai now uses " + em + "% everywhere.", scoped: "You corrected it: speed comes first for gifts with a deadline. Everywhere else Kai now uses " + em + "%, the rate your own choices support.", accepted: "You made fastest delivery your first priority. It's now a rule you set, not a guess." }[S.correction];
      status = '<div class="notice notice-pass" data-test="drift-resolved">' + I("check", 18) + "<div><strong>Corrected by you</strong><p>" + esc(msg) + '</p><p class="hint">This updates Kai\'s record of you. No model was retrained; the simulated agent simply reads the corrected value.</p>' +
        '<div class="row"><button class="btn btn-primary btn-sm" data-action="rerun" data-id="phone">Re-run the phone request</button><button class="btn btn-ghost btn-sm" data-action="rerun" data-id="gift">Try the Friday gift</button></div></div></div>';
    }

    var rows = S.evidence.map(function (e) {
      var p = PROV[e.provenance];
      return '<tr><td class="ev-id">' + e.id + '</td><td class="ev-date">' + esc(e.date) + '</td><td class="ev-item">' + esc(e.item) + "<small>" + esc(e.offer) + '</small></td><td class="ev-del">' + (e.outcome === "express" ? "Express" : "Standard") +
        '</td><td class="ev-prov"><span class="prov ' + p.cls + '">' + p.label + '</span></td><td class="ev-count">' + (p.counts ? I("check", 14, "ok") + "Counts" : '<span class="muted">Excluded</span>') + "</td></tr>";
    }).join("");

    var controls = S.correction ? "" :
      '<section class="panel"><div class="panel-h"><h2>Correct the guess</h2></div><div class="choices">' +
      '<button class="choice" data-action="correct" data-v="rejected"><strong>Reject it</strong><small>Value first everywhere. Kai uses ' + em + "%.</small></button>" +
      '<button class="choice choice-rec" data-action="correct" data-v="scoped"><strong>Correct it</strong><small>Speed matters only for gifts with a deadline. Adds a scoped rule you own.</small></button>' +
      '<button class="choice" data-action="correct" data-v="accepted"><strong>Accept it</strong><small>Make fastest delivery my first priority, as a rule I set.</small></button></div></section>';

    return '<header class="page-head"><h1>Kai\'s guesses about Riya</h1><p>Kai learns from orders. Aegis checks what it learned against the choices she actually made, and shows the evidence.</p></header>' +
      status +
      '<div class="drift-grid"><section class="panel"><div class="panel-h"><h2>Two estimates of the same habit</h2></div>' + A.charts.beliefs(dr) +
      '<p class="legend"><span class="lg lg-rule"></span>Supported by her active choices (shaded: 90% range) <span class="lg lg-guess"></span>Kai\'s belief</p>' +
      '<p class="method">' + I("info", 14) + "<span>Aegis models the habit as a Beta distribution updated only by choices she actively made. Kai counts every completed order, recent ones more (decay " + A.drift.DECAY + " per order), so pre-selected defaults she didn't override look like choices.</span></p></section>" +
      '<section class="panel"><div class="panel-h"><h2>How the gap opened</h2></div>' + A.charts.timeline(traj) +
      '<p class="legend"><span class="lg lg-guess"></span>You chose <span class="lg lg-hollow"></span>Kai\'s default, unchanged <span class="lg lg-context"></span>One-off context <span class="lg lg-rule"></span>Evidence</p>' +
      '<p class="insight">' + I("spark", 15) + "<span><b>Preference laundering:</b> all " + dr.expressByDefault + " of the regular orders Kai counts as “paid for speed” were express options it pre-selected itself. A default she tolerated was recorded as a choice she made.</span></p></section></div>" +
      controls +
      '<section class="panel"><div class="panel-h"><h2>Evidence: ten orders</h2></div><div class="table-wrap"><table class="evidence"><thead><tr><th>#</th><th>Date</th><th>Order</th><th>Delivery</th><th>How it happened</th><th>Aegis estimate</th></tr></thead><tbody>' + rows + "</tbody></table></div></section>";
  }

  A.views = A.views || {};
  A.views.drift = { render: render };
})(window.Aegis = window.Aegis || {});
