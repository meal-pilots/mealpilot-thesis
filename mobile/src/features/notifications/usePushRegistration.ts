import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import * as Localization from 'expo-localization'
import Constants from 'expo-constants'
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { useAuth } from '@features/auth/model/AuthContext'
import { registerDevice } from '@features/notifications/api/devices-api'

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
})

async function ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return
    await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
    })
}

async function requestPermissions(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === 'granted') return true
    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
}

export function usePushRegistration(): void {
    const { status } = useAuth()

    useEffect(() => {
        if (status !== 'authenticated') return
        if (!Device.isDevice) return

        let cancelled = false

        ;(async () => {
            try {
                await ensureAndroidChannel()
                const granted = await requestPermissions()
                if (!granted) return

                const projectId =
                    (Constants.expoConfig?.extra as Record<string, { projectId?: string }> | undefined)?.eas?.projectId ||
                    Constants.easConfig?.projectId

                const tokenResponse = await Notifications.getExpoPushTokenAsync(
                    projectId ? { projectId } : undefined,
                )
                if (cancelled) return

                await registerDevice({
                    expo_push_token: tokenResponse.data,
                    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
                    app_version: Constants.expoConfig?.version,
                    os_version: String(Platform.Version),
                    device_name: Device.deviceName ?? '',
                    locale: Localization.getLocales()[0]?.languageTag ?? '',
                    timezone: Localization.getCalendars()[0]?.timeZone ?? '',
                    push_enabled: true,
                })
            } catch {
                // best-effort: never throw on push registration
            }
        })()

        return () => {
            cancelled = true
        }
    }, [status])
}
