import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'

import { usePalette } from '@shared/lib/use-palette'
import { Text } from '@shared/ui/Text'
import { motion, radii } from '@shared/ui/theme'

type ProgressBarProps = {
    /** Either a 0..1 ratio, or current value when `max` is provided. */
    value: number
    max?: number
    label?: string
    suffix?: string
    color?: string
    height?: number
    animated?: boolean
}

export function ProgressBar({
    label,
    value,
    max,
    suffix = '',
    color,
    height = 10,
    animated = true,
}: ProgressBarProps) {
    const palette = usePalette()
    const fillColor = color ?? palette.accent

    let ratio: number
    if (typeof max === 'number') {
        const safeMax = Math.max(max, 1)
        ratio = Math.min(1, Math.max(0, value / safeMax))
    } else {
        ratio = Math.min(1, Math.max(0, value))
    }

    const progress = useSharedValue(animated ? 0 : ratio)

    useEffect(() => {
        progress.value = withTiming(ratio, {
            duration: motion.durationSlow,
            easing: Easing.out(Easing.cubic),
        })
    }, [progress, ratio])

    const animatedStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }))

    return (
        <View style={{ gap: 6 }}>
            {label ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text variant="caption" tone="secondary">
                        {label}
                    </Text>
                    {typeof max === 'number' ? (
                        <Text variant="caption" tone="secondary" weight="700">
                            {Math.round(value)}
                            {suffix} / {Math.round(max)}
                            {suffix}
                        </Text>
                    ) : null}
                </View>
            ) : null}
            <View
                style={{
                    height,
                    backgroundColor: palette.skeleton,
                    borderRadius: radii.pill,
                    overflow: 'hidden',
                }}
            >
                <Animated.View
                    style={[
                        {
                            height: '100%',
                            backgroundColor: fillColor,
                            borderRadius: radii.pill,
                        },
                        animatedStyle,
                    ]}
                />
            </View>
        </View>
    )
}
