# Google Play Console — submission metadata

## Store listing

- **App name (30 chars):** Meal Planner
- **Short description (80 chars):** Smart weekly meal plans for your family — budget, nutrition, allergies.
- **Full description (4000 chars):** see `docs/store/app-store-metadata.md` for the long copy.
- **Default language:** English (US). Add Russian and Kazakh translations if available.

## Categorization

- **App category:** Food & Drink
- **Tags:** meal planning, recipes, nutrition, family

## Content rating (IARC)

- Violence: None
- Sexuality: None
- Profanity: None
- Drugs/alcohol: None
- Gambling: None

Expected outcome: rated **PEGI 3 / Everyone**.

## Data safety form

Match `docs/legal/privacy-policy.md`. Key answers:

- Personal info: Email, Name — collected, encrypted in transit and at rest.
- Health and fitness: Height, weight, fitness info — collected with consent.
- App activity: In-app actions, Other user-generated content — collected.
- Device or other IDs: Other IDs (push token) — collected.
- Crash logs and diagnostics — collected, anonymized.

We do **not** share data with third parties for advertising. We do share
processor data with AWS, Sentry, Expo, PostHog (all listed in privacy policy).

## App access

If sign-in is required for review, provide demo credentials:

- Email: google-review@mealplanner.kz
- Password: REPLACE_WITH_DEMO_PASSWORD

Same demo state as App Store Connect (see `app-store-metadata.md`).

## Closed testing track (mandatory for new accounts)

Before promoting to Production, run a Closed Testing track for at least
14 days with at least 12 testers. Steps:

1. Play Console → Testing → Closed testing → Create track.
2. Upload AAB (built via `eas build --profile production --platform android`).
3. Add testers via mailing list.
4. Wait 14 days, monitor crash-free rate (must stay >99%).
5. Promote to Open testing or Production.

## Pre-launch report

Always review the pre-launch report Google generates after every upload
— it executes the app on a fleet of real devices and surfaces ANRs, crashes,
accessibility issues. Do **not** submit to Production with a red pre-launch report.

## Required screenshots

- Phone (1080×1920+): minimum 4, ideally 8.
- 7" tablet: minimum 1.
- 10" tablet: minimum 1.

Same screenshot set as App Store Connect, with phone framing.

## Phased release

Once approved, set staged rollout to 5% → 20% → 50% → 100% across
several days. Halt automatically if Sentry crash rate spikes.
