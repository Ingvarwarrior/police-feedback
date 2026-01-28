'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSurveyStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Toaster } from 'sonner'
import { ChevronLeft } from 'lucide-react'

// Step Components
import Step0Start from './steps/Step0Start'
import Step1ContactPref from './steps/Step1ContactPref'
import Step2ContactDetails from './steps/Step2ContactDetails'
import Step3Location from './steps/Step3Location'
import Step4Circumstances from './steps/Step4Circumstances'
import Step5Patrol from './steps/Step5Patrol'
import Step6Photos from './steps/Step6Photos'
import Step7Ratings from './steps/Step7Ratings'
import Step8Comment from './steps/Step8Comment'
import Step9Finish from './steps/Step9Finish'

import { AnimatePresence, motion } from 'framer-motion'

const STEPS_COUNT = 9

import { generateId } from '@/lib/utils'

export default function SurveyWizard() {
    const { currentStep, setClientGeneratedId, formData } = useSurveyStore()
    const [mounted, setMounted] = React.useState(false)

    useEffect(() => {
        setMounted(true)
        if (!formData.clientGeneratedId) {
            setClientGeneratedId(generateId())
        }
    }, [formData.clientGeneratedId, setClientGeneratedId])

    useEffect(() => {
        if (mounted) {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [currentStep, mounted])

    if (!mounted) return null

    const renderStep = () => {
        switch (currentStep) {
            case 0: return <Step0Start />
            case 1: return <Step1ContactPref />
            case 2: return <Step2ContactDetails />
            case 3: return <Step3Location />
            case 4: return <Step4Circumstances />
            case 5: return <Step5Patrol />
            case 6: return <Step6Photos />
            case 7: return <Step7Ratings />
            case 8: return <Step8Comment />
            case 9: return <Step9Finish />
            default: return <div>Unknown step</div>
        }
    }

    const progress = ((currentStep) / (STEPS_COUNT)) * 100

    return (
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto md:px-4">
            {/* Branded Header Area */}
            {currentStep < 9 && (

                <div className="sticky top-0 z-30 bg-primary/95 backdrop-blur-sm pt-2 pb-2 px-4 border-b border-white/10 md:rounded-t-[2.5rem] md:mt-4 shadow-2xl">
                    {/* Compact Branding Header */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                        <Link href="/" className="flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
                            <Image src="/emblem.jpg" alt="Logo" width={32} height={40} className="w-8 h-auto" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Патрульна поліція</span>
                                <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest leading-none">Хмільницький район</span>
                            </div>
                        </Link>
                        {currentStep > 0 && (
                            <div className="bg-white/10 rounded-full px-3 py-1 text-[10px] font-bold text-white/80">
                                Крок {currentStep + 1}/{STEPS_COUNT}
                            </div>
                        )}
                    </div>
                    {/* Progress Bar Row */}
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            {/* Replaced by top header info */}
                        </div>
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{Math.round(progress)}% Виконано</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-secondary shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "circOut" }}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col bg-white md:rounded-b-[2.5rem] shadow-2xl overflow-hidden min-h-[calc(100dvh-10rem)] md:min-h-[600px] transition-all duration-500">
                <div className="flex-1 p-2 sm:p-6 md:p-12">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="h-full"
                        >
                            {renderStep()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <Toaster position="top-right" expand={true} richColors />
        </div>
    )
}
