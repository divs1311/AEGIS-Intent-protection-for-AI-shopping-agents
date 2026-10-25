/* Aegis · Engine inspector (right panel on desktop, bottom sheet on mobile) */
(function (A) {
  "use strict";
  var U = A.ui, esc = U.esc, I = U.icon;

  function render(S) {
    var p = S.policy, v = S.ledger.verify(), dr = A.store.drift(), last = S.decisions[0];
    var am = dr.agent.mean, em = dr.evidence.mean, corr = !!S.correction;
    var kai = corr ? em : am;
    return '<h2 class="insp-h">' + I("chip", 16) + "Engine</h2>" +
      '<p class="insp-sub">Runs locally in this page. Simulated agent, real algorithms.</p>' +
      '<div class="insp-block"><h3>Active policy</h3><dl class="kv">' +
      "<div><dt>Version</dt><dd>" + p.version + " · <code>" + U.short(p.hash, 8) + "</code></dd></div>" +
      "<div><dt>Cap</dt><dd>" + U.inr(p.cap) + "</dd></div>" +
      "<div><dt>First priority</dt><dd>" + A.PRIORITY_LABELS[p.priorities[0]] + "</dd></div>" +
      "<div><dt>Tolerance</dt><dd>" + U.pct(p.tolerance) + "</dd></div>" +
      "<div><dt>Scoped rules</dt><dd>" + p.scoped.length + "</dd></div>" +
      '<div><dt>Write access</dt><dd>You only</dd></div></dl></div>' +
      '<div class="insp-block"><h3>Last check</h3>' + (last ? '<p class="insp-line">' + U.chip(last.eval.verdict) + "<span>" + esc(last.proposal.need) + "</span></p>" +
        '<p class="insp-mono">' + last.eval.checks.length + " checks · " + (last.eval.benchUs || 0).toFixed(1) + " µs · <code>" + U.short(last.decisionHash, 8) + "</code></p>" : '<p class="empty-line">None yet</p>') + "</div>" +
      '<div class="insp-block"><h3>Kai\'s speed guess</h3><div class="meter" role="img" aria-label="Kai uses ' + Math.round(kai * 100) + '%, evidence supports ' + Math.round(em * 100) + '%">' +
      '<span class="meter-band" style="left:' + (dr.evidence.ci[0] * 100) + "%;width:" + ((dr.evidence.ci[1] - dr.evidence.ci[0]) * 100) + '%"></span>' +
      '<span class="meter-dot meter-rule" style="left:' + em * 100 + '%"></span><span class="meter-dot meter-guess" style="left:' + kai * 100 + '%"></span></div>' +
      '<p class="insp-mono"><span class="tx-guess">Kai uses ' + Math.round(kai * 100) + '%</span> · <span class="tx-rule">evidence ' + Math.round(em * 100) + "%</span></p>" +
      (corr ? U.chip("pass", "Corrected") : U.chip("pause", "Unsupported")) + "</div>" +
      '<div class="insp-block"><h3>Ledger</h3><p class="insp-line">' + (v.ok ? U.chip("pass", "Verified") : U.chip("block", "Broken at " + v.brokenAt)) + "<span>" + S.ledger.entries.length + ' entries</span></p><p class="insp-mono">head <code>' + U.short(S.ledger.head(), 12) + "</code></p></div>";
  }

  A.views = A.views || {};
  A.views.inspector = { render: render };
})(window.Aegis = window.Aegis || {});
