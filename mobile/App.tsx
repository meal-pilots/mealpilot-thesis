import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { AppProviders } from '@core/providers/AppProviders'
import { RootNavigator } from '@core/navigation/RootNavigator'
import { usePushRegistration } from '@features/notifications/usePushRegistration'

SplashScreen.preventAutoHideAsync().catch(() => {})

function AppShell() {
    usePushRegistration()
    return <RootNavigator />
}

export default function App() {
    useEffect(() => {
        const timeout = setTimeout(() => {
            SplashScreen.hideAsync().catch(() => {})
        }, 250)
        return () => clearTimeout(timeout)
    }, [])

    return (
        <AppProviders>
            <StatusBar style="auto" />
            <AppShell />
        </AppProviders>
    )
}
