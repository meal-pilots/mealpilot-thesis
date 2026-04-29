import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import { usePlanDay } from '@features/plans/hooks'
import {
    formatCalories,
    formatCurrency,
    formatDate,
    mealTypeLabel,
} from '@shared/lib/formatters'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { palette, spacing } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'DayDetails'>
type Navigation = NativeStackNavigationProp<AppStackParamList>

export function DayDetailsScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<Navigation>()
    const { data, isLoading, error, refetch } = usePlanDay(params.mealPlanId, params.dayIndex)

    return (
        <Screen scroll>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <View>
                            <Heading level={1}>День {data.day_index}</Heading>
                            <Text style={{ color: palette.textMuted, marginTop: spacing.xs, fontSize: 14 }}>
                                {formatDate(data.plan_date)} · {formatCurrency(data.estimated_daily_cost)} ·{' '}
                                {formatCalories(data.estimated_daily_calories)}
                            </Text>
                        </View>

                        <Section title="Приёмы пищи">
                            <View style={{ gap: spacing.md }}>
                                {data.items.map((item) => (
                                    <Card key={item.id}>
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                color: palette.accentText,
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.4,
                                            }}
                                        >
                                            {mealTypeLabel(item.meal_type)}
                                        </Text>
                                        <Text
                                            style={{
                                                marginTop: spacing.xs,
                                                fontSize: 17,
                                                fontWeight: '700',
                                                color: palette.text,
                                            }}
                                            numberOfLines={2}
                                        >
                                            {item.recipe_title}
                                        </Text>
                                        <Text style={{ marginTop: spacing.xs, color: palette.textMuted, fontSize: 13 }}>
                                            {formatCurrency(item.estimated_cost)} ·{' '}
                                            {formatCalories(item.estimated_calories)} · порций{' '}
                                            {Number(item.servings_total)}
                                        </Text>
                                        {item.selection_reason_summary ? (
                                            <Text
                                                style={{
                                                    marginTop: spacing.sm,
                                                    color: palette.textSecondary,
                                                    fontStyle: 'italic',
                                                    fontSize: 13,
                                                    lineHeight: 19,
                                                }}
                                            >
                                                {item.selection_reason_summary}
                                            </Text>
                                        ) : null}

                                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                                            <Button
                                                label="Рецепт"
                                                variant="ghost"
                                                size="sm"
                                                onPress={() =>
                                                    navigation.navigate('RecipeDetails', {
                                                        recipeId: item.recipe_id,
                                                    })
                                                }
                                                style={{ flex: 1 }}
                                            />
                                            <Button
                                                label="Заменить"
                                                variant="secondary"
                                                size="sm"
                                                onPress={() =>
                                                    navigation.navigate('ReplaceMeal', {
                                                        mealPlanItemId: item.id,
                                                        mealPlanId: params.mealPlanId,
                                                        mealType: item.meal_type,
                                                        currentRecipeName: item.recipe_title,
                                                    })
                                                }
                                                style={{ flex: 1 }}
                                            />
                                            <Button
                                                label="Адаптировать"
                                                variant="secondary"
                                                size="sm"
                                                onPress={() =>
                                                    navigation.navigate('MealAdaptation', {
                                                        mealPlanItemId: item.id,
                                                    })
                                                }
                                                style={{ flex: 1 }}
                                            />
                                        </View>

                                        {item.adaptations.length > 0 ? (
                                            <View
                                                style={{
                                                    marginTop: spacing.md,
                                                    borderTopWidth: 1,
                                                    borderTopColor: palette.border,
                                                    paddingTop: spacing.sm,
                                                    gap: spacing.xs,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontWeight: '700',
                                                        fontSize: 12,
                                                        color: palette.textSecondary,
                                                    }}
                                                >
                                                    Адаптации
                                                </Text>
                                                {item.adaptations.map((adapt) => (
                                                    <Text
                                                        key={adapt.id}
                                                        style={{ fontSize: 13, color: palette.textSecondary }}
                                                    >
                                                        • {adapt.member_name}: {adapt.description}
                                                    </Text>
                                                ))}
                                            </View>
                                        ) : null}
                                    </Card>
                                ))}
                            </View>
                        </Section>
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}
