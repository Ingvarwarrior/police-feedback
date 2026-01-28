'use client'

import React, { useEffect } from 'react'
import { useSurveyStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Home, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Step9Finish() {
    const { resetSurvey } = useSurveyStore()

    const handleRestart = () => {
        resetSurvey()
    }

    return (
        <div className="text-center py-12 space-y-12 h-full flex flex-col justify-center">
            <div className="flex justify-center relative">
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="bg-primary p-8 rounded-[3rem] shadow-2xl relative z-10 border border-white/10"
                >
                    <CheckCircle2 className="w-20 h-20 text-secondary" />
                    <div className="absolute -bottom-2 -right-2 bg-secondary text-primary p-2 rounded-full shadow-lg">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </motion.div>
                <div className="absolute inset-0 bg-secondary/20 blur-[100px] animate-pulse rounded-full" />
            </div>

            <div className="space-y-4">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase italic">Дякуємо!</h2>
                <div className="h-1 w-12 bg-secondary mx-auto rounded-full" />
                <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-sm mx-auto">
                    Ваш відгук успішно надіслано. Ваша думка допомагає нам бути прозорими та ефективними.
                </p>
            </div>

            <div className="grid gap-4 max-w-xs mx-auto pt-8">
                <Link href="/">
                    <Button
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs gap-3 bg-primary text-secondary shadow-xl shadow-primary/20"
                        onClick={handleRestart}
                    >
                        <Home className="w-5 h-5" />
                        На головну
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    onClick={handleRestart}
                    className="h-10 text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] hover:text-primary gap-2"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Заповнити ще один відгук
                </Button>
            </div>

            <div className="pt-12">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                    Служити та захищати
                </p>
            </div>
        </div>
    )
}

import { ShieldCheck } from 'lucide-react'
