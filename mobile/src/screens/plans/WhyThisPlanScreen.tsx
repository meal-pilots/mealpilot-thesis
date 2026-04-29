import { useRoute, type RouteProp } from '@react-navigation/native'
import { Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import { usePlanExplanations } from '@features/plans/hooks'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'

type Route = RouteProp<AppStackParamList, 'WhyThisPlan'>

const TYPE_LABEL: Record<string, string> = {
    budget: 'Бюджет',
    nutrition: 'Нутриенты',
    diversity: 'Разнообразие',
    group_fit: 'Под семью',
    tradeoff: 'Компромисс',
}

const TYPE_COLOR: Record<string, string> = {
    budget: '#7A4A0A',
    nutrition: '#0F766E',
    diversity: '#7C3AED',
    group_fit: '#1F2937',
    tradeoff: '#B45309',
}

export function WhyThisPlanScreen() {
    const { params } = useRoute<Route>()
    const { data, isLoading, error, refetch } = usePlanExplanations(params.mealPlanId)

    return (
        <Screen scroll>
            <Heading level={1}>Почему этот план</Heading>
            <Text style={{ color: '#6B7280' }}>
                Прозрачность алгоритма: какие приоритеты повлияли на выбор рецептов.
            </Text>

            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data && data.length > 0 ? (
                    <View style={{ gap: 10 }}>
                        {data.map((exp) => (
                            <Card key={exp.id}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        color: TYPE_COLOR[exp.explanation_type] ?? '#7A4A0A',
                                    }}
                                >
                                    {TYPE_LABEL[exp.explanation_type] ?? exp.explanation_type}
                                </Text>
                                <Text style={{ marginTop: 4, fontSize: 16, fontWeight: '700' }}>
                                    {exp.title}
                                </Text>
                                <Text style={{ marginTop: 6, color: '#374151', lineHeight: 20 }}>
                                    {exp.explanation_text}
                                </Text>
                            </Card>
                        ))}
                    </View>
                ) : (
                    <EmptyState
                        title="Объяснений нет"
                        description="Алгоритм не оставил подробных объяснений для этого плана."
                        emoji="🤔"
                    />
                )}
            </QueryBoundary>
        </Screen>
    )
}
