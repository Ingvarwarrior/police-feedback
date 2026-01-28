"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddressAutocompleteProps {
    value: string
    onChange: (value: string) => void
    onSelect: (lat: number, lon: number, address: string) => void
    placeholder?: string
    className?: string
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: AddressAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (value.length < 3) {
                setSuggestions([])
                return
            }

            setIsLoading(true)
            try {
                // Nominatim search API
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=ua&limit=5&addressdetails=1`
                )
                const data = await res.json()
                setSuggestions(data || [])
            } catch (error) {
                console.error("Address search error:", error)
                setSuggestions([])
            } finally {
                setIsLoading(false)
            }
        }

        const timer = setTimeout(fetchSuggestions, 500)
        return () => clearTimeout(timer)
    }, [value])

    const handleSelect = (item: any) => {
        const lat = parseFloat(item.lat)
        const lon = parseFloat(item.lon)

        // Construct a nicer display name
        let displayName = item.display_name
        if (item.address) {
            const a = item.address
            let parts = []
            if (a.road) parts.push(a.road)
            if (a.house_number) parts.push(a.house_number)
            const city = a.city || a.town || a.village || a.city_district
            if (city) parts.push(city)

            if (parts.length > 0) displayName = parts.join(", ")
        }

        onChange(displayName)
        onSelect(lat, lon, displayName)
        setShowSuggestions(false)
    }

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <Input
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value)
                        setShowSuggestions(true)
                    }}
                    onFocus={() => {
                        if (value.length >= 3) setShowSuggestions(true)
                    }}
                    placeholder={placeholder}
                    className={cn(className, "pr-10")}
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                    {suggestions.map((item, i) => (
                        <button
                            key={i}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-50 last:border-0"
                            onClick={() => handleSelect(item)}
                        >
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-slate-700 leading-tight">
                                    {item.name || item.address?.road || item.display_name.split(',')[0]}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                    {item.display_name}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
