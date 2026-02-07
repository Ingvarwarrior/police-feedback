'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { formatDistanceToNow } from 'date-fns'
import { uk } from 'date-fns/locale'

// Fix Leaflet icons in Next.js
const icon = L.icon({
    iconUrl: '/apple-icon.png', // Fallback or use custom marker
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'rounded-full border-2 border-white shadow-lg'
})

// Specific icon for police
const policeIcon = (initials: string) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #0f172a; color: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 900; font-size: 10px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">${initials}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
})


function MapUpdater({ users }: { users: any[] }) {
    const map = useMap()
    // Optional: Auto-fit bounds if users change significantly
    // useEffect(() => {
    //     if (users.length > 0) {
    //         const bounds = L.latLngBounds(users.map(u => [u.lastLat, u.lastLon]))
    //         map.fitBounds(bounds, { padding: [50, 50] })
    //     }
    // }, [users, map])
    return null
}

export default function MapClient({ initialUsers }: { initialUsers: any[] }) {
    const [users, setUsers] = useState(initialUsers)

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                // Determine if we need a new API endpoint valid for just fetching users or reuse?
                // For simplicity, let's just refresh the page data via router or separate API?
                // Let's reload via server action or router refresh to get fresh data without full reload
                // But full router.refresh() might reset map view state.
                // Ideally, we need an API endpoint for this.
                // Let's create a quick API GET /api/admin/locations route.
                const res = await fetch('/api/admin/locations')
                if (res.ok) {
                    const data = await res.json()
                    setUsers(data)
                }
            } catch (e) {
                console.error("Map update failed", e)
            }
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    // Default center (Ukraine or Kyiv)
    const defaultCenter: [number, number] = [49.5558, 27.9583] // Hmilnyk approximate
    const center = users.length > 0 ? [users[0].lastLat, users[0].lastLon] as [number, number] : defaultCenter

    return (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {users.map(user => {
                if (!user.lastLat || !user.lastLon) return null
                const initials = (user.lastName?.[0] || user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()
                return (
                    <Marker
                        key={user.id}
                        position={[user.lastLat, user.lastLon]}
                        icon={policeIcon(initials)}
                    >
                        <Popup className="rounded-xl">
                            <div className="p-2 min-w-[150px]">
                                <p className="font-black text-slate-900 uppercase text-xs mb-1">
                                    {user.lastName} {user.firstName}
                                </p>
                                <p className="text-[10px] text-slate-500 font-bold mb-2">
                                    {user.badgeNumber || 'Без жетону'} • {user.role}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                    Оновлено {user.lastLocationAt ? formatDistanceToNow(new Date(user.lastLocationAt), { addSuffix: true, locale: uk }) : '-'}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                )
            })}

            <MapUpdater users={users} />
        </MapContainer>
    )
}
