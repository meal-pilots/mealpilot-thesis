const DIRECT_MESSAGE_KEYS = ['detail', 'message', 'error'] as const
const TRANSPARENT_KEYS = new Set(['data', 'errors', 'non_field_errors', 'nonFieldErrors'])
const IGNORED_KEYS = new Set(['code', 'request_id', 'requestId', 'status', 'status_code', 'statusCode'])

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanMessage(value: string): string | null {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function formatKey(key: string): string {
    const spaced = key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim()

    if (!spaced) {
        return key
    }

    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatMessage(path: string[], value: string): string | null {
    const message = cleanMessage(value)

    if (!message) {
        return null
    }

    if (path.length === 0) {
        return message
    }

    return `${path.map(formatKey).join(' ')}: ${message}`
}

function dedupe(messages: string[]): string[] {
    return Array.from(new Set(messages))
}

function collectMessages(value: unknown, path: string[] = []): string[] {
    if (value == null) {
        return []
    }

    if (typeof value === 'string') {
        const message = formatMessage(path, value)
        return message ? [message] : []
    }

    if (Array.isArray(value)) {
        return value.flatMap((item) => collectMessages(item, path))
    }

    if (!isRecord(value)) {
        return []
    }

    const messages: string[] = []

    for (const key of DIRECT_MESSAGE_KEYS) {
        messages.push(...collectMessages(value[key], path))
    }

    for (const [key, nestedValue] of Object.entries(value)) {
        if (DIRECT_MESSAGE_KEYS.includes(key as (typeof DIRECT_MESSAGE_KEYS)[number]) || IGNORED_KEYS.has(key)) {
            continue
        }

        const nestedPath = TRANSPARENT_KEYS.has(key) ? path : [...path, key]
        messages.push(...collectMessages(nestedValue, nestedPath))
    }

    return dedupe(messages)
}

export function extractApiErrorMessage(payload: unknown): string | null {
    const messages = collectMessages(payload)

    if (messages.length === 0) {
        return null
    }

    return messages.join(' ')
}
