import { useRoute, type RouteProp } from '@react-navigation/native'
import { Dimensions, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { BarChart } from 'react-native-gifted-charts'

import type { AppStackParamList } from '@core/navigation/types'
import { useBudgetAnalytics } from '@features/plans/hooks'
import { formatCurrency } from '@shared/lib/formatters'
import { usePalette } from '@shared/lib/use-palette'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { ProgressBar } from '@shared/ui/ProgressBar'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { radii, spacing, type Palette } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'BudgetAnalytics'>

const { width: screenWidth } = Dimensions.get('window')

export function BudgetAnalyticsScreen() {
    const palette = usePalette()
    const { params } = useRoute<Route>()
    const { data, isLoading, error, refetch } = useBudgetAnalytics(params.mealPlanId)

    return (
        <Screen scroll>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <Animated.View entering={FadeInDown.duration(380)}>
                            <Heading level={1}>Бюджет плана</Heading>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(60).duration(380)}>
                            <Card elevation="card">
                                <ProgressBar
                                    label="Использовано"
                                    value={Number(data.planned_cost)}
                                    max={Number(data.budget_limit) || Number(data.planned_cost) || 1}
                                    suffix=" ₸"
                                    color={Number(data.remaining) < 0 ? palette.danger : palette.accent}
                                    height={12}
                                />
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        marginTop: spacing.md,
                                    }}
                                >
                                    <BudgetStat
                                        palette={palette}
                                        label="Лимит"
                                        value={formatCurrency(data.budget_limit)}
                                    />
                                    <BudgetStat
                                        palette={palette}
                                        label="План"
                                        value={formatCurrency(data.planned_cost)}
                                    />
                                    <BudgetStat
                                        palette={palette}
                                        label="Остаток"
                                        value={formatCurrency(data.remaining)}
                                        accent={Number(data.remaining) >= 0 ? palette.success : palette.danger}
                                    />
                                </View>
                            </Card>
                        </Animated.View>

                        {data.cost_by_day.length > 0 ? (
                            <Animated.View entering={FadeInDown.delay(120).duration(380)}>
                                <Section title="По дням">
                                    <Card elevation="card">
                                        <BarChart
                                            data={data.cost_by_day.map((day) => ({
                                                value: Number(day.cost) || 0,
                                                label: `${day.day_index}`,
                                                frontColor: palette.accent,
                                                gradientColor: palette.accentStrong,
                                                topLabelComponent: () => (
                                                    <Text variant="overline" tone="muted" style={{ fontSize: 9 }}>
                                                        {Math.round(Number(day.cost))}
                                                    </Text>
                                                ),
                                            }))}
                                            barWidth={26}
                                            spacing={14}
                                            width={screenWidth - spacing.xxl * 2 - spacing.lg * 2}
                                            roundedTop
                                            showGradient
                                            barBorderRadius={6}
                                            yAxisColor={palette.border}
                                            xAxisColor={palette.border}
                                            yAxisTextStyle={{ color: palette.textMuted, fontSize: 10 }}
                                            xAxisLabelTextStyle={{ color: palette.textMuted, fontSize: 11 }}
                                            noOfSections={4}
                                            yAxisThickness={0}
                                            xAxisThickness={1}
                                            disableScroll
                                        />
                                    </Card>
                                </Section>
                            </Animated.View>
                        ) : null}

                        {data.most_expensive_meals.length > 0 ? (
                            <Animated.View entering={FadeInDown.delay(180).duration(380)}>
                                <Section title="Самые дорогие блюда">
                                    <Card elevation="card" padding={spacing.sm}>
                                        {data.most_expensive_meals.map((meal, index) => (
                                            <View
                                                key={meal.meal_plan_item_id}
                                                style={{
                                                    paddingVertical: spacing.sm,
                                                    paddingHorizontal: spacing.sm,
                                                    borderTopWidth: index === 0 ? 0 : 1,
                                                    borderTopColor: palette.border,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: spacing.sm,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: 14,
                                                        backgroundColor: palette.accentSoft,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Text
                                                        variant="caption"
                                                        weight="700"
                                                        tone="accent"
                                                    >
                                                        {index + 1}
                                                    </Text>
                                                </View>
                                                <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                                                    {meal.recipe_title}
                                                </Text>
                                                <Text variant="bodyStrong">{formatCurrency(meal.cost)}</Text>
                                            </View>
                                        ))}
                                    </Card>
                                </Section>
                            </Animated.View>
                        ) : null}

                        {data.savings_opportunities.length > 0 ? (
                            <Animated.View entering={FadeInDown.delay(240).duration(380)}>
                                <Section title="Где сэкономить">
                                    <Card elevation="card">
                                        <View style={{ gap: spacing.sm }}>
                                            {data.savings_opportunities.map((tip, idx) => (
                                                <View
                                                    key={idx}
                                                    style={{
                                                        flexDirection: 'row',
                                                        gap: spacing.sm,
                                                        alignItems: 'flex-start',
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            width: 24,
                                                            height: 24,
                                                            borderRadius: radii.pill,
                                                            backgroundColor: palette.successBg,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        <Icon
                                                            name="lightbulb"
                                                            size={14}
                                                            color={palette.success}
                                                        />
                                                    </View>
                                                    <Text variant="body" style={{ flex: 1, lineHeight: 22 }}>
                                                        {tip.suggestion}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </Card>
                                </Section>
                            </Animated.View>
                        ) : null}
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}

function BudgetStat({
    palette,
    label,
    value,
    accent,
}: {
    palette: Palette
    label: string
    value: string
    accent?: string
}) {
    return (
        <View>
            <Text variant="overline" tone="muted">
                {label}
            </Text>
            <Text variant="bodyStrong" style={{ marginTop: 2, color: accent ?? palette.text }}>
                {value}
            </Text>
        </View>
    )
}
