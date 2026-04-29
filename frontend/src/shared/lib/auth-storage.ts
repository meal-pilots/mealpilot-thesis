import type { StoredAuthSession } from '../types/auth'

const AUTH_SESSION_KEY = 'intelligent-meal-planner.auth.session'

function isBrowser() {
    return typeof window !== 'undefined'
}

function readFromStorage(storage: Storage): StoredAuthSession | null {
    const rawValue = storage.getItem(AUTH_SESSION_KEY)

    if (!rawValue) {
        return null
    }

    try {
        return JSON.parse(rawValue) as StoredAuthSession
    } catch {
        storage.removeItem(AUTH_SESSION_KEY)
        return null
    }
}

function writeToStorage(storage: Storage, session: StoredAuthSession) {
    storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function getStoredAuthSessionWithStorage(): {
    session: StoredAuthSession
    storage: Storage
} | null {
    if (!isBrowser()) {
        return null
    }

    const localSession = readFromStorage(window.localStorage)

    if (localSession) {
        return {
            session: localSession,
            storage: window.localStorage,
        }
    }

    const sessionSession = readFromStorage(window.sessionStorage)

    if (sessionSession) {
        return {
            session: sessionSession,
            storage: window.sessionStorage,
        }
    }

    return null
}

export function getStoredAuthSession() {
    return getStoredAuthSessionWithStorage()?.session ?? null
}

export function saveAuthSession(session: StoredAuthSession, remember: boolean) {
    if (!isBrowser()) {
        return
    }

    const targetStorage = remember ? window.localStorage : window.sessionStorage
    const otherStorage = remember ? window.sessionStorage : window.localStorage

    targetStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
    otherStorage.removeItem(AUTH_SESSION_KEY)
}

export function updateStoredAuthUser(user: StoredAuthSession['user']) {
    const stored = getStoredAuthSessionWithStorage()

    if (!stored) {
        return
    }

    writeToStorage(stored.storage, {
        ...stored.session,
        user,
    })
}

export function clearStoredAuthSession() {
    if (!isBrowser()) {
        return
    }

    window.localStorage.removeItem(AUTH_SESSION_KEY)
    window.sessionStorage.removeItem(AUTH_SESSION_KEY)
}

export function isStoredSessionPersistent() {
    const stored = getStoredAuthSessionWithStorage()

    if (!stored || !isBrowser()) {
        return false
    }

    return stored.storage === window.localStorage
}