import { Image, View, type ImageSourcePropType } from 'react-native'

import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Icon, type IconName } from '@shared/ui/Icon'
import { Text } from '@shared/ui/Text'
import { radii, spacing } from '@shared/ui/theme'

type EmptyStateProps = {
    title: string
    description?: string
    actionLabel?: string
    onAction?: () => void
    secondaryActionLabel?: string
    onSecondaryAction?: () => void
    icon?: IconName
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
    icon,
    illustration,
    compact,
}: EmptyStateProps) {
    const palette = usePalette()
    return (
        <View
            style={{
                flex: compact ? undefined : 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.xl,
                paddingVertical: compact ? spacing.xl : spacing.huge,
                gap: spacing.md,
            }}
        >
            {illustration ? (
                <Image
                    source={illustration}
                    style={{ width: 220, height: 160, resizeMode: 'contain', marginBottom: spacing.sm }}
                />
            ) : icon ? (
                <View
                    style={{
                        width: 96,
                        height: 96,
                        borderRadius: radii.pill,
                        backgroundColor: palette.accentSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: spacing.sm,
                    }}
                >
                    <Icon name={icon} size={40} color={palette.accentText} strokeWidth={1.8} />
                </View>
            ) : null}
            <Text variant="h2" align="center">
                {title}
            </Text>
            {description ? (
                <Text variant="body" tone="secondary" align="center" style={{ maxWidth: 360 }}>
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
