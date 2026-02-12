'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function StarRating({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) {
    return (
        <div className="space-y-4">
            <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 block ml-1">{label}</Label>
            <div className="flex gap-2 sm:gap-4" role="radiogroup" aria-label={label}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                        key={star}
                        type="button"
                        whileHover={{ y: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onChange(star)}
                        role="radio"
                        aria-checked={value === star}
                        aria-label={`${label}: ${star} з 5`}
                        title={`${star} з 5`}
                        className={cn(
                            "flex-1 h-14 sm:h-16 rounded-2xl flex items-center justify-center transition-all border-2 shadow-sm relative overflow-hidden",
                            value >= star
                                ? "bg-primary border-primary text-secondary shadow-lg shadow-primary/20"
                                : "bg-white border-slate-100 text-slate-200 hover:border-primary/20"
                        )}
                    >
                        <Star className={cn("w-7 h-7 sm:w-8 sm:h-8 transition-all", value >= star ? "fill-current" : "")} />
                    </motion.button>
                ))}
            </div>
        </div>
    )
}

export default function Step7Ratings() {
    const { setStep, updateData, formData } = useSurveyStore()

    const handleNext = () => {
        const { politeness, professionalism, effectiveness, overall } = formData.ratings
        if (!politeness || !professionalism || !effectiveness || !overall) {
            toast.error("Будь ласка, оцініть всі пункти")
            return
        }
        setStep(8)
    }
    const handleBack = () => setStep(6)

    const updateRating = (field: keyof typeof formData.ratings, value: number) => {
        updateData({
            ratings: {
                ...formData.ratings,
                [field]: value
            }
        })
    }

    return (
        <div className="space-y-8 h-full flex flex-col justify-center">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3 italic uppercase">
                    <div className="w-1.5 h-6 bg-primary" />
                    Ваша оцінка
                </h2>
                <p className="text-slate-500 font-medium tracking-tight text-sm">Оцініть кожен пункт. 1 - дуже погано, 5 - відмінно.</p>
            </div>

            <div className="space-y-6 flex-1 py-4">
                <StarRating
                    label="Ввічливість та коректність"
                    value={formData.ratings.politeness}
                    onChange={(v) => updateRating('politeness', v)}
                />
                <StarRating
                    label="Професійність / Компетентність"
                    value={formData.ratings.professionalism}
                    onChange={(v) => updateRating('professionalism', v)}
                />
                <StarRating
                    label="Ефективність вирішення"
                    value={formData.ratings.effectiveness}
                    onChange={(v) => updateRating('effectiveness', v)}
                />
                <div className="pt-6 border-t border-slate-100">
                    <StarRating
                        label="Загальне враження"
                        value={formData.ratings.overall}
                        onChange={(v) => updateRating('overall', v)}
                    />
                </div>
            </div>

            <div className="flex gap-4 pt-4 mt-auto">
                <Button variant="ghost" onClick={handleBack} className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs text-slate-400">Назад</Button>
                <Button onClick={handleNext} className="flex-[2] h-14 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs shadow-xl bg-primary text-secondary hover:bg-primary/90 transition-all">
                    Далі
                </Button>
            </div>
        </div>
    )
}
