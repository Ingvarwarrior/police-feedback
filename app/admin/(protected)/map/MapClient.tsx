'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { formatDistanceToNow } from 'date-fns'
import { uk } from 'date-fns/locale'
import { Card } from "@/components/ui/card"
import { Map as MapIcon, Calendar, Info, Layers } from "lucide-react"

// Fix for default Leaflet markers in Next.js
const setupMarkers = () => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
}

const policeIcon = (initials: string) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #0f172a; color: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 900; font-size: 10px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">${initials}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
})

function MapController({ points, userLocations }: { points: any[], userLocations: any[] }) {
    const map = useMap()
    useEffect(() => {
        if (points.length > 0 || userLocations.length > 0) {
            const allPoints = [
                ...points.map(p => [p.lat, p.lon] as [number, number]),
                ...userLocations.map(u => [u.lastLat, u.lastLon] as [number, number])
            ]
            if (allPoints.length > 0) {
                const bounds = L.latLngBounds(allPoints)
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
            }
        }
    }, [points, userLocations, map])
    return null
}

export default function MapClient({ initialUsers, isAdmin }: { initialUsers: any[], isAdmin: boolean }) {
    const [reportPoints, setReportPoints] = useState<any[]>([])
    const [onlineUsers, setOnlineUsers] = useState(initialUsers)
    const [loadingReports, setLoadingReports] = useState(true)
    const [filter, setFilter] = useState<'ALL' | 'POSITIVE' | 'CRITICAL'>('ALL')
    const [showOnline, setShowOnline] = useState(true)

    useEffect(() => {
        setupMarkers()

        // Fetch Report Points (Feedbacks)
        fetch('/api/admin/reports/map')
            .then(res => res.json())
            .then(data => {
                setReportPoints(data)
                setLoadingReports(false)
            })
            .catch(err => {
                console.error("Reports fetch failed", err)
                setLoadingReports(false)
            })

        // Poll Online Users (GPS) if Admin
        let interval: any
        if (isAdmin) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch('/api/admin/locations')
                    if (res.ok) {
                        const data = await res.json()
                        setOnlineUsers(data)
                    }
                } catch (e) {
                    console.error("Online users fetch failed", e)
                }
            }, 30000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isAdmin])

    const filteredReports = reportPoints.filter(p => {
        if (filter === 'ALL') return true
        if (filter === 'POSITIVE') return p.rating >= 4
        if (filter === 'CRITICAL') return p.rating < 3
        return true
    })

    const defaultCenter: [number, number] = [49.5558, 27.9583]

    return (
        <div className="space-y-4 h-full flex flex-col p-4 md:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <MapIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 shrink-0" />
                        Гео-аналітика {isAdmin ? '& Моніторинг' : ''}
                    </h1>
                    <p className="text-slate-500 font-bold text-[10px] md:text-xs">Всього відгуків: {reportPoints.length} {isAdmin ? `• Онлайн: ${onlineUsers.length}` : ''}</p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    {/* Report Filters */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Усі
                        </button>
                        <button
                            onClick={() => setFilter('POSITIVE')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === 'POSITIVE' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-600 hover:text-emerald-700'}`}
                        >
                            Позитивні
                        </button>
                        <button
                            onClick={() => setFilter('CRITICAL')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === 'CRITICAL' ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-600 hover:text-rose-700'}`}
                        >
                            Критичні
                        </button>
                    </div>

                    {/* Admin GPS Toggle */}
                    {isAdmin && (
                        <button
                            onClick={() => setShowOnline(!showOnline)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-tight shadow-sm transition-all ${showOnline ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                            <Layers className="w-3 h-3" />
                            Екіпажі {showOnline ? 'ON' : 'OFF'}
                        </button>
                    )}
                </div>
            </div>

            <Card className="flex-1 rounded-[2rem] overflow-hidden border-0 shadow-xl ring-1 ring-slate-200 relative z-0">
                <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />

                    {/* Report Markers */}
                    {filteredReports.map((p) => (
                        <Marker key={p.id} position={[p.lat, p.lon]}>
                            <Popup className="rounded-xl overflow-hidden">
                                <div className="p-3 min-w-[200px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-black text-slate-900 uppercase text-[9px] tracking-widest flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            {new Date(p.date).toLocaleDateString()}
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-[9px] font-black ${p.rating >= 4 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            Оцінка: {p.rating}
                                        </div>
                                    </div>
                                    <p className="text-slate-600 text-xs italic mb-2 line-clamp-3">"{p.comment || 'Без коментаря'}"</p>
                                    <a href={`/admin/reports/${p.id}`} className="block text-center py-2 bg-slate-50 rounded-lg text-blue-600 font-black text-[9px] uppercase hover:bg-slate-100 transition-colors">
                                        Дивитись звіт →
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Online User Markers (GPS) */}
                    {isAdmin && showOnline && onlineUsers.map(user => {
                        if (!user.lastLat || !user.lastLon) return null
                        const initials = (user.lastName?.[0] || user.firstName?.[0] || user.email?.[0] || '?').toUpperCase()
                        return (
                            <Marker
                                key={user.id}
                                position={[user.lastLat, user.lastLon]}
                                icon={policeIcon(initials)}
                            >
                                <Popup>
                                    <div className="p-2 min-w-[150px]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="font-black text-slate-900 uppercase text-xs">
                                                {user.lastName} {user.firstName || ''}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold mb-2">
                                            {user.badgeNumber || 'No Badge'} • {user.role}
                                        </p>
                                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                                            <Info className="w-3 h-3" />
                                            Оновлено {user.lastLocationAt ? formatDistanceToNow(new Date(user.lastLocationAt), { addSuffix: true, locale: uk }) : '-'}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    })}

                    <MapController points={filteredReports} userLocations={isAdmin && showOnline ? onlineUsers : []} />
                </MapContainer>
            </Card>
        </div>
    )
}
