import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FlatList, RefreshControl, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import { useActiveGroup } from '@features/groups/hooks'
import { usePlansForGroup } from '@features/plans/hooks'
import { formatCurrency, formatDateRange, formatScore } from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { Text } from '@shared/ui/Text'
import { radii, spacing, type Palette } from '@shared/ui/theme'

const STATUS_LABELS: Record<string, string> = {
    draft: 'Черновик',
    generated: 'Готов',
    approved: 'Утверждён',
    modified: 'Изменён',
    archived: 'В архиве',
}

const STATUS_COLOR = (status: string, p: Palette): string => {
    if (status === 'draft' || status === 'archived') return p.textMuted
    if (status === 'generated') return p.info
    if (status === 'approved') return p.success
    if (status === 'modified') return p.warning
    return p.textMuted
}

export function PlansScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const palette = usePalette()
    const groupQuery = useActiveGroup()
    const groupId = groupQuery.data?.id
    const plansQuery = usePlansForGroup(groupId)
    const { refreshing, onRefresh } = useRefresh(async () => {
        await Promise.all([plansQuery.refetch(), groupQuery.refetch()])
    })

    const renderHeader = () => (
        <Animated.View entering={FadeInDown.duration(380)} style={{ paddingBottom: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading level={1}>Планы питания</Heading>
                <Button
                    label="Новый"
                    onPress={() => {
                        haptic.medium()
                        navigation.navigate('GeneratePlan')
                    }}
                    size="sm"
                    iconLeft={<Icon name="plus" size={16} color={palette.onPrimary} strokeWidth={2.4} />}
                />
            </View>
        </Animated.View>
    )

    if (plansQuery.isLoading && !plansQuery.data) {
        return (
            <Screen>
                {renderHeader()}
                <SkeletonList count={4} />
            </Screen>
        )
    }

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <FlatList
                data={plansQuery.data ?? []}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{
                    padding: spacing.xxl,
                    paddingBottom: spacing.huge,
                    gap: spacing.sm,
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
                }
                ListEmptyComponent={
                    <EmptyState
                        title="Планов пока нет"
                        description="Создайте первый план, чтобы увидеть недельный список рецептов и покупок."
                        actionLabel="Сгенерировать план"
                        onAction={() => navigation.navigate('GeneratePlan')}
                        icon="calendarDays"
                    />
                }
                renderItem={({ item: plan, index }) => {
                    const statusColor = STATUS_COLOR(plan.status, palette)
                    return (
                        <Animated.View entering={FadeInDown.delay(index * 35).duration(360)}>
                            <Card
                                onPress={() => navigation.navigate('PlanDetails', { mealPlanId: plan.id })}
                                elevation="card"
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <View style={{ flex: 1, marginRight: spacing.md }}>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: spacing.xs,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: 3,
                                                    backgroundColor: statusColor,
                                                }}
                                            />
                                            <Text variant="overline" style={{ color: statusColor }}>
                                                {STATUS_LABELS[plan.status] ?? plan.status}
                                                {plan.is_current ? ' · Активный' : ''}
                                            </Text>
                                        </View>
                                        <Text
                                            variant="h3"
                                            numberOfLines={2}
                                            style={{ marginTop: spacing.xs }}
                                        >
                                            {plan.title}
                                        </Text>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: spacing.xs,
                                                marginTop: 4,
                                            }}
                                        >
                                            <Icon name="calendar" size={12} color={palette.textMuted} />
                                            <Text variant="caption" tone="muted">
                                                {formatDateRange(plan.start_date, plan.end_date)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <Text variant="bodyStrong">
                                            {formatCurrency(plan.estimated_total_cost)}
                                        </Text>
                                        <View
                                            style={{
                                                paddingHorizontal: spacing.sm,
                                                paddingVertical: 2,
                                                borderRadius: radii.pill,
                                                backgroundColor: palette.accentSoft,
                                            }}
                                        >
                                            <Text variant="caption" weight="700" tone="accent">
                                                {formatScore(plan.overall_score)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        </Animated.View>
                    )
                }}
            />
        </Screen>
    )
}
