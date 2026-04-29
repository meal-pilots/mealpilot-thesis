# App Asset Checklist

Required graphic assets before store submission. All assets should live in
`mobile/assets/` (mirrored to platform-specific bundles by Expo).

## App icons

- `assets/icon.png` — 1024×1024, sRGB, no alpha, no transparency.
- `assets/adaptive-icon.png` — 1024×1024 foreground for Android adaptive icon.

Generate platform variants automatically:

```bash
cd mobile
npx expo-asset
```

## Splash screen

- `assets/splash.png` — 2732×2732 PNG (Expo handles down-scaling).
- Background color: `#FFF7E6` (configured in `app.json`).

## Notification icon (Android)

- `assets/notification-icon.png` — 96×96 PNG, monochrome (white on transparent).

## Welcome hero

- `assets/welcome-hero.png` — 768×1024 PNG, used in `WelcomeScreen.tsx`.

## Store listing graphics

### App Store
- App icon: 1024×1024 (uses the same source as `icon.png`).
- Screenshots:
  - iPhone 6.7" (1290×2796) — at least 5.
  - iPhone 6.5" (1284×2778) — at least 3.
  - iPad 12.9" (2048×2732) — at least 3.
- App Preview videos (optional): up to three 15-30s clips per device size.

### Google Play
- Hi-res icon: 512×512 PNG with alpha.
- Feature graphic: 1024×500 PNG (no alpha, no transparency).
- Phone screenshots (1080×1920 or 1080×2400): minimum 4.
- 7" tablet screenshots (1200×1920 or similar): minimum 1.
- 10" tablet screenshots (1920×1200 or similar): minimum 1.

## Screenshot capture tips

Run a phased flow that highlights value:
1. Welcome screen.
2. Onboarding mode selection.
3. Plan summary (weekly grid).
4. Day details with replace action.
5. Shopping list with categories.
6. Budget analytics.
7. Nutrition analytics with per-member chart.
8. "Why this plan" explanations.

Capture from the iOS simulator (`Cmd+S`) or Android emulator (`Ctrl+S`),
crop to the exact required dimensions, and add a thin frame using a tool
like `fastlane frameit` or Figma templates.
