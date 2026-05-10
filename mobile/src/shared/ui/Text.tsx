import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native'

import { usePalette } from '@shared/lib/use-palette'
import { typography } from '@shared/ui/theme'

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'caption' | 'overline' | 'mono'

type Tone = 'default' | 'secondary' | 'muted' | 'inverse' | 'accent' | 'success' | 'danger' | 'warning' | 'info'

type Props = Omit<RNTextProps, 'maxFontSizeMultiplier' | 'style'> & {
    variant?: Variant
    tone?: Tone
    align?: 'left' | 'center' | 'right' | 'auto' | 'justify'
    weight?: TextStyle['fontWeight']
    /** Cap automatic font scaling at this multiplier — keeps layout stable. */
    maxFontSizeMultiplier?: number
    style?: TextStyle | TextStyle[]
}

export function Text({
    variant = 'body',
    tone = 'default',
    align,
    weight,
    style,
    maxFontSizeMultiplier = 1.4,
    children,
    ...rest
}: Props) {
    const palette = usePalette()
    const toneColor: Record<Tone, string> = {
        default: palette.text,
        secondary: palette.textSecondary,
        muted: palette.textMuted,
        inverse: palette.textInverse,
        accent: palette.accent,
        success: palette.success,
        danger: palette.danger,
        warning: palette.warning,
        info: palette.info,
    }
    return (
        <RNText
            allowFontScaling
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            style={[
                typography[variant] as TextStyle,
                { color: toneColor[tone] },
                align ? { textAlign: align } : null,
                weight ? { fontWeight: weight } : null,
                style as TextStyle,
            ]}
            {...rest}
        >
            {children}
        </RNText>
    )
}
