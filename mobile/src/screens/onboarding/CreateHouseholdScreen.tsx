import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Text } from 'react-native'

import type { OnboardingStackParamList } from '@core/navigation/types'
import { useOnboardingDraft } from '@features/onboarding/OnboardingContext'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'

export function CreateHouseholdScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
    const { draft, setDraft } = useOnboardingDraft()

    return (
        <Screen scroll>
            <Heading level={1}>Назовём вашу кухню</Heading>
            <Text style={{ color: '#6B7280' }}>
                Это просто название, его видите только вы.
            </Text>
            <Input
                label="Название"
                placeholder="Например: Семья Ивановых"
                value={draft.name}
                onChangeText={(v) => setDraft((curr) => ({ ...curr, name: v }))}
                autoCapitalize="sentences"
            />
            <Button
                label="Продолжить"
                onPress={() => navigation.navigate('Members')}
                disabled={!draft.name.trim()}
            />
        </Screen>
    )
}
