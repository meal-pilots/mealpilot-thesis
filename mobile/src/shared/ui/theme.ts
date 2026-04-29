/**
 * Design tokens for Meal Planner.
 *
 * Single source of truth for colors / spacing / typography / shadows.
 * Every visual component reads from here so a brand refresh is one file.
 */

export const palette = {
    // Brand: warm honey / cream
    canvas: '#FFF7E6',
    canvasMuted: '#FFFBF2',
    border: '#F0E2C5',
    borderStrong: '#E5D5B0',

    // Primary action colors
    primary: '#1F2937',
    primaryMuted: '#374151',
    onPrimary: '#FFFFFF',

    // Accent (warm amber for badges, highlights)
    accent: '#FFE4B5',
    accentStrong: '#FFD180',
    accentText: '#7A4A0A',

    // Text
    text: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    textInverse: '#FFFFFF',

    // Semantic
    success: '#047857',
    successBg: '#D1FAE5',
    danger: '#B91C1C',
    dangerBg: '#FEE2E2',
    warning: '#B45309',
    warningBg: '#FEF3C7',
    info: '#0F766E',
    infoBg: '#CCFBF1',

    // Surfaces
    overlay: 'rgba(0,0,0,0.45)',
    skeleton: '#F0E2C5',
    skeletonHighlight: '#FFFBF2',
} as const

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
} as const

export const radii = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
} as const

export const typography = {
    display: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
    h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3 },
    h2: { fontSize: 22, fontWeight: '700' },
    h3: { fontSize: 18, fontWeight: '600' },
    body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
    bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: '500' },
    overline: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' as const },
} as const

export const shadows = {
    card: {
        shadowColor: '#1F1100',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    raised: {
        shadowColor: '#1F1100',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
    overlay: {
        shadowColor: '#000',
        shadowOpacity: 0.20,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
    },
} as const

export const theme = {
    palette,
    spacing,
    radii,
    typography,
    shadows,
} as const

export type Theme = typeof theme
