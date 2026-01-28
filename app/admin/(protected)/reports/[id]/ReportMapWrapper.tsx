'use client'

import dynamic from 'next/dynamic'
import React from 'react'

// This component is a Client Component that uses next/dynamic with ssr: false
// to load the actual Leaflet map component.
const ReportMap = dynamic(() => import('./ReportMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Завантаження мапи...</div>
})

interface ReportMapWrapperProps {
    lat: number
    lon: number
}

export default function ReportMapWrapper({ lat, lon }: ReportMapWrapperProps) {
    return <ReportMap lat={lat} lon={lon} />
}
