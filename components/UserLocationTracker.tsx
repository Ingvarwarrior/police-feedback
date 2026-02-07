'use client'

import { useEffect } from "react"

export function UserLocationTracker() {
    useEffect(() => {
        if (!navigator.geolocation) return

        const sendLocation = (pos: GeolocationPosition) => {
            const { latitude, longitude } = pos.coords

            // Send to API
            fetch('/api/user/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: latitude, lon: longitude })
            }).catch(err => console.error("Location sync failed", err))
        }

        // Send immediately
        navigator.geolocation.getCurrentPosition(sendLocation, (err) => console.log("Location access denied", err))

        // Then watch for changes (or poll)
        // Using watchPosition is better for "real-time", but can be battery intensive.
        // Let's use setInterval for a balance (every 60s) unless significant movement.

        const interval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(sendLocation, (err) => console.log("Location access denied", err))
        }, 60000)

        return () => clearInterval(interval)
    }, [])

    return null // Invisible component
}
