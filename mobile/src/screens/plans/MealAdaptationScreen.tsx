import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AppStackParamList } from '@core/navigation/types'
import type { AdaptationType } from '@entities/plan/types'
import { useActiveGroup, useGroupMembers } from '@features/groups/hooks'
import { useCreateAdaptation } from '@features/plans/hooks'
import { goalLabel, memberTypeLabel } from '@shared/lib/formatters'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { EmptyState } from '@shared/ui/EmptyState'
import { Heading } from '@shared/ui/Heading'
import { Icon, type IconName } from '@shared/ui/Icon'
import { QueryBoundary } from '@shared/ui/QueryBoundary'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { useToast } from '@shared/ui/Toast'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, spacing, type Palette } from '@shared/ui/theme'

type Route = RouteProp<AppStackParamList, 'MealAdaptation'>
type Navigation = NativeStackNavigationProp<AppStackParamList>

const ADAPTATION_OPTIONS: { id: AdaptationType; label: string; icon: IconName; description: string }[] = [
    { id: 'cheaper_version', label: 'Подешевле', icon: 'wallet', description: 'Замена дорогих ингредиентов' },
    { id: 'low_carb', label: 'Меньше углеводов', icon: 'leaf', description: 'Меньше круп, больше овощей' },
    { id: 'high_protein', label: 'Больше белка', icon: 'zap', description: 'Усиленная порция белка' },
    { id: 'child_friendly', label: 'Для ребёнка', icon: 'cookie', description: 'Без острого, мельче порция' },
    { id: 'allergen_free', label: 'Без аллергенов', icon: 'alertCircle', description: 'Убрать общие аллергены' },
    { id: 'portion_change', label: 'Изменить порцию', icon: 'users', description: 'Под другое число едоков' },
    { id: 'ingredient_remove', label: 'Убрать ингредиент', icon: 'x', description: 'Без определённого продукта' },
    { id: 'ingredient_replace', label: 'Заменить ингредиент', icon: 'repeat', description: 'Замена по списку' },
]

export function MealAdaptationScreen() {
    const { params } = useRoute<Route>()
    const navigation = useNavigation<Navigation>()
    const palette = usePalette()
    const toast = useToast()
    const groupQuery = useActiveGroup()
    const membersQuery = useGroupMembers(groupQuery.data?.id)
    const create = useCreateAdaptation()

    const [memberId, setMemberId] = useState<string | null>(null)
    const [adaptationType, setAdaptationType] = useState<AdaptationType | null>(null)

    const onSubmit = async () => {
        if (!memberId || !adaptationType) {
            haptic.warning()
            toast.warning('Выберите члена семьи и тип адаптации')
            return
        }
        try {
            haptic.medium()
            await create.mutateAsync({
                itemId: params.mealPlanItemId,
                planId: '',
                member_id: memberId,
                adaptation_type: adaptationType,
            })
            haptic.success()
            toast.success('Адаптация добавлена')
            navigation.goBack()
        } catch (err) {
            haptic.error()
            toast.error(err instanceof Error ? err.message : 'Не удалось добавить')
        }
    }

    return (
        <Screen scroll>
            <Animated.View entering={FadeInDown.duration(380)}>
                <Heading level={1}>Адаптация блюда</Heading>
                <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                    Каждый член семьи может получить свою версию: меньше углеводов, без орехов, двойная порция и т.д.
                </Text>
            </Animated.View>

            <Section title="Для кого">
                <QueryBoundary
                    isLoading={membersQuery.isLoading}
                    error={membersQuery.error}
                    refetch={membersQuery.refetch}
                >
                    {membersQuery.data && membersQuery.data.length > 0 ? (
                        <View style={{ gap: spacing.sm }}>
                            {membersQuery.data.map((member) => {
                                const active = memberId === member.id
                                return (
                                    <TouchableSurface
                                        key={member.id}
                                        onPress={() => {
                                            haptic.selection()
                                            setMemberId(member.id)
                                        }}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected: active }}
                                        accessibilityLabel={member.display_name}
                                        scaleTo={0.985}
                                        style={{
                                            padding: spacing.md,
                                            borderRadius: radii.lg,
                                            borderWidth: 1.5,
                                            backgroundColor: active ? palette.accentSoft : palette.canvasElevated,
                                            borderColor: active ? palette.accent : palette.border,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: spacing.sm,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: radii.pill,
                                                backgroundColor: active ? palette.accent : palette.canvasMuted,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon
                                                name="user"
                                                size={18}
                                                color={active ? palette.textOnAccent : palette.text}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text variant="bodyStrong">{member.display_name}</Text>
                                            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                                {memberTypeLabel(member.member_type)} · {goalLabel(member.goal_type)}
                                            </Text>
                                        </View>
                                        {active ? (
                                            <Icon name="checkCircle" size={20} color={palette.accent} />
                                        ) : null}
                                    </TouchableSurface>
                                )
                            })}
                        </View>
                    ) : (
                        <EmptyState
                            title="Нет членов семьи"
                            description="Добавьте членов семьи в настройках группы."
                            icon="users"
                        />
                    )}
                </QueryBoundary>
            </Section>

            <Section title="Тип адаптации">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {ADAPTATION_OPTIONS.map((option) => {
                        const active = adaptationType === option.id
                        return (
                            <AdaptationCard
                                key={option.id}
                                palette={palette}
                                icon={option.icon}
                                label={option.label}
                                description={option.description}
                                active={active}
                                onPress={() => {
                                    haptic.selection()
                                    setAdaptationType(option.id)
                                }}
                            />
                        )
                    })}
                </View>
            </Section>

            {memberId && adaptationType ? (
                <Card elevation="card">
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Icon name="info" size={20} color={palette.accent} />
                        <View style={{ flex: 1 }}>
                            <Text variant="bodyStrong">Что произойдёт</Text>
                            <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                                Алгоритм пересчитает порции и ингредиенты под выбранный тип адаптации и сохранит
                                изменения только для выбранного члена семьи.
                            </Text>
                        </View>
                    </View>
                </Card>
            ) : null}

            <Button
                label="Применить адаптацию"
                onPress={onSubmit}
                loading={create.isPending}
                disabled={!memberId || !adaptationType}
                size="lg"
                iconLeft={<Icon name="sparkles" size={18} color={palette.onPrimary} />}
            />
        </Screen>
    )
}

function AdaptationCard({
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
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={label}
            scaleTo={0.96}
            style={{
                flexBasis: '47%',
                flexGrow: 1,
                padding: spacing.md,
                borderRadius: radii.lg,
                borderWidth: 1.5,
                backgroundColor: active ? palette.primary : palette.canvasElevated,
                borderColor: active ? palette.primary : palette.border,
                gap: spacing.xs,
            }}
        >
            <View
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.md,
                    backgroundColor: active ? palette.accent : palette.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Icon name={icon} size={18} color={active ? palette.textOnAccent : palette.accentText} />
            </View>
            <Text variant="bodyStrong" style={{ color: active ? palette.onPrimary : palette.text }}>
                {label}
            </Text>
            <Text
                variant="caption"
                style={{ color: active ? palette.accentSoft : palette.textMuted }}
            >
                {description}
            </Text>
        </TouchableSurface>
    )
}
