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

type LoginForm = { email: string; password: string }

export function LoginScreen() {
    const { login } = useAuth()
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>()
    const { control, handleSubmit, formState } = useForm<LoginForm>({
        defaultValues: { email: '', password: '' },
    })

    const onSubmit = handleSubmit(async (values) => {
        try {
            await login(values)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed'
            Alert.alert('Sign in failed', message)
        }
    })

    return (
        <Screen scroll>
            <Heading level={1}>Welcome back</Heading>
            <Text style={{ fontSize: 15, color: '#4B5563', marginBottom: 12 }}>
                Sign in to keep planning meals for your household.
            </Text>

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
                        autoComplete="password"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />

            <Button label="Sign in" loading={formState.isSubmitting} onPress={onSubmit} />
            <Button label="Create account" variant="ghost" onPress={() => navigation.navigate('SignUp')} />
        </Screen>
    )
}
