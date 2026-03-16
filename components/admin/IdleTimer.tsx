'use client'

import { useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
    broadcastAdminLogout,
    clearAdminSessionMarkers,
    getLastAdminActivity,
    markAdminSessionActive,
    setLastAdminActivity,
    shouldLogoutRestoredSession,
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

        if (shouldLogoutRestoredSession()) {
            void performLogout()
            return
        }

        markAdminSessionActive()

        const writeActivity = () => {
            const now = Date.now()
            if (now - lastPersistedAt.current < ACTIVITY_WRITE_THROTTLE) return
            lastPersistedAt.current = now
            setLastAdminActivity(now)
        }

        const handleActivity = () => {
            writeActivity()
        }

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click', 'focus']
        writeActivity()

        events.forEach(event => {
            window.addEventListener(event, handleActivity)
        })
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
            unsubscribeLogout()
            clearInterval(interval)
        }
    }, [status])

    return null
}
