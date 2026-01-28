'use client'

import React, { useState } from 'react'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function Step8Comment() {
    const { setStep, updateData, formData } = useSurveyStore()
    const [submitting, setSubmitting] = useState(false)

    const handleBack = () => setStep(7)

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const res = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Submission failed')
            }

            setStep(9)
        } catch (err: any) {
            toast.error(err.message || "Помилка при надсиланні. Спробуйте ще раз.")
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-8 h-full flex flex-col justify-center">
            <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                    <div className="w-1.5 h-6 bg-primary" />
                    Зауваження та пропозиції
                </h2>
                <p className="text-slate-500 font-medium tracking-tight text-sm px-4 md:px-0">Будь ласка, опишіть ситуацію детальніше, якщо це необхідно.</p>
            </div>

            <div className="space-y-4 flex-1">
                <div className="bg-slate-50 rounded-[2.5rem] p-4 md:p-8 border border-slate-100 shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-30" />
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 block px-4">Деталі взаємодії</Label>
                    <Textarea
                        placeholder="Опишіть, що саме сталося..."
                        className="min-h-[250px] md:min-h-[300px] border-none bg-transparent font-medium text-slate-700 focus-visible:ring-0 resize-none text-lg p-4 placeholder:text-slate-300"
                        maxLength={1000}
                        value={formData.comment}
                        onChange={(e) => updateData({ comment: e.target.value })}
                    />
                    <div className="flex justify-between items-center px-4 pt-4 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Макс. 1000 символів</span>
                        <span className={`text-[10px] font-black tracking-widest ${formData.comment.length > 900 ? 'text-rose-500' : 'text-primary'}`}>
                            {formData.comment.length}/1000
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-4 mt-auto">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={submitting}
                    className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-400"
                >
                    Назад
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl bg-primary text-secondary hover:bg-primary/90 gap-3 transition-all active:scale-[0.98]"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Надсилаємо...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Завершити
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
