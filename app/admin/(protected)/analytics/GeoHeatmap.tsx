'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"

// Fix for default marker icons (Client-side only)
const fixLeafletIcons = () => {
    if (typeof window !== 'undefined') {
        // Only run once
        if ((L.Icon.Default.prototype as any)._fixed) return;

        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

            ; (L.Icon.Default.prototype as any)._fixed = true;
    }
}

function MapController({ points }: { points: any[] }) {
    const map = useMap()

    useEffect(() => {
        if (points && points.length > 0) {
            try {
                const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
                }
            } catch (e) {
                console.error("Bounds error", e)
            }
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
    useEffect(() => {
        fixLeafletIcons()
    }, [])

    // Default center
    const center: [number, number] = [49.5558, 27.9587]

    return (
        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardContent className="p-0 h-[500px] relative z-0">
                <MapContainer
                    center={center}
                    zoom={10}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapController points={data} />

                    {data.map((p, idx) => (
                        <Marker key={idx} position={[p.lat, p.lng]}>
                            <Popup>
                                <div className="p-2 min-w-[150px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-black ${p.rating >= 4 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {p.rating} / 5
                                        </div>
                                    </div>
                                    <p className="text-slate-600 text-xs italic">
                                        {p.isNegative ? "Негативний відгук" : "Позитивний відгук"}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Legend Overlay */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg z-[1000] border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Маркери</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <div className="w-3 h-4 bg-blue-500 rounded-t-full border border-white shadow-sm"></div>
                        <span>Місце події</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
