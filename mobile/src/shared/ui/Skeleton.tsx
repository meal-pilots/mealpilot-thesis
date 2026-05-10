import { LinearGradient } from 'expo-linear-gradient'
import { useEffect } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated'

import { usePalette } from '@shared/lib/use-palette'
import { radii, spacing } from '@shared/ui/theme'

type SkeletonProps = {
    width?: number | `${number}%`
    height?: number
    borderRadius?: number
    style?: StyleProp<ViewStyle>
}

export function Skeleton({ width = '100%', height = 16, borderRadius = radii.sm, style }: SkeletonProps) {
    const palette = usePalette()
    const progress = useSharedValue(0)

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
            -1,
            false,
        )
    }, [progress])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -100 + progress.value * 300 }],
    }))

    return (
        <View
            style={[
                {
                    width: width as number,
                    height,
                    borderRadius,
                    backgroundColor: palette.skeleton,
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            <Animated.View style={[{ flex: 1 }, animatedStyle]}>
                <LinearGradient
                    colors={['transparent', palette.skeletonHighlight, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, opacity: 0.85 }}
                />
            </Animated.View>
        </View>
    )
}

export function SkeletonCard() {
    const palette = usePalette()
    return (
        <View
            style={{
                backgroundColor: palette.canvasElevated,
                borderRadius: radii.lg,
                padding: spacing.lg,
                borderWidth: 1,
                borderColor: palette.border,
                gap: spacing.sm,
            }}
        >
            <Skeleton width="60%" height={20} />
            <Skeleton width="100%" height={12} />
            <Skeleton width="80%" height={12} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                <Skeleton width={64} height={26} borderRadius={999} />
                <Skeleton width={88} height={26} borderRadius={999} />
            </View>
        </View>
    )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
    return (
        <View style={{ gap: spacing.md }}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </View>
    )
}
