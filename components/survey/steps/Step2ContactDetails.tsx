'use client'

import React from 'react'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, User } from 'lucide-react'
import { toast } from 'sonner'

export default function Step2ContactDetails() {
    const { setStep, updateData, formData } = useSurveyStore()

    const handleNext = () => {
        if (!formData.contactPhone || formData.contactPhone.length < 5) {
            toast.error("Будь ласка, вкажіть контактний номер телефону")
            return
        }
        setStep(3)
    }

    const handlePhoneChange = (val: string) => {
        let normalized = val
        if (val.startsWith('0') && val.length >= 10) {
            normalized = '+38' + val
        }
        updateData({ contactPhone: normalized })
    }

    const handleBack = () => setStep(1)

    return (
        <div className="space-y-8 h-full flex flex-col justify-center">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                    <div className="w-1.5 h-6 bg-primary" />
                    Ваші контакти
                </h2>
                <p className="text-slate-500 text-sm font-medium px-4 md:px-0">Ми зв'яжемося з вами лише за потреби уточнити деталі.</p>
            </div>

            <div className="space-y-6 flex-1 py-4">
                <div className="space-y-3">
                    <Label htmlFor="cname" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                        <User className="w-3.5 h-3.5" />
                        Як до вас звертатися?
                    </Label>
                    <Input
                        id="cname"
                        placeholder="Ваше ім'я"
                        className="h-14 rounded-2xl border-2 border-slate-100 font-bold focus-visible:ring-primary bg-white px-6 shadow-sm text-lg"
                        value={formData.contactName}
                        onChange={(e) => updateData({ contactName: e.target.value })}
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="cphone" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-2">
                        <Phone className="w-3.5 h-3.5" />
                        Номер телефону <span className="text-primary">*</span>
                    </Label>
                    <Input
                        id="cphone"
                        type="tel"
                        placeholder="+380..."
                        className="h-14 rounded-2xl border-2 border-slate-100 font-black focus-visible:ring-primary bg-white px-6 shadow-sm text-lg tracking-wider"
                        value={formData.contactPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onBlur={() => handlePhoneChange(formData.contactPhone)}
                    />
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                            Ці дані будуть доступні лише адміністрації для зворотного зв'язку.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-4 mt-auto">
                <Button variant="ghost" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-400">Назад</Button>
                <Button
                    onClick={handleNext}
                    className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl bg-primary text-secondary hover:bg-primary/90 transition-all"
                >
                    Далі
                </Button>
            </div>
        </div>
    )
}
