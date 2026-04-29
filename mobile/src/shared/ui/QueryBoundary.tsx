import { ActivityIndicator, Text, View } from 'react-native'

import { Button } from './Button'
import { SkeletonList } from './Skeleton'
import { palette, spacing } from './theme'

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
    if (isLoading) {
        if (skeleton === 'list') {
            return (
                <View style={{ flex: 1, padding: spacing.lg }}>
                    <SkeletonList count={skeletonCount} />
                </View>
            )
        }
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
                <ActivityIndicator color={palette.primary} />
                {loadingText ? <Text style={{ color: palette.textMuted }}>{loadingText}</Text> : null}
            </View>
        )
    }
    if (error) {
        const message = error instanceof Error ? error.message : 'Что-то пошло не так'
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: palette.danger }}>Не удалось загрузить</Text>
                <Text style={{ color: palette.textMuted, textAlign: 'center' }}>{message}</Text>
                {refetch ? <Button label="Повторить" onPress={refetch} variant="ghost" /> : null}
            </View>
        )
    }
    return <>{children}</>
}
