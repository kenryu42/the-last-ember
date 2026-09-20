# Experiment evidence

This directory contains retained configurations, seeds, traces and measured results.
It is versioned. Do not overwrite historical evidence when rerunning a study.

- `playtest-v02/` holds the three original benchmark result files moved from the
  repository root. See [the historical report](../docs/archive/playtest-v02.md).
- `identity/` retains the identity, Flame, concealment and Escape experiments.
  See [the experiment report](../docs/laboratory/identity-experiment.md).

Run scripts from the repository root. New study output goes to
`artifacts/identity/`. For general laboratory commands, redirect stdout into
`artifacts/`, for example:

```sh
mkdir -p artifacts
bun scripts/lab/lab.ts suite --suite smoke --games 1 --quiet > artifacts/smoke.jsonl
python3 scripts/reports/lab-report.py artifacts/smoke.jsonl
```

When results are selected for retention, copy them here with their seeds,
configuration, code revision and an explanation of what the experiment measures.
Report scripts that analyze the archived identity campaigns still read their
explicit inputs in `experiments/identity/`.
