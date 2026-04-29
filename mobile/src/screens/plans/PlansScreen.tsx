import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FlatList, RefreshControl, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import { useActiveGroup } from '@features/groups/hooks'
import { usePlansForGroup } from '@features/plans/hooks'
import { formatCurrency, formatDateRange, formatScore } from '@shared/lib/formatters'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { palette, spacing } from '@shared/ui/theme'

const STATUS_LABELS: Record<string, string> = {
    draft: 'Черновик',
    generated: 'Готов',
    approved: 'Утверждён',
    modified: 'Изменён',
    archived: 'В архиве',
}

const STATUS_COLORS: Record<string, string> = {
    draft: palette.textMuted,
    generated: palette.info,
    approved: palette.success,
    modified: palette.warning,
    archived: palette.textMuted,
}

export function PlansScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const groupQuery = useActiveGroup()
    const groupId = groupQuery.data?.id
    const plansQuery = usePlansForGroup(groupId)
    const { refreshing, onRefresh } = useRefresh(async () => {
        await Promise.all([plansQuery.refetch(), groupQuery.refetch()])
    })

    const renderHeader = () => (
        <View style={{ paddingBottom: spacing.md, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading level={1}>Планы питания</Heading>
                <Button
                    label="Новый"
                    onPress={() => navigation.navigate('GeneratePlan')}
                    size="sm"
                    iconLeft={<Text style={{ color: palette.onPrimary, fontSize: 16, fontWeight: '700' }}>＋</Text>}
                />
            </View>
        </View>
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
                    padding: spacing.lg,
                    paddingBottom: spacing.xxl,
                    gap: spacing.sm,
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
                }
                ListEmptyComponent={
                    <EmptyState
                        title="Планов пока нет"
                        description="Создайте первый план, чтобы увидеть недельный список рецептов и покупок."
                        actionLabel="Сгенерировать план"
                        onAction={() => navigation.navigate('GeneratePlan')}
                        emoji="🗓️"
                    />
                }
                renderItem={({ item: plan }) => (
                    <Card
                        onPress={() => navigation.navigate('PlanDetails', { mealPlanId: plan.id })}
                        style={{ marginBottom: spacing.sm }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                            }}
                        >
                            <View style={{ flex: 1, marginRight: spacing.md }}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        color: STATUS_COLORS[plan.status] ?? palette.textMuted,
                                        fontWeight: '700',
                                        letterSpacing: 0.4,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {STATUS_LABELS[plan.status] ?? plan.status}
                                    {plan.is_current ? ' · Активный' : ''}
                                </Text>
                                <Text
                                    style={{
                                        marginTop: spacing.xs,
                                        fontSize: 17,
                                        fontWeight: '700',
                                        color: palette.text,
                                        letterSpacing: -0.2,
                                    }}
                                    numberOfLines={2}
                                >
                                    {plan.title}
                                </Text>
                                <Text style={{ marginTop: 2, color: palette.textMuted, fontSize: 13 }}>
                                    {formatDateRange(plan.start_date, plan.end_date)}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontWeight: '700', color: palette.text, fontSize: 15 }}>
                                    {formatCurrency(plan.estimated_total_cost)}
                                </Text>
                                <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>
                                    {formatScore(plan.overall_score)} fit
                                </Text>
                            </View>
                        </View>
                    </Card>
                )}
            />
        </Screen>
    )
}
