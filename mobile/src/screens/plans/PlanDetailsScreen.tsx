import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import { usePlanDetail } from '@features/plans/hooks'
import {
    formatCalories,
    formatCurrency,
    formatDate,
    formatScore,
    mealTypeLabel,
} from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { mealTypeIcon } from '@shared/lib/meal-icons'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { StatRow } from '@shared/ui/StatRow'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, shadows, spacing, type Palette } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'PlanDetails'>
type Navigation = NativeStackNavigationProp<AppStackParamList>

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function shortDayName(dateStr: string): string {
    const d = new Date(dateStr)
    return DAY_NAMES[d.getDay()] ?? '—'
}

function dayNumber(dateStr: string): string {
    const d = new Date(dateStr)
    return String(d.getDate())
}

export function PlanDetailsScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<Navigation>()
    const palette = usePalette()
    const { data, isLoading, error, refetch } = usePlanDetail(params.mealPlanId)
    const [activeDayIndex, setActiveDayIndex] = useState(0)

    return (
        <Screen scroll>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <Animated.View entering={FadeInDown.duration(380)}>
                            <Heading level={1}>{data.summary.title}</Heading>
                            <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
                                {formatDate(data.summary.start_date)} — {formatDate(data.summary.end_date)} ·{' '}
                                {data.summary.days_count} дней
                            </Text>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(60).duration(380)}>
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
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(120).duration(380)}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: spacing.sm,
                                }}
                            >
                                <ActionPill
                                    palette={palette}
                                    icon="cart"
                                    label="Покупки"
                                    onPress={() =>
                                        navigation.navigate('ShoppingList', { mealPlanId: data.summary.id })
                                    }
                                />
                                <ActionPill
                                    palette={palette}
                                    icon="wallet"
                                    label="Бюджет"
                                    onPress={() =>
                                        navigation.navigate('BudgetAnalytics', { mealPlanId: data.summary.id })
                                    }
                                />
                                <ActionPill
                                    palette={palette}
                                    icon="pieChart"
                                    label="Нутриенты"
                                    onPress={() =>
                                        navigation.navigate('NutritionAnalytics', { mealPlanId: data.summary.id })
                                    }
                                />
                                <ActionPill
                                    palette={palette}
                                    icon="lightbulb"
                                    label="Почему так"
                                    onPress={() =>
                                        navigation.navigate('WhyThisPlan', { mealPlanId: data.summary.id })
                                    }
                                />
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(180).duration(380)}>
                            <Section title="Дни">
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}
                                >
                                    {data.days.map((day, index) => {
                                        const isActive = index === activeDayIndex
                                        return (
                                            <TouchableSurface
                                                key={day.id}
                                                onPress={() => {
                                                    haptic.selection()
                                                    setActiveDayIndex(index)
                                                }}
                                                accessibilityRole="button"
                                                accessibilityLabel={`День ${day.day_index}, ${formatDate(day.plan_date)}`}
                                                scaleTo={0.94}
                                                style={{
                                                    width: 60,
                                                    paddingVertical: spacing.md,
                                                    paddingHorizontal: spacing.sm,
                                                    borderRadius: radii.lg,
                                                    backgroundColor: isActive ? palette.accent : palette.canvasElevated,
                                                    borderWidth: 1,
                                                    borderColor: isActive ? palette.accent : palette.border,
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                            >
                                                <Text
                                                    variant="overline"
                                                    style={{
                                                        color: isActive ? palette.textOnAccent : palette.textMuted,
                                                    }}
                                                >
                                                    {shortDayName(day.plan_date)}
                                                </Text>
                                                <Text
                                                    variant="h2"
                                                    style={{
                                                        color: isActive ? palette.textOnAccent : palette.text,
                                                    }}
                                                >
                                                    {dayNumber(day.plan_date)}
                                                </Text>
                                            </TouchableSurface>
                                        )
                                    })}
                                </ScrollView>
                            </Section>
                        </Animated.View>

                        {data.days[activeDayIndex] ? (
                            <Animated.View
                                key={activeDayIndex}
                                entering={FadeInDown.duration(280)}
                                style={{ gap: spacing.md }}
                            >
                                <Card elevation="card">
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <View>
                                            <Text variant="overline" tone="muted">
                                                День {data.days[activeDayIndex].day_index}
                                            </Text>
                                            <Heading level={3}>{formatDate(data.days[activeDayIndex].plan_date)}</Heading>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text variant="overline" tone="muted">
                                                Стоимость
                                            </Text>
                                            <Text variant="h3" tone="accent">
                                                {formatCurrency(data.days[activeDayIndex].estimated_daily_cost)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Button
                                        label="Подробнее о дне"
                                        variant="ghost"
                                        size="sm"
                                        onPress={() =>
                                            navigation.navigate('DayDetails', {
                                                mealPlanId: data.summary.id,
                                                dayIndex: data.days[activeDayIndex].day_index,
                                            })
                                        }
                                        iconRight={
                                            <Icon name="chevronRight" size={16} color={palette.text} />
                                        }
                                        style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
                                    />
                                </Card>

                                <View style={{ gap: spacing.sm }}>
                                    {data.days[activeDayIndex].items.map((item) => (
                                        <Card
                                            key={item.id}
                                            onPress={() =>
                                                navigation.navigate('RecipeDetails', { recipeId: item.recipe_id })
                                            }
                                            elevation="card"
                                            accessibilityLabel={`${mealTypeLabel(item.meal_type)}: ${item.recipe_title}`}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: spacing.md,
                                                }}
                                            >
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
                                                    <Icon
                                                        name={mealTypeIcon(item.meal_type)}
                                                        size={22}
                                                        color={palette.accentText}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text variant="caption" tone="muted">
                                                        {mealTypeLabel(item.meal_type)}
                                                    </Text>
                                                    <Text variant="bodyStrong" numberOfLines={2}>
                                                        {item.recipe_title}
                                                    </Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text variant="caption" tone="muted">
                                                        {formatCurrency(item.estimated_cost)}
                                                    </Text>
                                                    <Text variant="caption" tone="accent" weight="700">
                                                        {formatScore(item.selection_score)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </Card>
                                    ))}
                                </View>
                            </Animated.View>
                        ) : null}

                        {data.top_explanations.length > 0 ? (
                            <Animated.View entering={FadeInDown.delay(240).duration(380)}>
                                <Section
                                    title="Главные причины выбора"
                                    actionRight={
                                        <Button
                                            label="Все"
                                            variant="ghost"
                                            size="sm"
                                            onPress={() =>
                                                navigation.navigate('WhyThisPlan', { mealPlanId: data.summary.id })
                                            }
                                        />
                                    }
                                >
                                    <View style={{ gap: spacing.sm }}>
                                        {data.top_explanations.slice(0, 3).map((exp) => (
                                            <Card key={exp.id} elevation="card">
                                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                                    <View
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: radii.md,
                                                            backgroundColor: palette.accentSoft,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        <Icon
                                                            name="lightbulb"
                                                            size={18}
                                                            color={palette.accentText}
                                                        />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text variant="bodyStrong">{exp.title}</Text>
                                                        <Text
                                                            variant="body"
                                                            tone="secondary"
                                                            style={{ marginTop: 2 }}
                                                        >
                                                            {exp.explanation_text}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </Card>
                                        ))}
                                    </View>
                                </Section>
                            </Animated.View>
                        ) : null}
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}

function ActionPill({
    palette,
    icon,
    label,
    onPress,
}: {
    palette: Palette
    icon: IconName
    label: string
    onPress: () => void
}) {
    return (
        <TouchableSurface
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            scaleTo={0.94}
            style={[
                {
                    flexBasis: '47%',
                    flexGrow: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.md,
                    borderRadius: radii.lg,
                    backgroundColor: palette.canvasElevated,
                    borderWidth: 1,
                    borderColor: palette.border,
                },
                shadows.card,
            ]}
        >
            <View
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: radii.md,
                    backgroundColor: palette.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name={icon} size={18} color={palette.accentText} />
            </View>
            <Text variant="bodyStrong">{label}</Text>
        </TouchableSurface>
    )
}