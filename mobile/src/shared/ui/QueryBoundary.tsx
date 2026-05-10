import { ActivityIndicator, View } from 'react-native'

import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Icon } from '@shared/ui/Icon'
import { SkeletonList } from '@shared/ui/Skeleton'
import { Text } from '@shared/ui/Text'
import { radii, spacing } from '@shared/ui/theme'

type QueryBoundaryProps = {
    isLoading: boolean
    error: unknown
    refetch?: () => void
    children: React.ReactNode
    loadingText?: string
    skeleton?: 'list' | 'spinner'
    skeletonCount?: number
}

export function QueryBoundary({
    isLoading,
    error,
    refetch,
    children,
    loadingText,
    skeleton = 'spinner',
    skeletonCount = 4,
}: QueryBoundaryProps) {
    const palette = usePalette()

    if (isLoading) {
        if (skeleton === 'list') {
            return (
                <View style={{ flex: 1, padding: spacing.lg }}>
                    <SkeletonList count={skeletonCount} />
                </View>
            )
        }
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: spacing.xl,
                    gap: spacing.md,
                }}
            >
                <ActivityIndicator color={palette.accent} />
                {loadingText ? (
                    <Text variant="body" tone="muted">
                        {loadingText}
                    </Text>
                ) : null}
            </View>
        )
    }
    if (error) {
        const message = error instanceof Error ? error.message : 'Что-то пошло не так'
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: spacing.xl,
                    gap: spacing.md,
                }}
            >
                <View
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: radii.pill,
                        backgroundColor: palette.dangerBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon name="alertCircle" size={40} color={palette.danger} strokeWidth={1.8} />
                </View>
                <Text variant="h3">Не удалось загрузить</Text>
                <Text variant="body" tone="muted" align="center">
                    {message}
                </Text>
                {refetch ? <Button label="Повторить" onPress={refetch} variant="ghost" /> : null}
            </View>
        )
    }
    return <>{children}</>
}
