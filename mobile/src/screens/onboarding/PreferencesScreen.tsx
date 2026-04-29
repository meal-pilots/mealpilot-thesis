import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, Text, View } from 'react-native'

import type { OnboardingStackParamList } from '@core/navigation/types'
import { useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Screen } from '@shared/ui/Screen'
import { Section } from '@shared/ui/Section'

const TIME_OPTIONS = [20, 30, 45, 60, 90]
const VARIETY_OPTIONS: Array<{ id: 'low' | 'medium' | 'high'; label: string }> = [
    { id: 'low', label: 'Меньше повторов' },
    { id: 'medium', label: 'Средне' },
    { id: 'high', label: 'Максимум разнообразия' },
]

export function PreferencesScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const { draft, setDraft } = useOnboardingDraft()

    return (
        <Screen scroll>
            <Heading level={1}>Предпочтения</Heading>
            <Text style={{ color: '#6B7280' }}>Сколько готовить и насколько разнообразно.</Text>

            <Section title="Максимум времени готовки">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {TIME_OPTIONS.map((minutes) => {
                        const active = draft.max_cooking_time_minutes === minutes
                        return (
                            <Pressable
                                key={minutes}
                                onPress={() =>
                                    setDraft((curr) => ({ ...curr, max_cooking_time_minutes: minutes }))
                                }
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    backgroundColor: active ? '#1F2937' : '#FFFBF2',
                                    borderWidth: 1,
                                    borderColor: active ? '#1F2937' : '#F0E2C5',
                                }}
                            >
                                <Text style={{ color: active ? '#fff' : '#111827', fontWeight: '600' }}>
                                    {minutes} мин
                                </Text>
                            </Pressable>
                        )
                    })}
                </View>
            </Section>

            <Section title="Разнообразие">
                <View style={{ gap: 8 }}>
                    {VARIETY_OPTIONS.map((option) => {
                        const active = draft.variety_preference === option.id
                        return (
                            <Pressable
                                key={option.id}
                                onPress={() =>
                                    setDraft((curr) => ({ ...curr, variety_preference: option.id }))
                                }
                                style={{
                                    padding: 14,
                                    borderRadius: 12,
                                    backgroundColor: active ? '#FFE4B5' : '#FFFBF2',
                                    borderWidth: 1,
                                    borderColor: active ? '#7A4A0A' : '#F0E2C5',
                                }}
                            >
                                <Text style={{ fontWeight: '600' }}>{option.label}</Text>
                            </Pressable>
                        )
                    })}
                </View>
            </Section>

            <Button label="Продолжить" onPress={() => navigation.navigate('Budget')} />
        </Screen>
    )
}
