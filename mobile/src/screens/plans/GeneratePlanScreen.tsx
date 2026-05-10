import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import type { GeneratePlanRequest } from '@entities/plan/types'
import { useActiveGroup } from '@features/groups/hooks'
import { useGeneratePlan, useGenerationRunStatus } from '@features/plans/hooks'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { Screen } from '@shared/ui/Screen'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { useToast } from '@shared/ui/Toast'
import { radii, shadows, spacing, type Palette } from '@shared/ui/theme'

type Strictness = 'strict' | 'medium' | 'flexible'
type Focus = 'budget' | 'nutrition' | 'speed' | 'taste'

const FOCUS_OPTIONS: { id: Focus; label: string; icon: IconName; description: string }[] = [
    { id: 'budget', label: 'Бюджет', icon: 'wallet', description: 'Минимальная стоимость недели' },
    { id: 'nutrition', label: 'Нутриенты', icon: 'pieChart', description: 'Сбалансированные БЖУ' },
    { id: 'speed', label: 'Скорость', icon: 'timer', description: 'Готовка до 30 минут' },
    { id: 'taste', label: 'Вкус', icon: 'star', description: 'Любимые рецепты семьи' },
]

const STRICTNESS_OPTIONS: { id: Strictness; label: string; description: string }[] = [
    { id: 'strict', label: 'Строго', description: 'Не превышать лимит' },
    { id: 'medium', label: 'Средне', description: '+20% допуск' },
    { id: 'flexible', label: 'Гибко', description: '+40% допуск' },
]

const DAYS_OPTIONS = [3, 5, 7, 14] as const
const MEALS_OPTIONS = [2, 3, 4] as const
const TOTAL_STEPS = 3

function todayString(): string {
    return new Date().toISOString().slice(0, 10)
}

