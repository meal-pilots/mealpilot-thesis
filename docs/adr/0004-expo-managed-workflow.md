# ADR 0004: React Native via Expo managed workflow

- **Status**: Accepted
- **Date**: 2026-04-27

## Context

We need a single mobile codebase shipping to both App Store and Play Market.
The team has React/TypeScript experience but no native iOS/Android skills.
Local Mac is available for iOS Simulator but EAS Build cloud is preferred.

## Decision

Use **Expo SDK 51 managed workflow** with **EAS Build** for cloud builds and
**EAS Update** for OTA JS-only patches.

## Alternatives considered

- **Bare React Native** — full native control, but every plugin needs manual
  pod-install and Gradle wiring; higher upfront cost.
- **Capacitor over the existing web React app** — fastest path to "an app
  in stores", but the result behaves like a wrapped website. Apple
  guideline 4.2 risk and worse UX (animations, inputs, gestures).
- **Flutter** — different language stack, none of our existing types and
  domain models would carry over.

## Rationale

- Reuse `shared/types/`, `shared/lib/`, business logic from the existing
  web frontend.
- Expo handles native deps (notifications, secure store, etc.) without
  pod-install gymnastics.
- EAS Build removes the requirement for a Mac in CI.
- EAS Update lets us roll out / rollback JS-only fixes without going
  through store review.

## Consequences

- We commit to the Expo SDK release cadence (annual major upgrade).
- Some niche native libraries are unavailable in managed workflow; if needed
  we can `eas build --profile development` with a custom config plugin or
  switch to bare workflow without losing the rest of the stack.
- React Compiler is currently disabled because it's experimental in RN.
