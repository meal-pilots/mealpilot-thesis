import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { OnboardingStackParamList } from '@core/navigation/types'
import { useOnboardingDraft } from '@features/onboarding/OnboardingContext'
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
import { radii, spacing } from '@shared/ui/theme'

const PERIODS: { id: 'daily' | 'weekly'; label: string }[] = [
    { id: 'daily', label: 'В день' },
    { id: 'weekly', label: 'В неделю' },
]

export function BudgetScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const palette = usePalette()
    const { draft, setDraft } = useOnboardingDraft()

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <Screen scroll>
                <Animated.View entering={FadeInDown.duration(380)}>
                    <Heading level={1}>Бюджет</Heading>
                    <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                        Алгоритм будет подбирать рецепты, чтобы уложиться в этот лимит.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80).duration(380)}>
                    <Section title="Период">
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            {PERIODS.map((p) => {
                                const active = draft.budget_period_type === p.id
                                return (
                                    <TouchableSurface
                                        key={p.id}
                                        onPress={() => {
                                            haptic.selection()
                                            setDraft((curr) => ({ ...curr, budget_period_type: p.id }))
                                        }}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected: active }}
                                        scaleTo={0.96}
                                        style={{
                                            flex: 1,
                                            paddingVertical: spacing.md,
                                            alignItems: 'center',
                                            borderRadius: radii.lg,
                                            backgroundColor: active ? palette.primary : palette.canvasElevated,
                                            borderWidth: 1.5,
                                            borderColor: active ? palette.primary : palette.border,
                                        }}
                                    >
                                        <Text
                                            variant="bodyStrong"
                                            style={{ color: active ? palette.onPrimary : palette.text }}
                                        >
                                            {p.label}
                                        </Text>
                                    </TouchableSurface>
                                )
                            })}
                        </View>
                    </Section>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(140).duration(380)}>
                    <Section title="Сумма">
                        <Input
                            label={draft.budget_period_type === 'daily' ? 'KZT в день' : 'KZT в неделю'}
                            keyboardType="numeric"
                            value={draft.budget_amount}
                            onChangeText={(v) => setDraft((curr) => ({ ...curr, budget_amount: v }))}
                            leftAddon={<Icon name="wallet" size={18} color={palette.textMuted} />}
                        />
                    </Section>
                </Animated.View>

                <Button
                    label="Продолжить"
                    size="lg"
                    onPress={() => navigation.navigate('Summary')}
                    disabled={!draft.budget_amount || Number(draft.budget_amount) <= 0}
                    iconRight={<Icon name="arrowRight" size={18} color={palette.onPrimary} />}
                    style={{ marginTop: spacing.md }}
                />
            </Screen>
        </KeyboardAvoidingView>
    )
}
