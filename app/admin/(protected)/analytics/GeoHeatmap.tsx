'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Card, CardContent } from "@/components/ui/card"

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
    const map = useMap()
    const layerRef = useRef<any>(null)

    useEffect(() => {
        if (!points || points.length === 0) return

        let mounted = true

        const initHeatmap = async () => {
            if (typeof window !== 'undefined') {
                // Ensure globally available L for the plugin
                (window as any).L = L

                // Dynamically import leaflet.heat
                await import('leaflet.heat')

                if (!mounted) return

                // Remove previous layer if exists
                if (layerRef.current) {
                    map.removeLayer(layerRef.current)
                    layerRef.current = null
                }

                // Check if plugin loaded correctly
                if ((L as any).heatLayer) {
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

                    layerRef.current = heat

                    // Auto-fit bounds
                    const latLngs = points.map(p => [p[0], p[1]] as [number, number])
                    const bounds = L.latLngBounds(latLngs)
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [50, 50] })
                    }
                }
            }
        }

        initHeatmap()

        return () => {
            mounted = false
            if (layerRef.current) {
                map.removeLayer(layerRef.current)
                layerRef.current = null
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
    // Center on Vinnytsia/Khmilnyk region by default
    const center: [number, number] = [49.5558, 27.9587]

    // Prepare heat data: [lat, lng, intensity]
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
                    zoom={10}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
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
