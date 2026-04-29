import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import type { RecipeCategory, RecipeFilters } from '@entities/recipe/types'
import { useReplaceMealItem } from '@features/plans/hooks'
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
import { useToast } from '@shared/ui/Toast'
import { palette, spacing } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'ReplaceMeal'>

export function ReplaceMealScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const toast = useToast()
    const replace = useReplaceMealItem()

    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search, 300)

    const filters = useMemo<RecipeFilters>(() => {
        const out: RecipeFilters = {}
        if (debouncedSearch.trim()) out.search = debouncedSearch.trim()
        if (params.mealType) out.category = params.mealType as RecipeCategory
        return out
    }, [debouncedSearch, params.mealType])

    const recipes = useRecipes(filters)
    const { refreshing, onRefresh } = useRefresh(recipes.refetch)

    const handleReplace = (recipeId: string, recipeTitle: string) => {
        replace.mutate(
            {
                itemId: params.mealPlanItemId,
                replacementRecipeId: recipeId,
                planId: params.mealPlanId,
            },
            {
                onSuccess: () => {
                    toast.success(`Заменено на «${recipeTitle}»`)
                    navigation.goBack()
                },
                onError: (err) =>
                    toast.error(err instanceof Error ? err.message : 'Не удалось заменить'),
            },
        )
    }

    const renderHeader = () => (
        <View style={{ paddingBottom: spacing.md, gap: spacing.md }}>
            <Heading level={1}>Заменить блюдо</Heading>
            {params.currentRecipeName ? (
                <Text style={{ color: palette.textSecondary, fontSize: 14 }}>
                    Сейчас: <Text style={{ fontWeight: '700' }}>{params.currentRecipeName}</Text>
                </Text>
            ) : null}
            <Input
                placeholder="Поиск замены"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                returnKeyType="search"
                leftAddon={<Text style={{ fontSize: 16, color: palette.textMuted }}>⌕</Text>}
            />
        </View>
    )

    if (recipes.isLoading && !recipes.data) {
        return (
            <Screen>
                {renderHeader()}
                <SkeletonList count={5} />
            </Screen>
        )
    }

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <FlatList
                data={recipes.data ?? []}
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
                        title="Нет подходящих рецептов"
                        description="Попробуйте смягчить поиск."
                        emoji="🍽️"
                    />
                }
                renderItem={({ item: recipe }) => (
                    <Pressable
                        onPress={() => handleReplace(recipe.id, recipe.title)}
                        disabled={replace.isPending}
                    >
                        <Card style={{ opacity: replace.isPending ? 0.6 : 1 }}>
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: palette.accentText,
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.4,
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
                        </Card>
                    </Pressable>
                )}
            />
        </Screen>
    )
}