export function GeneratePlanScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
    const palette = usePalette()
    const groupQuery = useActiveGroup()
    const groupId = groupQuery.data?.id
    const toast = useToast()

    const [step, setStep] = useState(0)

    const [daysCount, setDaysCount] = useState<number>(7)
    const [mealsPerDay, setMealsPerDay] = useState<number>(3)
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
            haptic.success()
            setRunId(null)
            navigation.replace('PlanDetails', { mealPlanId: data.meal_plan_id })
        } else if (data.status === 'failed') {
            haptic.error()
            setRunId(null)
            toast.error(data.error_message || 'Не удалось сгенерировать план')
        }
    }, [status.data, runId, navigation, toast])

    const goTo = (next: number) => {
        const safe = Math.max(0, Math.min(TOTAL_STEPS - 1, next))
        setStep(safe)
        haptic.selection()
    }

    const onSubmit = async () => {
        if (!groupId) {
            toast.error('Сначала пройдите онбординг и создайте семью')
            return
        }
        if (focus.length === 0) {
            toast.warning('Выберите хотя бы один приоритет')
            return
        }

        const request: GeneratePlanRequest = {
            start_date: todayString(),
            days_count: daysCount,
            meals_per_day: mealsPerDay,
            include_snacks: mealsPerDay === 4,
            budget_strictness: budgetStrictness,
            cooking_time_strictness: cookingTimeStrictness,
            optimization_focus: focus,
        }

        try {
            haptic.medium()
            const result = await generate.mutateAsync({ groupId, request })
            setRunId(result.generation_run_id)
        } catch (err) {
            haptic.error()
            toast.error(err instanceof Error ? err.message : 'Не удалось запустить генерацию')
        }
    }

    const isGenerating =
        generate.isPending || (runId !== null && status.data?.status !== 'completed' && status.data?.status !== 'failed')

    if (isGenerating) {
        return <GeneratingScreen palette={palette} />
    }

    return (
        <Screen contentContainerStyle={{ padding: 0 }}>
            <View style={{ paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, gap: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <View
                            key={i}
                            style={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: i <= step ? palette.accent : palette.border,
                            }}
                        />
                    ))}
                </View>
                <Text variant="overline" tone="muted">
                    Шаг {step + 1} из {TOTAL_STEPS}
                </Text>
            </View>

            <ScrollView
                key={`step-${step}`}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: spacing.xxl, paddingTop: spacing.lg, gap: spacing.lg }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInRight.duration(220)} style={{ gap: spacing.lg }}>
                    {step === 0 ? (
                        <>
                            <Heading level={1}>Когда готовим?</Heading>
                            <Text variant="body" tone="secondary">
                                Сколько дней и сколько приёмов пищи в день учитываем.
                            </Text>

                            <View style={{ gap: spacing.sm }}>
                                <Text variant="caption" tone="secondary" weight="700">
                                    Длительность
                                </Text>
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    {DAYS_OPTIONS.map((d) => (
                                        <ChipOption
                                            key={d}
                                            palette={palette}
                                            label={`${d} дн.`}
                                            active={daysCount === d}
                                            onPress={() => {
                                                haptic.selection()
                                                setDaysCount(d)
                                            }}
                                        />
                                    ))}
                                </View>
                            </View>

                            <View style={{ gap: spacing.sm }}>
                                <Text variant="caption" tone="secondary" weight="700">
                                    Приёмов пищи в день
                                </Text>
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    {MEALS_OPTIONS.map((m) => (
                                        <ChipOption
                                            key={m}
                                            palette={palette}
                                            label={`${m}`}
                                            active={mealsPerDay === m}
                                            onPress={() => {
                                                haptic.selection()
                                                setMealsPerDay(m)
                                            }}
                                        />
                                    ))}
                                </View>
                            </View>
                        </>
                    ) : null}

                    {step === 1 ? (
                        <>
                            <Heading level={1}>Под что оптимизируем?</Heading>
                            <Text variant="body" tone="secondary">
                                CP-SAT планировщик подберёт рецепты, балансируя выбранные приоритеты.
                            </Text>

                            <View style={{ gap: spacing.sm }}>
                                {FOCUS_OPTIONS.map((option) => {
                                    const active = focus.includes(option.id)
                                    return (
                                        <FocusCard
                                            key={option.id}
                                            palette={palette}
                                            icon={option.icon}
                                            label={option.label}
                                            description={option.description}
                                            active={active}
                                            onPress={() => {
                                                haptic.selection()
                                                setFocus((prev) =>
                                                    prev.includes(option.id)
                                                        ? prev.filter((f) => f !== option.id)
                                                        : [...prev, option.id],
                                                )
                                            }}
                                        />
                                    )
                                })}
                            </View>
                        </>
                    ) : null}

                    {step === 2 ? (
                        <>
                            <Heading level={1}>Насколько строго?</Heading>
                            <Text variant="body" tone="secondary">
                                Строгий режим не нарушит лимиты. Гибкий допускает превышение, если это сильно улучшает план.
                            </Text>

                            <View style={{ gap: spacing.sm }}>
                                <Text variant="caption" tone="secondary" weight="700">
                                    Бюджет
                                </Text>
                                <SegmentedControl
                                    palette={palette}
                                    options={STRICTNESS_OPTIONS}
                                    value={budgetStrictness}
                                    onChange={(value) => {
                                        haptic.selection()
                                        setBudgetStrictness(value)
                                    }}
                                />
                            </View>

                            <View style={{ gap: spacing.sm }}>
                                <Text variant="caption" tone="secondary" weight="700">
                                    Время готовки
                                </Text>
                                <SegmentedControl
                                    palette={palette}
                                    options={STRICTNESS_OPTIONS}
                                    value={cookingTimeStrictness}
                                    onChange={(value) => {
                                        haptic.selection()
                                        setCookingTimeStrictness(value)
                                    }}
                                />
                            </View>

                            <Card elevation="card" style={{ marginTop: spacing.md }}>
                                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                    <Icon name="info" size={20} color={palette.accent} />
                                    <View style={{ flex: 1 }}>
                                        <Text variant="bodyStrong">Готовы запустить</Text>
                                        <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                                            Алгоритм CP-SAT обычно подбирает план за 3-10 секунд.
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        </>
                    ) : null}
                </Animated.View>
            </ScrollView>

            <View
                style={{
                    flexDirection: 'row',
                    gap: spacing.sm,
                    padding: spacing.xxl,
                    borderTopWidth: 1,
                    borderTopColor: palette.border,
                    backgroundColor: palette.canvas,
                }}
            >
                {step > 0 ? (
                    <Button
                        label="Назад"
                        variant="ghost"
                        onPress={() => goTo(step - 1)}
                        style={{ flex: 1 }}
                        iconLeft={<Icon name="chevronLeft" size={18} color={palette.text} />}
                    />
                ) : null}
                {step < TOTAL_STEPS - 1 ? (
                    <Button
                        label="Далее"
                        onPress={() => goTo(step + 1)}
                        style={{ flex: step > 0 ? 1.5 : 1 }}
                        iconRight={<Icon name="chevronRight" size={18} color={palette.onPrimary} />}
                    />
                ) : (
                    <Button
                        label="Сгенерировать план"
                        onPress={onSubmit}
                        style={{ flex: 1.5 }}
                        iconLeft={<Icon name="sparkles" size={18} color={palette.onPrimary} />}
                    />
                )}
            </View>
        </Screen>
    )
}

