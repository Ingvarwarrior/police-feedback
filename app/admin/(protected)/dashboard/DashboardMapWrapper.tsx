'use client'

import dynamic from 'next/dynamic'

const DashboardMap = dynamic(() => import('./DashboardMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Завантаження мапи...</div>
})

export default function DashboardMapWrapper({ points }: { points: { lat: number, lon: number }[] }) {
    return <DashboardMap points={points} />
}
