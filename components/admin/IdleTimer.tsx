'use client'

import { useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
    broadcastAdminLogout,
    clearAdminTabClosedMarker,
    clearAdminSessionMarkers,
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
        }

        const handleActivity = () => {
            writeActivity()
        }

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click', 'focus']
        writeActivity()

        events.forEach(event => {
            window.addEventListener(event, handleActivity)
        })
        window.addEventListener('beforeunload', handleTabClose)
        window.addEventListener('pagehide', handleTabClose)
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
            unsubscribeLogout()
            clearInterval(interval)
        }
    }, [status])

    return null
}
