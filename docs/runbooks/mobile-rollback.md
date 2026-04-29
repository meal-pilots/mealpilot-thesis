# Runbook: Mobile rollback (Expo Updates / Stores)

## Type 1 — JS-only regression in a published OTA update

OTA updates are revertible via `eas update --branch production --rollback-to`.

```bash
cd mobile
npx eas update:list --branch production --limit 10
npx eas update:rollback-to --branch production --update-id <PREV_UPDATE_ID>
```

Phones running the affected runtime version will pick up the previous JS
bundle on their next app foreground.

## Type 2 — Native crash in latest store build

JS-only OTA can't fix native crashes. You must:

1. **Halt phased rollout** in App Store Connect (Phased Release → Pause).
2. **Halt Google Play** staged rollout.
3. Either:
   - Promote the previous build back to 100% rollout (App Store Connect lets
     you re-promote a build via "Add Build" if it's still archived), OR
   - Submit a fix build with bumped patch version + appReview note explaining
     the regression. Apple typically expedites such reviews; request an
     expedited review at https://developer.apple.com/contact/app-store/.

## Type 3 — Crash spike before phased rollout completes

Set up Sentry alert: if `crash_free_users < 99%` for 1 hour, on-call gets paged.
Then follow Type 1 (OTA fix) or Type 2 (native rebuild).

## Communication

- Push notification to all users when severe data loss is possible
  (e.g. shopping list corrupted): "We rolled back a recent update. Tap to refresh."
- Status update on https://mealplanner.kz/status if downtime > 30 min.

## Post-incident

- Post-mortem within 48 hours.
- Add a regression test covering the fault.
- Tighten the EAS Update phased rollout policy (start at 1%, not 5%).
