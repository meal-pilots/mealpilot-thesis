import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'

import type { AppStackParamList } from '@core/navigation/types'
import type { GeneratePlanRequest } from '@entities/plan/types'
import { useActiveGroup } from '@features/groups/hooks'
import { useGeneratePlan, useGenerationRunStatus } from '@features/plans/hooks'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'

type Strictness = 'strict' | 'medium' | 'flexible'
type Focus = 'budget' | 'nutrition' | 'speed' | 'taste'

const FOCUS_OPTIONS: Array<{ id: Focus; label: string }> = [
    { id: 'budget', label: 'Бюджет' },
    { id: 'nutrition', label: 'Нутриенты' },
    { id: 'speed', label: 'Скорость' },
    { id: 'taste', label: 'Вкус' },
]

const STRICTNESS_OPTIONS: Array<{ id: Strictness; label: string }> = [
    { id: 'strict', label: 'Строго' },
    { id: 'medium', label: 'Средне' },
    { id: 'flexible', label: 'Гибко' },
]

function todayString(): string {
    return new Date().toISOString().slice(0, 10)
}

export function GeneratePlanScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const groupQuery = useActiveGroup()
    const groupId = groupQuery.data?.id

    const [daysCount, setDaysCount] = useState('7')
    const [mealsPerDay, setMealsPerDay] = useState('3')
    const [budgetStrictness, setBudgetStrictness] = useState<Strictness>('medium')
    const [cookingTimeStrictness, setCookingTimeStrictness] = useState<Strictness>('medium')
    const [focus, setFocus] = useState<Focus[]>(['budget', 'nutrition'])
    const [runId, setRunId] = useState<string | null>(null)

    const generate = useGeneratePlan()
    const status = useGenerationRunStatus(runId)

    useEffect(() => {
        const data = status.data
        if (!data || !runId) return
        if (data.status === 'completed' && data.meal_plan_id) {
            setRunId(null)
            navigation.replace('PlanDetails', { mealPlanId: data.meal_plan_id })
        } else if (data.status === 'failed') {
            setRunId(null)
            Alert.alert('Не удалось сгенерировать', data.error_message || 'Попробуйте снова')
        }
    }, [status.data, runId, navigation])

    const onSubmit = async () => {
        if (!groupId) {
            Alert.alert('Нет группы', 'Сначала пройдите онбординг и создайте семью.')
            return
        }
        if (focus.length === 0) {
            Alert.alert('Не выбран фокус', 'Выберите хотя бы один приоритет оптимизации.')
            return
        }

        const request: GeneratePlanRequest = {
            start_date: todayString(),
            days_count: Number(daysCount) || 7,
            meals_per_day: Number(mealsPerDay) || 3,
            include_snacks: Number(mealsPerDay) === 4,
            budget_strictness: budgetStrictness,
            cooking_time_strictness: cookingTimeStrictness,
            optimization_focus: focus,
        }

        try {
            const result = await generate.mutateAsync({ groupId, request })
            setRunId(result.generation_run_id)
        } catch (err) {
            Alert.alert('Ошибка', err instanceof Error ? err.message : 'Не удалось запустить генерацию')
        }
    }

    const isGenerating = generate.isPending || (runId && status.data?.status !== 'completed')

    return (
        <Screen scroll>
            <Heading level={1}>Сгенерировать план</Heading>
            <Text style={{ color: '#6B7280' }}>
                Алгоритм CP-SAT подберёт {daysCount || '?'} дней рецептов под ваши предпочтения.
            </Text>

            <Section title="Параметры">
                <Input
                    label="Дней в плане"
                    keyboardType="numeric"
                    value={daysCount}
                    onChangeText={setDaysCount}
                />
                <Input
                    label="Приёмов пищи в день (1-4)"
                    keyboardType="numeric"
                    value={mealsPerDay}
                    onChangeText={setMealsPerDay}
                />
            </Section>

            <Section title="Жёсткость бюджета">
                <SegmentedControl
                    options={STRICTNESS_OPTIONS}
                    value={budgetStrictness}
                    onChange={setBudgetStrictness}
                />
            </Section>

            <Section title="Жёсткость по времени готовки">
                <SegmentedControl
                    options={STRICTNESS_OPTIONS}
                    value={cookingTimeStrictness}
                    onChange={setCookingTimeStrictness}
                />
            </Section>

            <Section title="Что важнее" subtitle="Можно выбрать несколько">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {FOCUS_OPTIONS.map((option) => {
                        const active = focus.includes(option.id)
                        return (
                            <Pressable
                                key={option.id}
                                onPress={() =>
                                    setFocus((prev) =>
                                        prev.includes(option.id)
                                            ? prev.filter((f) => f !== option.id)
                                            : [...prev, option.id],
                                    )
                                }
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    backgroundColor: active ? '#1F2937' : '#FFFBF2',
                                    borderWidth: 1,
                                    borderColor: active ? '#1F2937' : '#F0E2C5',
                                }}
                            >
                                <Text style={{ color: active ? '#fff' : '#111827', fontWeight: '600' }}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>
            </Section>

            {runId && status.data?.status === 'pending' ? (
                <Card>
                    <Heading level={3}>Генерируем…</Heading>
                    <Text style={{ marginTop: 6, color: '#6B7280' }}>
                        CP-SAT подбирает оптимальные рецепты. Обычно занимает 3-10 секунд.
                    </Text>
                </Card>
            ) : null}

            <Button
                label={isGenerating ? 'Генерация…' : 'Сгенерировать'}
                onPress={onSubmit}
                loading={Boolean(isGenerating)}
                disabled={Boolean(isGenerating)}
                style={{ marginTop: 8 }}
            />
        </Screen>
    )
}

function SegmentedControl<T extends string>(props: {
    options: Array<{ id: T; label: string }>
    value: T
    onChange: (value: T) => void
}) {
    return (
        <View style={{ flexDirection: 'row', gap: 8 }}>
            {props.options.map((option) => {
                const active = option.id === props.value
                return (
                    <Pressable
                        key={option.id}
                        onPress={() => props.onChange(option.id)}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            alignItems: 'center',
                            borderRadius: 12,
                            backgroundColor: active ? '#1F2937' : '#FFFBF2',
                            borderWidth: 1,
                            borderColor: active ? '#1F2937' : '#F0E2C5',
                        }}
                    >
                        <Text style={{ color: active ? '#fff' : '#111827', fontWeight: '600' }}>
                            {option.label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}
