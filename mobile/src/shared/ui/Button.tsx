import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { palette, radii, shadows, spacing } from './theme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
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
}

const variantStyles: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: palette.primary, fg: palette.onPrimary },
    secondary: { bg: palette.accent, fg: palette.accentText },
    ghost: { bg: 'transparent', fg: palette.primary, border: palette.primary },
    danger: { bg: palette.danger, fg: palette.onPrimary },
}

const sizeStyles: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; minHeight: number }> = {
    sm: { paddingV: 8, paddingH: 14, fontSize: 14, minHeight: 36 },
    md: { paddingV: 14, paddingH: 18, fontSize: 16, minHeight: 48 },
    lg: { paddingV: 18, paddingH: 22, fontSize: 17, minHeight: 56 },
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
}: ButtonProps) {
    const v = variantStyles[variant]
    const s = sizeStyles[size]
    const showShadow = variant !== 'ghost'

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !!disabled, busy: !!loading }}
            disabled={disabled || loading}
            onPress={onPress}
            style={({ pressed }) => [
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
                    opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
                    transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
                    width: fullWidth ? '100%' : undefined,
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
                        style={{
                            color: v.fg,
                            fontSize: s.fontSize,
                            fontWeight: '600',
                            letterSpacing: 0.1,
                        }}
                    >
                        {label}
                    </Text>
                    {iconRight ? <View>{iconRight}</View> : null}
                </>
            )}
        </Pressable>
    )
}
