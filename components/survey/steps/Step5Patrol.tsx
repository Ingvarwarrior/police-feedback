'use client'

import React from 'react'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, User, CreditCard } from 'lucide-react'

export default function Step5Patrol() {
    const { setStep, updateData, formData } = useSurveyStore()

    const handleNext = () => setStep(6)
    const handleBack = () => setStep(4)

    return (
        <div className="space-y-8 h-full flex flex-col justify-center">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                    <div className="w-1.5 h-6 bg-primary" />
                    Ідентифікація
                </h2>
                <p className="text-slate-500 text-sm font-medium px-4 md:px-0">Заповніть лише те, що пам’ятаєте.</p>
            </div>

            <div className="space-y-6 flex-1 py-4 overflow-y-auto px-1">
                <div className="space-y-3">
                    <Label htmlFor="patrol" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                        <Shield className="w-3.5 h-3.5" />
                        Бортовий номер / Номер авто
                    </Label>
                    <Input
                        id="patrol"
                        placeholder="напр. 105, 1234..."
                        className="h-14 rounded-2xl border-2 border-slate-100 font-bold focus-visible:ring-primary bg-white px-6 shadow-sm text-lg"
                        value={formData.patrolRef}
                        onChange={(e) => updateData({ patrolRef: e.target.value })}
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="officer" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                        <User className="w-3.5 h-3.5" />
                        Прізвище поліцейського
                    </Label>
                    <Input
                        id="officer"
                        placeholder="Якщо запам'ятали..."
                        className="h-14 rounded-2xl border-2 border-slate-100 font-bold focus-visible:ring-primary bg-white px-6 shadow-sm text-lg"
                        value={formData.officerName}
                        onChange={(e) => updateData({ officerName: e.target.value })}
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="badge" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                        <CreditCard className="w-3.5 h-3.5" />
                        Номер жетона
                    </Label>
                    <Input
                        id="badge"
                        placeholder="0123456"
                        className="h-14 rounded-2xl border-2 border-slate-100 font-black focus-visible:ring-primary bg-white px-6 shadow-sm text-lg tracking-[0.1em]"
                        value={formData.badgeNumber}
                        onChange={(e) => updateData({ badgeNumber: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex gap-4 pt-4 mt-auto">
                <Button variant="ghost" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-400">Назад</Button>
                <Button onClick={handleNext} className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl bg-primary text-secondary hover:bg-primary/90 transition-all">
                    Далі
                </Button>
            </div>
        </div>
    )
}
