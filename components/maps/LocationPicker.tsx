'use client'

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'

// Fix generic Leaflet icon issue in React
const iconProps = {
    iconUrl: '/marker-icon.png', // We'll need these assets or use CDN
    shadowUrl: '/marker-shadow.png',
    iconSize: [25, 41] as [number, number],
    iconAnchor: [12, 41] as [number, number],
}
// Using CDN for MVP to avoid asset copying logic complexities right now
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
    lat: number
    lon: number
    onLocationChange: (lat: number, lon: number, source: 'manual' | 'device') => void
}

function LocationMarker({ lat, lon, onChange }: { lat: number, lon: number, onChange: (lat: number, lon: number) => void }) {
    const map = useMap()

    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng)
        },
    })

    useEffect(() => {
        map.flyTo([lat, lon], map.getZoom())
    }, [lat, lon, map])

    return <Marker position={[lat, lon]} />
}

export default function LocationPicker({ lat, lon, onLocationChange }: LocationPickerProps) {
    // Default to somewhere in Khmelnytskyi district if 0,0
    const centerLat = lat || 49.423
    const centerLon = lon || 26.987

    return (
        <MapContainer
            center={[centerLat, centerLon]}
            zoom={13}
            scrollWheelZoom={true}
            className="w-full h-[300px] rounded-md z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker
                lat={centerLat}
                lon={centerLon}
                onChange={(newLat, newLon) => onLocationChange(newLat, newLon, 'manual')}
            />
        </MapContainer>
    )
}
