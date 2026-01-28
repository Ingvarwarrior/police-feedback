'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, MapPin, Search, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddressAutocomplete } from '../AddressAutocomplete'

// Dynamically import map
const LocationPicker = dynamic(() => import('@/components/maps/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-50 animate-pulse rounded-[2rem] flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Завантаження мапи...</div>
})

export default function Step3Location() {
    const { setStep, updateData, formData } = useSurveyStore()
    const [loadingLoc, setLoadingLoc] = useState(false)
    const [isApprox, setIsApprox] = useState<boolean>(formData.geoPoint?.precisionMode === 'approx' || true)

    const handleNext = () => {
        if (!formData.districtOrCity && !formData.geoPoint) {
            toast.error("Будь ласка, вкажіть місце події на мапі або введіть адресу")
            return
        }
        setStep(4)
    }
    const handleBack = () => setStep(formData.wantContact ? 2 : 1)

    const getAddressFromCoords = async (lat: number, lon: number) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=uk`)
            const data = await res.json()
            if (data && data.address) {
                const a = data.address
                let locationString = ""

                if (a.road) {
                    locationString = a.road
                    if (a.house_number) {
                        locationString += `, ${a.house_number}`
                    } else if (a.ref) {
                        locationString = `${a.road} (${a.ref})`
                    }
                    const settlement = a.city || a.town || a.village || a.hamlet || a.suburb
                    if (settlement) locationString += ` [${settlement}]`
                } else {
                    locationString = data.display_name.split(',').slice(0, 3).join(', ')
                }

                updateData({ districtOrCity: locationString })
            }
        } catch (error) {
            console.error("Geocoding error:", error)
        }
    }

    const handleGetLocation = () => {
        setLoadingLoc(true)

        // Powerful features like Geolocation require a secure context (HTTPS or localhost)
        const isSecure = typeof window !== 'undefined' && window.isSecureContext;

        if (typeof window === 'undefined' || !navigator.geolocation) {
            if (!isSecure && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                toast.error("Геолокація заблокована браузером (необхідне HTTPS з'єднання або доступ через localhost)")
            } else {
                toast.error("Геолокація не підтримується вашим браузером")
            }
            setLoadingLoc(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude, accuracy } = pos.coords
                updateData({
                    geoPoint: {
                        lat: latitude,
                        lon: longitude,
                        accuracyMeters: accuracy,
                        precisionMode: isApprox ? 'approx' : 'exact'
                    }
                })
                await getAddressFromCoords(latitude, longitude)
                setLoadingLoc(false)
                toast.success("Ваше місцезнаходження визначено!")
            },
            (err) => {
                let msg = "Не вдалося отримати локацію."
                if (err.code === 1) msg = "Доступ до геопозиції заборонено. Перевірте налаштування приватності."
                if (err.code === 2) msg = "Позиція недоступна."
                if (err.code === 3) msg = "Час очікування вичерпано."

                toast.error(msg)
                setLoadingLoc(false)
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
    }

    const handleMapChange = async (lat: number, lon: number) => {
        updateData({ geoPoint: { lat, lon, precisionMode: isApprox ? 'approx' : 'exact' } })
        await getAddressFromCoords(lat, lon)
    }

    return (
        <div className="space-y-8 h-full flex flex-col justify-center">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                    <div className="w-1.5 h-6 bg-primary" />
                    Місце події
                </h2>
                <p className="text-slate-500 text-sm font-medium px-4 md:px-0">Використовуйте мапу або GPS для визначення локації.</p>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto px-1">
                <Button
                    variant="outline"
                    onClick={handleGetLocation}
                    disabled={loadingLoc}
                    className="w-full h-14 rounded-2xl border-2 border-slate-100 gap-3 font-bold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-sm bg-white"
                >
                    {loadingLoc ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <MapPin className="w-5 h-5 text-primary" />}
                    Увімкнути GPS позиціонування
                </Button>

                <div className="relative h-[300px] w-full group overflow-hidden rounded-[2.5rem] border-2 border-slate-100 shadow-xl">
                    <Label className="absolute top-4 left-4 z-10 bg-white/90 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm flex items-center gap-1">
                        Мапа <span className="text-primary">*</span>
                    </Label>
                    <LocationPicker
                        lat={formData.geoPoint?.lat || 49.555}
                        lon={formData.geoPoint?.lon || 28.333}
                        onLocationChange={handleMapChange}
                    />
                    {!formData.geoPoint && (
                        <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] pointer-events-none flex items-center justify-center p-8 text-center">
                            <div className="bg-white/95 px-6 py-3 rounded-full shadow-2xl border border-slate-100 animate-bounce">
                                <p className="text-primary font-black text-[11px] uppercase tracking-[0.2em]">Поставте точку на мапі</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ... approx mode switch ... */}
                <div className="flex items-center gap-5 p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 shadow-inner group">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg", isApprox ? "bg-primary text-secondary" : "bg-rose-500 text-white")}>
                        <Shield className="w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                        <Label htmlFor="approx-mode" className="font-extrabold text-slate-900 text-sm uppercase tracking-tight">Режим приватності</Label>
                        <p className="text-[10px] text-slate-400 font-bold leading-tight">
                            {isApprox ? "Координати будуть дещо округлені" : "Місце події буде збережене точно"}
                        </p>
                    </div>
                    <Switch
                        id="approx-mode"
                        checked={isApprox}
                        onCheckedChange={(val) => {
                            setIsApprox(val)
                            if (formData.geoPoint) {
                                updateData({ geoPoint: { ...formData.geoPoint, precisionMode: val ? 'approx' : 'exact' } })
                            }
                        }}
                        className="data-[state=checked]:bg-primary"
                    />
                </div>

                <div className="space-y-3 px-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5" />
                        Або уточніть адресу <span className="text-primary">*</span>
                    </Label>
                    <AddressAutocomplete
                        placeholder="Вулиця, номер будинку або орієнтир"
                        className="h-14 rounded-2xl border-2 border-slate-100 font-bold focus-visible:ring-primary focus-visible:border-primary bg-white px-6 shadow-sm"
                        value={formData.districtOrCity}
                        onChange={(val) => updateData({ districtOrCity: val })}
                        onSelect={(lat, lon, address) => {
                            updateData({
                                districtOrCity: address,
                                geoPoint: {
                                    lat,
                                    lon,
                                    precisionMode: isApprox ? 'approx' : 'exact'
                                }
                            })
                        }}
                    />
                </div>
            </div>

            <div className="flex gap-4 pt-4 mt-auto">
                <Button variant="ghost" onClick={handleBack} className="flex-1 h-14 rounded-2xl text-slate-400 font-bold uppercase tracking-widest text-xs">Назад</Button>
                <Button onClick={handleNext} className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl bg-primary text-secondary hover:bg-primary/90 transition-all">
                    Далі
                </Button>
            </div>
        </div>
    )
}
