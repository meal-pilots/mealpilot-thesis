import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import type { AuthStackParamList } from '@core/navigation/types'
import { useAuth } from '@features/auth/model/AuthContext'
import { usePalette } from '@shared/lib/use-palette'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'
import { Text } from '@shared/ui/Text'
import { useToast } from '@shared/ui/Toast'
import { spacing } from '@shared/ui/theme'

type LoginForm = { email: string; password: string }

export function LoginScreen() {
    const palette = usePalette()
    const { login } = useAuth()
    const toast = useToast()
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>()
    const [showPassword, setShowPassword] = useState(false)
    const { control, handleSubmit, formState } = useForm<LoginForm>({
        defaultValues: { email: '', password: '' },
    })

    const onSubmit = handleSubmit(async (values) => {
        try {
            await login(values)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Не удалось войти'
            toast.error(message)
        }
    })

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <Screen scroll>
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Heading level={1}>С возвращением</Heading>
                    <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                        Войдите, чтобы продолжить планировать меню для семьи.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80).duration(400)} style={{ gap: spacing.md }}>
                    <Controller
                        control={control}
                        name="email"
                        rules={{
                            required: 'Введите email',
                            pattern: { value: /.+@.+\..+/, message: 'Неверный email' },
                        }}
                        render={({ field, fieldState }) => (
                            <Input
                                label="Email"
                                placeholder="anel@example.com"
                                autoCapitalize="none"
                                autoComplete="email"
                                keyboardType="email-address"
                                value={field.value}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                error={fieldState.error?.message}
                                leftAddon={<Icon name="mail" size={18} color={palette.textMuted} />}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="password"
                        rules={{
                            required: 'Введите пароль',
                            minLength: { value: 8, message: 'Минимум 8 символов' },
                        }}
                        render={({ field, fieldState }) => (
                            <Input
                                label="Пароль"
                                placeholder="••••••••"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete="password"
                                value={field.value}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                error={fieldState.error?.message}
                                rightAddon={
                                    <Pressable
                                        onPress={() => setShowPassword((v) => !v)}
                                        hitSlop={12}
                                        accessibilityRole="button"
                                        accessibilityLabel={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                                    >
                                        <Icon
                                            name={showPassword ? 'eyeOff' : 'eye'}
                                            size={18}
                                            color={palette.textMuted}
                                        />
                                    </Pressable>
                                }
                            />
                        )}
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(160).duration(400)} style={{ gap: spacing.sm }}>
                    <Button label="Войти" loading={formState.isSubmitting} onPress={onSubmit} size="lg" />
                    <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
                        <Text variant="caption" tone="muted">
                            Нет аккаунта?
                        </Text>
                        <Pressable
                            onPress={() => navigation.navigate('SignUp')}
                            hitSlop={8}
                            accessibilityRole="link"
                        >
                            <Text variant="caption" tone="accent" weight="700">
                                Создать
                            </Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </Screen>
        </KeyboardAvoidingView>
    )
}
