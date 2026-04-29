import { useRoute, type RouteProp } from '@react-navigation/native'
import { Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import { useBudgetAnalytics } from '@features/plans/hooks'
import { formatCurrency } from '@shared/lib/formatters'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { ProgressBar } from '@shared/ui/ProgressBar'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'

type Route = RouteProp<AppStackParamList, 'BudgetAnalytics'>

export function BudgetAnalyticsScreen() {
    const { params } = useRoute<Route>()
    const { data, isLoading, error, refetch } = useBudgetAnalytics(params.mealPlanId)

    return (
        <Screen scroll>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <Heading level={1}>Бюджет плана</Heading>

                        <Card>
                            <ProgressBar
                                label="Использовано"
                                value={Number(data.planned_cost)}
                                max={Number(data.budget_limit) || Number(data.planned_cost) || 1}
                                suffix=" ₸"
                                color={
                                    Number(data.remaining) < 0 ? '#B91C1C' : '#1F2937'
                                }
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                                <Stat label="Лимит" value={formatCurrency(data.budget_limit)} />
                                <Stat label="План" value={formatCurrency(data.planned_cost)} />
                                <Stat
                                    label="Остаток"
                                    value={formatCurrency(data.remaining)}
                                    accent={Number(data.remaining) >= 0 ? '#047857' : '#B91C1C'}
                                />
                            </View>
                        </Card>

                        {data.cost_by_day.length > 0 ? (
                            <Section title="По дням">
                                <Card>
                                    {data.cost_by_day.map((day, index) => {
                                        const max = Math.max(
                                            ...data.cost_by_day.map((d) => Number(d.cost) || 0),
                                            1,
                                        )
                                        const ratio = (Number(day.cost) || 0) / max
                                        return (
                                            <View
                                                key={day.day_index}
                                                style={{
                                                    paddingVertical: 8,
                                                    borderTopWidth: index === 0 ? 0 : 1,
                                                    borderTopColor: '#F0E2C5',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                    }}
                                                >
                                                    <Text style={{ fontWeight: '600' }}>
                                                        День {day.day_index}
                                                    </Text>
                                                    <Text style={{ fontWeight: '600' }}>
                                                        {formatCurrency(day.cost)}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={{
                                                        marginTop: 6,
                                                        height: 6,
                                                        backgroundColor: '#F0E2C5',
                                                        borderRadius: 3,
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            width: `${ratio * 100}%`,
                                                            height: '100%',
                                                            backgroundColor: '#1F2937',
                                                        }}
                                                    />
                                                </View>
                                            </View>
                                        )
                                    })}
                                </Card>
                            </Section>
                        ) : null}

                        {data.most_expensive_meals.length > 0 ? (
                            <Section title="Самые дорогие блюда">
                                <Card>
                                    {data.most_expensive_meals.map((meal, index) => (
                                        <View
                                            key={meal.meal_plan_item_id}
                                            style={{
                                                paddingVertical: 8,
                                                borderTopWidth: index === 0 ? 0 : 1,
                                                borderTopColor: '#F0E2C5',
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Text style={{ flex: 1, color: '#111827' }} numberOfLines={1}>
                                                {meal.recipe_title}
                                            </Text>
                                            <Text style={{ fontWeight: '700' }}>
                                                {formatCurrency(meal.cost)}
                                            </Text>
                                        </View>
                                    ))}
                                </Card>
                            </Section>
                        ) : null}

                        {data.savings_opportunities.length > 0 ? (
                            <Section title="Где сэкономить">
                                <Card>
                                    {data.savings_opportunities.map((tip, idx) => (
                                        <Text key={idx} style={{ color: '#374151', lineHeight: 20 }}>
                                            • {tip.suggestion}
                                        </Text>
                                    ))}
                                </Card>
                            </Section>
                        ) : null}
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <View>
            <Text style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase' }}>{label}</Text>
            <Text style={{ marginTop: 2, fontSize: 16, fontWeight: '700', color: accent ?? '#111827' }}>
                {value}
            </Text>
        </View>
    )
}
