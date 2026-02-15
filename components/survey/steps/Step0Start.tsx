'use client'

import React from 'react'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Info, ArrowRight } from 'lucide-react'

interface Step0StartProps {
    unitName?: string
    emergencyPhone?: string
    welcomeMessage?: string
    unitAddress?: string
}

export default function Step0Start({
    unitName,
    emergencyPhone,
    welcomeMessage,
    unitAddress,
}: Step0StartProps) {
    const { setStep, updateData, formData } = useSurveyStore()
    const unitNameToShow = unitName || process.env.NEXT_PUBLIC_SURVEY_UNIT_NAME || 'Патрульна поліція'
    const emergencyPhoneToShow = emergencyPhone || '102'
    const welcomeMessageToShow = welcomeMessage || 'Це опитування допомагає нам покращити роботу поліції.'

    const handleNext = () => {
        if (formData.hasConsent) {
            setStep(1)
        }
    }

    return (
        <div className="space-y-10 flex flex-col items-center">
            <div className="text-center space-y-4 w-full">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-primary text-secondary rounded-[2rem] mb-2 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                    <ShieldCheck className="w-12 h-12 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tighter text-slate-900 uppercase italic">
                        Громадський <span className="text-primary tracking-normal">Контроль</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">
                        {unitNameToShow}
                    </p>
                    {unitAddress ? (
                        <p className="text-[11px] text-slate-500 font-medium">{unitAddress}</p>
                    ) : null}
                </div>
            </div>

            <div className="w-full p-4 md:p-8 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-200 shadow-inner space-y-6">
                <div className="flex flex-col md:flex-row gap-5">
                    <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg">
                        <Info className="w-5 h-5" />
                    </div>
                    <div className="leading-relaxed text-sm text-slate-600">
                        <p className="mb-4 font-semibold text-slate-800 border-l-4 border-secondary pl-4">
                            {welcomeMessageToShow}
                        </p>
                        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm mb-6 bg-[url('https://www.transparenttextures.com/patterns/back-lining.png')]">
                            <p className="text-rose-600 font-extrabold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                                Увага
                            </p>
                            <p className="text-[13px] leading-snug">
                                Це не є заявою про злочин. В екстрених ситуаціях негайно телефонуйте <span className="text-rose-600 font-black underline decoration-rose-200 underline-offset-4">{emergencyPhoneToShow}</span>.
                            </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-200/50">
                            <p className="font-black text-primary text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-4 h-0.5 bg-secondary" />
                                Офіційні канали звернення
                            </p>
                            <div className="grid grid-cols-1 gap-3 text-[13px]">
                                {[
                                    { label: 'Електронне звернення', name: 'Електронне звернення НПУ', url: 'https://npu.gov.ua/onlajn-zvernennya' },
                                    { label: 'Електронне звернення', name: 'Електронне звернення МВС', url: 'https://mvs.gov.ua/work-with-citizens/elektronni-zvernennya-gromadyan' },
                                    { label: 'Електронне звернення', name: 'Електронне звернення Департамент патрульної поліції', url: 'https://patrolpolice.gov.ua/zapit/' },
                                    { label: 'Урядовий контактний центр', name: 'Урядовий контактний центр', url: 'https://ukc.gov.ua/appeal/' }
                                ].map(link => (
                                    <a
                                        key={link.name}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border-2 border-slate-50 hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all group shadow-sm"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary/50 transition-colors">{link.label}</span>
                                            <span className="font-extrabold text-slate-900 group-hover:text-primary transition-colors">{link.name}</span>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-secondary group-hover:translate-x-1 transition-transform" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-6">
                <div
                    className={`flex items-start space-x-4 p-4 md:p-6 rounded-3xl border-2 transition-all select-none group ${formData.hasConsent ? 'bg-primary/5 border-primary shadow-lg ring-4 ring-primary/5' : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                    <Checkbox
                        id="consent"
                        checked={formData.hasConsent}
                        onCheckedChange={(checked) => updateData({ hasConsent: checked === true })}
                        aria-describedby="consent-note"
                        className="mt-1 translate-y-0.5 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors group-hover:border-primary"
                    />
                    <Label
                        htmlFor="consent"
                        id="consent-note"
                        className="text-xs font-bold text-slate-600 leading-relaxed cursor-pointer flex-1 py-1 group-hover:text-slate-900 transition-colors"
                    >
                        Я ознайомився з інформацією вище та погоджуюся на обробку персональних даних для покращення роботи поліції.
                    </Label>
                </div>
            </div>

            <Button
                className="w-full h-16 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 group bg-primary hover:bg-primary/90 text-secondary"
                size="lg"
                disabled={!formData.hasConsent}
                onClick={handleNext}
            >
                Розпочати
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform shadow-2xl" />
            </Button>
        </div>
    )
}
