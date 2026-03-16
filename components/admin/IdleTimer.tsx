'use client'

import { useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
    broadcastAdminLogout,
    clearAdminTabClosedMarker,
    clearAdminSessionMarkers,
    getAdminTabClosedAt,
    getLastAdminActivity,
    markAdminSessionActive,
    recordAdminTabClosed,
    setLastAdminActivity,
    subscribeToAdminLogout,
} from '@/lib/client/admin-session'

const IDLE_TIMEOUT = 60 * 60 * 1000
const CHECK_INTERVAL = 30 * 1000
const ACTIVITY_WRITE_THROTTLE = 5 * 1000

export function IdleTimer() {
    const { status } = useSession()
    const lastPersistedAt = useRef<number>(0)
    const logoutTriggered = useRef(false)

    function isReloadNavigation() {
        if (typeof window === 'undefined' || !window.performance || typeof window.performance.getEntriesByType !== 'function') {
            return false
        }

        const navigationEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
        return navigationEntries[0]?.type === 'reload'
    }

    function redirectToLogin(reason: string) {
        clearAdminSessionMarkers()
        window.location.replace(`/admin/login?${reason}=${Date.now()}`)
    }

    function notifyServerAboutLogoutOnClose() {
        const url = '/api/auth/client-logout'

        try {
            if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
                const blob = new Blob([JSON.stringify({ reason: 'close' })], {
                    type: 'application/json',
                })
                navigator.sendBeacon(url, blob)
                return
            }
        } catch {
            // ignore and fallback to fetch keepalive
        }

        void fetch(url, {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason: 'close' }),
        }).catch(() => undefined)
    }

    async function performLogout() {
        if (logoutTriggered.current) return
        logoutTriggered.current = true

        const timestamp = Date.now()
        clearAdminSessionMarkers()
        broadcastAdminLogout(timestamp)
        await signOut({ callbackUrl: '/admin/login' })
    }

    useEffect(() => {
        if (status !== 'authenticated') return

        logoutTriggered.current = false

        markAdminSessionActive()
        clearAdminTabClosedMarker()

        const writeActivity = () => {
            const now = Date.now()
            if (now - lastPersistedAt.current < ACTIVITY_WRITE_THROTTLE) return
            lastPersistedAt.current = now
            setLastAdminActivity(now)
        }

        const handleTabClose = () => {
            recordAdminTabClosed()
            notifyServerAboutLogoutOnClose()
        }

        const handleActivity = () => {
            writeActivity()
        }

        const handleResume = () => {
            if (document.visibilityState === 'hidden') return

            const closedAt = getAdminTabClosedAt()
            if (closedAt && !isReloadNavigation()) {
                redirectToLogin('restored')
                return
            }

            writeActivity()
        }

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click', 'focus']
        writeActivity()

        events.forEach(event => {
            window.addEventListener(event, handleActivity)
        })
        window.addEventListener('beforeunload', handleTabClose)
        window.addEventListener('pagehide', handleTabClose)
        window.addEventListener('pageshow', handleResume)
        window.addEventListener('focus', handleResume)
        document.addEventListener('visibilitychange', handleResume)
        const unsubscribeLogout = subscribeToAdminLogout(() => {
            void performLogout()
        })

        const interval = setInterval(() => {
            if (Date.now() - getLastAdminActivity() >= IDLE_TIMEOUT) {
                void performLogout()
            }
        }, CHECK_INTERVAL)

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
            window.removeEventListener('beforeunload', handleTabClose)
            window.removeEventListener('pagehide', handleTabClose)
            window.removeEventListener('pageshow', handleResume)
            window.removeEventListener('focus', handleResume)
            document.removeEventListener('visibilitychange', handleResume)
            unsubscribeLogout()
            clearInterval(interval)
        }
    }, [status])

    return null
}
