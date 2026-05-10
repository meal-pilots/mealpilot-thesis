import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { View } from 'react-native'
import Animated, { FadeInDown, Layout } from 'react-native-reanimated'

import type { OnboardingStackParamList } from '@core/navigation/types'
import type { GoalType, MemberType } from '@entities/group/types'
import {
    newOnboardingMember,
    useOnboardingDraft,
    type OnboardingMember,
} from '@features/onboarding/OnboardingContext'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, spacing, type Palette } from '@shared/ui/theme'

const MEMBER_TYPES: { id: MemberType; label: string }[] = [
    { id: 'adult', label: 'Взрослый' },
    { id: 'child', label: 'Ребёнок' },
    { id: 'teen', label: 'Подросток' },
    { id: 'custom', label: 'Иной' },
]

const GOAL_TYPES: { id: GoalType; label: string }[] = [
    { id: 'maintenance', label: 'Поддержка' },
    { id: 'weight_loss', label: 'Похудение' },
    { id: 'mass_gain', label: 'Набор массы' },
    { id: 'high_protein', label: 'Больше белка' },
    { id: 'low_carb', label: 'Меньше углеводов' },
    { id: 'healthy', label: 'Здоровое' },
]

export function MembersScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const palette = usePalette()
    const { draft, setDraft } = useOnboardingDraft()

    const update = (id: string, patch: Partial<OnboardingMember>) =>
        setDraft((curr) => ({
            ...curr,
            members: curr.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }))

    const remove = (id: string) =>
        setDraft((curr) => ({ ...curr, members: curr.members.filter((m) => m.id !== id) }))

    const add = () => {
        haptic.medium()
        setDraft((curr) => ({ ...curr, members: [...curr.members, newOnboardingMember()] }))
    }

    const isValid = draft.members.length > 0 && draft.members.every((m) => m.display_name.trim() && m.age)

    return (
        <Screen scroll>
            <Animated.View entering={FadeInDown.duration(380)}>
                <Heading level={1}>Кто в семье?</Heading>
                <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                    Возраст и цели нужны для расчёта порций и нутриентов.
                </Text>
            </Animated.View>

            <View style={{ gap: spacing.md }}>
                {draft.members.map((member, index) => (
                    <Animated.View
                        key={member.id}
                        entering={FadeInDown.delay(index * 50).duration(360)}
                        layout={Layout.springify()}
                    >
                        <Card elevation="card">
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: spacing.sm,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                                    <View
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: radii.pill,
                                            backgroundColor: palette.accent,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Text variant="caption" weight="700" style={{ color: palette.textOnAccent }}>
                                            {index + 1}
                                        </Text>
                                    </View>
                                    <Text variant="bodyStrong">Член семьи</Text>
                                </View>
                                {draft.members.length > 1 ? (
                                    <TouchableSurface
                                        onPress={() => {
                                            haptic.warning()
                                            remove(member.id)
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Удалить"
                                        feedback="medium"
                                        scaleTo={0.92}
                                        style={{
                                            paddingHorizontal: spacing.sm,
                                            paddingVertical: 6,
                                            borderRadius: radii.pill,
                                            backgroundColor: palette.dangerBg,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        <Icon name="trash" size={14} color={palette.danger} />
                                        <Text variant="caption" weight="700" tone="danger">
                                            Удалить
                                        </Text>
                                    </TouchableSurface>
                                ) : null}
                            </View>

                            <Input
                                label="Имя"
                                value={member.display_name}
                                onChangeText={(v) => update(member.id, { display_name: v })}
                                autoCapitalize="words"
                                leftAddon={<Icon name="user" size={18} color={palette.textMuted} />}
                            />

                            <View style={{ marginTop: spacing.md }}>
                                <Text variant="caption" tone="secondary" weight="700" style={{ marginBottom: 6 }}>
                                    Тип
                                </Text>
                                <ChipRow
                                    palette={palette}
                                    options={MEMBER_TYPES}
                                    value={member.member_type}
                                    onChange={(id) => update(member.id, { member_type: id })}
                                />
                            </View>

                            <View style={{ marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm }}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Возраст"
                                        keyboardType="numeric"
                                        value={member.age}
                                        onChangeText={(v) => update(member.id, { age: v })}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        label="Вес, кг"
                                        keyboardType="numeric"
                                        value={member.weight_kg}
                                        onChangeText={(v) => update(member.id, { weight_kg: v })}
                                    />
                                </View>
                            </View>

                            <View style={{ marginTop: spacing.md }}>
                                <Text variant="caption" tone="secondary" weight="700" style={{ marginBottom: 6 }}>
                                    Цель
                                </Text>
                                <ChipRow
                                    palette={palette}
                                    options={GOAL_TYPES}
                                    value={member.goal_type}
                                    onChange={(id) => update(member.id, { goal_type: id })}
                                    accent
                                />
                            </View>
                        </Card>
                    </Animated.View>
                ))}
            </View>

            <Button
                label="Добавить ещё"
                variant="ghost"
                onPress={add}
                iconLeft={<Icon name="plus" size={18} color={palette.text} />}
            />
            <Button
                label="Продолжить"
                size="lg"
                onPress={() => navigation.navigate('Preferences')}
                disabled={!isValid}
                iconRight={<Icon name="arrowRight" size={18} color={palette.onPrimary} />}
            />
        </Screen>
    )
}

function ChipRow<T extends string>({
    palette,
    options,
    value,
    onChange,
    accent,
}: {
    palette: Palette
    options: { id: T; label: string }[]
    value: T
    onChange: (id: T) => void
    accent?: boolean
}) {
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {options.map((option) => {
                const active = option.id === value
                const bg = accent
                    ? active
                        ? palette.accent
                        : palette.canvasMuted
                    : active
                        ? palette.primary
                        : palette.canvasMuted
                const fg = active ? (accent ? palette.textOnAccent : palette.onPrimary) : palette.text
                return (
                    <TouchableSurface
                        key={option.id}
                        onPress={() => {
                            haptic.selection()
                            onChange(option.id)
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        scaleTo={0.94}
                        style={{
                            paddingHorizontal: spacing.md,
                            paddingVertical: 8,
                            borderRadius: radii.pill,
                            backgroundColor: bg,
                            borderWidth: 1,
                            borderColor: active ? bg : palette.border,
                        }}
                    >
                        <Text variant="caption" weight="700" style={{ color: fg }}>
                            {option.label}
                        </Text>
                    </TouchableSurface>
                )
            })}
        </View>
    )
}
