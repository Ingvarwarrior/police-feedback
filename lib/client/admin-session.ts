'use client'

const IDLE_ACTIVITY_KEY = 'admin:last-activity-at'
const LOGOUT_BROADCAST_KEY = 'admin:force-logout-at'
const AUTH_MARKER_KEY = 'admin:auth-marker'
const TAB_SESSION_KEY = 'admin:tab-session-id'
const CHANNEL_NAME = 'admin:session-channel'
const LOGIN_MARKER_KEY = 'admin:just-logged-in'

function isBrowser() {
    return typeof window !== 'undefined'
}

function createTabId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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

export function getAdminTabSessionId() {
    if (!isBrowser()) return null
    return window.sessionStorage.getItem(TAB_SESSION_KEY)
}

export function createAdminTabSession() {
    if (!isBrowser()) return null
    const tabId = createTabId()
    window.sessionStorage.setItem(TAB_SESSION_KEY, tabId)
    return tabId
}

export function setAdminAuthMarker(timestamp: number) {
    if (!isBrowser()) return
    window.localStorage.setItem(AUTH_MARKER_KEY, String(timestamp))
}

export function hasAdminAuthMarker() {
    if (!isBrowser()) return false
    return Boolean(window.localStorage.getItem(AUTH_MARKER_KEY))
}

export function markAdminJustLoggedIn() {
    if (!isBrowser()) return
    window.sessionStorage.setItem(LOGIN_MARKER_KEY, String(Date.now()))
}

export function consumeAdminJustLoggedIn() {
    if (!isBrowser()) return false
    const value = window.sessionStorage.getItem(LOGIN_MARKER_KEY)
    if (!value) return false
    window.sessionStorage.removeItem(LOGIN_MARKER_KEY)
    return true
}

export function clearAdminSessionMarkers() {
    if (!isBrowser()) return
    window.localStorage.removeItem(IDLE_ACTIVITY_KEY)
    window.localStorage.removeItem(AUTH_MARKER_KEY)
    window.sessionStorage.removeItem(TAB_SESSION_KEY)
    window.sessionStorage.removeItem(LOGIN_MARKER_KEY)
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

export async function detectOtherActiveAdminTab(timeoutMs = 250) {
    if (!isBrowser() || typeof BroadcastChannel === 'undefined') return false

    const currentTabId = getAdminTabSessionId()
    const requestId = createTabId()
    const channel = new BroadcastChannel(CHANNEL_NAME)
    let found = false

    const listener = (event: MessageEvent) => {
        const data = event.data as { type?: string; requestId?: string; tabId?: string } | null
        if (!data || data.type !== 'ACTIVE_TAB_PRESENT' || data.requestId !== requestId) return
        if (data.tabId && data.tabId !== currentTabId) {
            found = true
        }
    }

    channel.addEventListener('message', listener)
    channel.postMessage({
        type: 'PING_ACTIVE_TABS',
        requestId,
        tabId: currentTabId,
    })

    await new Promise(resolve => window.setTimeout(resolve, timeoutMs))

    channel.removeEventListener('message', listener)
    channel.close()

    return found
}

export function subscribeToAdminTabPings() {
    if (!isBrowser() || typeof BroadcastChannel === 'undefined') return () => {}

    const tabId = getAdminTabSessionId()
    if (!tabId) return () => {}

    const channel = new BroadcastChannel(CHANNEL_NAME)

    const listener = (event: MessageEvent) => {
        const data = event.data as { type?: string; requestId?: string; tabId?: string } | null
        if (!data || data.type !== 'PING_ACTIVE_TABS' || !data.requestId) return
        if (data.tabId === tabId) return

        channel.postMessage({
            type: 'ACTIVE_TAB_PRESENT',
            requestId: data.requestId,
            tabId,
        })
    }

    channel.addEventListener('message', listener)

    return () => {
        channel.removeEventListener('message', listener)
        channel.close()
    }
}
