/**
 * Design tokens for Meal Planner.
 *
 * Single source of truth for colors / spacing / typography / shadows.
 * Light + dark palettes are exported separately so a `usePalette()` hook
 * can swap them based on the system color scheme without re-rendering
 * every screen.
 */

import { Platform, type TextStyle } from 'react-native'

const sharedSemantics = {
    success: '#15803D',
    successBg: '#D1FAE5',
    successOn: '#FFFFFF',
    danger: '#B91C1C',
    dangerBg: '#FEE2E2',
    dangerOn: '#FFFFFF',
    warning: '#B45309',
    warningBg: '#FEF3C7',
    warningOn: '#FFFFFF',
    info: '#0F766E',
    infoBg: '#CCFBF1',
    infoOn: '#FFFFFF',
} as const

export const lightPalette = {
    canvas: '#FFFBF5',
    canvasMuted: '#FFF6E8',
    canvasElevated: '#FFFFFF',
    border: '#F0E4CF',
    borderStrong: '#E0CFA8',

    primary: '#2D2419',
    primaryMuted: '#4A3520',
    onPrimary: '#FFF7E6',

    accent: '#F97316',
    accentSoft: '#FFE4B5',
    accentStrong: '#EA580C',
    accentText: '#7C2D0E',

    text: '#1C1410',
    textSecondary: '#3F362C',
    textMuted: '#71655A',
    textInverse: '#FFFBF5',
    textOnAccent: '#FFFFFF',

    overlay: 'rgba(28, 20, 16, 0.55)',
    overlaySoft: 'rgba(28, 20, 16, 0.30)',
    skeleton: '#F0E4CF',
    skeletonHighlight: '#FFF6E8',

    ...sharedSemantics,
} as const

export const darkPalette = {
    canvas: '#100B07',
    canvasMuted: '#1A1310',
    canvasElevated: '#241A14',
    border: '#33271E',
    borderStrong: '#503B2A',

    primary: '#F97316',
    primaryMuted: '#EA580C',
    onPrimary: '#1A0E03',

    accent: '#F97316',
    accentSoft: '#3D2611',
    accentStrong: '#FB923C',
    accentText: '#FFD9B0',

    text: '#FAF1E0',
    textSecondary: '#D4C4AB',
    textMuted: '#9C8C76',
    textInverse: '#1A0E03',
    textOnAccent: '#1A0E03',

    overlay: 'rgba(0, 0, 0, 0.65)',
    overlaySoft: 'rgba(0, 0, 0, 0.40)',
    skeleton: '#241A14',
    skeletonHighlight: '#33271E',

    ...sharedSemantics,
} as const

export type Palette = typeof lightPalette

/**
 * Default palette export — kept for legacy code paths that import
 * `palette` directly. New code should use `usePalette()` so the same
 * components transparently work in dark mode.
 */
export const palette = lightPalette

export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
    massive: 64,
} as const

export const radii = {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
    pill: 999,
} as const

const fontFamily = {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
} as const

export type TypoToken = TextStyle & { fontFamily: string }

export const typography: Record<
    'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'caption' | 'overline' | 'mono',
    TypoToken
> = {
    display: { fontSize: 36, fontFamily: fontFamily.bold, letterSpacing: -0.8, lineHeight: 42 },
    h1: { fontSize: 28, fontFamily: fontFamily.bold, letterSpacing: -0.5, lineHeight: 34 },
    h2: { fontSize: 22, fontFamily: fontFamily.semibold, letterSpacing: -0.3, lineHeight: 28 },
    h3: { fontSize: 17, fontFamily: fontFamily.semibold, letterSpacing: -0.1, lineHeight: 22 },
    body: { fontSize: 15, fontFamily: fontFamily.regular, lineHeight: 22 },
    bodyStrong: { fontSize: 15, fontFamily: fontFamily.semibold, lineHeight: 22 },
    caption: { fontSize: 13, fontFamily: fontFamily.medium, lineHeight: 18 },
    overline: {
        fontSize: 11,
        fontFamily: fontFamily.bold,
        letterSpacing: 1,
        textTransform: 'uppercase' as const,
        lineHeight: 14,
    },
    mono: {
        fontSize: 13,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!,
        lineHeight: 18,
    },
}

const shadowColor = '#1F1100'

export const shadows = {
    none: {
        shadowColor: 'transparent',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
    },
    card: {
        shadowColor,
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    raised: {
        shadowColor,
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 5,
    },
    overlay: {
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 14 },
        elevation: 10,
    },
    glow: {
        shadowColor: '#F97316',
        shadowOpacity: 0.32,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
    },
} as const

export const motion = {
    durationFast: 180,
    durationMedium: 280,
    durationSlow: 420,
    spring: { damping: 16, stiffness: 160, mass: 1 },
    springSnappy: { damping: 22, stiffness: 240, mass: 0.6 },
    springSoft: { damping: 12, stiffness: 90, mass: 1 },
} as const

export const fonts = fontFamily

export const theme = {
    palette,
    spacing,
    radii,
    typography,
    shadows,
    motion,
    fonts,
} as const

export type Theme = typeof theme

export type ColorScheme = 'light' | 'dark'
