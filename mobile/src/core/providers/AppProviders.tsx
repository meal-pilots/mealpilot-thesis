import NetInfo from '@react-native-community/netinfo'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { AppState, type AppStateStatus, Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider } from '@features/auth/model/AuthContext'
import { ToastProvider } from '@shared/ui/Toast'

onlineManager.setEventListener((setOnline) => {
    const sub = NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected)))
    return () => sub()
})

function onAppStateChange(status: AppStateStatus) {
    if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active')
    }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
    const queryClient = useMemo(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: 2,
                        staleTime: 1000 * 30,
                        gcTime: 1000 * 60 * 5,
                        refetchOnWindowFocus: false,
                    },
                    mutations: {
                        retry: 0,
                    },
                },
            }),
        [],
    )

    useEffect(() => {
        const sub = AppState.addEventListener('change', onAppStateChange)
        return () => sub.remove()
    }, [])

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <BottomSheetModalProvider>
                    <QueryClientProvider client={queryClient}>
                        <AuthProvider>
                            <ToastProvider>{children}</ToastProvider>
                        </AuthProvider>
                    </QueryClientProvider>
                </BottomSheetModalProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    )
}
