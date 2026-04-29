import Constants from 'expo-constants'

const fallbackBaseUrl = 'http://localhost:8000'

export const API_BASE_URL: string =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiBaseUrl ||
    fallbackBaseUrl

export const APP_ENV = (process.env.EXPO_PUBLIC_ENV as 'development' | 'preview' | 'production') ?? 'development'

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0'
