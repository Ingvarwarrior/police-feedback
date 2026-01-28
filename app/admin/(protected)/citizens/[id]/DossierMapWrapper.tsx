'use client'

import dynamic from 'next/dynamic'

const DossierMap = dynamic(() => import("./DossierMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">Завантаження мапи...</div>
})

export default function DossierMapWrapper({ markers }: { markers: any[] }) {
    return <DossierMap markers={markers} />
}
