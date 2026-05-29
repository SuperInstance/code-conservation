# code-conservation

**Source code spectral analysis — measure structural coherence of codebases via the conservation spectral framework.**

Treats source code as a graph: functions/modules are nodes, call/reference edges connect them. Measures how "conserved" structural properties (cyclomatic complexity, depth, naming) are across the codebase. Clean code has high conservation (consistent patterns); spaghetti code has low conservation (chaotic structure).

## What This Gives You

- **Code graph construction** — AST-based call/reference graphs
- **Structural attribute tracking** — complexity, nesting depth, line count per function
- **Conservation scoring** — how consistent is the codebase's structure?
- **Style comparison** — Python idiomatic vs Rust-style Python (included samples)
- **Anomaly detection** — find functions that break the codebase's structural pattern

## Quick Start

```bash
python code_conservation.py
```

Includes sample files: `samples/clean-python.py` and `samples/clean-rust-style.py` for comparison.

## How It Fits

Part of the SuperInstance ecosystem:

- **[linguistic-spectral](https://github.com/SuperInstance/linguistic-spectral)** — Text/language spectral analysis
- **code-conservation** — Source code spectral analysis (this repo)

## License

MIT
