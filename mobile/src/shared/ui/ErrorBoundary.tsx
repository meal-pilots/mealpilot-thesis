import { Component, type ReactNode } from 'react'
import { View } from 'react-native'

import { Button } from '@shared/ui/Button'
import { Heading } from '@shared/ui/Heading'
import { Icon } from '@shared/ui/Icon'
import { lightPalette, radii, spacing } from '@shared/ui/theme'
import { Text } from '@shared/ui/Text'

type Props = {
    children: ReactNode
    fallback?: ReactNode
}

type State = {
    hasError: boolean
    error?: Error
}

/**
 * Last-line defence against renderer crashes.
 *
 * Apple Review treats white-screen crashes as a hard reject; this
 * boundary keeps the app interactive and lets the user try recovering.
 * Reports should be wired to Sentry once the SDK is initialized.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: { componentStack: string }): void {
        // Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
        console.error('[ErrorBoundary]', error, info.componentStack)
    }

    private handleReset = (): void => {
        this.setState({ hasError: false, error: undefined })
    }

    render(): ReactNode {
        if (!this.state.hasError) return this.props.children
        if (this.props.fallback) return this.props.fallback

        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: lightPalette.canvas,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: spacing.xxl,
                    gap: spacing.lg,
                }}
            >
                <View
                    style={{
                        width: 96,
                        height: 96,
                        borderRadius: radii.pill,
                        backgroundColor: lightPalette.dangerBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon name="alertCircle" size={48} color={lightPalette.danger} />
                </View>
                <Heading level={1} style={{ textAlign: 'center' }}>
                    Что-то пошло не так
                </Heading>
                <Text tone="secondary" align="center" style={{ maxWidth: 320 }}>
                    Мы уже знаем об ошибке. Попробуйте вернуться назад или перезапустить приложение.
                </Text>
                <Button label="Попробовать снова" onPress={this.handleReset} style={{ marginTop: spacing.md }} />
            </View>
        )
    }
}
