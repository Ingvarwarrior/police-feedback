'use client'

import dynamic from 'next/dynamic'

const MapClient = dynamic(() => import("./MapClient"), {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-bold">Завантаження мапи...</div>
})

export default function MapWrapper({ initialUsers }: { initialUsers: any[] }) {
    return <MapClient initialUsers={initialUsers} />
}
