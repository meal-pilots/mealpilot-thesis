import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    useFonts,
} from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect } from 'react'
import { useColorScheme, View } from 'react-native'

import { AppProviders } from '@core/providers/AppProviders'
import { RootNavigator } from '@core/navigation/RootNavigator'
import { usePushRegistration } from '@features/notifications/usePushRegistration'
import { ErrorBoundary } from '@shared/ui/ErrorBoundary'
import { darkPalette, lightPalette } from '@shared/ui/theme'

SplashScreen.preventAutoHideAsync().catch(() => {})

function AppShell() {
    usePushRegistration()
    return <RootNavigator />
}

export default function App() {
    const scheme = useColorScheme()
    const palette = scheme === 'dark' ? darkPalette : lightPalette

    const [fontsLoaded, fontsError] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    })

    const ready = fontsLoaded || !!fontsError

    const onLayoutRootView = useCallback(() => {
        if (ready) {
            SplashScreen.hideAsync().catch(() => {})
        }
    }, [ready])

    useEffect(() => {
        if (ready) {
            SplashScreen.hideAsync().catch(() => {})
        }
    }, [ready])

    if (!ready) return null

    return (
        <View style={{ flex: 1, backgroundColor: palette.canvas }} onLayout={onLayoutRootView}>
            <ErrorBoundary>
                <AppProviders>
                    <StatusBar style={scheme === 'dark' ? 'light' : 'auto'} />
                    <AppShell />
                </AppProviders>
            </ErrorBoundary>
        </View>
    )
}
