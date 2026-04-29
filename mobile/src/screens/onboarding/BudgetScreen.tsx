import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, Text, View } from 'react-native'

import type { OnboardingStackParamList } from '@core/navigation/types'
import { useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'

const PERIODS: Array<{ id: 'daily' | 'weekly'; label: string }> = [
    { id: 'daily', label: 'В день' },
    { id: 'weekly', label: 'В неделю' },
]

export function BudgetScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const { draft, setDraft } = useOnboardingDraft()

    return (
        <Screen scroll>
            <Heading level={1}>Бюджет</Heading>
            <Text style={{ color: '#6B7280' }}>
                Алгоритм будет подбирать рецепты, чтобы уложиться в этот лимит.
            </Text>

            <Section title="Период">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {PERIODS.map((p) => {
                        const active = draft.budget_period_type === p.id
                        return (
                            <Pressable
                                key={p.id}
                                onPress={() =>
                                    setDraft((curr) => ({ ...curr, budget_period_type: p.id }))
                                }
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    borderRadius: 12,
                                    backgroundColor: active ? '#1F2937' : '#FFFBF2',
                                    borderWidth: 1,
                                    borderColor: active ? '#1F2937' : '#F0E2C5',
                                }}
                            >
                                <Text style={{ color: active ? '#fff' : '#111827', fontWeight: '600' }}>
                                    {p.label}
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>
            </Section>

            <Section title="Сумма">
                <Input
                    label={draft.budget_period_type === 'daily' ? 'KZT в день' : 'KZT в неделю'}
                    keyboardType="numeric"
                    value={draft.budget_amount}
                    onChangeText={(v) => setDraft((curr) => ({ ...curr, budget_amount: v }))}
                />
            </Section>

            <Button
                label="Продолжить"
                onPress={() => navigation.navigate('Summary')}
                disabled={!draft.budget_amount || Number(draft.budget_amount) <= 0}
            />
        </Screen>
    )
}
