import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { OnboardingStackParamList } from '@core/navigation/types'
import { useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import { haptic } from '@shared/lib/haptics'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'
import { Text } from '@shared/ui/Text'
import { TouchableSurface } from '@shared/ui/TouchableSurface'
import { radii, spacing } from '@shared/ui/theme'

const TIME_OPTIONS = [20, 30, 45, 60, 90]
const VARIETY_OPTIONS: { id: 'low' | 'medium' | 'high'; label: string; description: string }[] = [
    { id: 'low', label: 'Меньше повторов', description: 'Допустимо повторять рецепты' },
    { id: 'medium', label: 'Средне', description: 'Сбалансированное меню' },
    { id: 'high', label: 'Максимум разнообразия', description: 'Ни одного повтора' },
]

export function PreferencesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const palette = usePalette()
    const { draft, setDraft } = useOnboardingDraft()

    return (
        <Screen scroll>
            <Animated.View entering={FadeInDown.duration(380)}>
                <Heading level={1}>Предпочтения</Heading>
                <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                    Сколько готовить и насколько разнообразно.
                </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(380)}>
                <Section title="Максимум времени готовки">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                        {TIME_OPTIONS.map((minutes) => {
                            const active = draft.max_cooking_time_minutes === minutes
                            return (
                                <TouchableSurface
                                    key={minutes}
                                    onPress={() => {
                                        haptic.selection()
                                        setDraft((curr) => ({ ...curr, max_cooking_time_minutes: minutes }))
                                    }}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: active }}
                                    accessibilityLabel={`${minutes} минут`}
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
                                    <Icon
                                        name="clock"
                                        size={14}
                                        color={active ? palette.onPrimary : palette.textMuted}
                                    />
                                    <Text
                                        variant="caption"
                                        weight="700"
                                        style={{ color: active ? palette.onPrimary : palette.text }}
                                    >
                                        {minutes} мин
                                    </Text>
                                </TouchableSurface>
                            )
                        })}
                    </View>
                </Section>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(140).duration(380)}>
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
