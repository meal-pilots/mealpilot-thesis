import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Image, Text, View } from 'react-native'

import type { RootStackParamList } from '@core/navigation/types'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Screen } from '@shared/ui/Screen'
import { palette, spacing } from '@shared/ui/theme'

export function WelcomeScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

    return (
        <Screen
            scroll
            contentContainerStyle={{
                justifyContent: 'space-between',
                paddingBottom: spacing.xxl,
                gap: spacing.xl,
            }}
        >
            <View style={{ alignItems: 'center', gap: spacing.lg, marginTop: spacing.lg }}>
                <Image
                    source={require('../../../assets/welcome-hero.png')}
                    style={{
                        width: '100%',
                        aspectRatio: 3 / 2,
                        maxHeight: 320,
                        resizeMode: 'contain',
                    }}
                />
                <View style={{ alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md }}>
                    <Heading level={1} style={{ textAlign: 'center', letterSpacing: -0.5 }}>
                        Готовим для семьи без лишних усилий
                    </Heading>
                    <Text
                        style={{
                            fontSize: 16,
                            color: palette.textSecondary,
                            textAlign: 'center',
                            lineHeight: 24,
                            maxWidth: 360,
                        }}
                    >
                        План на неделю под бюджет, аллергии и предпочтения каждого. Список покупок собирается сам.
                    </Text>
                </View>
            </View>

            <View style={{ gap: spacing.sm }}>
                <Button
                    label="Создать аккаунт"
                    size="lg"
                    onPress={() =>
                        navigation.navigate('Auth', { screen: 'SignUp' } as never)
                    }
                />
                <Button
                    label="У меня уже есть аккаунт"
                    variant="ghost"
                    size="lg"
                    onPress={() => navigation.navigate('Auth', { screen: 'Login' } as never)}
                />
            </View>
        </Screen>
    )
}
