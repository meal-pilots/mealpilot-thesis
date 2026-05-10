import { View, type StyleProp, type ViewStyle } from 'react-native'

import { usePalette } from '@shared/lib/use-palette'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, shadows, spacing } from '@shared/ui/theme'

type CardElevation = 'flat' | 'card' | 'raised' | 'overlay'

type CardProps = {
    children: React.ReactNode
    onPress?: () => void
    style?: StyleProp<ViewStyle>
    elevation?: CardElevation
    padding?: number
    accessibilityLabel?: string
    accessibilityHint?: string
}

export function Card({
    children,
    onPress,
    style,
    elevation = 'flat',
    padding = spacing.lg,
    accessibilityLabel,
    accessibilityHint,
}: CardProps) {
    const palette = usePalette()
    const baseStyle: ViewStyle = {
        backgroundColor: palette.canvasElevated,
        borderRadius: radii.lg,
        padding,
        borderWidth: 1,
        borderColor: palette.border,
    }
    const shadowStyle =
        elevation === 'card' ? shadows.card : elevation === 'raised' ? shadows.raised : elevation === 'overlay' ? shadows.overlay : null

    if (onPress) {
        return (
            <TouchableSurface
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
                style={[baseStyle, shadowStyle, style]}
                rippleColor="rgba(0, 0, 0, 0.08)"
                scaleTo={0.985}
            >
                {children}
            </TouchableSurface>
        )
    }
    return <View style={[baseStyle, shadowStyle, style]}>{children}</View>
}
