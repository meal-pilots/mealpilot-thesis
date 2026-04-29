import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useLayoutEffect, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import { useFavorites, useRecipe, useToggleFavorite } from '@features/recipes/hooks'
import {
    formatCalories,
    formatCurrency,
    formatGrams,
    formatMinutes,
    formatScore,
    mealTypeLabel,
} from '@shared/lib/formatters'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { StatRow } from '@shared/ui/StatRow'
import { TagList } from '@shared/ui/Tag'
import { useToast } from '@shared/ui/Toast'
import { palette, radii, spacing } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'RecipeDetails'>

export function RecipeDetailsScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const toast = useToast()

    const { data, isLoading, error, refetch } = useRecipe(params.recipeId)
    const { data: favorites } = useFavorites()
    const toggleFavorite = useToggleFavorite()

    const isFavorited = useMemo(
        () => favorites?.some((f) => f.recipe_id === params.recipeId) ?? false,
        [favorites, params.recipeId],
    )

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Pressable
                    onPress={() => {
                        if (toggleFavorite.isPending) return
                        toggleFavorite.mutate(
                            { recipeId: params.recipeId, currentlyFavorited: isFavorited },
                            {
                                onSuccess: () => {
                                    toast.success(isFavorited ? 'Удалено из избранного' : 'Добавлено в избранное')
                                },
                                onError: () => toast.error('Не удалось обновить избранное'),
                            },
                        )
                    }}
                    style={{ paddingHorizontal: 8 }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorited ? 'Удалить из избранного' : 'Добавить в избранное'}
                >
                    <Text style={{ fontSize: 22, color: isFavorited ? palette.warning : palette.textMuted }}>
                        {isFavorited ? '★' : '☆'}
                    </Text>
                </Pressable>
            ),
        })
    }, [isFavorited, navigation, params.recipeId, toast, toggleFavorite])

    return (
        <Screen scroll>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <View>
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: palette.accentText,
                                    fontWeight: '700',
                                    letterSpacing: 0.5,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {mealTypeLabel(data.category)} · {data.cuisine_type}
                            </Text>
                            <Heading level={1} style={{ marginTop: spacing.xs }}>
                                {data.title}
                            </Heading>
                            {data.short_description ? (
                                <Text
                                    style={{
                                        marginTop: spacing.sm,
                                        color: palette.textSecondary,
                                        fontSize: 15,
                                        lineHeight: 22,
                                    }}
                                >
                                    {data.short_description}
                                </Text>
                            ) : null}
                        </View>

                        <StatRow
                            stats={[
                                { label: 'Время', value: formatMinutes(data.total_time_minutes) },
                                { label: 'Стоимость', value: formatCurrency(data.estimated_cost) },
                                {
                                    label: 'Подходит',
                                    value: formatScore(data.suitability.fit_score),
                                    emphasis: true,
                                },
                                { label: 'Порций', value: String(data.servings_default) },
                            ]}
                        />

                        {data.tags.length > 0 ? (
                            <Section title="Теги">
                                <TagList items={data.tags} />
                            </Section>
                        ) : null}

                        {data.nutrition ? (
                            <Section title="Нутриенты на порцию">
                                <Card>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
                                        <NutritionBox
                                            label="Калории"
                                            value={formatCalories(data.nutrition.calories_per_serving)}
                                        />
                                        <NutritionBox
                                            label="Белки"
                                            value={formatGrams(data.nutrition.protein_per_serving_g)}
                                        />
                                        <NutritionBox
                                            label="Жиры"
                                            value={formatGrams(data.nutrition.fat_per_serving_g)}
                                        />
                                        <NutritionBox
                                            label="Углеводы"
                                            value={formatGrams(data.nutrition.carb_per_serving_g)}
                                        />
                                    </View>
                                </Card>
                            </Section>
                        ) : null}

                        <Section title="Ингредиенты" subtitle={`${data.ingredients.length} позиций`}>
                            <Card>
                                {data.ingredients.map((ing, index) => (
                                    <View
                                        key={ing.ingredient_id}
                                        style={{
                                            paddingVertical: spacing.sm,
                                            borderTopWidth: index === 0 ? 0 : 1,
                                            borderTopColor: palette.border,
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <Text style={{ flex: 1, color: palette.text, fontSize: 15 }}>
                                            {ing.name}
                                            {ing.preparation_note ? `, ${ing.preparation_note}` : ''}
                                        </Text>
                                        <Text style={{ color: palette.textMuted, marginLeft: spacing.md, fontSize: 14 }}>
                                            {Number(ing.quantity)} {ing.unit}
                                        </Text>
                                    </View>
                                ))}
                            </Card>
                        </Section>

                        {data.steps.length > 0 ? (
                            <Section title="Приготовление" subtitle={`${data.steps.length} шагов`}>
                                <View style={{ gap: spacing.sm }}>
                                    {data.steps.map((step) => (
                                        <Card key={step.order}>
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: spacing.sm,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: radii.pill,
                                                        backgroundColor: palette.accent,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: palette.accentText,
                                                            fontWeight: '700',
                                                            fontSize: 13,
                                                        }}
                                                    >
                                                        {step.order}
                                                    </Text>
                                                </View>
                                                {step.duration_minutes ? (
                                                    <Text
                                                        style={{
                                                            color: palette.textMuted,
                                                            fontSize: 12,
                                                            fontWeight: '600',
                                                        }}
                                                    >
                                                        {formatMinutes(step.duration_minutes)}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <Text
                                                style={{
                                                    marginTop: spacing.sm,
                                                    color: palette.text,
                                                    lineHeight: 22,
                                                    fontSize: 15,
                                                }}
                                            >
                                                {step.instruction_text}
                                            </Text>
                                        </Card>
                                    ))}
                                </View>
                            </Section>
                        ) : null}

                        {data.suitability.matches.length > 0 || data.suitability.conflicts.length > 0 ? (
                            <Section title="Подходит ли вашей семье">
                                <Card>
                                    {data.suitability.matches.length > 0 ? (
                                        <View style={{ marginBottom: spacing.sm }}>
                                            <Text style={{ color: palette.success, fontWeight: '700', marginBottom: 4 }}>
                                                Плюсы
                                            </Text>
                                            {data.suitability.matches.map((m) => (
                                                <Text key={m} style={{ color: palette.success, lineHeight: 22 }}>
                                                    • {m}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}
                                    {data.suitability.conflicts.length > 0 ? (
                                        <View>
                                            <Text style={{ color: palette.danger, fontWeight: '700', marginBottom: 4 }}>
                                                Замечания
                                            </Text>
                                            {data.suitability.conflicts.map((c) => (
                                                <Text key={c} style={{ color: palette.danger, lineHeight: 22 }}>
                                                    • {c}
                                                </Text>
                                            ))}
                                        </View>
                                    ) : null}
                                </Card>
                            </Section>
                        ) : null}
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}

function NutritionBox({ label, value }: { label: string; value: string }) {
    return (
        <View style={{ flexBasis: '40%', flexGrow: 1 }}>
            <Text
                style={{
                    fontSize: 11,
                    color: palette.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    fontWeight: '700',
                }}
            >
                {label}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 17, fontWeight: '700', color: palette.text }}>{value}</Text>
        </View>
    )
}
