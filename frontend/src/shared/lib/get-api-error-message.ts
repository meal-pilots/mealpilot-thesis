import { ApiError } from '../api/http'
import { extractApiErrorMessage } from './api-error-message'

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    if (error instanceof ApiError) {
        return extractApiErrorMessage(error.payload) ?? error.message ?? fallback
    }

    if (error instanceof Error) {
        return error.message
    }

    return fallback
}
