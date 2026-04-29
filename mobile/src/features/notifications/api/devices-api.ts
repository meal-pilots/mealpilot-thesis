import { apiRequest } from '@shared/api/http'

export type DeviceRegistrationPayload = {
    expo_push_token: string
    platform: 'ios' | 'android' | 'web'
    app_version?: string
    os_version?: string
    device_name?: string
    locale?: string
    timezone?: string
    push_enabled?: boolean
}

export async function registerDevice(payload: DeviceRegistrationPayload): Promise<void> {
    await apiRequest<unknown>('/api/v1/devices/register', {
        method: 'POST',
        body: payload,
    })
}
