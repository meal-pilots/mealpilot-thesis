import { ApiError } from '../api/http'

function extractMessage(payload: unknown): string | null {
    if (!payload) {
        return null
    }

    if (typeof payload === 'string') {
        return payload
    }

    if (typeof payload === 'object') {
        if ('detail' in payload && typeof payload.detail === 'string') {
            return payload.detail
        }

        if ('data' in payload) {
            return extractMessage(payload.data)
        }

        for (const value of Object.values(payload)) {
            if (typeof value === 'string') {
                return value
            }

            if (Array.isArray(value) && typeof value[0] === 'string') {
                return value[0]
            }
        }
    }

    return null
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    if (error instanceof ApiError) {
        return extractMessage(error.payload) ?? error.message ?? fallback
    }

    if (error instanceof Error) {
        return error.message
    }

    return fallback
}