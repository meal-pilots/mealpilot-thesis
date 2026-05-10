import { forwardRef, useMemo } from 'react'
import {
    Platform,
    Pressable,
    type PressableProps,
    type StyleProp,
    type View,
    type ViewStyle,
} from 'react-native'
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated'

import { haptic } from '@shared/lib/haptics'
import { motion } from '@shared/ui/theme'

type Feedback = 'none' | 'light' | 'medium' | 'selection' | 'success' | 'warning' | 'error'

type Props = Omit<PressableProps, 'style'> & {
    style?: StyleProp<ViewStyle>
    pressedStyle?: StyleProp<ViewStyle>
    /** Apply animated scale on press; default true. */
    scaleOnPress?: boolean
    scaleTo?: number
    /** Haptic to play on press in. Default 'light'. */
    feedback?: Feedback
    /** Android ripple color. Defaults to a soft black. */
    rippleColor?: string
    rippleBorderless?: boolean
}

const HAPTIC_MAP: Record<Feedback, () => void> = {
    none: () => {},
    light: haptic.light,
    medium: haptic.medium,
    selection: haptic.selection,
    success: haptic.success,
    warning: haptic.warning,
    error: haptic.error,
}

export const TouchableSurface = forwardRef<View, Props>(function TouchableSurface(
    {
        style,
        pressedStyle,
        children,
        onPressIn,
        onPressOut,
        scaleOnPress = true,
        scaleTo = 0.97,
        feedback = 'light',
        rippleColor = 'rgba(0, 0, 0, 0.12)',
        rippleBorderless = false,
        disabled,
        ...rest
    },
    ref,
) {
    const scale = useSharedValue(1)
    const opacity = useSharedValue(1)

    const animatedStyle = useAnimatedStyle(() => ({
        transform: scaleOnPress ? [{ scale: scale.value }] : [],
        opacity: opacity.value,
    }))

    const androidRipple = useMemo(
        () => (Platform.OS === 'android' ? { color: rippleColor, borderless: rippleBorderless } : undefined),
        [rippleColor, rippleBorderless],
    )

    // Layout / visual styles (flexDirection, padding, backgroundColor…) MUST
    // live on the Animated.View — Pressable is a wrapper with a single
    // child here, so flexDirection: 'row' on it would have no effect and
    // labels could collapse off-screen.
    return (
        <Pressable
            ref={ref}
            disabled={disabled}
            android_ripple={androidRipple}
            onPressIn={(event) => {
                if (disabled) return
                if (scaleOnPress) {
                    scale.value = withSpring(scaleTo, motion.springSnappy)
                }
                if (Platform.OS === 'ios') {
                    opacity.value = withTiming(0.85, { duration: motion.durationFast })
                }
                HAPTIC_MAP[feedback]?.()
                onPressIn?.(event)
            }}
            onPressOut={(event) => {
                if (scaleOnPress) {
                    scale.value = withSpring(1, motion.springSnappy)
                }
                opacity.value = withTiming(1, { duration: motion.durationFast })
                onPressOut?.(event)
            }}
            style={({ pressed }) => [
                { opacity: disabled ? 0.4 : 1 },
                pressed && pressedStyle,
            ]}
            {...rest}
        >
            <Animated.View style={[animatedStyle, style]}>
                {children as React.ReactNode}
            </Animated.View>
        </Pressable>
    )
})
