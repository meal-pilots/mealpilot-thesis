# App Store Connect — submission metadata

Use this checklist when filling in the App Store Connect record.

## App Information

- **Name (30 chars):** Meal Planner
- **Subtitle (30 chars):** Smart family meal planning
- **Bundle ID:** kz.mealplanner.app
- **Primary Category:** Food & Drink
- **Secondary Category:** Health & Fitness

## Pricing and Availability

- **Price tier:** Free
- **Availability:** All countries (or restricted to Kazakhstan + EU during private beta)

## App Privacy

Declare the following data collection (see `docs/legal/privacy-policy.md`):

- Contact info: Email — used for **App Functionality**, **linked to identity**.
- Health & Fitness: Health (height, weight, dietary goals) — used for
  **App Functionality**, **linked to identity**.
- User content: Other user content (recipes, feedback) — used for
  **App Functionality**, **linked to identity**.
- Identifiers: User ID — used for **App Functionality**, **linked to identity**.
- Diagnostics: Crash data, performance data — used for **App Functionality**,
  **not linked to identity**.

We do **not** use any data for tracking.

## Promotional Text (170 chars)

> Plan a week of meals tailored to your family's budget, allergies and
> goals — generated in seconds, with a smart shopping list.

## Description (Full)

```
Meal Planner is your household's intelligent kitchen assistant.

WHAT IT DOES
- Generate weekly meal plans tailored to your family in seconds
- Honor allergies, religious restrictions, and individual goals (weight loss,
  mass gain, low-carb, healthy, high-protein)
- Track per-member calorie and macro targets
- Produce a smart shopping list grouped by category
- Show transparent reasoning behind every plan: budget vs nutrition vs taste

KEY FEATURES
- 5,000+ curated recipes with full nutrition data
- Automatic ingredient substitutions for cheaper, low-carb, or kid-friendly versions
- Pantry tracking — what you already have stays off the shopping list
- Budget analytics: spend vs target, top contributors
- Nutrition analytics: per-member daily macros
- Share plans with family via secure links

PRIVACY
- All your data lives in EU data centers (Frankfurt).
- We never sell your data.
- Delete your account in one tap.

SUPPORT
hello@mealplanner.kz
```

## Keywords (100 chars total)

```
meal plan,grocery list,family,nutrition,budget,recipe,diet,allergy,calorie,kazakh
```

## Support URL

https://mealplanner.kz/support

## Marketing URL

https://mealplanner.kz

## Privacy Policy URL

https://mealplanner.kz/privacy

## App Review Information

### Demo Account

- Email: apple-review@mealplanner.kz
- Password: REPLACE_WITH_DEMO_PASSWORD

The demo account already has:
- A pre-populated household ("Reviewer Family") with two adults + one child.
- One generated weekly meal plan with shopping list.
- Sample feedback data.

### Notes

> Meal Planner ships as a native React Native app. All app logic is bundled
> locally; the server provides API endpoints only. Health-related data
> (height, weight, dietary goals) is collected with explicit consent during
> onboarding and is used solely for plan generation. Users can delete their
> account or export their data from the Profile screen at any time.

## Export Compliance

- Uses standard HTTPS only — eligible for export compliance exemption.
- Answer "Yes, the app uses encryption" → "Yes, the app qualifies for the
  exemptions provided in section 740.17(b) of the EAR".

## Age Rating

- **Age Rating:** 4+
- No objectionable content.

## Required Screenshots

- iPhone 6.7" (1290×2796): minimum 5 — Welcome, Onboarding, Plan, Day, Shopping list, Analytics.
- iPhone 6.5" (1284×2778): minimum 3.
- iPad 12.9" (2048×2732): minimum 3.
