export type ApiEnvelope<T> = {
    data: T
    meta?: Record<string, unknown>
    request_id?: string
    errors?: Record<string, unknown>
}
