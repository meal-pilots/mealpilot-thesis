import { Image, Text, View, type ImageSourcePropType } from 'react-native'

import { Button } from './Button'
import { palette, spacing } from './theme'

type EmptyStateProps = {
    title: string
    description?: string
    actionLabel?: string
    onAction?: () => void
    secondaryActionLabel?: string
    onSecondaryAction?: () => void
    emoji?: string
    illustration?: ImageSourcePropType
    compact?: boolean
}

export function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    emoji,
    illustration,
    compact,
}: EmptyStateProps) {
    return (
        <View
            style={{
                flex: compact ? undefined : 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.xl,
                paddingVertical: compact ? spacing.xl : spacing.xxxl,
                gap: spacing.md,
            }}
        >
            {illustration ? (
                <Image
                    source={illustration}
                    style={{ width: 220, height: 160, resizeMode: 'contain', marginBottom: spacing.sm }}
                />
            ) : emoji ? (
                <View
                    style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: palette.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: spacing.sm,
                    }}
                >
                    <Text style={{ fontSize: 48 }}>{emoji}</Text>
                </View>
            ) : null}
            <Text
                style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: palette.text,
                    textAlign: 'center',
                    letterSpacing: -0.2,
                }}
            >
                {title}
            </Text>
            {description ? (
                <Text
                    style={{
                        fontSize: 15,
                        color: palette.textSecondary,
                        textAlign: 'center',
                        lineHeight: 22,
                        maxWidth: 360,
                    }}
                >
                    {description}
                </Text>
            ) : null}
            {actionLabel && onAction ? (
                <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.md, minWidth: 220 }} />
            ) : null}
            {secondaryActionLabel && onSecondaryAction ? (
                <Button
                    label={secondaryActionLabel}
                    onPress={onSecondaryAction}
                    variant="ghost"
                    style={{ minWidth: 220 }}
                />
            ) : null}
        </View>
    )
}
