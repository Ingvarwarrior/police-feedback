'use client'

import React from 'react'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { UserX, MessageSquareText, ShieldCheck } from 'lucide-react'

export default function Step1ContactPref() {
    const { setStep, updateData, formData } = useSurveyStore()

    const handleNext = () => {
        if (formData.wantContact) {
            setStep(2)
        } else {
            setStep(3)
        }
    }

    const handleBack = () => setStep(0)

    return (
        <div className="space-y-10 h-full flex flex-col justify-center">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                    <div className="w-1.5 h-6 bg-primary" />
                    Формат відгуку
                </h2>
                <p className="text-slate-500 text-sm font-medium px-4 md:px-0">
                    Чи потрібно з вами зв'язатися для уточнення деталей?
                </p>
            </div>

            <RadioGroup
                value={formData.wantContact ? 'yes' : 'no'}
                onValueChange={(val) => updateData({ wantContact: val === 'yes' })}
                aria-label="Формат подання відгуку"
                className="grid gap-4 flex-1 py-4"
            >
                <Label
                    htmlFor="opt-no"
                    className={`flex items-center gap-5 p-6 rounded-[2rem] border-2 transition-all cursor-pointer group ${!formData.wantContact ? 'border-primary bg-primary shadow-2xl shadow-primary/20 scale-[1.02] text-white' : 'border-slate-100 bg-slate-50 hover:border-primary/20'}`}
                >
                    <RadioGroupItem value="no" id="opt-no" className="sr-only" />
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${!formData.wantContact ? 'bg-secondary text-primary shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                        <UserX className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                        <p className={`font-black uppercase tracking-tight text-lg ${!formData.wantContact ? 'text-secondary' : 'text-slate-900'}`}>
                            Анонімно
                        </p>
                        <p className={`text-xs font-bold leading-tight mt-0.5 ${!formData.wantContact ? 'text-white/80' : 'text-slate-400'}`}>
                            Без персональних даних
                        </p>
                    </div>
                </Label>

                <Label
                    htmlFor="opt-yes"
                    className={`flex items-center gap-5 p-6 rounded-[2rem] border-2 transition-all cursor-pointer group ${formData.wantContact ? 'border-primary bg-primary shadow-2xl shadow-primary/20 scale-[1.02] text-white' : 'border-slate-100 bg-slate-50 hover:border-primary/20'}`}
                >
                    <RadioGroupItem value="yes" id="opt-yes" className="sr-only" />
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${formData.wantContact ? 'bg-secondary text-primary shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                        <MessageSquareText className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                        <p className={`font-black uppercase tracking-tight text-lg ${formData.wantContact ? 'text-secondary' : 'text-slate-900'}`}>
                            Зі зв'язком
                        </p>
                        <p className={`text-xs font-bold leading-tight mt-0.5 ${formData.wantContact ? 'text-white/80' : 'text-slate-400'}`}>
                            Залишу номер для уточнень
                        </p>
                    </div>
                </Label>
            </RadioGroup>

            <div className="flex gap-4 pt-4 mt-auto">
                <Button variant="ghost" onClick={handleBack} className="flex-1 h-14 rounded-2xl text-slate-400 font-bold uppercase tracking-widest text-xs">Назад</Button>
                <Button onClick={handleNext} className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl bg-primary text-secondary hover:bg-primary/90 transition-all">
                    Далі
                </Button>
            </div>
        </div>
    )
}
