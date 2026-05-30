import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { OnboardingStackParamList } from '@core/navigation/types'
import { useOnboardingDraft, type RestrictionId } from '@features/onboarding/OnboardingContext'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, spacing, type Palette } from '@shared/ui/theme'

const TIME_OPTIONS = [20, 30, 45, 60, 90]

const CUISINE_OPTIONS = [
    { id: 'kazakh', label: 'Казахская' },
    { id: 'central_asian', label: 'Центральная Азия' },
    { id: 'european', label: 'Европейская' },
    { id: 'asian', label: 'Азиатская' },
] as const

const RESTRICTION_OPTIONS: { id: RestrictionId; label: string }[] = [
    { id: 'gluten-free', label: 'Без глютена' },
    { id: 'dairy-free', label: 'Без молочного' },
    { id: 'vegan', label: 'Веган' },
    { id: 'nut-free', label: 'Без орехов' },
    { id: 'halal', label: 'Халал' },
]

const SPICE_OPTIONS = [
    { id: 'none', label: 'Без острого' },
    { id: 'mild', label: 'Мягко' },
    { id: 'medium', label: 'Средне' },
    { id: 'hot', label: 'Остро' },
] as const

const VARIETY_OPTIONS: { id: 'low' | 'medium' | 'high'; label: string; description: string }[] = [
    { id: 'low', label: 'Меньше повторов', description: 'Можно чаще возвращаться к удачным рецептам' },
    { id: 'medium', label: 'Средне', description: 'Сбалансированное меню без лишней строгости' },
    { id: 'high', label: 'Максимум разнообразия', description: 'Больше разных блюд в течение недели' },
]

type TagField = 'loved_flavors' | 'disliked_foods'

export function PreferencesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const palette = usePalette()
    const { draft, setDraft } = useOnboardingDraft()
    const [flavorInput, setFlavorInput] = useState('')
    const [dislikeInput, setDislikeInput] = useState('')

    function toggleListValue(field: 'preferred_cuisines' | 'selected_restrictions', value: string) {
        haptic.selection()
        setDraft((curr) => {
            const current = curr[field]
            return {
                ...curr,
                [field]: current.includes(value as never)
                    ? current.filter((item) => item !== value)
                    : [...current, value],
            }
        })
    }

    function addTag(field: TagField, value: string) {
        const nextValue = value.trim()
        if (!nextValue) return

        haptic.selection()
        setDraft((curr) => ({
            ...curr,
            [field]: curr[field].includes(nextValue) ? curr[field] : [...curr[field], nextValue],
        }))

        if (field === 'loved_flavors') {
            setFlavorInput('')
        } else {
            setDislikeInput('')
        }
    }

    function removeTag(field: TagField, value: string) {
        haptic.selection()
        setDraft((curr) => ({ ...curr, [field]: curr[field].filter((item) => item !== value) }))
    }

    return (
        <Screen scroll>
            <Animated.View entering={FadeInDown.duration(380)}>
                <Heading level={1}>Предпочтения</Heading>
                <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                    Настройте вкусы, ограничения, кухню и ритм готовки для точного подбора рецептов.
                </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(380)}>
                <Section title="Любимые кухни">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        {CUISINE_OPTIONS.map((option) => (
                            <ChoiceChip
                                key={option.id}
                                palette={palette}
                                label={option.label}
                                active={draft.preferred_cuisines.includes(option.id)}
                                onPress={() => toggleListValue('preferred_cuisines', option.id)}
                            />
                        ))}
                    </View>
                </Section>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(380)}>
                <TagSection
                    title="Любимые вкусы"
                    placeholder="Например: томат, зелень"
                    values={draft.loved_flavors}
                    inputValue={flavorInput}
                    onInputChange={setFlavorInput}
                    onAdd={() => addTag('loved_flavors', flavorInput)}
                    onRemove={(value) => removeTag('loved_flavors', value)}
                    palette={palette}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(160).duration(380)}>
                <TagSection
                    title="Нелюбимые продукты"
                    placeholder="Например: кинза, грибы"
                    values={draft.disliked_foods}
                    inputValue={dislikeInput}
                    onInputChange={setDislikeInput}
                    onAdd={() => addTag('disliked_foods', dislikeInput)}
                    onRemove={(value) => removeTag('disliked_foods', value)}
                    palette={palette}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(380)}>
                <Section title="Ограничения">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        {RESTRICTION_OPTIONS.map((option) => (
                            <ChoiceChip
                                key={option.id}
                                palette={palette}
                                label={option.label}
                                active={draft.selected_restrictions.includes(option.id)}
                                onPress={() => toggleListValue('selected_restrictions', option.id)}
                                icon="alertCircle"
                            />
                        ))}
                    </View>
                </Section>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(380)}>
                <Section title="Острота">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        {SPICE_OPTIONS.map((option) => (
                            <ChoiceChip
                                key={option.id}
                                palette={palette}
                                label={option.label}
                                active={draft.spice_tolerance === option.id}
                                onPress={() => {
                                    haptic.selection()
                                    setDraft((curr) => ({ ...curr, spice_tolerance: option.id }))
                                }}
                                icon="flame"
                            />
                        ))}
                    </View>
                </Section>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(280).duration(380)}>
                <Section title="Максимум времени готовки">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        {TIME_OPTIONS.map((minutes) => (
                            <ChoiceChip
                                key={minutes}
                                palette={palette}
                                label={`${minutes} мин`}
                                active={draft.max_cooking_time_minutes === minutes}
                                onPress={() => {
                                    haptic.selection()
                                    setDraft((curr) => ({ ...curr, max_cooking_time_minutes: minutes }))
                                }}
                                icon="clock"
                            />
                        ))}
                    </View>
                </Section>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(320).duration(380)}>
                <Section title="Разнообразие">
                    <View style={{ gap: spacing.sm }}>
                        {VARIETY_OPTIONS.map((option) => {
                            const active = draft.variety_preference === option.id
                            return (
                                <TouchableSurface
                                    key={option.id}
                                    onPress={() => {
                                        haptic.selection()
                                        setDraft((curr) => ({ ...curr, variety_preference: option.id }))
                                    }}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: active }}
                                    accessibilityLabel={option.label}
                                    scaleTo={0.985}
                                    style={{
                                        padding: spacing.md,
                                        borderRadius: radii.lg,
                                        backgroundColor: active ? palette.accentSoft : palette.canvasElevated,
                                        borderWidth: 1.5,
                                        borderColor: active ? palette.accent : palette.border,
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: spacing.sm,
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text variant="bodyStrong">{option.label}</Text>
                                            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                                                {option.description}
                                            </Text>
                                        </View>
                                        {active ? (
                                            <Icon name="checkCircle" size={20} color={palette.accent} />
                                        ) : null}
                                    </View>
                                </TouchableSurface>
                            )
                        })}
                    </View>
                </Section>
            </Animated.View>

            <Button
                label="Продолжить"
                size="lg"
                onPress={() => navigation.navigate('Budget')}
                iconRight={<Icon name="arrowRight" size={18} color={palette.onPrimary} />}
                style={{ marginTop: spacing.md }}
            />
        </Screen>
    )
}

