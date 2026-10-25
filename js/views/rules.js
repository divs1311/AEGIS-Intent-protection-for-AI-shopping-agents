/* Aegis · Your rules: the user-owned policy */
(function (A) {
  "use strict";
  var U = A.ui, esc = U.esc, I = U.icon;

  function seg(action, opts, active, attrs) {
    return '<div class="seg" role="radiogroup">' + opts.map(function (o) {
      var on = o.v === active;
      return '<button type="button" role="radio" aria-checked="' + on + '" class="seg-b' + (on ? " on" : "") + '" data-action="' + action + '" data-v="' + o.v + '"' + (attrs || "") + ">" + o.l + "</button>";
    }).join("") + "</div>";
  }

  function tierTag(kind) { return '<span class="tier tier-' + kind + '">' + (kind === "block" ? I("block", 12) + "Blocks" : I("pause", 12) + "Pauses") + "</span>"; }

  function prettyPolicy(p) {
    var o = A.store.clone(p); delete o.hash; delete o.updatedAt; delete o.updatedBy;
    return JSON.stringify(o, null, 2);
  }

  function render(S, ui) {
    var d = ui.draft, pol = S.policy;
    var changes = A.store.get() && (function () { var tmp = A.store.clone(d); return diffLines(pol, tmp); })();
    var sugg = S.suggestions.map(function (s) {
      return '<div class="notice notice-guess" data-test="suggestion">' + I("bot", 18) + '<div><strong>Kai suggests: ' + esc(s.title) + "</strong><p>" + esc(s.why) + " Suggestions never change your rules until you accept them.</p>" +
        '<div class="row"><button class="btn btn-primary btn-sm" data-action="acceptSuggestion" data-id="' + s.id + '">Accept and save</button><button class="btn btn-ghost btn-sm" data-action="dismissSuggestion" data-id="' + s.id + '">Dismiss</button></div></div></div>';
    }).join("");

    var prios = d.priorities.map(function (k, i) {
      return '<li class="prio"><span class="prio-n">' + (i + 1) + '</span><span class="prio-l">' + A.PRIORITY_LABELS[k] + "</span>" +
        '<button class="icon-btn" data-action="prioUp" data-i="' + i + '" aria-label="Move ' + A.PRIORITY_LABELS[k] + ' up"' + (i === 0 ? " disabled" : "") + ">" + I("up", 15) + "</button>" +
        '<button class="icon-btn" data-action="prioDown" data-i="' + i + '" aria-label="Move ' + A.PRIORITY_LABELS[k] + ' down"' + (i === d.priorities.length - 1 ? " disabled" : "") + ">" + I("down", 15) + "</button></li>";
    }).join("");

    var auto = Object.keys(A.CATEGORY_LABELS).map(function (k) {
      return '<div class="auto-row"><span>' + A.CATEGORY_LABELS[k] + "</span>" + seg("autonomy", [{ v: "auto", l: "Automatic" }, { v: "ask", l: "Ask me" }, { v: "never", l: "Never" }], d.autonomy[k], ' data-cat="' + k + '"') + "</div>";
    }).join("");

    var scoped = d.scoped.length ? d.scoped.map(function (r, i) {
      return '<li class="scoped">' + I("clock", 15) + "<span><strong>" + esc(r.label) + '</strong><small>Added from the drift report. Applies only when the order is a gift with a deadline.</small></span><button class="btn btn-ghost btn-sm" data-action="removeScoped" data-i="' + i + '">Remove</button></li>';
    }).join("") : '<li class="empty-line">None yet. Corrections you make on the drift report can add one.</li>';

    var ex = Math.round(10000 * (1 + d.tolerance));
    var versions = S.history.slice().reverse().map(function (p) {
      return "<li><span>Version " + p.version + "</span><code>" + U.short(p.hash, 12) + "</code><small>" + esc(p.updatedAt) + "</small></li>";
    }).join("");

    return '<header class="page-head"><h1>Your rules</h1><p>What “acting for Riya” means. Aegis checks every purchase against these. Kai can read them but can\'t change them.</p></header>' + sugg +
      '<div class="rules-grid">' +
      '<section class="panel"><div class="panel-h"><h2>Spending cap per purchase</h2>' + tierTag("block") + '</div><p class="big-num" id="capVal">' + U.inr(d.cap) + "</p>" +
      '<input type="range" id="capRange" min="5000" max="50000" step="500" value="' + d.cap + '" aria-label="Spending cap">' +
      '<label class="toggle"><input type="checkbox" class="switch" data-action="toggle" data-key="capBlocks"' + (d.rules.capBlocks ? " checked" : "") + '><span>Over the cap needs my explicit authorization</span></label></section>' +

      '<section class="panel"><div class="panel-h"><h2>What matters most</h2></div><ol class="prios">' + prios + '</ol><p class="hint">Aegis compares offers in this order. Today: value first.</p></section>' +

      '<section class="panel"><div class="panel-h"><h2>How much extra you\'ll pay for your second priority</h2>' + tierTag("pause") + '</div><p class="big-num" id="tolVal">' + U.pct(d.tolerance) + "</p>" +
      '<input type="range" id="tolRange" min="0" max="0.3" step="0.025" value="' + d.tolerance + '" aria-label="Tolerance">' +
      '<p class="hint" id="tolHint">If the best-value option costs ₹10,000, Kai may pay up to ' + U.inr(ex) + " for something faster without asking. Above that, Aegis pauses.</p></section>" +

      '<section class="panel"><div class="panel-h"><h2>Review rules</h2>' + tierTag("pause") + "</div>" +
      '<label class="toggle"><input type="checkbox" class="switch" data-action="toggle" data-key="pausePaidMisfit"' + (d.rules.pausePaidMisfit ? " checked" : "") + '><span>Pause paid placements that aren\'t my best fit<small>A sponsored offer that also fits passes normally.</small></span></label>' +
      '<div class="auto-row"><span>Lowest seller rating</span>' + seg("minRating", [{ v: "3.5", l: "3.5★" }, { v: "4", l: "4.0★" }, { v: "4.5", l: "4.5★" }], String(d.rules.minRating)) + "</div></section>" +

      '<section class="panel span2"><div class="panel-h"><h2>Autonomy by category</h2></div>' + auto + '<p class="hint">Automatic still runs every check above. It just skips the question when everything fits.</p></section>' +

      '<section class="panel span2"><div class="panel-h"><h2>Scoped rules</h2></div><ul class="scoped-list">' + scoped + "</ul></section>" +
      "</div>" +

      '<div class="savebar' + (changes.length ? " dirty" : "") + '" data-test="savebar"><div>' + I("lock", 16) + "<span>" +
      (changes.length ? "<b>" + changes.length + " unsaved " + (changes.length === 1 ? "change" : "changes") + ":</b> " + esc(changes.join(" · ")) : "Version " + pol.version + " · fingerprint <code>" + U.short(pol.hash, 12) + "</code> · write access: you only") + "</span></div>" +
      (changes.length ? '<div class="row"><button class="btn btn-ghost btn-sm" data-action="discard">Discard</button><button class="btn btn-primary btn-sm" data-action="savePolicy">Save as version ' + (pol.version + 1) + "</button></div>" : "") + "</div>" +

      '<details class="code"><summary>' + I("chip", 16) + "Policy as code · version " + pol.version + " · SHA-256 <code>" + U.short(pol.hash, 16) + "</code></summary>" +
      '<pre data-test="policy-json">' + esc(prettyPolicy(pol)) + '</pre><div class="code-side"><h4>Versions</h4><ul class="versions">' + versions + "</ul>" +
      '<p class="hint">Every check records the version it used, so any decision can be replayed against the exact rules in force.</p></div></details>';
  }

  function diffLines(a, b) {
    var out = [], P = A.policy;
    if (a.cap !== b.cap) out.push("cap " + P.inr(b.cap));
    if (a.tolerance !== b.tolerance) out.push("tolerance " + P.pct(b.tolerance));
    if (a.priorities.join() !== b.priorities.join()) out.push(A.PRIORITY_LABELS[b.priorities[0]] + " first");
    if (a.rules.capBlocks !== b.rules.capBlocks) out.push(b.rules.capBlocks ? "over-cap blocks" : "over-cap pauses");
    if (a.rules.pausePaidMisfit !== b.rules.pausePaidMisfit) out.push("paid-placement pause " + (b.rules.pausePaidMisfit ? "on" : "off"));
    if (a.rules.minRating !== b.rules.minRating) out.push("seller floor " + b.rules.minRating.toFixed(1) + "★");
    Object.keys(b.autonomy).forEach(function (k) { if (a.autonomy[k] !== b.autonomy[k]) out.push(A.CATEGORY_LABELS[k].toLowerCase() + ": " + ({ auto: "automatic", ask: "ask me", never: "never" })[b.autonomy[k]]); });
    if (a.scoped.length !== b.scoped.length) out.push("scoped rules");
    return out;
  }

  A.views = A.views || {};
  A.views.rules = { render: render, diffLines: diffLines };
})(window.Aegis = window.Aegis || {});
