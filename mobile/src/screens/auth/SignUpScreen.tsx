import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native'
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

type SignUpForm = { email: string; password: string; full_name: string }

export function SignUpScreen() {
    const palette = usePalette()
    const { signUp } = useAuth()
    const toast = useToast()
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>()
    const [showPassword, setShowPassword] = useState(false)

    const { control, handleSubmit, formState } = useForm<SignUpForm>({
        defaultValues: { email: '', password: '', full_name: '' },
    })

    const onSubmit = handleSubmit(
        async (values) => {
            Keyboard.dismiss()
            try {
                await signUp({
                    email: values.email.trim().toLowerCase(),
                    password: values.password,
                    full_name: values.full_name.trim(),
                })
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Не удалось зарегистрироваться'
                toast.error(message)
            }
        },
        (errors) => {
            const message =
                errors.full_name?.message ||
                errors.email?.message ||
                errors.password?.message ||
                'Проверьте поля регистрации'
            toast.error(String(message))
        },
    )

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <Screen scroll>
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Heading level={1}>Создаём вашу кухню</Heading>
                    <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                        Дальше пройдём короткий онбординг — соберём первую неделю меню.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(80).duration(400)} style={{ gap: spacing.md }}>
                    <Controller
                        control={control}
                        name="full_name"
                        rules={{
                            validate: (value) => value.trim().length > 0 || 'Введите имя',
                        }}
                        render={({ field, fieldState }) => (
                            <Input
                                label="Полное имя"
                                placeholder="Анель Жумабаева"
                                autoCapitalize="words"
                                value={field.value}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                error={fieldState.error?.message}
                                leftAddon={<Icon name="user" size={18} color={palette.textMuted} />}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="email"
                        rules={{
                            required: 'Введите email',
                            validate: (value) => /.+@.+\..+/.test(value.trim()) || 'Неверный email',
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
                                placeholder="Минимум 8 символов"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
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
                    <Button label="Создать аккаунт" loading={formState.isSubmitting} onPress={onSubmit} size="lg" />
                    <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
                        <Text variant="caption" tone="muted">
                            Уже есть аккаунт?
                        </Text>
                        <Pressable
                            onPress={() => navigation.navigate('Login')}
                            hitSlop={8}
                            accessibilityRole="link"
                        >
                            <Text variant="caption" tone="accent" weight="700">
                                Войти
                            </Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </Screen>
        </KeyboardAvoidingView>
    )
}
