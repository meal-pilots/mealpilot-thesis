import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import type { RecipeCategory, RecipeFilters } from '@entities/recipe/types'
import { useRecipes } from '@features/recipes/hooks'
import { formatCalories, formatCurrency, formatMinutes, formatScore, mealTypeLabel } from '@shared/lib/formatters'
import { useDebouncedValue } from '@shared/lib/use-debounced'
import { useRefresh } from '@shared/lib/use-refresh'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { SkeletonList } from '@shared/ui/Skeleton'
import { TagList } from '@shared/ui/Tag'
import { palette, radii, spacing } from '@shared/ui/theme'

const CATEGORY_FILTERS: Array<{ id: RecipeCategory | 'all'; label: string }> = [
    { id: 'all', label: 'Все' },
    { id: 'breakfast', label: mealTypeLabel('breakfast') },
    { id: 'lunch', label: mealTypeLabel('lunch') },
    { id: 'dinner', label: mealTypeLabel('dinner') },
    { id: 'snack', label: mealTypeLabel('snack') },
]

export function RecipesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState<RecipeCategory | 'all'>('all')
    const debouncedSearch = useDebouncedValue(search, 300)

    const filters = useMemo<RecipeFilters>(() => {
        const next: RecipeFilters = {}
        if (debouncedSearch.trim()) next.search = debouncedSearch.trim()
        if (category !== 'all') next.category = category
        return next
    }, [debouncedSearch, category])

    const { data, isLoading, error, refetch } = useRecipes(filters)
    const { refreshing, onRefresh } = useRefresh(refetch)

    const renderHeader = () => (
        <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
            <Heading level={1}>Рецепты</Heading>
            <Input
                placeholder="Поиск по названию или ингредиенту"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                returnKeyType="search"
                leftAddon={<Text style={{ fontSize: 16, color: palette.textMuted }}>⌕</Text>}
                rightAddon={
                    search ? (
                        <Pressable
                            onPress={() => setSearch('')}
                            hitSlop={8}
                            accessibilityLabel="Очистить поиск"
                        >
                            <Text style={{ color: palette.textMuted, fontSize: 16 }}>×</Text>
                        </Pressable>
                    ) : null
                }
            />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}
            >
                {CATEGORY_FILTERS.map((option) => {
                    const active = option.id === category
                    return (
                        <Pressable
                            key={option.id}
                            onPress={() => setCategory(option.id)}
                            style={{
                                paddingHorizontal: spacing.md,
                                paddingVertical: spacing.sm,
                                borderRadius: radii.pill,
                                backgroundColor: active ? palette.primary : palette.canvasMuted,
                                borderWidth: 1,
                                borderColor: active ? palette.primary : palette.border,
                            }}
                        >
                            <Text
                                style={{
                                    color: active ? palette.onPrimary : palette.text,
                                    fontWeight: '600',
                                    fontSize: 14,
                                }}
                            >
                                {option.label}
                            </Text>
                        </Pressable>
                    )
                })}
            </ScrollView>
        </View>
    )

    if (isLoading && !data) {
        return (
            <Screen>
                {renderHeader()}
                <SkeletonList count={5} />
            </Screen>
        )
    }

    if (error) {
        return (
            <Screen>
                {renderHeader()}
                <EmptyState
                    title="Не удалось загрузить рецепты"
                    description={error instanceof Error ? error.message : 'Попробуйте обновить'}
                    actionLabel="Повторить"
                    onAction={refetch}
                />
            </Screen>
        )
    }

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <FlatList
                data={data ?? []}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{
                    padding: spacing.lg,
                    paddingBottom: spacing.xxl,
                    gap: spacing.md,
                }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
                }
                ListEmptyComponent={
                    <EmptyState
                        title="Ничего не найдено"
                        description="Попробуйте смягчить фильтры или сменить категорию."
                        emoji="🥦"
                        actionLabel={debouncedSearch || category !== 'all' ? 'Сбросить фильтры' : undefined}
                        onAction={
                            debouncedSearch || category !== 'all'
                                ? () => {
                                      setSearch('')
                                      setCategory('all')
                                  }
                                : undefined
                        }
                    />
                }
                renderItem={({ item: recipe }) => (
                    <Card
                        onPress={() => navigation.navigate('RecipeDetails', { recipeId: recipe.id })}
                        style={{ marginBottom: spacing.sm }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, marginRight: spacing.md }}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        color: palette.accentText,
                                        fontWeight: '700',
                                        letterSpacing: 0.4,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {mealTypeLabel(recipe.category)} · {formatScore(recipe.fit_score)}
                                </Text>
                                <Text
                                    style={{
                                        marginTop: spacing.xs,
                                        fontSize: 16,
                                        fontWeight: '700',
                                        color: palette.text,
                                        letterSpacing: -0.2,
                                    }}
                                    numberOfLines={2}
                                >
                                    {recipe.title}
                                </Text>
                                <Text style={{ marginTop: spacing.xs, color: palette.textMuted, fontSize: 13 }}>
                                    {formatMinutes(recipe.total_time_minutes)} ·{' '}
                                    {formatCurrency(recipe.estimated_cost)} ·{' '}
                                    {formatCalories(recipe.calories_per_serving ?? '0')}
                                </Text>
                                {recipe.tags.length > 0 ? (
                                    <View style={{ marginTop: spacing.sm }}>
                                        <TagList items={recipe.tags.slice(0, 3)} />
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </Card>
                )}
            />
        </Screen>
    )
}
