import { useRoute, type RouteProp } from '@react-navigation/native'
import { Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import { useNutritionAnalytics } from '@features/plans/hooks'
import { formatScore } from '@shared/lib/formatters'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { ProgressBar } from '@shared/ui/ProgressBar'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'

type Route = RouteProp<AppStackParamList, 'NutritionAnalytics'>

export function NutritionAnalyticsScreen() {
    const { params } = useRoute<Route>()
    const { data, isLoading, error, refetch } = useNutritionAnalytics(params.mealPlanId)

    return (
        <Screen scroll>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <Heading level={1}>Нутриенты</Heading>
                        <Text style={{ color: '#6B7280' }}>
                            Соответствие плана целям семьи: {formatScore(data.weekly_target_fit)}
                        </Text>

                        <Section title="Баланс макроэлементов">
                            <Card>
                                {Object.entries(data.macro_balance ?? {}).map(([key, value]) => (
                                    <View key={key} style={{ marginVertical: 6 }}>
                                        <ProgressBar
                                            label={key}
                                            value={Number(value) * 100}
                                            max={100}
                                            suffix="%"
                                        />
                                    </View>
                                ))}
                            </Card>
                        </Section>

                        <Section title="По членам семьи">
                            <View style={{ gap: 10 }}>
                                {(data.member_fit ?? []).map((member) => (
                                    <Card key={member.member_id}>
                                        <Text style={{ fontWeight: '700', fontSize: 16 }}>
                                            {member.display_name}
                                        </Text>
                                        <Text style={{ color: '#6B7280', marginTop: 4 }}>
                                            {Math.round(member.actual_calories)} /{' '}
                                            {Math.round(member.target_calories)} ккал в день
                                        </Text>
                                        <View style={{ marginTop: 8, gap: 6 }}>
                                            <ProgressBar
                                                label="Калории"
                                                value={member.actual_calories}
                                                max={member.target_calories || member.actual_calories || 1}
                                                suffix=" ккал"
                                                color="#1F2937"
                                            />
                                            <ProgressBar
                                                label="Белки"
                                                value={member.protein_ratio * 100}
                                                max={100}
                                                suffix="%"
                                                color="#0F766E"
                                            />
                                            <ProgressBar
                                                label="Жиры"
                                                value={member.fat_ratio * 100}
                                                max={100}
                                                suffix="%"
                                                color="#B45309"
                                            />
                                            <ProgressBar
                                                label="Углеводы"
                                                value={member.carb_ratio * 100}
                                                max={100}
                                                suffix="%"
                                                color="#7C3AED"
                                            />
                                        </View>
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
