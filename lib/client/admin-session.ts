'use client'

const IDLE_ACTIVITY_KEY = 'admin:last-activity-at'
const AUTH_MARKER_KEY = 'admin:auth-present'
const TAB_MARKER_KEY = 'admin:tab-active'
const LOGOUT_BROADCAST_KEY = 'admin:force-logout-at'
const CLOSE_MARKER_KEY = 'admin:last-close-at'

function isBrowser() {
    return typeof window !== 'undefined'
}

export function getLastAdminActivity() {
    if (!isBrowser()) return Date.now()

    const raw = window.localStorage.getItem(IDLE_ACTIVITY_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : NaN
    return Number.isFinite(parsed) ? parsed : Date.now()
}

export function setLastAdminActivity(timestamp: number) {
    if (!isBrowser()) return
    window.localStorage.setItem(IDLE_ACTIVITY_KEY, String(timestamp))
}

export function markAdminSessionActive() {
    if (!isBrowser()) return
    window.sessionStorage.setItem(TAB_MARKER_KEY, '1')
    window.localStorage.setItem(AUTH_MARKER_KEY, '1')
}

export function shouldLogoutRestoredSession() {
    if (!isBrowser()) return false

    const hasPersistentAuth = window.localStorage.getItem(AUTH_MARKER_KEY) === '1'
    const hasTabMarker = window.sessionStorage.getItem(TAB_MARKER_KEY) === '1'
    return hasPersistentAuth && !hasTabMarker
}

export function clearAdminSessionMarkers() {
    if (!isBrowser()) return

    window.sessionStorage.removeItem(TAB_MARKER_KEY)
    window.localStorage.removeItem(AUTH_MARKER_KEY)
    window.localStorage.removeItem(IDLE_ACTIVITY_KEY)
    window.localStorage.removeItem(CLOSE_MARKER_KEY)
}

export function recordAdminTabClosed(timestamp: number = Date.now()) {
    if (!isBrowser()) return
    window.localStorage.setItem(CLOSE_MARKER_KEY, String(timestamp))
}

export function clearAdminTabClosedMarker() {
    if (!isBrowser()) return
    window.localStorage.removeItem(CLOSE_MARKER_KEY)
}

export function getAdminTabClosedAt() {
    if (!isBrowser()) return null

    const raw = window.localStorage.getItem(CLOSE_MARKER_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : NaN
    return Number.isFinite(parsed) ? parsed : null
}

export function broadcastAdminLogout(timestamp: number) {
    if (!isBrowser()) return
    window.localStorage.setItem(LOGOUT_BROADCAST_KEY, String(timestamp))
}

export function subscribeToAdminLogout(handler: () => void) {
    if (!isBrowser()) return () => {}

    const listener = (event: StorageEvent) => {
        if (event.key !== LOGOUT_BROADCAST_KEY || !event.newValue) return
        handler()
    }

    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
}
