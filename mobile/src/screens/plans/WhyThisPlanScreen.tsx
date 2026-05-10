import { useRoute, type RouteProp } from '@react-navigation/native'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import { usePlanExplanations } from '@features/plans/hooks'
import { usePalette } from '@shared/lib/use-palette'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Text } from '@shared/ui/Text'
import { radii, spacing, type Palette } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'WhyThisPlan'>

const TYPE_LABEL: Record<string, string> = {
    budget: 'Бюджет',
    nutrition: 'Нутриенты',
    diversity: 'Разнообразие',
    group_fit: 'Под семью',
    tradeoff: 'Компромисс',
}

const TYPE_ICON: Record<string, IconName> = {
    budget: 'wallet',
    nutrition: 'pieChart',
    diversity: 'sparkles',
    group_fit: 'users',
    tradeoff: 'lightbulb',
}

const TYPE_COLOR = (type: string, p: Palette): string => {
    if (type === 'budget') return p.warning
    if (type === 'nutrition') return p.success
    if (type === 'diversity') return p.info
    if (type === 'group_fit') return p.accent
    if (type === 'tradeoff') return p.danger
    return p.accent
}

export function WhyThisPlanScreen() {
    const palette = usePalette()
    const { params } = useRoute<Route>()
    const { data, isLoading, error, refetch } = usePlanExplanations(params.mealPlanId)

    return (
        <Screen scroll>
            <Animated.View entering={FadeInDown.duration(380)}>
                <Heading level={1}>Почему этот план</Heading>
                <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                    Прозрачность алгоритма: какие приоритеты повлияли на выбор рецептов.
                </Text>
            </Animated.View>

            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data && data.length > 0 ? (
                    <View style={{ gap: spacing.sm }}>
                        {data.map((exp, index) => {
                            const tint = TYPE_COLOR(exp.explanation_type, palette)
                            return (
                                <Animated.View
                                    key={exp.id}
                                    entering={FadeInDown.delay(index * 60).duration(360)}
                                >
                                    <Card elevation="card">
                                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                            <View
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: radii.md,
                                                    backgroundColor: tint + '22',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Icon
                                                    name={TYPE_ICON[exp.explanation_type] ?? 'lightbulb'}
                                                    size={18}
                                                    color={tint}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text variant="overline" style={{ color: tint }}>
                                                    {TYPE_LABEL[exp.explanation_type] ?? exp.explanation_type}
                                                </Text>
                                                <Text variant="bodyStrong" style={{ marginTop: 2 }}>
                                                    {exp.title}
                                                </Text>
                                                <Text variant="body" tone="secondary" style={{ marginTop: 6 }}>
                                                    {exp.explanation_text}
                                                </Text>
                                            </View>
                                        </View>
                                    </Card>
                                </Animated.View>
                            )
                        })}
                    </View>
                ) : (
                    <EmptyState
                        title="Объяснений нет"
                        description="Алгоритм не оставил подробных объяснений для этого плана."
                        icon="lightbulb"
                    />
                )}
            </QueryBoundary>
        </Screen>
    )
}
