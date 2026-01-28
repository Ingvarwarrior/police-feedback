'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export function LiveClock() {
    const [time, setTime] = useState<string>('')

    useEffect(() => {
        // Set initial time on client to avoid hydration mismatch
        setTime(new Date().toLocaleTimeString('uk-UA'))

        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString('uk-UA'))
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    return (
        <div className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-slate-200 text-xs font-black uppercase tracking-widest">
            <Clock className="w-4 h-4 text-blue-400" />
            {time || '--:--:--'}
        </div>
    )
}
