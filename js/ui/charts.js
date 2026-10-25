/* Aegis · charts (hand-rolled SVG, no libraries)
 * Colours carry meaning: indigo = what the user said / evidence, raspberry = the agent's guess,
 * grey = everything else. Status colours appear only with an icon and a label.
 */
(function (A) {
  "use strict";
  var U = A.ui;
  var COL = { rule: "#3346C9", guess: "#C0267D", context: "#0A7F9E", ink: "#141C33", muted: "#6B7489", grid: "#E6E9F0", axis: "#C9CFDB", gray: "#A6ADBD" };

  function tip(text) { return ' data-tip="' + U.esc(text) + '"'; }
  function nice(max) { var p = Math.pow(10, Math.floor(Math.log10(max))), m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  function ticks(min, max, n) {
    var step = nice((max - min) / n), out = [], v = Math.ceil(min / step) * step;
    for (; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }
  function kfmt(v) { return v >= 1000 ? "₹" + (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : "₹" + v; }

  /* 1. Offer map: price vs delivery, with the cap and the tolerance band */
  function offerMap(d, opts) {
    var ev = d.eval, offers = d.proposal.offers, pol = opts.policy;
    var W = 520, H = 230, L = 46, R = 18, T = 18, B = 40;
    var op = offers.map(function (o) { return o.price; }), maxOP = Math.max.apply(null, op);
    var capNear = pol.rules.capBlocks && pol.cap <= maxOP * 1.35;
    var prices = op.concat(capNear ? [pol.cap] : []);
    var lo = Math.min.apply(null, prices) * 0.9, hi = Math.max.apply(null, prices) * 1.06;
    if (hi - lo < 400) { lo -= 200; hi += 200; }
    var maxD = Math.max(5, Math.max.apply(null, offers.map(function (o) { return o.days; })) + 1);
    function x(v) { return L + (W - L - R) * (v - lo) / (hi - lo); }
    function y(dd) { return T + (H - T - B) * (dd / maxD); }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="Offers by price and delivery time">';
    ticks(lo, hi, 5).forEach(function (t) { s += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="' + T + '" y2="' + (H - B) + '" class="grid"/><text x="' + x(t) + '" y="' + (H - B + 16) + '" class="axis" text-anchor="middle">' + kfmt(t) + "</text>"; });
    for (var dd = 0; dd <= maxD; dd++) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(dd) + '" y2="' + y(dd) + '" class="grid"/>' + (dd ? '<text x="' + (L - 8) + '" y="' + (y(dd) + 4) + '" class="axis" text-anchor="end">' + dd + "d</text>" : "");
    s += '<text x="' + ((W + L) / 2) + '" y="' + (H - 6) + '" class="axis-title" text-anchor="middle">Price</text>';
    s += '<text x="12" y="' + ((H - B + T) / 2) + '" class="axis-title" text-anchor="middle" transform="rotate(-90 12 ' + ((H - B + T) / 2) + ')">Delivery</text>';
    if (ev.best && ev.priorities[0] === "value") {
      var b0 = x(ev.best.price), b1 = x(Math.min(hi, ev.best.price * (1 + pol.tolerance)));
      s += '<rect x="' + b0 + '" y="' + T + '" width="' + Math.max(2, b1 - b0) + '" height="' + (H - B - T) + '" class="band"' + tip("Your tolerance band: up to " + U.pct(pol.tolerance) + " above the best fit (" + U.inr(ev.best.price) + "–" + U.inr(ev.best.price * (1 + pol.tolerance)) + ")") + "/>";
      s += '<text x="' + (b0 + 4) + '" y="' + (T + 12) + '" class="label-rule">Your ' + U.pct(pol.tolerance) + " band</text>";
    }
    if (!capNear && pol.rules.capBlocks) s += '<text x="' + (W - R) + '" y="' + (T + 12) + '" class="label-cap" text-anchor="end">Cap ' + U.inr(pol.cap) + ', off chart →</text>';
    if (capNear && pol.cap > lo && pol.cap < hi) {
      s += '<line x1="' + x(pol.cap) + '" x2="' + x(pol.cap) + '" y1="' + T + '" y2="' + (H - B) + '" class="cap-line"/>';
      s += '<text x="' + (x(pol.cap) + 5) + '" y="' + (H - B - 6) + '" class="label-cap">Cap ' + U.inr(pol.cap) + "</text>";
    }
    var compliantIds = A.policy.compliant(offers, pol, d.proposal).map(function (o) { return o.id; });
    offers.forEach(function (o) {
      var isChosen = o.id === ev.chosen.id, isBest = ev.best && o.id === ev.best.id, ok = compliantIds.indexOf(o.id) > -1;
      var cx = x(o.price), cy = y(o.days);
      var t = o.title + " · " + o.seller + " · " + U.inr(o.price) + " · " + U.days(o.days) + " · " + o.rating.toFixed(1) + "★" + (o.sponsored ? " · paid placement" : "") + (ok ? "" : " · breaks a rule");
      var cls = isChosen ? "dot-guess" : isBest ? "dot-rule" : ok ? "dot-other" : "dot-out";
      s += '<g class="mark"' + tip(t) + '><circle cx="' + cx + '" cy="' + cy + '" r="14" class="hit"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (isChosen || isBest ? 6.5 : 5) + '" class="' + cls + '"/>';
      if (isChosen && isBest) s += '<circle cx="' + cx + '" cy="' + cy + '" r="10" class="ring-rule"/>';
      s += "</g>";
      if (isChosen) s += '<text x="' + cx + '" y="' + (cy - 13) + '" class="label-guess" text-anchor="middle">Kai\'s pick</text>';
      if (isBest && !isChosen) s += '<text x="' + (cx + 10) + '" y="' + (cy - 9) + '" class="label-rule">Best fit</text>';
    });
    return s + "</svg>";
  }

  /* 2. Belief curves: what the user's own choices support vs what the agent believes */
  function beliefs(dr) {
    var W = 460, H = 210, L = 30, R = 16, T = 16, B = 38;
    var ev = A.stats.betaGrid(dr.evidence.a, dr.evidence.b), ag = A.stats.betaGrid(dr.agent.a, dr.agent.b);
    var ymax = 0, i; for (i = 0; i < ev.ys.length; i++) ymax = Math.max(ymax, ev.ys[i], ag.ys[i]);
    ymax *= 1.08;
    function x(v) { return L + (W - L - R) * v; }
    function y(v) { return T + (H - T - B) * (1 - v / ymax); }
    function path(g) { var p = ""; for (var k = 0; k < g.xs.length; k += 4) p += (k ? "L" : "M") + x(g.xs[k]).toFixed(1) + "," + y(g.ys[k]).toFixed(1); return p; }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="Kai\'s belief compared with the evidence from your choices">';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) { s += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="' + T + '" y2="' + (H - B) + '" class="grid"/><text x="' + x(t) + '" y="' + (H - B + 16) + '" class="axis" text-anchor="middle">' + (t * 100) + "%</text>"; });
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" class="baseline"/>';
    s += '<text x="' + ((W + L) / 2) + '" y="' + (H - 6) + '" class="axis-title" text-anchor="middle">How often Riya pays extra for faster delivery</text>';
    var c0 = x(dr.evidence.ci[0]), c1 = x(dr.evidence.ci[1]);
    s += '<rect x="' + c0 + '" y="' + T + '" width="' + (c1 - c0) + '" height="' + (H - B - T) + '" class="band"' + tip("90% range supported by your own choices: " + Math.round(dr.evidence.ci[0] * 100) + "–" + Math.round(dr.evidence.ci[1] * 100) + "%") + "/>";
    s += '<path d="' + path(ev) + "L" + x(1) + "," + y(0) + "L" + x(0) + "," + y(0) + 'Z" class="area-rule"/>';
    s += '<path d="' + path(ev) + '" class="line-rule"/><path d="' + path(ag) + '" class="line-guess"/>';
    var em = dr.evidence.mean, am = dr.agent.mean;
    s += '<g class="mark"' + tip("Your choices support " + Math.round(em * 100) + "% (from " + dr.evidence.n + " active choices)") + '><circle cx="' + x(em) + '" cy="' + (H - B) + '" r="5" class="dot-rule"/></g>';
    s += '<g class="mark"' + tip("Kai believes " + Math.round(am * 100) + "% (from all 10 orders, defaults included, recent ones weighted more)") + '><circle cx="' + x(am) + '" cy="' + (H - B) + '" r="5" class="dot-guess"/></g>';
    s += '<text x="' + (x(em) + 8) + '" y="' + (T + 14) + '" class="label-rule">Your choices: ' + Math.round(em * 100) + "%</text>";
    s += '<text x="' + Math.min(W - R - 4, x(am) + 8) + '" y="' + (T + 30) + '" class="label-guess"' + (x(am) > W - 150 ? ' text-anchor="end"' : "") + ">Kai's guess: " + Math.round(am * 100) + "%</text>";
    return s + "</svg>";
  }

  /* 3. Drift timeline: Kai's running belief, order by order, marked by provenance */
  function timeline(traj) {
    var W = 460, H = 210, L = 38, R = 16, T = 16, B = 34, n = traj.length;
    function x(i) { return L + (W - L - R) * (i / (n - 1)); }
    function y(v) { return T + (H - T - B) * (1 - v / 0.8); }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="Kai\'s belief rose with each tolerated default">';
    [0, 0.2, 0.4, 0.6, 0.8].forEach(function (t) { s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" class="grid"/><text x="' + (L - 8) + '" y="' + (y(t) + 4) + '" class="axis" text-anchor="end">' + Math.round(t * 100) + "%</text>"; });
    var pa = "", pe = "";
    traj.forEach(function (p, i) { pa += (i ? "L" : "M") + x(i) + "," + y(p.agent); pe += (i ? "L" : "M") + x(i) + "," + y(p.evidence); });
    s += '<path d="' + pe + '" class="line-rule"/><path d="' + pa + '" class="line-guess"/>';
    var lab = { chosen: "You chose", defaulted: "Kai's default you didn't change", context: "One-off: a gift with a deadline" };
    traj.forEach(function (p, i) {
      var cx = x(i), cy = y(p.agent), t = A.EVIDENCE[i].id + " · " + A.EVIDENCE[i].item + " · " + A.EVIDENCE[i].offer + " · " + lab[p.provenance] + " · Kai now " + Math.round(p.agent * 100) + "%";
      s += '<g class="mark"' + tip(t) + '><circle cx="' + cx + '" cy="' + cy + '" r="12" class="hit"/>';
      if (p.provenance === "defaulted") s += '<circle cx="' + cx + '" cy="' + cy + '" r="5.5" class="dot-hollow"/>';
      else if (p.provenance === "context") s += '<rect x="' + (cx - 5) + '" y="' + (cy - 5) + '" width="10" height="10" rx="1.5" class="dot-context"/>';
      else s += '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" class="dot-guess"/>';
      s += '</g><text x="' + cx + '" y="' + (H - B + 16) + '" class="axis" text-anchor="middle">' + A.EVIDENCE[i].id + "</text>";
    });
    var last = traj[n - 1];
    s += '<text x="' + (x(n - 1) - 6) + '" y="' + (y(last.agent) - 10) + '" class="label-guess" text-anchor="end">Kai ' + Math.round(last.agent * 100) + "%</text>";
    s += '<text x="' + (x(n - 1) - 6) + '" y="' + (y(last.evidence) - 8) + '" class="label-rule" text-anchor="end">Evidence ' + Math.round(last.evidence * 100) + "%</text>";
    return s + "</svg>";
  }

  /* 4. Operating curve: interruptions vs mismatches across tolerance settings */
  function operatingCurve(sweep, refs, current) {
    var W = 460, H = 260, L = 44, R = 18, T = 18, B = 40;
    var xmax = Math.ceil(Math.max.apply(null, sweep.map(function (m) { return m.interruptsPer100; })) * 1.08 / 5) * 5;
    var ymax = nice(Math.max(refs.agentOnly.mismatchesPer100, refs.capOnly.mismatchesPer100) * 1.08);
    function x(v) { return L + (W - L - R) * v / xmax; }
    function y(v) { return T + (H - T - B) * (1 - v / ymax); }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="Trade-off between interruptions and mismatches">';
    ticks(0, xmax, 5).forEach(function (t) { s += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="' + T + '" y2="' + (H - B) + '" class="grid"/><text x="' + x(t) + '" y="' + (H - B + 16) + '" class="axis" text-anchor="middle">' + t + "</text>"; });
    ticks(0, ymax, 4).forEach(function (t) { s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" class="grid"/><text x="' + (L - 8) + '" y="' + (y(t) + 4) + '" class="axis" text-anchor="end">' + t + "</text>"; });
    s += '<text x="' + ((W + L) / 2) + '" y="' + (H - 6) + '" class="axis-title" text-anchor="middle">Interruptions per 100 orders</text>';
    s += '<text x="12" y="' + ((H - B + T) / 2) + '" class="axis-title" text-anchor="middle" transform="rotate(-90 12 ' + ((H - B + T) / 2) + ')">Mismatches per 100</text>';
    var p = ""; sweep.forEach(function (m, i) { p += (i ? "L" : "M") + x(m.interruptsPer100) + "," + y(m.mismatchesPer100); });
    s += '<path d="' + p + '" class="line-rule"/>';
    sweep.forEach(function (m) {
      var cur = Math.abs(m.tolerance - current) < 1e-6;
      s += '<g class="mark"' + tip("Tolerance " + U.pct(m.tolerance) + ": " + m.interruptsPer100.toFixed(1) + " interruptions, " + m.mismatchesPer100.toFixed(1) + " mismatches per 100 · pause precision " + Math.round(m.pausePrecision * 100) + "%") + '><circle cx="' + x(m.interruptsPer100) + '" cy="' + y(m.mismatchesPer100) + '" r="12" class="hit"/><circle cx="' + x(m.interruptsPer100) + '" cy="' + y(m.mismatchesPer100) + '" r="' + (cur ? 6.5 : 4) + '" class="dot-rule' + (cur ? " dot-current" : "") + '"/></g>';
      if (cur || m.tolerance === 0.025 || m.tolerance === 0.3) s += '<text x="' + (x(m.interruptsPer100) + 9) + '" y="' + (y(m.mismatchesPer100) - 8) + '" class="' + (cur ? "label-rule" : "axis") + '">' + U.pct(m.tolerance) + (cur ? " (current)" : "") + "</text>";
    });
    [["Agent alone", refs.agentOnly], ["Spending cap only", refs.capOnly]].forEach(function (r, i) {
      var cx = x(0), cy = y(r[1].mismatchesPer100);
      s += '<g class="mark"' + tip(r[0] + ": " + r[1].mismatchesPer100.toFixed(1) + " mismatches per 100, no interruptions") + '><circle cx="' + cx + '" cy="' + cy + '" r="12" class="hit"/><circle cx="' + cx + '" cy="' + cy + '" r="5" class="dot-ref"/></g>';
      s += '<text x="' + (cx + 9) + '" y="' + (cy + (i ? 14 : -6)) + '" class="axis">' + r[0] + "</text>";
    });
    return s + "</svg>";
  }

  /* 5. Weekly interruptions: with and without drift corrections */
  function weekly(withC, withoutC) {
    var W = 460, H = 220, L = 36, R = 40, T = 16, B = 34, n = withC.length;
    var ymax = nice(Math.max.apply(null, withoutC.concat(withC)) * 1.05);
    function x(i) { return L + (W - L - R) * (i / (n - 1)); }
    function y(v) { return T + (H - T - B) * (1 - v / ymax); }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="Interruptions per week with and without drift corrections">';
    ticks(0, ymax, 4).forEach(function (t) { s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" class="grid"/><text x="' + (L - 8) + '" y="' + (y(t) + 4) + '" class="axis" text-anchor="end">' + t + "</text>"; });
    for (var i = 0; i < n; i += 2) s += '<text x="' + x(i) + '" y="' + (H - B + 16) + '" class="axis" text-anchor="middle">W' + (i + 1) + "</text>";
    function line(arr, cls, name) {
      var p = ""; arr.forEach(function (v, i) { p += (i ? "L" : "M") + x(i) + "," + y(v); });
      var out = '<path d="' + p + '" class="' + cls + '"/>';
      arr.forEach(function (v, i) { out += '<g class="mark"' + tip(name + ", week " + (i + 1) + ": " + v.toFixed(1) + " interruptions per 100 orders") + '><circle cx="' + x(i) + '" cy="' + y(v) + '" r="10" class="hit"/></g>'; });
      return out;
    }
    s += line(withoutC, "line-muted", "Users never correct drift") + line(withC, "line-rule", "Users correct drift alerts");
    s += '<circle cx="' + x(n - 1) + '" cy="' + y(withC[n - 1]) + '" r="4.5" class="dot-rule"/><circle cx="' + x(n - 1) + '" cy="' + y(withoutC[n - 1]) + '" r="4.5" class="dot-ref"/>';
    s += '<text x="' + (x(n - 1) + 8) + '" y="' + (y(withC[n - 1]) + 4) + '" class="label-rule">' + withC[n - 1].toFixed(0) + "</text>";
    s += '<text x="' + (x(n - 1) + 8) + '" y="' + (y(withoutC[n - 1]) + 4) + '" class="axis">' + withoutC[n - 1].toFixed(0) + "</text>";
    return s + "</svg>";
  }

  /* Shared tooltip for every [data-tip] mark */
  function bindTooltips(root) {
    var tipEl = document.getElementById("tooltip");
    root.addEventListener("pointerover", function (e) {
      var m = e.target.closest && e.target.closest("[data-tip]");
      if (!m) return;
      tipEl.textContent = m.getAttribute("data-tip"); tipEl.hidden = false;
    });
    root.addEventListener("pointermove", function (e) {
      if (tipEl.hidden) return;
      var x = e.clientX + 14, y = e.clientY + 14, w = tipEl.offsetWidth;
      if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
      tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
    });
    root.addEventListener("pointerout", function (e) {
      var m = e.target.closest && e.target.closest("[data-tip]");
      if (m && !m.contains(e.relatedTarget)) tipEl.hidden = true;
    });
  }

  A.charts = { offerMap: offerMap, beliefs: beliefs, timeline: timeline, operatingCurve: operatingCurve, weekly: weekly, bindTooltips: bindTooltips, COL: COL };
})(window.Aegis = window.Aegis || {});
