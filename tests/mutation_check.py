"""Mutation check: do the tests actually catch bugs?

Copies the prototype, injects one realistic bug at a time, runs the test suite (desktop pass
only, for speed) and reports which checks failed. A mutation that no check catches is a gap
in the tests.   Usage:  python tests/mutation_check.py
"""
import shutil, subprocess, sys, os, pathlib, tempfile

BASE = pathlib.Path(__file__).resolve().parents[1]
MUTATIONS = [
    ("A cap breach only pauses instead of blocking", "js/core/policy.js",
     'level: policy.rules.capBlocks ? "block" : "pause"', 'level: "pause"'),
    ("The agent is allowed to write rules", "js/store.js",
     'if (actor !== "user") {', 'if (false) {'),
    ("A one-time exception quietly raises the cap", "js/store.js",
     'd.resolution = { type: "exception" }; execute(d, ev.chosen, "exception");',
     'd.resolution = { type: "exception" }; S.policy.cap = ev.chosen.price; execute(d, ev.chosen, "exception");'),
    ("The drift detector counts tolerated defaults as choices", "js/core/agent.js",
     'return e.provenance === "chosen"; });', 'return true; });'),
    ("Ledger verification always reports success", "js/core/ledger.js",
     'if (C.sha256(C.canonical(entryBody(e))) !== e.hash) return', 'if (false) return'),
    ("Tolerance boundary off by one (strict instead of inclusive)", "js/core/policy.js",
     'if (first === "value") return chosen.price <= best.price * (1 + tolerance) + 1e-9;',
     'if (first === "value") return chosen.price < best.price * (1 + tolerance) - 1;'),
    ("Aegis ignores the agent's unsupported guesses", "js/core/policy.js",
     'var weak = cites.filter(', 'var weak = [].filter('),
    ("Simulation lets a material over-cap order through", "js/core/simulate.js",
     'executed = truthBest || null; }', 'executed = chosenOffer; }'),
]

def main():
    rows, missed = [], 0
    for name, f, a, b in MUTATIONS:
        tmp = pathlib.Path(tempfile.mkdtemp(prefix="aegis-mut-"))
        dst = tmp / "proto"
        shutil.copytree(BASE, dst, ignore=shutil.ignore_patterns("__pycache__", "shots", "test_report.md"))
        src = (dst / f).read_text()
        if a not in src:
            rows.append((name, "SKIPPED: pattern not found", [])); continue
        (dst / f).write_text(src.replace(a, b, 1))
        env = dict(os.environ, AEGIS_FAST="1")
        out = subprocess.run([sys.executable, str(dst / "tests" / "run_tests.py")], capture_output=True, text=True, env=env, timeout=900).stdout
        failed = sorted({l.split()[1] for l in out.splitlines() if l.startswith("FAIL")})
        caught = bool(failed)
        missed += 0 if caught else 1
        rows.append((name, "CAUGHT" if caught else "MISSED", failed))
        shutil.rmtree(tmp, ignore_errors=True)
        print(("CAUGHT " if caught else "MISSED ") + name + ("  -> " + ", ".join(failed) if failed else ""))
    print(f"\n{len(rows) - missed} of {len(rows)} injected bugs caught")
    lines = ["# Mutation check", "", "Each row injects one bug into a copy of the prototype and runs the test suite.", "",
             "| Injected bug | Result | Checks that failed |", "|---|---|---|"]
    lines += [f"| {n} | {r} | {', '.join(c)} |" for n, r, c in rows]
    (BASE / "tests" / "mutation_report.md").write_text("\n".join(lines) + "\n")
    sys.exit(1 if missed else 0)

if __name__ == "__main__":
    main()
