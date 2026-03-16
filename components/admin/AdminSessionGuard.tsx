'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    broadcastAdminLogout,
    clearAdminSessionMarkers,
    consumeAdminJustLoggedIn,
    createAdminTabSession,
    detectOtherActiveAdminTab,
    getAdminTabSessionId,
    hasAdminAuthMarker,
    setAdminAuthMarker,
    setLastAdminActivity,
    subscribeToAdminTabPings,
} from '@/lib/client/admin-session'

async function performClosedSessionLogout() {
    const stamp = Date.now()
    clearAdminSessionMarkers()
    broadcastAdminLogout(stamp)

    try {
        await fetch('/api/auth/client-logout', {
            method: 'POST',
            credentials: 'same-origin',
        })
    } finally {
        window.location.replace(`/admin/login?closed=${stamp}`)
    }
}

export function AdminSessionGuard() {
    const { status } = useSession()

    useEffect(() => {
        if (status !== 'authenticated') return

        let cancelled = false
        let unsubscribePings = () => {}

        const bootstrap = async () => {
            if (consumeAdminJustLoggedIn()) {
                createAdminTabSession()
                setAdminAuthMarker(Date.now())
                setLastAdminActivity(Date.now())
                unsubscribePings = subscribeToAdminTabPings()
                return
            }

            const existingTabId = getAdminTabSessionId()
            if (existingTabId) {
                setAdminAuthMarker(Date.now())
                setLastAdminActivity(Date.now())
                unsubscribePings = subscribeToAdminTabPings()
                return
            }

            const authMarkerExists = hasAdminAuthMarker()
            const otherTabAlive = await detectOtherActiveAdminTab()
            if (cancelled) return

            if (authMarkerExists && !otherTabAlive) {
                await performClosedSessionLogout()
                return
            }

            createAdminTabSession()
            setAdminAuthMarker(Date.now())
            setLastAdminActivity(Date.now())
            unsubscribePings = subscribeToAdminTabPings()
        }

        void bootstrap()

        return () => {
            cancelled = true
            unsubscribePings()
        }
    }, [status])

    return null
}
