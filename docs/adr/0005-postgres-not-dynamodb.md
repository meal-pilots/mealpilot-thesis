# ADR 0005: Postgres for primary store, not DynamoDB

- **Status**: Accepted
- **Date**: 2026-04-27

## Context

The data model is heavily relational: groups → members → constraints,
recipes ↔ ingredients ↔ prices, meal plans → days → items → adaptations,
shopping lists → items, feedback connecting users + recipes + groups.

## Decision

Use **PostgreSQL 16** (RDS Multi-AZ) as the primary store.

## Alternatives considered

- **DynamoDB** — would force us to denormalise into either fat documents
  per group or to maintain handcrafted secondary indexes. The planner
  scores >5000 recipes per generation request — that's a poor fit for
  DynamoDB pricing and access patterns.
- **MySQL / MariaDB** — equivalent in many ways but Postgres has better JSON
  fields, partial indexes, and `CREATE INDEX CONCURRENTLY` which we use
  in zero-downtime migrations.

## Rationale

- Mature ORM (Django) with deterministic migrations.
- JSONField for flexible blobs (constraints, explanation_json) without
  giving up relational integrity.
- Strong full-text search via `tsvector` if we ever need recipe search.
- ARM-priced t4g.small instance keeps prod under $80/mo.

## Consequences

- Vertical scaling will be the bottleneck before sharding becomes necessary.
  Trigger plan: monitor CPU + slow queries; add read replica when CPU
  averages > 60%; only then consider sharding by region.
- We commit to ORM migrations for schema changes — every change ships with
  a migration in the same PR.
