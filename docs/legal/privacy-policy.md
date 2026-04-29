# Privacy Policy

_Last updated: REPLACE_WITH_DATE_

This Privacy Policy describes how Meal Planner ("we", "us", "the Service")
collects, uses, and discloses personal data when you use our mobile and web
applications.

We comply with the General Data Protection Regulation (EU) 2016/679 (GDPR),
the Apple App Store Privacy Guidelines, and the Google Play Data Safety
requirements.

## 1. Controller

Meal Planner
Address: REPLACE_WITH_LEGAL_ADDRESS
Contact: privacy@mealplanner.kz

## 2. Data we collect

### Account data
- Email address
- Display name
- Hashed password (we never store your plaintext password)

### Household profile (optional but required for plan generation)
- Member display names, age, sex, height, weight, activity level
- Health goals (weight loss, mass gain, maintenance, low carb, healthy, high protein)
- Dietary constraints (allergies, intolerances, religious restrictions, dislikes)
- Household budget, currency, region, planning preferences

### Usage data
- Recipe feedback (likes, ratings, dislikes with reasons)
- Meal plan feedback (overall rating, satisfaction scores)
- Interaction events (recipes viewed, plans generated, plans approved)
- Pantry items you record

### Device data
- Push notification token (Expo push token)
- Platform (iOS / Android), app version, OS version
- Device locale and timezone (used for localization, not advertising)

### Technical data
- IP address (kept in CloudWatch logs for 30 days for security/audit purposes)
- Crash reports via Sentry (sanitized — no personal data in stack traces)

We do **NOT** collect: precise location, advertising identifiers, contacts,
photos (unless you explicitly upload one), or social network data.

## 3. Why we process your data

- **Account creation and authentication** — Article 6(1)(b) GDPR (contract).
- **Meal plan generation, recipe recommendations, and shopping list aggregation**
  — Article 6(1)(b) GDPR (contract).
- **Health-related data (weight, height, allergies, goals)** —
  Article 9(2)(a) GDPR (explicit consent at onboarding).
- **Push notifications** — Article 6(1)(a) GDPR (consent), revocable in app settings.
- **Crash reports and aggregate analytics** — Article 6(1)(f) GDPR (legitimate
  interest in maintaining a stable, secure service).

## 4. Where your data is stored

All data is stored on AWS infrastructure in the `eu-central-1` (Frankfurt)
region. AWS is used as a Data Processor under a Data Processing Agreement.

- Postgres database: encrypted at rest (KMS), TLS in transit.
- Redis cache: AUTH-protected, TLS in transit.
- S3 (recipe images): encrypted at rest.

## 5. Sharing with third parties

We do not sell or trade your personal data. We share specific data only with
the following processors, strictly under contract:

- **Amazon Web Services (eu-central-1)** — hosting and storage.
- **Sentry** — crash reporting (anonymized; data residency Germany / US).
- **Expo** — push notification delivery.
- **PostHog** — anonymized product analytics; can be disabled in app settings.

## 6. Retention

- Account data: until you delete your account.
- Meal plans, feedback, pantry items: until you delete your account or
  individually delete the records.
- Crash logs: 90 days.
- Backups: encrypted, retained for 30 days, then deleted.

## 7. Your rights (GDPR + Apple Guideline 5.1.1(v))

- **Right of access** — see section 8 (Data Export).
- **Right to rectification** — edit your profile in the app at any time.
- **Right to erasure** — see section 8 (Account Deletion).
- **Right to data portability** — see section 8 (Data Export).
- **Right to object** — disable push notifications and analytics in app settings.
- **Right to lodge a complaint** with a supervisory authority in your country.

## 8. Account deletion and data export

Inside the app: **Profile → Account → Delete account** OR
**Profile → Account → Export my data**.

Both operations require re-authentication. Deletion is irreversible and
removes all your personal data within 30 days, except where retention is
required by law (typically 6 months for transaction logs).

You can also email privacy@mealplanner.kz with the subject "Data deletion"
or "Data export" — we respond within 30 days.

## 9. Children

The Service is not intended for children under 13. Parents may add
"child" members to a household with their consent and understanding that
only minimal demographic data (display name, age, dietary needs) is stored
about minors.

## 10. Security

- TLS 1.2+ for all traffic.
- Argon2 password hashing.
- JWT tokens with rotation and blacklist on logout.
- DDoS protection via AWS Shield + WAF.
- Pre-deployment security audit and dependency scanning.

In case of a personal data breach we will notify affected users and the
appropriate supervisory authority within 72 hours.

## 11. Changes to this policy

We will notify you in the app at least 30 days before material changes
take effect.

## 12. Contact

privacy@mealplanner.kz