function GeneratingScreen({ palette }: { palette: Palette }) {
    return (
        <Screen contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
                entering={FadeIn.duration(400)}
                style={{ alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xxl }}
            >
                <View
                    style={[
                        {
                            width: 96,
                            height: 96,
                            borderRadius: 48,
                            backgroundColor: palette.accentSoft,
                            alignItems: 'center',
                            justifyContent: 'center',
                        },
                        shadows.glow,
                    ]}
                >
                    <Icon name="sparkles" size={42} color={palette.accent} />
                </View>
                <ActivityIndicator color={palette.accent} size="large" />
                <Heading level={2} style={{ textAlign: 'center' }}>
                    Подбираем меню для вашей семьи
                </Heading>
                <Text variant="body" tone="secondary" align="center" style={{ maxWidth: 320 }}>
                    CP-SAT учитывает бюджет, аллергии, цели и предпочтения каждого члена семьи. Обычно это занимает
                    3-10 секунд.
                </Text>
            </Animated.View>
        </Screen>
    )
}

function ChipOption({
    palette,
    label,
    active,
    onPress,
}: {
    palette: Palette
    label: string
    active: boolean
    onPress: () => void
}) {
    return (
        <TouchableSurface
            onPress={onPress}
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={{
                flex: 1,
                paddingVertical: spacing.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.lg,
                backgroundColor: active ? palette.primary : palette.canvasElevated,
                borderWidth: 1.5,
                borderColor: active ? palette.primary : palette.border,
            }}
        >
            <Text variant="bodyStrong" style={{ color: active ? palette.onPrimary : palette.text }}>
                {label}
            </Text>
        </TouchableSurface>
    )
}

function FocusCard({
    palette,
    icon,
    label,
    description,
    active,
    onPress,
}: {
    palette: Palette
    icon: IconName
    label: string
    description: string
    active: boolean
    onPress: () => void
}) {
    return (
        <TouchableSurface
            onPress={onPress}
            scaleTo={0.985}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${label}. ${description}`}
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radii.lg,
                    backgroundColor: active ? palette.accentSoft : palette.canvasElevated,
                    borderWidth: 1.5,
                    borderColor: active ? palette.accent : palette.border,
                },
                active ? shadows.card : null,
            ]}
        >
            <View
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: radii.md,
                    backgroundColor: active ? palette.accent : palette.canvasMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name={icon} size={22} color={active ? palette.textOnAccent : palette.text} />
            </View>
            <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{label}</Text>
                <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                    {description}
                </Text>
            </View>
            <Icon
                name={active ? 'checkCircle' : 'plus'}
                size={20}
                color={active ? palette.accent : palette.textMuted}
            />
        </TouchableSurface>
    )
}

function SegmentedControl<T extends string>({
    palette,
    options,
    value,
    onChange,
}: {
    palette: Palette
    options: { id: T; label: string; description?: string }[]
    value: T
    onChange: (value: T) => void
}) {
    return (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {options.map((option) => {
                const active = option.id === value
                return (
                    <TouchableSurface
                        key={option.id}
                        onPress={() => onChange(option.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        scaleTo={0.96}
                        style={{
                            flex: 1,
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.sm,
                            alignItems: 'center',
                            borderRadius: radii.lg,
                            backgroundColor: active ? palette.primary : palette.canvasElevated,
                            borderWidth: 1.5,
                            borderColor: active ? palette.primary : palette.border,
                            gap: 2,
                        }}
                    >
                        <Text variant="bodyStrong" style={{ color: active ? palette.onPrimary : palette.text }}>
                            {option.label}
                        </Text>
                        {option.description ? (
                            <Text
                                variant="caption"
                                style={{
                                    color: active ? palette.accentSoft : palette.textMuted,
                                    fontSize: 11,
                                }}
                            >
                                {option.description}
                            </Text>
                        ) : null}
                    </TouchableSurface>
                )
            })}
        </View>
    )
}
