/* Aegis · Guided tour: the whole loop in eleven steps, each one runs the real app */
(function (A) {
  "use strict";
  var U = A.ui, esc = U.esc, I = U.icon;

  var STEPS = [
    { t: "Riya's rules", b: "Cap ₹15,000 per purchase, value first, and a 10% tolerance: Kai may pay up to 10% above the best-value option for something faster. Only Riya can change these.", go: "rules" },
    { t: "Most orders pass silently", b: "Kai reorders detergent. Every check passes, so Aegis countersigns the cart and stays invisible.", go: "checkout", run: "request:refill" },
    { t: "Under the cap, still wrong", b: "Kai picks a ₹6,499 air fryer, a paid placement. A comparable one costs ₹4,999. A spending limit would let it through. Aegis pauses it.", go: "checkout", run: "request:fryer" },
    { t: "Choose the best fit", b: "Riya picks the ₹4,999 fryer. Aegis re-checks it, it passes, and her rules stay exactly as they were.", go: "checkout", run: "editBest" },
    { t: "Over the cap: blocked", b: "Kai proposes a ₹17,499 phone, citing her “liking for speed”. That breaks a hard rule, so payment never starts.", go: "checkout", run: "request:phone" },
    { t: "Kai tries to move the goalposts", b: "Kai asks to raise the cap to ₹18,000. Rejected: agents can read rules, never write them. It becomes a suggestion only Riya can accept.", go: "checkout", run: "request:ruleEdit" },
    { t: "Why Kai drifted", b: "Kai thinks she pays for speed 57% of the time. Her active choices say 14%. Every regular order Kai counted as “paid for speed” was an express option it had pre-selected itself.", go: "drift" },
    { t: "Correct the guess, scoped", b: "Speed matters only for gifts with a deadline. That becomes a scoped rule she owns; elsewhere Kai uses 14%.", go: "drift", run: "correct:scoped" },
    { t: "Now Aegis gets out of the way", b: "The same phone request: Kai proposes the ₹13,299 Kite and it passes with no prompt. The Friday gift ships express, also with no prompt.", go: "checkout", run: "rerunBoth" },
    { t: "A record that can't be rewritten", b: "Every step above is in a hash-chained ledger. Simulate tampering, then verify again to see the chain break.", go: "ledger", run: "verify" },
    { t: "The trade-off, quantified", b: "The same engine on thousands of synthetic orders: how many mismatches Aegis stops, and how many interruptions that costs.", go: "lab", run: "labRun" }
  ];

  function render(ui) {
    if (ui.tour == null) return "";
    if (ui.tour === -1) {
      return '<div class="welcome" role="dialog" aria-modal="true" aria-labelledby="wTitle"><div class="welcome-card">' +
        '<p class="w-kicker">' + I("shield", 18) + "Aegis · simulated prototype</p>" +
        '<h2 id="wTitle">An agent can complete a purchase and still fail you.</h2>' +
        "<p>Riya delegates shopping to Kai, an AI agent. Aegis sits between Kai's proposal and payment, checks it against her rules, and shows when Kai's guesses about her stop matching what she actually chose.</p>" +
        '<div class="row"><button class="btn btn-primary" data-action="tourStart" data-test="tour-start">' + I("play", 15) + 'Take the 3-minute tour</button><button class="btn btn-ghost" data-action="tourExit">Explore on my own</button></div>' +
        '<p class="hint">Everything is simulated: no real agent, store, payment or model. The policy engine, drift statistics, hashing and simulation are real code running in this page.</p></div></div>';
    }
    var s = STEPS[ui.tour], n = STEPS.length, done = ui.tourDone[ui.tour];
    return '<aside class="tour" aria-live="polite" data-test="tour"><div class="tour-top"><span class="tour-step">Step ' + (ui.tour + 1) + " of " + n + '</span><button class="icon-btn" data-action="tourExit" aria-label="Close tour">' + I("x", 15) + "</button></div>" +
      '<div class="tour-bar"><span style="width:' + ((ui.tour + (done ? 1 : 0.5)) / n * 100) + '%"></span></div>' +
      "<h3>" + esc(s.t) + "</h3><p>" + esc(s.b) + "</p>" +
      '<div class="row"><button class="btn btn-ghost btn-sm" data-action="tourBack"' + (ui.tour === 0 ? " disabled" : "") + ">Back</button>" +
      (s.run && !done ? '<button class="btn btn-primary btn-sm" data-action="tourDo" data-test="tour-do">' + I("play", 14) + "Show me</button>"
        : (ui.tour < n - 1 ? '<button class="btn btn-primary btn-sm" data-action="tourNext" data-test="tour-next">Next</button>' : '<button class="btn btn-primary btn-sm" data-action="tourExit">Finish</button>')) +
      "</div></aside>";
  }

  A.views = A.views || {};
  A.views.tour = { render: render, STEPS: STEPS };
})(window.Aegis = window.Aegis || {});
