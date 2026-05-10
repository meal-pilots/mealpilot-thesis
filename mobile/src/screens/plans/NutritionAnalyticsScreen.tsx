import { useRoute, type RouteProp } from '@react-navigation/native'
import { useMemo } from 'react'
import { Dimensions, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { PieChart } from 'react-native-gifted-charts'

import type { AppStackParamList } from '@core/navigation/types'
import { useNutritionAnalytics } from '@features/plans/hooks'
import { formatScore } from '@shared/lib/formatters'
import { usePalette } from '@shared/lib/use-palette'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { ProgressBar } from '@shared/ui/ProgressBar'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { radii, spacing, type Palette } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'NutritionAnalytics'>

const { width: screenWidth } = Dimensions.get('window')

const MACRO_LABELS: Record<string, string> = {
    protein: 'Белки',
    fat: 'Жиры',
    carb: 'Углеводы',
    carbs: 'Углеводы',
    protein_g: 'Белки',
    fat_g: 'Жиры',
    carb_g: 'Углеводы',
}

export function NutritionAnalyticsScreen() {
    const palette = usePalette()
    const { params } = useRoute<Route>()
    const { data, isLoading, error, refetch } = useNutritionAnalytics(params.mealPlanId)

    const macroPie = useMemo(() => {
        if (!data?.macro_balance) return []
        const colors: Record<string, string> = {
            protein: palette.success,
            fat: palette.warning,
            carb: palette.info,
            carbs: palette.info,
            protein_g: palette.success,
            fat_g: palette.warning,
            carb_g: palette.info,
        }
        return Object.entries(data.macro_balance).map(([key, value]) => ({
            value: Number(value) * 100,
            color: colors[key] ?? palette.accent,
            text: `${Math.round(Number(value) * 100)}%`,
            label: MACRO_LABELS[key] ?? key,
        }))
    }, [data, palette])

    return (
        <Screen scroll>
            <QueryBoundary isLoading={isLoading} error={error} refetch={refetch}>
                {data ? (
                    <>
                        <Animated.View entering={FadeInDown.duration(380)}>
                            <Heading level={1}>Нутриенты</Heading>
                            <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                                Соответствие плана целям семьи: {formatScore(data.weekly_target_fit)}
                            </Text>
                        </Animated.View>

                        {macroPie.length > 0 ? (
                            <Animated.View entering={FadeInDown.delay(60).duration(380)}>
                                <Section title="Баланс макроэлементов">
                                    <Card elevation="card">
                                        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                                            <PieChart
                                                data={macroPie}
                                                radius={Math.min(screenWidth / 4, 110)}
                                                innerRadius={Math.min(screenWidth / 7, 70)}
                                                centerLabelComponent={() => (
                                                    <View style={{ alignItems: 'center' }}>
                                                        <Text variant="overline" tone="muted">
                                                            ФИТ
                                                        </Text>
                                                        <Text variant="h2">
                                                            {formatScore(data.weekly_target_fit)}
                                                        </Text>
                                                    </View>
                                                )}
                                                showText={false}
                                                strokeColor={palette.canvasElevated}
                                                strokeWidth={4}
                                            />
                                        </View>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'center',
                                                flexWrap: 'wrap',
                                                gap: spacing.md,
                                                marginTop: spacing.sm,
                                            }}
                                        >
                                            {macroPie.map((slice) => (
                                                <View
                                                    key={slice.label}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: 5,
                                                            backgroundColor: slice.color,
                                                        }}
                                                    />
                                                    <Text variant="caption" tone="secondary">
                                                        {slice.label} · {slice.text}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </Card>
                                </Section>
                            </Animated.View>
                        ) : null}

                        <Animated.View entering={FadeInDown.delay(120).duration(380)}>
                            <Section title="По членам семьи">
                                <View style={{ gap: spacing.sm }}>
                                    {(data.member_fit ?? []).map((member, index) => (
                                        <Animated.View
                                            key={member.member_id}
                                            entering={FadeInDown.delay(160 + index * 60).duration(360)}
                                        >
                                            <MemberFitCard
                                                palette={palette}
                                                member={member}
                                            />
                                        </Animated.View>
                                    ))}
                                </View>
                            </Section>
                        </Animated.View>
                    </>
                ) : null}
            </QueryBoundary>
        </Screen>
    )
}

function MemberFitCard({
    palette,
    member,
}: {
    palette: Palette
    member: {
        member_id: string
        display_name: string
        target_calories: number
        actual_calories: number
        protein_ratio: number
        fat_ratio: number
        carb_ratio: number
    }
}) {
    return (
        <Card elevation="card">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: radii.pill,
                        backgroundColor: palette.accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text variant="bodyStrong" style={{ color: palette.textOnAccent }}>
                        {(member.display_name?.trim()?.charAt(0) ?? '?').toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{member.display_name?.trim() || 'Без имени'}</Text>
                    <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        {Math.round(member.actual_calories ?? 0)} / {Math.round(member.target_calories ?? 0)} ккал в день
                    </Text>
                </View>
            </View>
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                <NutrientBar
                    palette={palette}
                    icon="flame"
                    label="Калории"
                    value={member.actual_calories ?? 0}
                    max={member.target_calories || member.actual_calories || 1}
                    suffix=" ккал"
                    color={palette.danger}
                />
                <NutrientBar
                    palette={palette}
                    icon="zap"
                    label="Белки"
                    value={(member.protein_ratio ?? 0) * 100}
                    max={100}
                    suffix="%"
                    color={palette.success}
                />
                <NutrientBar
                    palette={palette}
                    icon="cookie"
                    label="Жиры"
                    value={(member.fat_ratio ?? 0) * 100}
                    max={100}
                    suffix="%"
                    color={palette.warning}
                />
                <NutrientBar
                    palette={palette}
                    icon="croissant"
                    label="Углеводы"
                    value={(member.carb_ratio ?? 0) * 100}
                    max={100}
                    suffix="%"
                    color={palette.info}
                />
            </View>
        </Card>
    )
}

function NutrientBar({
    palette: _palette,
    icon,
    label,
    value,
    max,
    suffix,
    color,
}: {
    palette: Palette
    icon: IconName
    label: string
    value: number
    max: number
    suffix: string
    color: string
}) {
    return (
        <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={icon} size={14} color={color} />
                <Text variant="caption" tone="secondary" weight="700" style={{ flex: 1 }}>
                    {label}
                </Text>
                <Text variant="caption" tone="muted">
                    {Math.round(value)}
                    {suffix} / {Math.round(max)}
                    {suffix}
                </Text>
            </View>
            <ProgressBar value={value} max={max} color={color} height={8} />
        </View>
    )
}
