import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import { usePlanDetail } from '@features/plans/hooks'
import {
    formatCalories,
    formatCurrency,
    formatDate,
    formatScore,
    mealTypeLabel,
} from '@shared/lib/formatters'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { StatRow } from '@shared/ui/StatRow'

type Route = RouteProp<AppStackParamList, 'PlanDetails'>
type Navigation = NativeStackNavigationProp<AppStackParamList>

export function PlanDetailsScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<Navigation>()
    const { data, isLoading, error, refetch } = usePlanDetail(params.mealPlanId)

    return (
        <Screen scroll>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <View>
                            <Heading level={1}>{data.summary.title}</Heading>
                            <Text style={{ color: '#6B7280', marginTop: 4 }}>
                                {formatDate(data.summary.start_date)} — {formatDate(data.summary.end_date)} ·{' '}
                                {data.summary.days_count} дней
                            </Text>
                        </View>

                        <StatRow
                            stats={[
                                {
                                    label: 'Стоимость',
                                    value: formatCurrency(data.summary.estimated_total_cost),
                                },
                                {
                                    label: 'Калории',
                                    value: formatCalories(data.summary.estimated_total_calories),
                                },
                                {
                                    label: 'Скор',
                                    value: formatScore(data.summary.overall_score),
                                    emphasis: true,
                                },
                                { label: 'Бюджет fit', value: formatScore(data.summary.budget_fit_score) },
                            ]}
                        />

                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <Button
                                label="Список покупок"
                                variant="secondary"
                                onPress={() =>
                                    navigation.navigate('ShoppingList', { mealPlanId: data.summary.id })
                                }
                                style={{ flexBasis: '47%', flexGrow: 1 }}
                            />
                            <Button
                                label="Бюджет"
                                variant="ghost"
                                onPress={() =>
                                    navigation.navigate('BudgetAnalytics', { mealPlanId: data.summary.id })
                                }
                                style={{ flexBasis: '47%', flexGrow: 1 }}
                            />
                            <Button
                                label="Нутриенты"
                                variant="ghost"
                                onPress={() =>
                                    navigation.navigate('NutritionAnalytics', { mealPlanId: data.summary.id })
                                }
                                style={{ flexBasis: '47%', flexGrow: 1 }}
                            />
                            <Button
                                label="Почему так"
                                variant="ghost"
                                onPress={() =>
                                    navigation.navigate('WhyThisPlan', { mealPlanId: data.summary.id })
                                }
                                style={{ flexBasis: '47%', flexGrow: 1 }}
                            />
                        </View>

                        <Section title="Дни">
                            <View style={{ gap: 10 }}>
                                {data.days.map((day) => (
                                    <Card
                                        key={day.id}
                                        onPress={() =>
                                            navigation.navigate('DayDetails', {
                                                mealPlanId: data.summary.id,
                                                dayIndex: day.day_index,
                                            })
                                        }
                                    >
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                marginBottom: 8,
                                            }}
                                        >
                                            <Text style={{ fontWeight: '700', fontSize: 16 }}>
                                                День {day.day_index} · {formatDate(day.plan_date)}
                                            </Text>
                                            <Text style={{ fontWeight: '700', color: '#7A4A0A' }}>
                                                {formatCurrency(day.estimated_daily_cost)}
                                            </Text>
                                        </View>
                                        <View style={{ gap: 4 }}>
                                            {day.items.map((item) => (
                                                <View
                                                    key={item.id}
                                                    style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                    }}
                                                >
                                                    <Text style={{ flex: 1, color: '#374151' }} numberOfLines={1}>
                                                        <Text style={{ fontWeight: '700' }}>
                                                            {mealTypeLabel(item.meal_type)}:
                                                        </Text>{' '}
                                                        {item.recipe_title}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </Card>
                                ))}
                            </View>
                        </Section>

                        {data.top_explanations.length > 0 ? (
                            <Section title="Главные причины выбора">
                                <View style={{ gap: 8 }}>
                                    {data.top_explanations.map((exp) => (
                                        <Card key={exp.id}>
                                            <Text style={{ fontWeight: '700' }}>{exp.title}</Text>
                                            <Text style={{ marginTop: 4, color: '#374151', lineHeight: 20 }}>
                                                {exp.explanation_text}
                                            </Text>
                                        </Card>
                                    ))}
                                    <Pressable
                                        onPress={() =>
                                            navigation.navigate('WhyThisPlan', { mealPlanId: data.summary.id })
                                        }
                                    >
                                        <Text
                                            style={{
                                                color: '#7A4A0A',
                                                fontWeight: '600',
                                                textAlign: 'center',
                                                marginTop: 4,
                                            }}
                                        >
                                            Все объяснения →
                                        </Text>
                                    </Pressable>
                                </View>
                            </Section>
                        ) : null}
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}
