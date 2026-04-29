# ADR 0001: Monorepo with three sibling codebases

- **Status**: Accepted
- **Date**: 2026-04-27

## Context

The project consists of:
- a Django backend with REST API and CP-SAT planner,
- a React Native mobile client targeting App Store + Play Market,
- a Terraform-managed AWS infrastructure layer,
- a separate Python ETL project that produces the recipe corpus.

The diploma scope requires versioning all of these together and keeping
the API contract synchronised with the mobile client.

## Decision

Keep four sibling directories at the repository root:

- `backend/` — Django API.
- `mobile/` — React Native + Expo.
- `infrastructure/` — Terraform.
- (sibling repo) `etl-meals/` — kept separate because it depends on heavy
  ML libraries that don't belong in production runtime.

CI workflows are scoped per-directory via path filters so a backend change
does not trigger mobile builds and vice versa.

## Consequences

Pros:
- Single PR can touch backend + mobile + infrastructure when the API contract
  changes.
- Single Terraform state graph manages everything.
- Reviewers see the full picture in one repository.

Cons:
- Repository size grows; we mitigate by `.gitignore`-ing build artifacts.
- Mobile and backend dependency tools (npm vs pip) need separate cache layers
  in CI (we already do this).
- Harder to give external contractors access to only one part — solved by
  branch protection rules per path if needed.
