'use client'

const IDLE_ACTIVITY_KEY = 'admin:last-activity-at'
const LOGOUT_BROADCAST_KEY = 'admin:force-logout-at'

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

export function clearAdminSessionMarkers() {
    if (!isBrowser()) return
    window.localStorage.removeItem(IDLE_ACTIVITY_KEY)
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
