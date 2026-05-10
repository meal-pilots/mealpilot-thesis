import { useState } from 'react'
import { TextInput, View, type TextInputProps } from 'react-native'

import { usePalette } from '@shared/lib/use-palette'
import { Text } from '@shared/ui/Text'
import { radii, spacing } from '@shared/ui/theme'

type InputProps = TextInputProps & {
    label?: string
    error?: string
    hint?: string
    leftAddon?: React.ReactNode
    rightAddon?: React.ReactNode
}

export function Input({ label, error, hint, leftAddon, rightAddon, style, onFocus, onBlur, ...rest }: InputProps) {
    const palette = usePalette()
    const [focused, setFocused] = useState(false)

    const borderColor = error ? palette.danger : focused ? palette.primary : palette.border

    return (
        <View style={{ gap: spacing.xs }}>
            {label ? (
                <Text variant="caption" tone="secondary">
                    {label}
                </Text>
            ) : null}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor,
                    borderRadius: radii.md,
                    backgroundColor: palette.canvasMuted,
                    paddingHorizontal: spacing.md,
                    minHeight: 52,
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
                    selectionColor={palette.accent}
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
                <Text variant="caption" tone="danger">
                    {error}
                </Text>
            ) : hint ? (
                <Text variant="caption" tone="muted">
                    {hint}
                </Text>
            ) : null}
        </View>
    )
}
