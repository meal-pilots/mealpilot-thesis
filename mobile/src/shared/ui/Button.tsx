import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native'

import { usePalette } from '@shared/lib/use-palette'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, shadows, spacing, type Palette } from '@shared/ui/theme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tonal'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = {
    label: string
    onPress: () => void
    variant?: ButtonVariant
    size?: ButtonSize
    disabled?: boolean
    loading?: boolean
    fullWidth?: boolean
    iconLeft?: React.ReactNode
    iconRight?: React.ReactNode
    style?: StyleProp<ViewStyle>
    accessibilityLabel?: string
    accessibilityHint?: string
}

function variantStyles(palette: Palette): Record<ButtonVariant, { bg: string; fg: string; border?: string }> {
    return {
        primary: { bg: palette.primary, fg: palette.onPrimary },
        secondary: { bg: palette.accent, fg: palette.textOnAccent },
        tonal: { bg: palette.accentSoft, fg: palette.accentText },
        ghost: { bg: 'transparent', fg: palette.text, border: palette.borderStrong },
        danger: { bg: palette.danger, fg: palette.dangerOn },
    }
}

const sizeStyles: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; minHeight: number }> = {
    sm: { paddingV: 8, paddingH: 14, fontSize: 14, minHeight: 40 },
    md: { paddingV: 14, paddingH: 18, fontSize: 16, minHeight: 48 },
    lg: { paddingV: 16, paddingH: 22, fontSize: 17, minHeight: 56 },
}

export function Button({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled,
    loading,
    fullWidth,
    iconLeft,
    iconRight,
    style,
    accessibilityLabel,
    accessibilityHint,
}: ButtonProps) {
    const palette = usePalette()
    const v = variantStyles(palette)[variant]
    const s = sizeStyles[size]
    const showShadow = variant === 'primary' || variant === 'danger' || variant === 'secondary'
    const isDisabled = !!disabled || !!loading

    return (
        <TouchableSurface
            accessibilityRole="button"
            accessibilityState={{ disabled: !!disabled, busy: !!loading }}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint}
            disabled={isDisabled}
            onPress={onPress}
            feedback={variant === 'danger' ? 'medium' : 'light'}
            scaleTo={0.97}
            rippleColor={variant === 'primary' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}
            style={[
                {
                    backgroundColor: v.bg,
                    paddingVertical: s.paddingV,
                    paddingHorizontal: s.paddingH,
                    minHeight: s.minHeight,
                    borderRadius: radii.lg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: spacing.sm,
                    borderWidth: v.border ? 1.5 : 0,
                    borderColor: v.border,
                    width: fullWidth ? '100%' : undefined,
                    overflow: 'hidden',
                },
                showShadow ? shadows.card : null,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={v.fg} size="small" />
            ) : (
                <>
                    {iconLeft ? <View>{iconLeft}</View> : null}
                    <Text
                        variant="bodyStrong"
                        style={{
                            color: v.fg,
                            fontSize: s.fontSize,
                            letterSpacing: 0.1,
                        }}
                    >
                        {label}
                    </Text>
                    {iconRight ? <View>{iconRight}</View> : null}
                </>
            )}
        </TouchableSurface>
    )
}
