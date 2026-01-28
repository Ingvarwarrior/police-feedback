'use client'

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface DashboardMapProps {
    points: { lat: number, lon: number }[]
}

export default function DashboardMap({ points }: DashboardMapProps) {
    // Default center for Khmilnyk/Koziatyn area if no points
    const center: [number, number] = points.length > 0
        ? [points[0].lat, points[0].lon]
        : [49.66, 28.66]

    return (
        <MapContainer
            center={center}
            zoom={10}
            style={{ height: '100%', width: '100%', borderRadius: '1.5rem' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((p, idx) => (
                <CircleMarker
                    key={idx}
                    center={[p.lat, p.lon]}
                    radius={8}
                    fillColor="#3b82f6"
                    color="#1d4ed8"
                    weight={1}
                    fillOpacity={0.6}
                >
                    <Tooltip>Відгук тут</Tooltip>
                </CircleMarker>
            ))}
        </MapContainer>
    )
}
