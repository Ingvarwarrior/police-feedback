'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import Link from 'next/link'

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface MarkerData {
    lat: number
    lon: number
    title: string
    description: string
    id: string
}

export default function DossierMap({ markers }: { markers: MarkerData[] }) {
    if (markers.length === 0) {
        return (
            <div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                Координати відсутні
            </div>
        )
    }

    const center: [number, number] = [markers[0].lat, markers[0].lon]

    return (
        <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.map((m) => (
                <Marker key={m.id} position={[m.lat, m.lon]}>
                    <Popup className="rounded-2xl overflow-hidden">
                        <div className="p-2 space-y-1">
                            <p className="font-bold text-slate-900 leading-tight">{m.title}</p>
                            <p className="text-xs text-slate-500">{m.description}</p>
                            <Link
                                href={`/admin/reports/${m.id}`}
                                className="text-[10px] font-black uppercase text-primary hover:underline block pt-1"
                            >
                                Детальніше →
                            </Link>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