function ChoiceChip({
    palette,
    label,
    active,
    onPress,
    icon,
}: {
    palette: Palette
    label: string
    active: boolean
    onPress: () => void
    icon?: 'alertCircle' | 'clock' | 'flame'
}) {
    return (
        <TouchableSurface
            onPress={onPress}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            scaleTo={0.94}
            style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radii.pill,
                backgroundColor: active ? palette.primary : palette.canvasElevated,
                borderWidth: 1,
                borderColor: active ? palette.primary : palette.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
            }}
        >
            {icon ? <Icon name={icon} size={14} color={active ? palette.onPrimary : palette.textMuted} /> : null}
            <Text variant="caption" weight="700" style={{ color: active ? palette.onPrimary : palette.text }}>
                {label}
            </Text>
        </TouchableSurface>
    )
}

function TagSection({
    title,
    placeholder,
    values,
    inputValue,
    onInputChange,
    onAdd,
    onRemove,
    palette,
}: {
    title: string
    placeholder: string
    values: string[]
    inputValue: string
    onInputChange: (value: string) => void
    onAdd: () => void
    onRemove: (value: string) => void
    palette: Palette
}) {
    return (
        <Section title={title}>
            <View style={{ gap: spacing.sm }}>
                {values.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        {values.map((value) => (
                            <TouchableSurface
                                key={value}
                                onPress={() => onRemove(value)}
                                accessibilityRole="button"
                                accessibilityLabel={`Удалить ${value}`}
                                scaleTo={0.94}
                                style={{
                                    paddingHorizontal: spacing.md,
                                    paddingVertical: spacing.sm,
                                    borderRadius: radii.pill,
                                    backgroundColor: palette.accentSoft,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <Text variant="caption" weight="700" style={{ color: palette.accentText }}>
                                    {value}
                                </Text>
                                <Icon name="x" size={13} color={palette.accentText} />
                            </TouchableSurface>
                        ))}
                    </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                        <Input value={inputValue} onChangeText={onInputChange} placeholder={placeholder} />
                    </View>
                    <Button label="Добавить" size="sm" variant="tonal" onPress={onAdd} disabled={!inputValue.trim()} />
                </View>
            </View>
        </Section>
    )
}
