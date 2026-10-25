# Mutation check

Each row injects one bug into a copy of the prototype and runs the test suite.

| Injected bug | Result | Checks that failed |
|---|---|---|
| A cap breach only pauses instead of blocking | CAUGHT | E05, U05, U07 |
| The agent is allowed to write rules | CAUGHT | E12, E13 |
| A one-time exception quietly raises the cap | CAUGHT | E07 |
| The drift detector counts tolerated defaults as choices | CAUGHT | E16, E17, E23, U04, U09 |
| Ledger verification always reports success | CAUGHT | E19, U10 |
| Tolerance boundary off by one (strict instead of inclusive) | CAUGHT | U07 |
| Aegis ignores the agent's unsupported guesses | CAUGHT | U08 |
| Simulation lets a material over-cap order through | CAUGHT | E22, U12 |
