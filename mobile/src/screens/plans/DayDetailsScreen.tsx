import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import { usePlanDay } from '@features/plans/hooks'
import {
    formatCalories,
    formatCurrency,
    formatDate,
    mealTypeLabel,
} from '@shared/lib/formatters'
import { mealTypeIcon } from '@shared/lib/meal-icons'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { radii, spacing, type Palette } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'DayDetails'>
type Navigation = NativeStackNavigationProp<AppStackParamList>

export function DayDetailsScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<Navigation>()
    const palette = usePalette()
    const { data, isLoading, error, refetch } = usePlanDay(params.mealPlanId, params.dayIndex)

    return (
        <Screen scroll>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <Animated.View entering={FadeInDown.duration(380)}>
                            <Heading level={1}>День {data.day_index}</Heading>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: spacing.sm,
                                    marginTop: spacing.xs,
                                }}
                            >
                                <Icon name="calendar" size={14} color={palette.textMuted} />
                                <Text variant="caption" tone="muted">
                                    {formatDate(data.plan_date)} · {formatCurrency(data.estimated_daily_cost)} ·{' '}
                                    {formatCalories(data.estimated_daily_calories)}
                                </Text>
                            </View>
                        </Animated.View>

                        <Section title="Приёмы пищи">
                            <View style={{ gap: spacing.md }}>
                                {data.items.map((item, index) => (
                                    <Animated.View
                                        key={item.id}
                                        entering={FadeInDown.delay(index * 60).duration(360)}
                                    >
                                        <MealItemCard
                                            palette={palette}
                                            meal={item}
                                            onRecipe={() =>
                                                navigation.navigate('RecipeDetails', {
                                                    recipeId: item.recipe_id,
                                                })
                                            }
                                            onReplace={() =>
                                                navigation.navigate('ReplaceMeal', {
                                                    mealPlanItemId: item.id,
                                                    mealPlanId: params.mealPlanId,
                                                    mealType: item.meal_type,
                                                    currentRecipeName: item.recipe_title,
                                                })
                                            }
                                            onAdapt={() =>
                                                navigation.navigate('MealAdaptation', {
                                                    mealPlanItemId: item.id,
                                                })
                                            }
                                        />
                                    </Animated.View>
                                ))}
                            </View>
                        </Section>
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}

function MealItemCard({
    palette,
    meal,
    onRecipe,
    onReplace,
    onAdapt,
}: {
    palette: Palette
    meal: {
        id: string
        meal_type: string
        recipe_id: string
        recipe_title: string
        servings_total: string
        estimated_cost: string
        estimated_calories: string
        selection_reason_summary: string
        adaptations: { id: string; member_name: string; description: string }[]
    }
    onRecipe: () => void
    onReplace: () => void
    onAdapt: () => void
}) {
    return (
        <Card elevation="card">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: radii.md,
                        backgroundColor: palette.accentSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon name={mealTypeIcon(meal.meal_type)} size={22} color={palette.accentText} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text variant="overline" tone="accent">
                        {mealTypeLabel(meal.meal_type)}
                    </Text>
                    <Text variant="bodyStrong" numberOfLines={2}>
                        {meal.recipe_title}
                    </Text>
                </View>
            </View>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    marginTop: spacing.sm,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="wallet" size={12} color={palette.textMuted} />
                    <Text variant="caption" tone="muted">
                        {formatCurrency(meal.estimated_cost)}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="flame" size={12} color={palette.textMuted} />
                    <Text variant="caption" tone="muted">
                        {formatCalories(meal.estimated_calories)}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="users" size={12} color={palette.textMuted} />
                    <Text variant="caption" tone="muted">
                        {Number(meal.servings_total)}
                    </Text>
                </View>
            </View>
            {meal.selection_reason_summary ? (
                <View
                    style={{
                        marginTop: spacing.sm,
                        padding: spacing.sm,
                        borderRadius: radii.md,
                        backgroundColor: palette.canvasMuted,
                        flexDirection: 'row',
                        gap: spacing.sm,
                    }}
                >
                    <Icon name="lightbulb" size={14} color={palette.accent} />
                    <Text variant="caption" tone="secondary" style={{ flex: 1, fontStyle: 'italic' }}>
                        {meal.selection_reason_summary}
                    </Text>
                </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <Button label="Рецепт" variant="ghost" size="sm" onPress={onRecipe} style={{ flex: 1 }} />
                <Button label="Заменить" variant="tonal" size="sm" onPress={onReplace} style={{ flex: 1 }} />
                <Button label="Адаптация" variant="tonal" size="sm" onPress={onAdapt} style={{ flex: 1 }} />
            </View>

            {meal.adaptations.length > 0 ? (
                <View
                    style={{
                        marginTop: spacing.md,
                        borderTopWidth: 1,
                        borderTopColor: palette.border,
                        paddingTop: spacing.sm,
                        gap: spacing.xs,
                    }}
                >
                    <Text variant="overline" tone="muted">
                        Адаптации
                    </Text>
                    {meal.adaptations.map((adapt) => (
                        <Text key={adapt.id} variant="caption" tone="secondary">
                            • {adapt.member_name}: {adapt.description}
                        </Text>
                    ))}
                </View>
            ) : null}
        </Card>
    )
}
