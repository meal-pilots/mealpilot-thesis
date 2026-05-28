import Constants from 'expo-constants'

const fallbackApiBaseUrl = 'http://localhost:8000/api/v1'
const apiVersionPath = '/api/v1'

function normalizeApiBaseUrl(value: string): string {
    const trimmed = value.trim().replace(/\/$/, '')

    if (trimmed.endsWith(apiVersionPath)) {
        return trimmed
    }

    return `${trimmed}${apiVersionPath}`
}

export const API_BASE_URL: string = normalizeApiBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiBaseUrl ||
    fallbackApiBaseUrl,
)

export const APP_ENV = (process.env.EXPO_PUBLIC_ENV as 'development' | 'preview' | 'production') ?? 'development'

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0'
