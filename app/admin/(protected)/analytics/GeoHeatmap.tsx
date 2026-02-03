'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import 'leaflet.heat'
import { Card, CardContent } from "@/components/ui/card"

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
    const map = useMap()

    useEffect(() => {
        if (!points || points.length === 0) return

        const heat = (L as any).heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: {
                0.4: 'blue',
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            }
        }).addTo(map)

        return () => {
            map.removeLayer(heat)
        }
    }, [points, map])

    return null
}

interface GeoPoint {
    lat: number
    lng: number
    rating: number
    isNegative: boolean
}

interface GeoHeatmapProps {
    data: GeoPoint[]
}

export default function GeoHeatmap({ data }: GeoHeatmapProps) {
    // Focus on Ukraine/Vinnytsia region by default or calculate bounds
    const center: [number, number] = [49.5558, 27.9587] // Khmilnyk center approx

    // Prepare heat data: [lat, lng, intensity]
    // Intensity: 1.0 for negative, 0.3 for positive
    const heatData: [number, number, number][] = data.map(p => [
        p.lat,
        p.lng,
        p.isNegative ? 1.0 : 0.2
    ])

    return (
        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardContent className="p-0 h-[500px] relative z-0">
                <MapContainer
                    center={center}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <HeatmapLayer points={heatData} />
                </MapContainer>

                {/* Legend Overlay */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg z-[1000] border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Легенда інтенсивності</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span>Низька (Позитив)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mt-1">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span>Висока (Негатив)</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
