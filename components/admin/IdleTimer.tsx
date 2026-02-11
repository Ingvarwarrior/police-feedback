'use client'

import { useEffect, useCallback, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const IDLE_TIMEOUT = 20 * 60 * 1000 // 20 minutes in milliseconds
const CHECK_INTERVAL = 30 * 1000 // Check every 30 seconds

export function IdleTimer() {
    const { data: session, status, update } = useSession()
    const router = useRouter()
    const lastActivity = useRef<number>(Date.now())

    const handleActivity = useCallback(() => {
        lastActivity.current = Date.now()
    }, [])

    useEffect(() => {
        if (status !== 'authenticated') return

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity)
        })

        // Timer to check for inactivity
        const interval = setInterval(() => {
            const now = Date.now()
            if (now - lastActivity.current >= IDLE_TIMEOUT) {
                console.log('Session expired due to inactivity')
                signOut({ callbackUrl: '/admin/login' })
            } else {
                // Optionally update session to keep it alive on backend if user is active
                // update() // This might be too frequent if called every 30s, but NextAuth v5 update() handle this well
            }
        }, CHECK_INTERVAL)

        return () => {
            // Cleanup
            events.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
            clearInterval(interval)
        }
    }, [status, handleActivity])

    return null
}
