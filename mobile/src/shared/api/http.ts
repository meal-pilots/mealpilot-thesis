import { Platform } from 'react-native'

import { API_BASE_URL, APP_VERSION } from '@shared/config/api'
import {
    clearStoredAuthSession,
    getStoredAuthSession,
    saveAuthSession,
} from '@shared/lib/secure-storage'
import type { ApiEnvelope } from '@shared/types/api'

export class ApiError extends Error {
    status: number
    payload: unknown

    constructor(message: string, status: number, payload: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.payload = payload
    }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
    body?: BodyInit | Record<string, unknown> | null
    auth?: boolean
    retryOnUnauthorized?: boolean
}

let refreshPromise: Promise<string | null> | null = null

function buildUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`
    return `${API_BASE_URL}${normalized}`
}

function defaultPlatformHeader(): string {
    if (Platform.OS === 'ios') return 'ios'
    if (Platform.OS === 'android') return 'android'
    return 'web'
}

async function parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
        try {
            return await response.json()
        } catch {
            return null
        }
    }
    const text = await response.text()
    return text || null
}

function extractErrorMessage(payload: unknown, fallback: string): string {
    if (!payload) return fallback
    if (typeof payload === 'string') return payload
    if (typeof payload !== 'object') return fallback

    const obj = payload as Record<string, unknown>
    if (typeof obj.detail === 'string') return obj.detail
    if (obj.errors && typeof obj.errors === 'object') {
        return extractErrorMessage(obj.errors, fallback)
    }
    if (obj.data && typeof obj.data === 'object') {
        return extractErrorMessage(obj.data, fallback)
    }
    for (const value of Object.values(obj)) {
        if (typeof value === 'string' && value.trim()) return value
        if (Array.isArray(value) && typeof value[0] === 'string') return value[0] as string
    }
    return fallback
}

/**
 * Single-flight refresh.
 *
 * IMPORTANT: we set `refreshPromise` *before* awaiting anything so that
 * concurrent 401s share one in-flight refresh and don't all rotate the
 * refresh token (which would blacklist all but one and log the user out).
 */
function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
        try {
            const stored = await getStoredAuthSession()
            if (!stored) return null

            const response = await fetch(buildUrl('/api/v1/auth/refresh'), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-App-Version': APP_VERSION,
                    'X-Platform': defaultPlatformHeader(),
                },
                body: JSON.stringify({ refresh: stored.refresh }),
            })
            const payload = (await parseBody(response)) as ApiEnvelope<{ access: string; refresh?: string }> | null

            if (!response.ok || !payload?.data?.access) {
                await clearStoredAuthSession()
                return null
            }

            const next = {
                ...stored,
                access: payload.data.access,
                refresh: payload.data.refresh ?? stored.refresh,
            }
            await saveAuthSession(next)
            return next.access
        } catch {
            await clearStoredAuthSession()
            return null
        } finally {
            refreshPromise = null
        }
    })()

    return refreshPromise
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
        auth = true,
        retryOnUnauthorized = true,
        headers,
        body,
        ...rest
    } = options

    const requestHeaders = new Headers(headers)
    requestHeaders.set('Accept', 'application/json')
    requestHeaders.set('X-App-Version', APP_VERSION)
    requestHeaders.set('X-Platform', defaultPlatformHeader())

    let requestBody: BodyInit | undefined
    if (body && !(body instanceof FormData) && typeof body === 'object') {
        requestHeaders.set('Content-Type', 'application/json')
        requestBody = JSON.stringify(body)
    } else if (body != null) {
        requestBody = body as BodyInit
    }

    if (auth) {
        const stored = await getStoredAuthSession()
        if (stored?.access) {
            requestHeaders.set('Authorization', `Bearer ${stored.access}`)
        }
    }

    const response = await fetch(buildUrl(path), {
        ...rest,
        headers: requestHeaders,
        body: requestBody,
    })

    if (response.status === 426) {
        throw new ApiError(
            'A new version of the app is required.',
            426,
            await parseBody(response),
        )
    }

    if (response.status === 401 && auth && retryOnUnauthorized) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
            return apiRequest<T>(path, { ...options, retryOnUnauthorized: false })
        }
        await clearStoredAuthSession()
    }

    const payload = await parseBody(response)

    if (!response.ok) {
        throw new ApiError(
            extractErrorMessage(payload, `Request failed with status ${response.status}.`),
            response.status,
            payload,
        )
    }

    if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
        return (payload as ApiEnvelope<T>).data
    }

    return payload as T
}
