# Aegis prototype: test report

Run 2026-10-25 04:01 UTC · Chromium via Playwright · network off · 1440 px and 390 px

**83 of 83 checks passed.**

| ID | Where | Check | Result |
|---|---|---|---|
| U01 | engine | SHA-256 of empty string | pass |
| U01 | engine | SHA-256 of 'abc' | pass |
| U01 | engine | SHA-256 of the 448-bit FIPS message | pass |
| U01 | engine | SHA-256 of UTF-8 text (₹) | pass |
| U02 | engine | HMAC-SHA-256 RFC 4231 case 2 | pass |
| U02 | engine | Canonical JSON is key-order independent | pass |
| U03 | engine | Beta(1,6) 90% interval matches closed form within 0.005 | pass |
| U03 | engine | Beta mean | pass |
| U04 | engine | Drift: agent belief 57%, evidence 14%, flagged unsupported | pass |
| U04 | engine | Drift: only actively chosen orders count | pass |
| U05 | engine | Refill passes | pass |
| U05 | engine | Air fryer ₹6,499 pauses (no hard rule broken) | pass |
| U05 | engine | ₹17,499 phone blocks on the cap | pass |
| U05 | engine | Renewal blocks on category autonomy | pass |
| U05 | engine | Below-floor seller pauses | pass |
| U06 | engine | Deterministic: same input gives the same checks | pass |
| U07 | engine | Tolerance boundary: ₹11,000 passes at 10% | pass |
| U07 | engine | Tolerance boundary: ₹11,001 pauses at 10% | pass |
| U07 | engine | Cap boundary: ₹10,500 within, ₹10,501 blocks | pass |
| U08 | engine | Scoped rule: express gift passes only with the rule | pass |
| U08 | engine | Unsupported inference pauses an otherwise fitting order | pass |
| U09 | engine | Agent with a drifted belief stretches the cap and picks ₹17,499 | pass |
| U09 | engine | Agent with the corrected belief picks ₹13,299 | pass |
| U10 | engine | Ledger verifies, then detects tampering at the edited entry | pass |
| U10 | engine | Ledger detects a broken link | pass |
| U11 | engine | Countersignature verifies, and fails if the cart changes | pass |
| U12 | engine | Simulation is reproducible with a fixed seed | pass |
| U12 | engine | Release gate holds: zero hard-rule breaches under Aegis across seeds | pass |
| U12 | engine | Agent alone does breach hard rules (the test can fail) | pass |
| E01 | 1440px | Welcome card offers the tour, and can be dismissed | pass |
| E02 | 1440px | Routine refill passes silently and is countersigned | pass |
| E03 | 1440px | ₹6,499 air fryer is paused, not blocked, and flagged as something a cap would miss | pass |
| E04 | 1440px | Choosing the best fit (₹4,999) passes; memory panel shows rules unchanged | pass |
| E05 | 1440px | ₹17,499 phone is blocked before payment with the exact gap | pass |
| E06 | 1440px | Exception dialog: confirm disabled until ticked; Escape cancels | pass |
| E07 | 1440px | One-time exception buys this order only; cap and version unchanged | pass |
| E08 | 1440px | “Need it by tomorrow” picks the ₹14,999 next-day option for this order only | pass |
| E09 | 1440px | After a block, Kai respects the cap, but its speed guess still gets a ₹14,999 pick paused | pass |
| E10 | 1440px | Approve once buys it without learning a preference | pass |
| E11 | 1440px | “This pause wasn't needed” is logged; the order still waits | pass |
| E12 | 1440px | Kai can't change a rule, in the UI or via the store; it becomes a suggestion | pass |
| E13 | 1440px | Only the user's acceptance raises the cap (version 2, new fingerprint) | pass |
| E14 | 1440px | With the higher cap the same phone is paused, not blocked | pass |
| E15 | 1440px | Editing tolerance and saving creates version 2 with a new hash | pass |
| E16 | 1440px | Drift shows 57% vs 14%; scoped correction makes the next phone (₹13,299) and the gift pass | pass |
| E17 | 1440px | After an outright rejection, Kai picks the cheaper frame that still meets Friday (₹1,249), and it passes | pass |
| E18 | 1440px | A newer proposal supersedes an undecided one, logged as never executed | pass |
| E19 | 1440px | Ledger verifies, detects tampering at the edited entry, and recovers | pass |
| E20 | 1440px | Ledger downloads as JSON with policy versions and a verification result | pass |
| E21 | 1440px | Countersignature on a bought order verifies | pass |
| E22 | 1440px | Lab runs the real engine: zero breaches under Aegis, reproducible, trade-off curve drawn | pass |
| E23 | 1440px | Guided tour runs all 11 steps end to end | pass |
| E24 | 1440px | Keyboard: Enter on a focused request runs it | pass |
| E25 | 1440px | No horizontal scrolling on any of the five screens | pass |
| E26 | 1440px | Offline: zero network requests | pass |
| E27 | 1440px | No JavaScript errors | pass |
| E01 | 390px | Welcome card offers the tour, and can be dismissed | pass |
| E02 | 390px | Routine refill passes silently and is countersigned | pass |
| E03 | 390px | ₹6,499 air fryer is paused, not blocked, and flagged as something a cap would miss | pass |
| E04 | 390px | Choosing the best fit (₹4,999) passes; memory panel shows rules unchanged | pass |
| E05 | 390px | ₹17,499 phone is blocked before payment with the exact gap | pass |
| E06 | 390px | Exception dialog: confirm disabled until ticked; Escape cancels | pass |
| E07 | 390px | One-time exception buys this order only; cap and version unchanged | pass |
| E08 | 390px | “Need it by tomorrow” picks the ₹14,999 next-day option for this order only | pass |
| E09 | 390px | After a block, Kai respects the cap, but its speed guess still gets a ₹14,999 pick paused | pass |
| E10 | 390px | Approve once buys it without learning a preference | pass |
| E11 | 390px | “This pause wasn't needed” is logged; the order still waits | pass |
| E12 | 390px | Kai can't change a rule, in the UI or via the store; it becomes a suggestion | pass |
| E13 | 390px | Only the user's acceptance raises the cap (version 2, new fingerprint) | pass |
| E14 | 390px | With the higher cap the same phone is paused, not blocked | pass |
| E15 | 390px | Editing tolerance and saving creates version 2 with a new hash | pass |
| E16 | 390px | Drift shows 57% vs 14%; scoped correction makes the next phone (₹13,299) and the gift pass | pass |
| E17 | 390px | After an outright rejection, Kai picks the cheaper frame that still meets Friday (₹1,249), and it passes | pass |
| E18 | 390px | A newer proposal supersedes an undecided one, logged as never executed | pass |
| E19 | 390px | Ledger verifies, detects tampering at the edited entry, and recovers | pass |
| E20 | 390px | Ledger downloads as JSON with policy versions and a verification result | pass |
| E21 | 390px | Countersignature on a bought order verifies | pass |
| E22 | 390px | Lab runs the real engine: zero breaches under Aegis, reproducible, trade-off curve drawn | pass |
| E23 | 390px | Guided tour runs all 11 steps end to end | pass |
| E24 | 390px | Keyboard: Enter on a focused request runs it | pass |
| E25 | 390px | No horizontal scrolling on any of the five screens | pass |
| E26 | 390px | Offline: zero network requests | pass |
| E27 | 390px | No JavaScript errors | pass |

Not covered: browsers other than Chromium; screen readers; real agents, payments or stores (none exist; all data is simulated).
