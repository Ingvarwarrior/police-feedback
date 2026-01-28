'use client'

import { useState, useEffect } from "react"
import { Users, Heart, ShieldCheck } from "lucide-react"

export default function PublicTrustWidget() {
    const [stats, setStats] = useState({ total: 0, satisfactionRate: 0, politenessRate: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/stats/public')
                if (res.ok) {
                    const data = await res.json()
                    setStats(data)
                }
            } catch (error) {
                console.error("Failed to fetch public stats")
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/10" />
            ))}
        </div>
    )

    const items = [
        { label: "Відгуків отримано", val: stats.total, icon: Users, suffix: "" },
        { label: "Рівень задоволеності", val: stats.satisfactionRate, icon: ShieldCheck, suffix: "%" },
        { label: "Ввічливість патрулів", val: stats.politenessRate, icon: Heart, suffix: "%" },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {items.map((item, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl group hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2 bg-accent/20 rounded-lg text-accent">
                            <item.icon className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                    </div>
                    <p className="text-3xl font-black text-white tracking-widest italic uppercase">
                        {item.val}{item.suffix}
                    </p>
                </div>
            ))}
        </div>
    )
}
