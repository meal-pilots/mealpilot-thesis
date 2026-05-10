import { useRoute, type RouteProp } from '@react-navigation/native'
import { useMemo } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import Animated, { FadeInDown, Layout } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import type { ShoppingListItem } from '@entities/plan/types'
import {
    useRegenerateShoppingList,
    useShoppingList,
    useUpdateShoppingItem,
} from '@features/plans/hooks'
import { formatCurrency, formatQuantity, pluralRu, shoppingCategoryLabel } from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { useRefresh } from '@shared/lib/use-refresh'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { ProgressBar } from '@shared/ui/ProgressBar'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { useToast } from '@shared/ui/Toast'
import { radii, shadows, spacing, type Palette } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'ShoppingList'>

export function ShoppingListScreen() {
    const { params } = useRoute<Route>()
    const palette = usePalette()
    const planId = params.mealPlanId
    const list = useShoppingList(planId)
    const regenerate = useRegenerateShoppingList()
    const toggle = useUpdateShoppingItem()
    const toast = useToast()
    const { refreshing, onRefresh } = useRefresh(list.refetch)

    const grouped = useMemo(() => {
        if (!list.data) return [] as { category: string; items: ShoppingListItem[] }[]
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
    const completed = totalCount > 0 && checkedCount === totalCount

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <ScrollView
                contentContainerStyle={{
                    padding: spacing.xxl,
                    paddingBottom: spacing.huge,
                    gap: spacing.lg,
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
                }
                showsVerticalScrollIndicator={false}
            >
                <QueryBoundary
                    isLoading={list.isLoading && !list.data}
                    error={list.error}
                    refetch={list.refetch}
                    skeleton="list"
                >
                    {list.data ? (
                        <>
                            <Animated.View entering={FadeInDown.duration(380)}>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                                    <Heading level={1}>Покупки</Heading>
                                </View>
                                <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                                    {totalCount} {pluralRu(totalCount, ['позиция', 'позиции', 'позиций'])}
                                </Text>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(60).duration(380)}>
                                <Card elevation="card">
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-end',
                                        }}
                                    >
                                        <View>
                                            <Text variant="overline" tone="muted">
                                                Итого
                                            </Text>
                                            <Heading level={1} style={{ marginTop: 2 }}>
                                                {formatCurrency(list.data.total_estimated_cost)}
                                            </Heading>
                                        </View>
                                        <View
                                            style={{
                                                paddingHorizontal: spacing.md,
                                                paddingVertical: 6,
                                                borderRadius: radii.pill,
                                                backgroundColor: completed ? palette.successBg : palette.accentSoft,
                                            }}
                                        >
                                            <Text
                                                variant="caption"
                                                weight="700"
                                                style={{ color: completed ? palette.success : palette.accentText }}
                                            >
                                                {checkedCount} / {totalCount}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ marginTop: spacing.md }}>
                                        <ProgressBar
                                            value={progress}
                                            color={completed ? palette.success : palette.accent}
                                            height={10}
                                        />
                                    </View>
                                </Card>
                            </Animated.View>

                            <Button
                                label={regenerate.isPending ? 'Пересобираем…' : 'Пересобрать список'}
                                variant="ghost"
                                iconLeft={<Icon name="refresh" size={18} color={palette.text} />}
                                onPress={() =>
                                    regenerate.mutate(planId, {
                                        onSuccess: () => {
                                            haptic.success()
                                            toast.success('Список покупок обновлён')
                                        },
                                        onError: () => {
                                            haptic.error()
                                            toast.error('Не удалось пересобрать')
                                        },
                                    })
                                }
                                loading={regenerate.isPending}
                            />

                            {grouped.map(({ category, items }, sectionIndex) => (
                                <Animated.View
                                    key={category}
                                    entering={FadeInDown.delay(120 + sectionIndex * 40).duration(380)}
                                >
                                    <Section
                                        title={shoppingCategoryLabel(category)}
                                        subtitle={`${items.length} ${pluralRu(items.length, ['позиция', 'позиции', 'позиций'])}`}
                                    >
                                        <Card elevation="card" padding={spacing.sm}>
                                            {items.map((item, index) => (
                                                <Animated.View key={item.id} layout={Layout.springify()}>
                                                    <ShoppingRow
                                                        palette={palette}
                                                        item={item}
                                                        showDivider={index > 0}
                                                        onToggle={() => {
                                                            haptic.light()
                                                            toggle.mutate({
                                                                itemId: item.id,
                                                                planId,
                                                                payload: { is_checked: !item.is_checked },
                                                            })
                                                        }}
                                                    />
                                                </Animated.View>
                                            ))}
                                        </Card>
                                    </Section>
                                </Animated.View>
                            ))}
                        </>
                    ) : null}
                </QueryBoundary>
            </ScrollView>
        </Screen>
    )
}

function ShoppingRow({
    palette,
    item,
    showDivider,
    onToggle,
}: {
    palette: Palette
    item: ShoppingListItem
    showDivider: boolean
    onToggle: () => void
}) {
    const checked = item.is_checked
    return (
        <TouchableSurface
            onPress={onToggle}
            scaleTo={0.99}
            feedback="none"
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={`${item.ingredient_name}, ${formatQuantity(item.total_quantity, item.unit)}`}
            style={{
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.sm,
                borderTopWidth: showDivider ? 1 : 0,
                borderTopColor: palette.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
            }}
        >
            <View
                style={{
                    width: 26,
                    height: 26,
                    borderRadius: radii.sm,
                    borderWidth: 2,
                    borderColor: checked ? palette.success : palette.borderStrong,
                    backgroundColor: checked ? palette.success : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...(checked ? shadows.glow : {}),
                }}
            >
                {checked ? <Icon name="check" size={16} color={palette.successOn} strokeWidth={3} /> : null}
            </View>
            <View style={{ flex: 1 }}>
                <Text
                    variant="bodyStrong"
                    style={{
                        color: checked ? palette.textMuted : palette.text,
                        textDecorationLine: checked ? 'line-through' : 'none',
                    }}
                >
                    {item.ingredient_name}
                </Text>
                <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    {formatQuantity(item.total_quantity, item.unit)} · {formatCurrency(item.estimated_price)}
                </Text>
            </View>
        </TouchableSurface>
    )
}
