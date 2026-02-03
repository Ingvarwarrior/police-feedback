'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DossierTabsProps {
    general: React.ReactNode
    history: React.ReactNode
    media: React.ReactNode
    analysis: React.ReactNode
}

export default function DossierTabs({ general, history, media, analysis }: DossierTabsProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'history' | 'media' | 'analysis'>('history')

    const tabs = [
        { id: 'history', label: 'Історія звернень' },
        { id: 'media', label: 'Медіатека' },
        { id: 'analysis', label: 'Аналітика' },
        { id: 'general', label: 'Профіль' },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                            activeTab === tab.id
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in duration-500">
                {activeTab === 'history' && history}
                {activeTab === 'media' && media}
                {activeTab === 'analysis' && analysis}
                {activeTab === 'general' && general}
            </div>
        </div>
    )
}
