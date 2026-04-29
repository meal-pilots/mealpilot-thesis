import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Controller, useForm } from 'react-hook-form'
import { Alert, Text } from 'react-native'

import { useAuth } from '@features/auth/model/AuthContext'
import type { AuthStackParamList } from '@core/navigation/types'
import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Input } from '@shared/ui/Input'
import { Screen } from '@shared/ui/Screen'

type SignUpForm = { email: string; password: string; full_name: string }

export function SignUpScreen() {
    const { signUp } = useAuth()
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>()
    const { control, handleSubmit, formState } = useForm<SignUpForm>({
        defaultValues: { email: '', password: '', full_name: '' },
    })

    const onSubmit = handleSubmit(async (values) => {
        try {
            await signUp(values)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Sign up failed'
            Alert.alert('Sign up failed', message)
        }
    })

    return (
        <Screen scroll>
            <Heading level={1}>Create your kitchen</Heading>
            <Text style={{ fontSize: 15, color: '#4B5563', marginBottom: 12 }}>
                We&apos;ll guide you through a quick onboarding next.
            </Text>

            <Controller
                control={control}
                name="full_name"
                rules={{ required: 'Name is required' }}
                render={({ field, fieldState }) => (
                    <Input
                        label="Full name"
                        autoCapitalize="words"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="email"
                rules={{ required: 'Email is required', pattern: { value: /.+@.+\..+/, message: 'Invalid email' } }}
                render={({ field, fieldState }) => (
                    <Input
                        label="Email"
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="password"
                rules={{ required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } }}
                render={({ field, fieldState }) => (
                    <Input
                        label="Password"
                        secureTextEntry
                        autoCapitalize="none"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />

            <Button label="Create account" loading={formState.isSubmitting} onPress={onSubmit} />
            <Button label="I already have one" variant="ghost" onPress={() => navigation.navigate('Login')} />
        </Screen>
    )
}
