import { useEffect, useRef } from 'react'
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native'

import { palette, radii, spacing } from './theme'

type SkeletonProps = {
    width?: number | `${number}%`
    height?: number
    borderRadius?: number
    style?: StyleProp<ViewStyle>
}

export function Skeleton({ width = '100%', height = 16, borderRadius = radii.sm, style }: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.5)).current

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            ]),
        )
        loop.start()
        return () => loop.stop()
    }, [opacity])

    return (
        <Animated.View
            style={[
                {
                    width: width as number,
                    height,
                    borderRadius,
                    backgroundColor: palette.skeleton,
                    opacity,
                },
                style,
            ]}
        />
    )
}

export function SkeletonCard() {
    return (
        <View
            style={{
                backgroundColor: palette.canvasMuted,
                borderRadius: radii.lg,
                padding: spacing.lg,
                borderWidth: 1,
                borderColor: palette.border,
                gap: spacing.sm,
            }}
        >
            <Skeleton width="60%" height={18} />
            <Skeleton width="100%" height={12} />
            <Skeleton width="80%" height={12} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                <Skeleton width={64} height={24} borderRadius={999} />
                <Skeleton width={84} height={24} borderRadius={999} />
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
