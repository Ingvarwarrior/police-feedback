'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export function LiveClock() {
    const [time, setTime] = useState<string>('')

    useEffect(() => {
        const syncTime = () => {
            setTime(new Date().toLocaleTimeString('uk-UA'))
        }

        syncTime()

        let timer = window.setInterval(syncTime, 1000)

        const restartTimer = () => {
            if (document.visibilityState === 'hidden') return
            window.clearInterval(timer)
            syncTime()
            timer = window.setInterval(syncTime, 1000)
        }

        window.addEventListener('focus', restartTimer)
        window.addEventListener('pageshow', restartTimer)
        document.addEventListener('visibilitychange', restartTimer)

        return () => {
            window.clearInterval(timer)
            window.removeEventListener('focus', restartTimer)
            window.removeEventListener('pageshow', restartTimer)
            document.removeEventListener('visibilitychange', restartTimer)
        }
    }, [])

    return (
        <div className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-slate-200 text-xs font-black uppercase tracking-widest">
            <Clock className="w-4 h-4 text-blue-400" />
            {time || '--:--:--'}
        </div>
    )
}
