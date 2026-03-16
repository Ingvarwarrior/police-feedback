'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
    broadcastAdminLogout,
    clearAdminSessionMarkers,
    getLastAdminActivity,
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
        try {
            await fetch('/api/auth/client-logout', {
                method: 'POST',
                credentials: 'same-origin',
            })
        } finally {
            window.location.replace(`/admin/login?idle=${timestamp}`)
        }
    }

    useEffect(() => {
        if (status !== 'authenticated') return

        logoutTriggered.current = false

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
            clearAdminSessionMarkers()
            window.location.replace(`/admin/login?logout=${Date.now()}`)
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
