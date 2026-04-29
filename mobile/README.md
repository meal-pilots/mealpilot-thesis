# Meal Planner — Mobile

React Native + Expo client for the Intelligent Meal Planner backend.

## Quick start

```bash
cd mobile
npm install
npx expo start
```

Press `i` to open the iOS simulator (requires Xcode), `a` for the Android
emulator, or scan the QR code from Expo Go on your phone.

## Configuration

The base API URL is read from the `EXPO_PUBLIC_API_BASE_URL` environment
variable, configured per build profile in `eas.json`. Local development
defaults to `http://localhost:8000` — start the backend with
`docker compose up` from `../backend`.

## Project layout

- `src/core/` — providers, navigation, app shell.
- `src/features/` — auth, settings, notifications, plans, pantry, recipes.
- `src/entities/` — typed domain models shared by features.
- `src/screens/` — top-level screens grouped by area.
- `src/shared/` — UI primitives (`theme.ts`, `Button`, `Skeleton`, `Toast`),
  utilities (`use-debounced`, `use-refresh`, `formatters`), API client, types.

## Bundled assets

| Path | Purpose | Size |
| --- | --- | --- |
| `assets/icon.png` | Master app icon | 1024 × 1024 |
| `assets/adaptive-icon.png` | Android adaptive foreground | 1024 × 1024 |
| `assets/splash.png` | Splash screen | 2732 × 2732 |
| `assets/notification-icon.png` | Status-bar notification icon | 96 × 96 (white on transparent) |
| `assets/welcome-hero.png` | Onboarding hero illustration | 1536 × 1024 |
| `assets/favicon.png` | Web favicon | 64 × 64 |

## Build & submit

Before releasing, replace these placeholders in `app.json` and `eas.json`:

- `expo.owner` (`app.json`) — EAS organisation slug.
- `expo.extra.eas.projectId` (`app.json`) — EAS project UUID
  (`eas project:init` will populate it).
- `submit.production.ios.appleId` / `ascAppId` / `appleTeamId`
  (`eas.json`) — Apple developer account credentials.
- `submit.production.android.serviceAccountKeyPath` (`eas.json`) — path to a
  Google Play service account JSON file (see [docs][play-svc]).

[play-svc]: https://docs.expo.dev/submit/android/#creating-a-google-service-account-key

```bash
# Internal preview build (uploaded to TestFlight / Internal Testing)
npx eas build --profile preview --platform all

# Production build, auto-incremented version
npx eas build --profile production --platform all

# Submit latest production build to both stores
npx eas submit --platform all --latest
```

## OTA updates

Use Expo Updates to ship JS-only patches without going through review:

```bash
npx eas update --branch production --message "fix: shopping list crash"
```

## Push notifications

Push tokens are registered via `usePushRegistration()` on first authenticated
session. The backend sends pushes through the Expo Push Service —
no FCM/APNs key is required for development.

## Store submission checklist

See `docs/store/` for the full checklist (screenshots, descriptions,
privacy policy URL, age rating, Russian + English copy).
