import { useRoute, type RouteProp } from '@react-navigation/native'
import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import type { ShoppingListItem } from '@entities/plan/types'
import {
    useRegenerateShoppingList,
    useShoppingList,
    useUpdateShoppingItem,
} from '@features/plans/hooks'
import { formatCurrency } from '@shared/lib/formatters'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { ProgressBar } from '@shared/ui/ProgressBar'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { useToast } from '@shared/ui/Toast'
import { palette, radii, spacing } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'ShoppingList'>

const CATEGORY_LABELS: Record<string, string> = {
    produce: 'Овощи и фрукты',
    meat: 'Мясо и птица',
    fish: 'Рыба',
    dairy: 'Молочное',
    grains: 'Крупы и хлеб',
    pantry: 'Бакалея',
    spices: 'Специи',
    drinks: 'Напитки',
    other: 'Другое',
}

function categoryLabel(slug: string): string {
    return CATEGORY_LABELS[slug] ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Другое')
}

export function ShoppingListScreen() {
    const { params } = useRoute<Route>()
    const planId = params.mealPlanId
    const list = useShoppingList(planId)
    const regenerate = useRegenerateShoppingList()
    const toggle = useUpdateShoppingItem()
    const toast = useToast()
    const { refreshing, onRefresh } = useRefresh(list.refetch)

    const grouped = useMemo(() => {
        if (!list.data) return [] as Array<{ category: string; items: ShoppingListItem[] }>
        const buckets = new Map<string, ShoppingListItem[]>()
        for (const item of list.data.items) {
            const key = item.category_label || 'other'
            if (!buckets.has(key)) buckets.set(key, [])
            buckets.get(key)!.push(item)
        }
        return Array.from(buckets.entries()).map(([category, items]) => ({ category, items }))
    }, [list.data])

    const checkedCount = list.data?.items.filter((i) => i.is_checked).length ?? 0
    const totalCount = list.data?.items.length ?? 0
    const progress = totalCount > 0 ? checkedCount / totalCount : 0

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <ScrollView
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
                }
            >
                <QueryBoundary
                    isLoading={list.isLoading && !list.data}
                    error={list.error}
                    refetch={list.refetch}
                    skeleton="list"
                >
                    {list.data ? (
                        <>
                            <View>
                                <Heading level={1}>Список покупок</Heading>
                                <Text style={{ color: palette.textMuted, marginTop: spacing.xs, fontSize: 14 }}>
                                    Итого: {formatCurrency(list.data.total_estimated_cost)} · {totalCount} позиций
                                </Text>
                            </View>

                            <View
                                style={{
                                    backgroundColor: palette.canvasMuted,
                                    borderRadius: radii.lg,
                                    padding: spacing.md,
                                    borderWidth: 1,
                                    borderColor: palette.border,
                                    gap: spacing.sm,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontWeight: '700', color: palette.text }}>
                                        Прогресс покупок
                                    </Text>
                                    <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
                                        {checkedCount} / {totalCount}
                                    </Text>
                                </View>
                                <ProgressBar value={progress} />
                            </View>

                            <Button
                                label={regenerate.isPending ? 'Пересобираем…' : 'Пересобрать список'}
                                variant="ghost"
                                onPress={() =>
                                    regenerate.mutate(planId, {
                                        onSuccess: () => toast.success('Список покупок обновлён'),
                                        onError: () => toast.error('Не удалось пересобрать'),
                                    })
                                }
                                loading={regenerate.isPending}
                            />

                            {grouped.map(({ category, items }) => (
                                <Section key={category} title={categoryLabel(category)}>
                                    <Card>
                                        {items.map((item, index) => {
                                            const checked = item.is_checked
                                            return (
                                                <Pressable
                                                    key={item.id}
                                                    onPress={() =>
                                                        toggle.mutate({
                                                            itemId: item.id,
                                                            planId,
                                                            payload: { is_checked: !checked },
                                                        })
                                                    }
                                                    style={{
                                                        paddingVertical: spacing.sm,
                                                        borderTopWidth: index === 0 ? 0 : 1,
                                                        borderTopColor: palette.border,
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: spacing.md,
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: radii.sm,
                                                            borderWidth: 2,
                                                            borderColor: checked ? palette.primary : palette.borderStrong,
                                                            backgroundColor: checked ? palette.primary : 'transparent',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        {checked ? (
                                                            <Text
                                                                style={{
                                                                    color: palette.onPrimary,
                                                                    fontSize: 14,
                                                                    fontWeight: '700',
                                                                }}
                                                            >
                                                                ✓
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={{
                                                                color: checked ? palette.textMuted : palette.text,
                                                                fontWeight: '600',
                                                                fontSize: 15,
                                                                textDecorationLine: checked
                                                                    ? 'line-through'
                                                                    : 'none',
                                                            }}
                                                        >
                                                            {item.ingredient_name}
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                color: palette.textMuted,
                                                                fontSize: 13,
                                                                marginTop: 2,
                                                            }}
                                                        >
                                                            {Number(item.total_quantity)} {item.unit} ·{' '}
                                                            {formatCurrency(item.estimated_price)}
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            )
                                        })}
                                    </Card>
                                </Section>
                            ))}
                        </>
                    ) : null}
                </QueryBoundary>
            </ScrollView>
        </Screen>
    )
}
