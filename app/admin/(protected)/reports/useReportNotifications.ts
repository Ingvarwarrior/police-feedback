"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

type RouterLike = {
    refresh: () => void
}

function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContext) return

        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = "sine"
        osc.frequency.setValueAtTime(500, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1)

        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

        osc.start()
        osc.stop(ctx.currentTime + 0.5)
    } catch (error) {
        console.error("Audio play failed", error)
    }
}

export function useReportNotifications(enabled: boolean, router: RouterLike) {
    const lastCountRef = useRef<number | null>(null)

    useEffect(() => {
        if (!enabled) return

        const checkNewReports = async () => {
            try {
                const res = await fetch("/api/admin/reports/stats")
                if (!res.ok) return

                const data = await res.json()
                if (lastCountRef.current === null) {
                    lastCountRef.current = data.count
                    return
                }

                if (data.count > lastCountRef.current) {
                    playNotificationSound()
                    toast.info("🔔 Новий звіт!", {
                        description: "Список оновлено автоматично",
                        action: {
                            label: "Оновити",
                            onClick: () => router.refresh(),
                        },
                    })
                    router.refresh()
                }

                lastCountRef.current = data.count
            } catch (error) {
                console.error("Polling error", error)
            }
        }

        const interval = setInterval(checkNewReports, 30000)
        void checkNewReports()

        return () => clearInterval(interval)
    }, [enabled, router])
}

