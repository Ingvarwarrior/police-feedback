'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Card } from "@/components/ui/card"
import { Map as MapIcon, Calendar } from "lucide-react"

// Fix for default Leaflet markers in Next.js
const setupMarkers = () => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
}

function MapController({ points }: { points: any[] }) {
    const map = useMap()
    useEffect(() => {
        if (points.length > 0) {
            const allPoints = points.map(p => [p.lat, p.lon] as [number, number])
            const bounds = L.latLngBounds(allPoints)
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
        }
    }, [points, map])
    return null
}

export default function MapClient() {
    const [reportPoints, setReportPoints] = useState<any[]>([])
    const [loadingReports, setLoadingReports] = useState(true)
    const [filter, setFilter] = useState<'ALL' | 'POSITIVE' | 'CRITICAL'>('ALL')

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
    }, [])

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
                        Гео-аналітика
                    </h1>
                    <p className="text-slate-500 font-bold text-[10px] md:text-xs">Всього відгуків: {reportPoints.length}</p>
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

                    <MapController points={filteredReports} />
                </MapContainer>
            </Card>
        </div>
    )
}
