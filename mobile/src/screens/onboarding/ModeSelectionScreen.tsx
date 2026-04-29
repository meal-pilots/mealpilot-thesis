import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Pressable, Text, View } from 'react-native'

import type { OnboardingStackParamList } from '@core/navigation/types'
import type { GroupType } from '@entities/group/types'
import { buildMembersForMode, useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Screen } from '@shared/ui/Screen'

const MODES: Array<{ id: GroupType; emoji: string; title: string; description: string }> = [
    { id: 'solo', emoji: '🍽️', title: 'Только для меня', description: 'Один человек.' },
    { id: 'two_adults', emoji: '👫', title: 'Двое взрослых', description: 'Пара или соседи.' },
    { id: 'adults_kids', emoji: '👨‍👩‍👧', title: 'Взрослые + дети', description: 'Семейные блюда.' },
    { id: 'custom', emoji: '👥', title: 'Своя группа', description: 'Хост, общага, команда.' },
]

export function ModeSelectionScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const { draft, setDraft } = useOnboardingDraft()

    return (
        <Screen scroll>
            <Heading level={1}>Кто будет питаться?</Heading>
            <Text style={{ color: '#6B7280' }}>Поможет подобрать порции и список покупок.</Text>

            <View style={{ gap: 10 }}>
                {MODES.map((mode) => {
                    const active = draft.groupType === mode.id
                    return (
                        <Pressable
                            key={mode.id}
                            onPress={() =>
                                setDraft((curr) => ({
                                    ...curr,
                                    groupType: mode.id,
                                    members:
                                        curr.groupType === mode.id ? curr.members : buildMembersForMode(mode.id),
                                }))
                            }
                            style={{
                                padding: 16,
                                borderRadius: 14,
                                backgroundColor: active ? '#FFE4B5' : '#FFFBF2',
                                borderWidth: 1,
                                borderColor: active ? '#7A4A0A' : '#F0E2C5',
                            }}
                        >
                            <Text style={{ fontSize: 24 }}>{mode.emoji}</Text>
                            <Text style={{ marginTop: 6, fontSize: 17, fontWeight: '700' }}>{mode.title}</Text>
                            <Text style={{ marginTop: 2, color: '#6B7280' }}>{mode.description}</Text>
                        </Pressable>
                    )
                })}
            </View>

            <Button
                label="Продолжить"
                onPress={() => navigation.navigate('CreateHousehold')}
                disabled={!draft.groupType}
                style={{ marginTop: 8 }}
            />
        </Screen>
    )
}
