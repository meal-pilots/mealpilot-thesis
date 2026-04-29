import * as SecureStore from 'expo-secure-store'

import type { StoredAuthSession } from '@shared/types/auth'

const AUTH_SESSION_KEY = 'mealplanner.auth.session'
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
}

export async function getStoredAuthSession(): Promise<StoredAuthSession | null> {
    try {
        const raw = await SecureStore.getItemAsync(AUTH_SESSION_KEY, SECURE_STORE_OPTIONS)
        if (!raw) return null
        return JSON.parse(raw) as StoredAuthSession
    } catch {
        await clearStoredAuthSession()
        return null
    }
}

export async function saveAuthSession(session: StoredAuthSession): Promise<void> {
    await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session), SECURE_STORE_OPTIONS)
}

export async function clearStoredAuthSession(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_SESSION_KEY, SECURE_STORE_OPTIONS).catch(() => {})
}

export async function updateStoredAuthUser(user: StoredAuthSession['user']): Promise<void> {
    const stored = await getStoredAuthSession()
    if (!stored) return
    await saveAuthSession({ ...stored, user })
}
