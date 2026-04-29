import { useState } from 'react'
import { Text, TextInput, type TextInputProps, View } from 'react-native'

import { palette, radii, spacing } from './theme'

type InputProps = TextInputProps & {
    label?: string
    error?: string
    hint?: string
    leftAddon?: React.ReactNode
    rightAddon?: React.ReactNode
}

export function Input({ label, error, hint, leftAddon, rightAddon, style, onFocus, onBlur, ...rest }: InputProps) {
    const [focused, setFocused] = useState(false)

    return (
        <View style={{ gap: spacing.xs }}>
            {label ? (
                <Text style={{ fontSize: 14, fontWeight: '600', color: palette.textSecondary }}>{label}</Text>
            ) : null}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor: error ? palette.danger : focused ? palette.primary : palette.border,
                    borderRadius: radii.md,
                    backgroundColor: palette.canvasMuted,
                    paddingHorizontal: spacing.md,
                }}
            >
                {leftAddon ? <View style={{ marginRight: spacing.sm }}>{leftAddon}</View> : null}
                <TextInput
                    placeholderTextColor={palette.textMuted}
                    onFocus={(e) => {
                        setFocused(true)
                        onFocus?.(e)
                    }}
                    onBlur={(e) => {
                        setFocused(false)
                        onBlur?.(e)
                    }}
                    style={[
                        {
                            flex: 1,
                            paddingVertical: 14,
                            fontSize: 16,
                            color: palette.text,
                        },
                        style,
                    ]}
                    {...rest}
                />
                {rightAddon ? <View style={{ marginLeft: spacing.sm }}>{rightAddon}</View> : null}
            </View>
            {error ? (
                <Text style={{ color: palette.danger, fontSize: 13, fontWeight: '500' }}>{error}</Text>
            ) : hint ? (
                <Text style={{ color: palette.textMuted, fontSize: 13 }}>{hint}</Text>
            ) : null}
        </View>
    )
}
