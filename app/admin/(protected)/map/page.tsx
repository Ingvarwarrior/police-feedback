'use client'

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Map as MapIcon, Shield, Star, Calendar } from "lucide-react"

// Leaflet markers are tricky with Next.js SSR
// Leaflet markers are tricky with Next.js SSR
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
)
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
)
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
)
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
)

// Sub-component to handle map centering/zooming
function MapController({ points }: { points: any[] }) {
    const map = (require('react-leaflet') as any).useMap()

    useEffect(() => {
        if (points.length > 0) {
            const L = require('leaflet')
            const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]))
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
        }
    }, [points, map])

    return null
}

import 'leaflet/dist/leaflet.css'

export default function ReportsMapPage() {
    const [points, setPoints] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'ALL' | 'POSITIVE' | 'CRITICAL'>('ALL')

    useEffect(() => {
        // Fix for default marker icons (Client-side only)
        const L = require('leaflet')
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        fetch('/api/admin/reports/map')
            .then(res => res.json())
            .then(data => {
                setPoints(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="p-12 text-center">Завантаження карти...</div>

    const filteredPoints = points.filter(p => {
        if (filter === 'ALL') return true
        if (filter === 'POSITIVE') return p.rating >= 4
        if (filter === 'CRITICAL') return p.rating < 3
        return true
    })

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <MapIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-600 shrink-0" />
                        Гео-аналітика відгуків
                    </h1>
                    <p className="text-slate-500 font-medium text-sm md:text-base">Візуалізація активності громадян на мапі району</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setFilter(filter === 'POSITIVE' ? 'ALL' : 'POSITIVE')}
                        className={`px-3 md:px-4 py-2 rounded-2xl border text-xs md:text-sm font-black flex items-center gap-2 shadow-sm transition-all active:scale-95 ${filter === 'POSITIVE'
                            ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-200 ring-offset-2 scale-105'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`}
                    >
                        <div className={`w-2 h-2 rounded-full animate-pulse ${filter === 'POSITIVE' ? 'bg-white' : 'bg-emerald-500'}`} />
                        {points.filter(p => p.rating >= 4).length} ПОЗИТИВНИХ
                    </button>
                    <button
                        onClick={() => setFilter(filter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
                        className={`px-3 md:px-4 py-2 rounded-2xl border text-xs md:text-sm font-black flex items-center gap-2 shadow-sm transition-all active:scale-95 ${filter === 'CRITICAL'
                            ? 'bg-rose-500 text-white border-rose-400 ring-2 ring-rose-200 ring-offset-2 scale-105'
                            : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'}`}
                    >
                        <div className={`w-2 h-2 rounded-full animate-pulse ${filter === 'CRITICAL' ? 'bg-white' : 'bg-rose-500'}`} />
                        {points.filter(p => p.rating < 3).length} КРИТИЧНИХ
                    </button>
                    {filter !== 'ALL' && (
                        <button
                            onClick={() => setFilter('ALL')}
                            className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-4"
                        >
                            Скинути фільтр
                        </button>
                    )}
                </div>
            </div>

            <Card className="flex-1 rounded-[2.5rem] overflow-hidden border-0 shadow-2xl ring-1 ring-slate-200 relative z-0">
                <MapContainer
                    center={[49.55, 28.25]} // Approx center for Ukraine/Hmilnyk
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController points={filteredPoints} />
                    {filteredPoints.map((p) => (
                        <Marker key={p.id} position={[p.lat, p.lon]}>
                            <Popup>
                                <div className="p-2 min-w-[200px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-black text-slate-900 uppercase text-[10px] tracking-widest flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            {new Date(p.date).toLocaleDateString()}
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-black ${p.rating >= 4 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {p.rating} / 5
                                        </div>
                                    </div>
                                    <p className="text-slate-600 text-xs italic mb-2">"{p.comment}"</p>
                                    <a href={`/admin/reports/${p.id}?from=map`} className="text-blue-600 font-black text-[10px] uppercase hover:underline">
                                        Відкрити звіт →
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </Card>
        </div>
    )
}
