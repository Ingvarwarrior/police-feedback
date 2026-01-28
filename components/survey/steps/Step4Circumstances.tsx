'use client'

import React from 'react'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, HelpCircle } from 'lucide-react'

export default function Step4Circumstances() {
    const { setStep, updateData, formData } = useSurveyStore()

    const handleNext = () => setStep(5)
    const handleBack = () => setStep(3)

    // Get today's date in YYYY-MM-DD format for max attribute
    const today = new Date().toISOString().split('T')[0]

    return (
        <div className="space-y-8 h-full flex flex-col justify-center">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                    <div className="w-1.5 h-6 bg-primary" />
                    Обставини
                </h2>
                <p className="text-slate-500 text-sm font-medium px-4 md:px-0">Коли та за яких умов це сталося?</p>
            </div>

            <div className="space-y-6 flex-1 py-4 overflow-y-auto px-1">
                <div className="space-y-3">
                    <Label htmlFor="date" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Дата події
                    </Label>
                    <Input
                        type="date"
                        id="date"
                        max={today}
                        className="h-14 rounded-2xl border-2 border-slate-100 font-bold focus-visible:ring-primary bg-white px-6 shadow-sm"
                        value={formData.interactionDate ?? ''}
                        onChange={(e) => updateData({ interactionDate: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                            <Clock className="w-3.5 h-3.5" />
                            Приблизний час
                        </Label>
                        <Select value={formData.interactionTime} onValueChange={(val) => updateData({ interactionTime: val })}>
                            <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 font-bold bg-white px-6 shadow-sm">
                                <SelectValue placeholder="Оберіть час" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-2 border-slate-100">
                                <SelectItem value="00:00-03:00">🌙 00:00 – 03:00</SelectItem>
                                <SelectItem value="03:00-06:00">🌄 03:00 – 06:00</SelectItem>
                                <SelectItem value="06:00-09:00">🌅 06:00 – 09:00</SelectItem>
                                <SelectItem value="09:00-12:00">☀️ 09:00 – 12:00</SelectItem>
                                <SelectItem value="12:00-15:00">🕐 12:00 – 15:00</SelectItem>
                                <SelectItem value="15:00-18:00">🌤️ 15:00 – 18:00</SelectItem>
                                <SelectItem value="18:00-21:00">🌆 18:00 – 21:00</SelectItem>
                                <SelectItem value="21:00-00:00">🌃 21:00 – 00:00</SelectItem>
                                <SelectItem value="unknown">🤷 Не пам'ятаю</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Тип ситуації
                        </Label>
                        <Select value={formData.incidentType} onValueChange={(val) => updateData({ incidentType: val })}>
                            <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 font-bold bg-white px-6 shadow-sm">
                                <SelectValue placeholder="Причина" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-2 border-slate-100">
                                <SelectItem value="call_102">📞 Виклик 102</SelectItem>
                                <SelectItem value="traffic_stop">🚗 Зупинка авто</SelectItem>
                                <SelectItem value="street">👮 Звернення</SelectItem>
                                <SelectItem value="other">❓ Інше</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                        <Clock className="w-3.5 h-3.5" />
                        Час очікування поліції
                    </Label>
                    <Select value={formData.responseTime} onValueChange={(val: any) => updateData({ responseTime: val })}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 font-bold bg-white px-6 shadow-sm">
                            <SelectValue placeholder="Оцініть час очікування" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-2 border-slate-100">
                            <SelectItem value="under_10">⚡ До 10 хв</SelectItem>
                            <SelectItem value="10_20">⏱️ 10–20 хв</SelectItem>
                            <SelectItem value="20_40">⏳ 20–40 хв</SelectItem>
                            <SelectItem value="over_40">⌛ Понад 40 хв</SelectItem>
                            <SelectItem value="unknown">🤷 Не можу оцінити</SelectItem>
                        </SelectContent>
                    </Select>
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
