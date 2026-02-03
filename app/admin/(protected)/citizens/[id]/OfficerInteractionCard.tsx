'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Shield, Star, Users } from "lucide-react"
import { OfficerInteraction } from "@/lib/dossier-utils"

interface OfficerInteractionCardProps {
    interactions: OfficerInteraction[]
}

export default function OfficerInteractionCard({ interactions }: OfficerInteractionCardProps) {
    if (interactions.length === 0) {
        return (
            <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Дані про взаємодію з офіцерами відсутні</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {interactions.map((i) => (
                <div key={i.officerId} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{i.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{i.badgeNumber}</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                            <span className="text-sm font-black text-slate-900">{i.count}</span>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">разів</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end text-amber-500">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-xs font-bold">{i.avgScore.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
