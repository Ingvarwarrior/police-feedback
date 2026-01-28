'use client'

import React, { useEffect, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface AddressResolverProps {
    lat: number
    lon: number
}

export default function AddressResolver({ lat, lon }: AddressResolverProps) {
    const [address, setAddress] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAddress = async () => {
            try {
                // Using OSM Nominatim for reverse geocoding
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=uk`, {
                    headers: {
                        'User-Agent': 'PoliceFeedbackSystem/1.0'
                    }
                })
                const data = await res.json()
                if (data.display_name) {
                    // Extract a shorter, readable address if possible
                    const addr = data.address;
                    const shortAddress = [
                        addr.road || addr.street,
                        addr.house_number,
                        addr.suburb,
                        addr.city || addr.town || addr.village
                    ].filter(Boolean).join(', ');

                    setAddress(shortAddress || data.display_name)
                }
            } catch (err) {
                console.error('Failed to resolve address:', err)
                setAddress('Не вдалося визначити адресу')
            } finally {
                setLoading(false)
            }
        }

        fetchAddress()
    }, [lat, lon])

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest p-4">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                Визначаємо адресу...
            </div>
        )
    }

    return (
        <div className="p-5 space-y-2 bg-white border-t border-slate-100">
            <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-primary" />
                    Адреса події
                </p>
                <p className="text-sm font-bold text-slate-900 leading-relaxed">
                    {address || 'Адреса відсутня'}
                </p>
            </div>
        </div>
    )
}
