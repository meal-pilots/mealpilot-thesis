import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Image } from 'expo-image'
import { Dimensions, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { RootStackParamList } from '@core/navigation/types'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Text } from '@shared/ui/Text'
import { radii, spacing } from '@shared/ui/theme'

const { width: screenWidth } = Dimensions.get('window')

export function WelcomeScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
    const palette = usePalette()

    return (
        <View style={{ flex: 1, backgroundColor: palette.canvas }}>
            <LinearGradient
                colors={[palette.canvas, palette.accentSoft, palette.canvas]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', padding: spacing.xxl }} edges={['top', 'bottom']}>
                <Animated.View entering={FadeIn.duration(450)} style={{ alignItems: 'center', marginTop: spacing.lg }}>
                    <View
                        style={{
                            position: 'absolute',
                            width: screenWidth * 0.8,
                            height: screenWidth * 0.8,
                            borderRadius: 999,
                            backgroundColor: palette.accent,
                            opacity: 0.18,
                            top: -40,
                        }}
                    />
                    <Image
                        source={require('../../../assets/welcome-hero.png')}
                        style={{
                            width: screenWidth - spacing.xxl * 2,
                            aspectRatio: 3 / 2,
                            maxHeight: 320,
                        }}
                        contentFit="contain"
                        transition={250}
                    />
                </Animated.View>

                <Animated.View
                    entering={FadeInDown.delay(150).duration(500).springify()}
                    style={{ alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md }}
                >
                    <View
                        style={{
                            paddingHorizontal: spacing.md,
                            paddingVertical: 6,
                            borderRadius: radii.pill,
                            backgroundColor: palette.canvasElevated,
                            borderWidth: 1,
                            borderColor: palette.border,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.xs,
                        }}
                    >
                        <Icon name="sparkles" size={14} color={palette.accent} />
                        <Text variant="caption" tone="secondary" weight="700">
                            CP-SAT + ML планировщик
                        </Text>
                    </View>
                    <Heading level={1} style={{ textAlign: 'center', fontSize: 32, lineHeight: 38 }}>
                        Готовим для семьи без лишних усилий
                    </Heading>
                    <Text variant="body" tone="secondary" align="center" style={{ maxWidth: 360, lineHeight: 24 }}>
                        План на неделю под бюджет, аллергии и предпочтения каждого. Список покупок собирается сам.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(280).duration(500).springify()} style={{ gap: spacing.sm }}>
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
                </Animated.View>
            </SafeAreaView>
        </View>
    )
}
