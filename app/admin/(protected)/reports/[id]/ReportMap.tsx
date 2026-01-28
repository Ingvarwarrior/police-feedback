'use client'

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// Fix for default marker icon in Leaflet + Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface ReportMapProps {
    lat: number
    lon: number
}

export default function ReportMap({ lat, lon }: ReportMapProps) {
    return (
        <MapContainer
            center={[lat, lon]}
            zoom={15}
            className="h-full w-full rounded-b-xl"
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lon]}>
                <Popup>
                    Місце події
                </Popup>
            </Marker>
            <Circle
                center={[lat, lon]}
                radius={50}
                pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
            />
        </MapContainer>
    )
}
