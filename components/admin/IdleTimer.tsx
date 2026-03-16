'use client'

import { useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'

const IDLE_TIMEOUT = 60 * 60 * 1000
const CHECK_INTERVAL = 30 * 1000
const ACTIVITY_WRITE_THROTTLE = 5 * 1000
const LAST_ACTIVITY_KEY = 'admin:last-activity-at'
const LOGOUT_BROADCAST_KEY = 'admin:force-logout-at'

function getLastActivity() {
    if (typeof window === 'undefined') return Date.now()

    const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : NaN
    return Number.isFinite(parsed) ? parsed : Date.now()
}

function persistLastActivity(timestamp: number) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp))
}

function broadcastLogout(timestamp: number) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LOGOUT_BROADCAST_KEY, String(timestamp))
}

function clearServerSession() {
    if (typeof window === 'undefined') return

    if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/auth/client-logout')
        return
    }

    void fetch('/api/auth/client-logout', {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
    })
}

export function IdleTimer() {
    const { status } = useSession()
    const lastPersistedAt = useRef<number>(0)
    const logoutTriggered = useRef(false)
    const unloadTriggered = useRef(false)

    async function performLogout() {
        if (logoutTriggered.current) return
        logoutTriggered.current = true

        const timestamp = Date.now()
        broadcastLogout(timestamp)
        clearServerSession()
        await signOut({ callbackUrl: '/admin/login' })
    }

    useEffect(() => {
        if (status !== 'authenticated') return

        logoutTriggered.current = false
        unloadTriggered.current = false

        const writeActivity = () => {
            const now = Date.now()
            if (now - lastPersistedAt.current < ACTIVITY_WRITE_THROTTLE) return
            lastPersistedAt.current = now
            persistLastActivity(now)
        }

        const handleActivity = () => {
            writeActivity()
        }

        const handleCrossTabLogout = (event: StorageEvent) => {
            if (event.key !== LOGOUT_BROADCAST_KEY || !event.newValue) return
            void performLogout()
        }

        const handleUnload = () => {
            if (unloadTriggered.current) return
            unloadTriggered.current = true

            const timestamp = Date.now()
            broadcastLogout(timestamp)
            clearServerSession()
        }

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click', 'focus']
        writeActivity()

        events.forEach(event => {
            window.addEventListener(event, handleActivity)
        })
        window.addEventListener('storage', handleCrossTabLogout)
        window.addEventListener('pagehide', handleUnload)
        window.addEventListener('beforeunload', handleUnload)

        const interval = setInterval(() => {
            if (Date.now() - getLastActivity() >= IDLE_TIMEOUT) {
                void performLogout()
            }
        }, CHECK_INTERVAL)

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
            window.removeEventListener('storage', handleCrossTabLogout)
            window.removeEventListener('pagehide', handleUnload)
            window.removeEventListener('beforeunload', handleUnload)
            clearInterval(interval)
        }
    }, [status])

    return null
}
