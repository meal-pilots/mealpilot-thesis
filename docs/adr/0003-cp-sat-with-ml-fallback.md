# ADR 0003: CP-SAT planner with LightGBM-augmented scoring

- **Status**: Accepted
- **Date**: 2026-04-27

## Context

The core algorithmic task is: given a household, generate a 7-day meal plan
that satisfies hard constraints (budget cap, allergies, religious bans,
disliked ingredients, max cook time) and maximises a soft preference score.

## Decision

- Use **OR-Tools CP-SAT** (open source) for the combinatorial selection.
- The recipe-vs-group score that the solver maximises is computed by a
  **LightGBM listwise ranker** when an artifact is available, otherwise by
  a hand-crafted deterministic function.
- Fall back to a deterministic greedy planner when CP-SAT fails or
  the OR-Tools binary is unavailable.

## Alternatives considered

- **Pure ILP via PuLP/CBC** — slower, less expressive for non-linear
  constraints (e.g., "at most one fish day"), no built-in tie-breaking.
- **Pure heuristic** — simpler, but cannot guarantee constraint feasibility
  in tight cases (small budget + many allergies).
- **End-to-end neural ranker over plan candidates** — interesting but
  expensive to train; we lose interpretability that matters for the diploma.

## Rationale

- CP-SAT handles "exactly one meal per day per slot" cleanly via assignment.
- ML scoring lets us learn from `RecipeFeedback` over time without
  rewriting the solver.
- Deterministic fallback keeps the planner robust regardless of ML readiness.

## Consequences

- We pay an OR-Tools dependency (~50 MB binary) in the production image —
  acceptable.
- The ML model becomes a decoupled artifact — easy to retrain weekly via
  Celery beat, easy to A/B-test via PostHog feature flags.
- We must monitor "% CP-SAT solved" — if it drops below ~95% we know the
  candidate pool is too constrained and the user experience suffers.
