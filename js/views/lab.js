/* Aegis · Simulation lab: what Aegis catches, and what it costs in interruptions */
(function (A) {
  "use strict";
  var U = A.ui, esc = U.esc, I = U.icon;

  function f(v, kind) {
    if (v == null) return "–";
    if (kind === "pct") return Math.round(v * 100) + "%";
    if (kind === "inr") return "₹" + Math.round(v);
    return v.toFixed(1);
  }

  var ROWS = [
    ["preferenceSafeRate", "Preference-safe purchases", "pct", "North star: bought orders that kept to the rules and fit the user's true priorities", true],
    ["autonomousCompletion", "Autonomous completion", "pct", "Paired: orders completed safely with no interruption", true],
    ["hardBreachesPer1000", "Hard-rule breaches per 1,000", "n", "Release gate: must be zero", false],
    ["mismatchesPer100", "Mismatches reaching the user per 100", "n", "Bought, but outside the user's real tolerance", false],
    ["interruptsPer100", "Interruptions per 100 orders", "n", "Pauses and blocks the user had to decide", false],
    ["pausePrecision", "Pause precision", "pct", "Share of interruptions that were genuinely material", true],
    ["falseHoldsPer100", "False holds per 100", "n", "Interruptions that weren't needed", false],
    ["overspendPerOrder", "Overspend vs best fit, per order", "inr", "Extra paid on mismatched orders, averaged over all orders", false]
  ];

  function render(S, ui) {
    var p = ui.labParams, r = S.lab;
    var controls = '<section class="panel lab-controls"><div class="panel-h"><h2>Assumptions you can change</h2></div>' +
      '<div class="ctl"><label for="labTol">Aegis tolerance <b id="labTolV">' + U.pct(p.tolerance) + '</b></label><input type="range" id="labTol" min="0.025" max="0.3" step="0.025" value="' + p.tolerance + '"></div>' +
      '<div class="ctl"><label for="labCorr">Users who correct a drift alert <b id="labCorrV">' + Math.round(p.correctionRate * 100) + '%</b></label><input type="range" id="labCorr" min="0" max="1" step="0.1" value="' + p.correctionRate + '"></div>' +
      '<div class="ctl"><span>Synthetic shoppers</span><div class="seg">' + [120, 240, 480].map(function (n) { return '<button class="seg-b' + (p.users === n ? " on" : "") + '" data-action="labUsers" data-v="' + n + '">' + n + "</button>"; }).join("") + "</div></div>" +
      '<div class="row"><button class="btn btn-primary" data-action="labRun" data-test="lab-run">' + I("play", 15) + (r ? "Run again" : "Run simulation") + '</button><button class="btn btn-ghost" data-action="labSeed">New random world</button></div>' +
      '<p class="hint">Seed ' + p.seed + " · " + p.users + " shoppers × " + A.sim.DEFAULTS.orders + " orders over 12 weeks. Same seed, same result.</p></section>";

    var results = "";
    if (ui.labBusy) results = '<section class="panel"><p class="busy"><span class="spinner"></span>Running every order through the real policy engine…</p></section>';
    else if (r) {
      var cols = [["Agent alone", r.agentOnly], ["Spending cap only", r.capOnly], ["Aegis", r.aegis]];
      var table = '<table class="kpi" data-test="lab-table"><thead><tr><th>Metric</th>' + cols.map(function (c, i) { return '<th class="' + (i === 2 ? "col-aegis" : "") + '">' + c[0] + "</th>"; }).join("") + "</tr></thead><tbody>" +
        ROWS.map(function (row) {
          return "<tr><th>" + row[1] + "<small>" + row[3] + "</small></th>" + cols.map(function (c, i) {
            var v = c[1][row[0]]; if ((row[0] === "pausePrecision") && i < 2) v = null;
            return '<td class="' + (i === 2 ? "col-aegis" : "") + '" data-label="' + c[0] + '">' + f(v, row[2]) + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table>";
      results = '<section class="panel"><div class="panel-h"><h2>Same world, three ways to delegate</h2></div><div class="table-wrap">' + table + "</div>" +
        '<p class="hint">Engine timing in this browser: ' + r.aegis.evals.toLocaleString("en-IN") + " checks, " + r.aegis.usPerEval.toFixed(1) + " µs each on average. Whole run " + r.ms + " ms.</p></section>" +
        '<div class="lab-grid"><section class="panel"><div class="panel-h"><h2>Choosing the tolerance: the trade-off</h2></div>' +
        (ui.labSweep ? A.charts.operatingCurve(ui.labSweep, r, p.tolerance) + '<p class="legend"><span class="lg lg-rule"></span>Aegis at tolerances from 2.5% to 30% <span class="lg lg-ref"></span>No Aegis (no interruptions)</p><p class="hint">Lower-left is better. Tighter tolerances catch more mismatches but interrupt more; the pilot calibrates the real setting.</p>' : '<p class="busy"><span class="spinner"></span>Sweeping tolerances…</p>') + "</section>" +
        '<section class="panel"><div class="panel-h"><h2>Correction is what lets Aegis get out of the way</h2></div>' + A.charts.weekly(r.aegis.weeklyInterruptRate, r.aegisNoCorrection.weeklyInterruptRate) +
        '<p class="legend"><span class="lg lg-rule"></span>' + Math.round(p.correctionRate * 100) + '% of users correct drift alerts <span class="lg lg-ref"></span>Nobody corrects</p><p class="hint">Without corrections the agent keeps drifting and interruptions pile up. With them, Kai\'s guesses get fixed and Aegis interrupts less each week.</p></section></div>';
    }

    return '<header class="page-head"><h1>Simulation lab</h1><p>Thousands of synthetic orders run through the same policy engine as the checkout, to show what Aegis catches and what it costs in interruptions.</p></header>' +
      '<div class="notice notice-sim">' + I("info", 16) + "<p><b>Synthetic, not a forecast.</b> Shoppers, catalogues and agent drift are generated from stated assumptions (true tolerance 5–15%, 25% paid placements, 35% of defaults overridden). Use it to compare designs and pick an operating point, not to predict real results.</p></div>" +
      controls + results;
  }

  A.views = A.views || {};
  A.views.lab = { render: render };
})(window.Aegis = window.Aegis || {});
