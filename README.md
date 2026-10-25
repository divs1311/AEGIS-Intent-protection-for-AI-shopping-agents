# Aegis: interactive prototype

**Aegis is a user-governed intent-protection layer for AI shopping agents.** An agent may act on your behalf. It should not quietly redefine what acting on your behalf means.

This prototype accompanies the Flipkart APM ’29 case submission. It is plain HTML, CSS and JavaScript, with no build step and no network calls.

## How to run

1. Unzip the folder.
2. Double-click `index.html`. Any modern browser works (Chrome, Edge, Firefox or Safari).
3. Choose **Take the 3-minute tour**. It walks the whole loop in 11 steps, and each step runs the real app.

## What is real and what is simulated

| Real code, running in the page | Simulated |
|---|---|
| The policy engine: deterministic checks with pass, pause or block verdicts (`js/core/policy.js`) | Kai, the shopping agent: a small scoring model, not an AI |
| Drift detection: a Beta-distribution estimate built only from choices the user actively made, with a 90% interval (`js/core/agent.js`, `js/core/stats.js`) | All products, sellers, prices and order history |
| SHA-256 and HMAC-SHA-256, written from scratch and checked against FIPS 180-4 and RFC 4231 test vectors (`js/core/crypto.js`) | The device key used for countersignatures (a demo key) |
| A hash-chained ledger with verification and a tamper demonstration (`js/core/ledger.js`) | Payments, Flipkart checkout, UPI and AP2 integration |
| A simulation lab that replays thousands of synthetic orders through the same engine (`js/core/simulate.js`) | The synthetic shoppers' behaviour, generated from stated assumptions |

No model is trained or retrained anywhere. Correcting a guess updates the record the simulated agent reads.

## The ideas it demonstrates

- **Three kinds of intent, kept apart.**
  - Rules: written by the user only.
  - Guesses: inferred by the agent, shown with their evidence.
  - Context: a one-off fact for this order, such as "needed by tomorrow".
- **An intervention ladder.**
  - Block: a hard rule is broken.
  - Pause: no rule is broken, but the choice materially conflicts with what the user said.
  - Pass: everything fits, and Aegis stays silent.
- **Materiality is the user's own setting.** With value first and a 10% tolerance, Aegis pauses only when the agent's pick costs more than 10% above the best offer that meets every rule.
- **A spending cap is not enough.** The ₹6,499 air fryer is under the ₹15,000 cap, yet costs 30% more than a comparable ₹4,999 model. Aegis pauses it; a cap would let it through.
- **Preference laundering.** Kai believes Riya pays for faster delivery 57% of the time. Her active choices support 14% (90% range 1–39%). Every regular order Kai counted as "paid for speed" was an express option it had pre-selected itself.
- **Correction lets Aegis get out of the way.** After a scoped correction ("speed matters only for gifts with a deadline"), two things change:
  - The next phone request proposes the ₹13,299 Kite, and it passes with no prompt.
  - The Friday gift ships express, also with no prompt.
- **Nothing changes behind the user's back.** Exceptions cover one order and need an explicit tick-box. Agent attempts to edit rules are rejected and logged. Every decision is in a tamper-evident ledger.

## Screens

| Screen | What to try |
|---|---|
| Checkout | Ask Kai to buy any of six requests. Each proposal shows its verdict seal, every check Aegis ran, and where Kai's pick sits among comparable offers. |
| Your rules | Change the cap, priority order, tolerance, review rules and autonomy. Saving creates a new version with its own SHA-256 fingerprint. Open **Policy as code** to see the exact rules. |
| Drift | Compare Kai's belief with the evidence, inspect all ten orders, then reject, correct or accept the guess. |
| Ledger | Verify the chain, simulate tampering and watch verification fail at that entry, then download the log as JSON. The countersignature check sits alongside. |
| Lab | Run the simulation, change the tolerance or how often users correct drift, and see the trade-off curve between interruptions and mismatches. |

On a phone the screens are in the bottom tab bar, and **Engine** opens the live inspector. On a wide desktop the inspector is always visible on the right.

## Tests (optional)

```
pip install playwright
python -m playwright install chromium
python tests/run_tests.py          # 83 checks: 23 engine unit tests + 30 browser checks at 1440 px and at 390 px, offline
python tests/mutation_check.py     # injects 8 realistic bugs one at a time; each must make a check fail
```

`tests/test_report.md` and `tests/mutation_report.md` record the last run made while preparing this submission. Results: **83 of 83 checks passed; 8 of 8 injected bugs caught.**

Not covered by the tests: browsers other than Chromium, and screen readers.

## Files

```
index.html               app shell
css/app.css              design tokens, components, responsive layout
js/core/crypto.js        SHA-256, HMAC-SHA-256, canonical JSON
js/core/stats.js         seeded random numbers, Beta distribution
js/core/policy.js        the policy engine
js/core/agent.js         simulated agent and drift detector
js/core/ledger.js        hash-chained ledger and countersignatures
js/core/simulate.js      simulation lab
js/data.js               scenario data (all fictional)
js/store.js              app state; rules are writable by the user only
js/ui/                   helpers, icons, charts
js/views/                one file per screen, plus inspector and tour
js/app.js                routing and interactions
fonts/                   Schibsted Grotesk and IBM Plex Mono (SIL Open Font License)
tests/                   automated tests and their reports
```
