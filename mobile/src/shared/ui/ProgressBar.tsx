import { Text, View } from 'react-native'

import { palette, radii } from './theme'

type ProgressBarProps = {
    /** Either a 0..1 ratio, or current value when `max` is provided. */
    value: number
    max?: number
    label?: string
    suffix?: string
    color?: string
    height?: number
}

export function ProgressBar({
    label,
    value,
    max,
    suffix = '',
    color = palette.primary,
    height = 8,
}: ProgressBarProps) {
    let ratio: number
    if (typeof max === 'number') {
        const safeMax = Math.max(max, 1)
        ratio = Math.min(1, Math.max(0, value / safeMax))
    } else {
        ratio = Math.min(1, Math.max(0, value))
    }

    return (
        <View style={{ gap: 6 }}>
            {label ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: palette.textSecondary }}>{label}</Text>
                    {typeof max === 'number' ? (
                        <Text style={{ fontSize: 13, color: palette.textSecondary, fontWeight: '600' }}>
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
                    borderRadius: radii.sm,
                    overflow: 'hidden',
                }}
            >
                <View
                    style={{
                        width: `${ratio * 100}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: radii.sm,
                    }}
                />
            </View>
        </View>
    )
}
