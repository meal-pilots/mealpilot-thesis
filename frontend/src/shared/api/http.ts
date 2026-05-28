import { API_BASE_URL } from '../config/api'
import {
    clearStoredAuthSession,
    getStoredAuthSessionWithStorage,
    isStoredSessionPersistent,
    saveAuthSession,
} from '../lib/auth-storage'
import { extractApiErrorMessage } from '../lib/api-error-message'
import type { ApiEnvelope } from '../types/api'

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

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
    body?: BodyInit | Record<string, unknown> | null
    auth?: boolean
    retryOnUnauthorized?: boolean
    unwrap?: boolean
}

let refreshPromise: Promise<string | null> | null = null

function buildUrl(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${API_BASE_URL}${normalizedPath}`
}

async function parseResponseBody(response: Response) {
    if (response.status === 204 || response.status === 205) {
        return null
    }

    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
        const text = await response.text()
        return text ? JSON.parse(text) : null
    }

    const text = await response.text()
    return text || null
}

function extractErrorMessage(payload: unknown, fallback: string) {
    return extractApiErrorMessage(payload) ?? fallback
}

async function refreshAccessToken() {
    const stored = getStoredAuthSessionWithStorage()

    if (!stored) {
        return null
    }

    if (refreshPromise) {
        return refreshPromise
    }

    refreshPromise = (async () => {
        const response = await fetch(buildUrl('/auth/refresh'), {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: stored.session.refresh }),
        })

        const payload = await parseResponseBody(response)

        if (!response.ok) {
            clearStoredAuthSession()
            throw new ApiError(
                extractErrorMessage(payload, 'Your session has expired. Please log in again.'),
                response.status,
                payload,
            )
        }

        const envelope = payload as ApiEnvelope<{ access: string; refresh?: string }>
        const nextSession = {
            ...stored.session,
            access: envelope.data.access,
            refresh: envelope.data.refresh ?? stored.session.refresh,
        }

        saveAuthSession(nextSession, isStoredSessionPersistent())
        return nextSession.access
    })()
        .catch(() => null)
        .finally(() => {
            refreshPromise = null
        })

    return refreshPromise
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const {
        auth = true,
        retryOnUnauthorized = true,
        unwrap = true,
        headers,
        body,
        ...restOptions
    } = options

    const requestHeaders = new Headers(headers)
    requestHeaders.set('Accept', 'application/json')

    let requestBody: BodyInit | undefined

    if (body && !(body instanceof FormData) && typeof body === 'object') {
        requestHeaders.set('Content-Type', 'application/json')
        requestBody = JSON.stringify(body)
    } else if (body != null) {
        requestBody = body
    }

    if (auth) {
        const stored = getStoredAuthSessionWithStorage()
        if (stored?.session.access) {
            requestHeaders.set('Authorization', `Bearer ${stored.session.access}`)
        }
    }

    const response = await fetch(buildUrl(path), {
        ...restOptions,
        headers: requestHeaders,
        body: requestBody,
    })

    if (response.status === 401 && auth && retryOnUnauthorized) {
        const refreshedAccessToken = await refreshAccessToken()

        if (refreshedAccessToken) {
            return apiRequest<T>(path, {
                ...options,
                retryOnUnauthorized: false,
            })
        }

        clearStoredAuthSession()
    }

    const payload = await parseResponseBody(response)

    if (!response.ok) {
        throw new ApiError(
            extractErrorMessage(payload, `Request failed with status ${response.status}.`),
            response.status,
            payload,
        )
    }

    if (!unwrap) {
        return payload as T
    }

    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as ApiEnvelope<T>).data
    }

    return payload as T
}
