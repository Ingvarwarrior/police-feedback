'use client'

import { useState, useEffect, useRef, type MutableRefObject } from "react"
import { Bell, Check, ExternalLink, AlertTriangle, Clock, Info, FileText, Volume2, VolumeX, Smartphone, Loader2 } from "lucide-react"
import { getNotifications, markAsRead, markAllAsRead, checkStaleReports } from "@/app/admin/(protected)/actions/notificationActions"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { uk } from "date-fns/locale"

import { toast } from "sonner"

const SOUND_PREF_KEY = "pf:notification-center:sound-enabled"

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

function triggerNotificationTone(audioCtxRef: MutableRefObject<AudioContext | null>) {
    try {
        const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextConstructor) return

        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContextConstructor()
        }

        const ctx = audioCtxRef.current
        if (ctx.state === "suspended") {
            void ctx.resume()
        }

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = "triangle"
        osc.frequency.setValueAtTime(660, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.08)
        gain.gain.setValueAtTime(0.0001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28)
        osc.start()
        osc.stop(ctx.currentTime + 0.28)
    } catch (error) {
        console.error("Notification sound failed", error)
    }
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [soundEnabled, setSoundEnabled] = useState(false)
    const [pushSupported, setPushSupported] = useState(false)
    const [pushConfigured, setPushConfigured] = useState(true)
    const [pushEnabled, setPushEnabled] = useState(false)
    const [pushLoading, setPushLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const initializedRef = useRef(false)
    const knownIdsRef = useRef<Set<string>>(new Set())
    const audioCtxRef = useRef<AudioContext | null>(null)
    const soundEnabledRef = useRef(false)
    const pushEnabledRef = useRef(false)

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications()
            setNotifications(data)

            const newItems = data.filter((item: any) => !knownIdsRef.current.has(item.id))
            knownIdsRef.current = new Set(data.map((item: any) => item.id))

            if (initializedRef.current && newItems.length > 0) {
                const latest = newItems[0]
                if (soundEnabledRef.current) {
                    triggerNotificationTone(audioCtxRef)
                    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                        navigator.vibrate([180, 80, 180])
                    }
                }

                if (
                    document.visibilityState === "hidden" &&
                    !pushEnabledRef.current &&
                    typeof Notification !== "undefined" &&
                    Notification.permission === "granted"
                ) {
                    new Notification(latest?.title || "Нове сповіщення", {
                        body: latest?.message || "",
                        icon: "/icon-192.png",
                        tag: `in-app-${latest?.id || Date.now()}`,
                    })
                }

                toast.info(newItems.length > 1 ? `Нових сповіщень: ${newItems.length}` : "Нове сповіщення", {
                    description: latest?.title || latest?.message || "Оновіть список подій",
                })
            }
            initializedRef.current = true
        } catch (error) {
            console.error("Failed to fetch notifications", error)
        }
    }

    useEffect(() => {
        const fromStorage = localStorage.getItem(SOUND_PREF_KEY)
        if (fromStorage === "1") {
            setSoundEnabled(true)
        }
    }, [])

    useEffect(() => {
        localStorage.setItem(SOUND_PREF_KEY, soundEnabled ? "1" : "0")
    }, [soundEnabled])

    useEffect(() => {
        soundEnabledRef.current = soundEnabled
    }, [soundEnabled])

    useEffect(() => {
        pushEnabledRef.current = pushEnabled
    }, [pushEnabled])

    useEffect(() => {
        fetchNotifications()
        // Check for stale reports once on mount
        checkStaleReports()

        // Refresh every 30 seconds
        const interval = setInterval(() => {
            fetchNotifications()
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!soundEnabled) return

        const unlockAudio = () => {
            const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext
            if (!AudioContextConstructor) return

            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContextConstructor()
            }

            if (audioCtxRef.current.state === "suspended") {
                void audioCtxRef.current.resume()
            }
        }

        window.addEventListener("pointerdown", unlockAudio, { passive: true })
        window.addEventListener("keydown", unlockAudio)

        return () => {
            window.removeEventListener("pointerdown", unlockAudio)
            window.removeEventListener("keydown", unlockAudio)
        }
    }, [soundEnabled])

    useEffect(() => {
        if (typeof window === "undefined") return

        const supported =
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            typeof Notification !== "undefined"

        setPushSupported(supported)
        if (!supported) return

        let cancelled = false

        const initPush = async () => {
            try {
                const keyRes = await fetch("/api/admin/push/vapid-public-key", { cache: "no-store" })
                const keyPayload = await keyRes.json().catch(() => ({} as any))
                const configured = keyRes.ok && keyPayload?.configured !== false && Boolean(keyPayload?.publicKey)

                if (!cancelled) {
                    setPushConfigured(configured)
                }
                if (!configured) {
                    if (!cancelled) {
                        setPushEnabled(false)
                    }
                    return
                }

                const registration = await navigator.serviceWorker.register("/sw.js")
                const existing = await registration.pushManager.getSubscription()
                if (!cancelled) {
                    setPushEnabled(Boolean(existing))
                }
            } catch (error) {
                console.error("Service worker registration failed", error)
            }
        }

        void initPush()

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const unreadCount = notifications.length

    const handleToggleSound = () => {
        setSoundEnabled((prev) => !prev)
        if (!soundEnabled) {
            triggerNotificationTone(audioCtxRef)
        }
    }

    const handleEnablePush = async () => {
        if (!pushSupported || pushLoading) return
        setPushLoading(true)
        try {
            const permission = Notification.permission === "granted"
                ? "granted"
                : await Notification.requestPermission()

            if (permission !== "granted") {
                toast.error("Дозвіл на push-сповіщення не надано")
                return
            }

            const keyRes = await fetch("/api/admin/push/vapid-public-key", { cache: "no-store" })
            const keyPayload = await keyRes.json().catch(() => ({} as any))

            const configured = keyRes.ok && keyPayload?.configured !== false && Boolean(keyPayload?.publicKey)
            if (!configured) {
                setPushConfigured(false)
                setPushEnabled(false)
                toast.info("Push-сповіщення недоступні: серверні ключі не налаштовані")
                return
            }
            setPushConfigured(true)
            const publicKey = keyPayload.publicKey as string

            const registration = await navigator.serviceWorker.register("/sw.js")
            let subscription = await registration.pushManager.getSubscription()

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey),
                })
            }

            const subscribeRes = await fetch("/api/admin/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription.toJSON()),
            })

            if (!subscribeRes.ok) {
                const payload = await subscribeRes.json().catch(() => ({ error: "" }))
                throw new Error(payload?.error || "Не вдалося активувати push")
            }

            setPushEnabled(true)
            toast.success("Push-сповіщення увімкнено")
        } catch (error: any) {
            const message = String(error?.message || "")
            if (message.includes("WEB_PUSH keys are not configured")) {
                setPushConfigured(false)
                setPushEnabled(false)
                toast.info("Push-сповіщення недоступні: серверні ключі не налаштовані")
                return
            }
            toast.error(message || "Не вдалося увімкнути push-сповіщення")
        } finally {
            setPushLoading(false)
        }
    }

    const handleDisablePush = async () => {
        if (!pushSupported || pushLoading) return
        setPushLoading(true)
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            if (subscription) {
                await fetch("/api/admin/push/unsubscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                })
                await subscription.unsubscribe()
            }
            setPushEnabled(false)
            toast.success("Push-сповіщення вимкнено")
        } catch (error) {
            toast.error("Не вдалося вимкнути push-сповіщення")
        } finally {
            setPushLoading(false)
        }
    }

    const handleMarkAll = async () => {
        if (isLoading) return
        setIsLoading(true)

        const promise = markAllAsRead()

        toast.promise(promise, {
            loading: 'Очищення списку...',
            success: 'Всі сповіщення прочитано',
            error: 'Помилка оновлення'
        })

        try {
            await promise
            setNotifications([])
            setIsOpen(false)
        } catch (error) {
            // Error handled by toast
        } finally {
            setIsLoading(false)
        }
    }

    const handleMarkOne = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        e.preventDefault()

        try {
            await markAsRead(id)
            setNotifications(prev => prev.filter(n => n.id !== id))
        } catch (error) {
            toast.error("Не вдалося позначити як прочитане")
        }
    }

    const handleNotifyClick = async (n: any) => {
        if (n.id.startsWith('diag-')) return;

        try {
            await markAsRead(n.id)
            setNotifications(prev => prev.filter(item => item.id !== n.id))
            setIsOpen(false)
        } catch (error) {
            console.error("Failed to mark as read", error)
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-2xl transition-all duration-300 ${isOpen ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/50'}`}
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-tada' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-4 ring-slate-900 shadow-lg border border-white/10 scale-110">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/80 z-[100] overflow-hidden backdrop-blur-2xl ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-200 fixed inset-x-4 top-20 w-auto sm:absolute sm:right-0 sm:top-auto sm:mt-4 sm:w-[380px] sm:inset-auto sm:origin-top-right">
                    <div className="p-6 border-b border-white/10 bg-gradient-to-br from-slate-800/50 to-transparent flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-black uppercase text-xs tracking-widest italic">Повідомлення</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{unreadCount} нових подій</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleToggleSound}
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${soundEnabled
                                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                        : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                                        }`}
                                >
                                    {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                                    {soundEnabled ? "Звук: ON" : "Звук: OFF"}
                                </button>
                                <button
                                    type="button"
                                    onClick={pushEnabled ? handleDisablePush : handleEnablePush}
                                    disabled={!pushSupported || !pushConfigured || pushLoading}
                                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ${pushEnabled
                                        ? "border-blue-500/40 bg-blue-500/20 text-blue-300"
                                        : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                                        }`}
                                >
                                    {pushLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
                                    {pushEnabled ? "Push: ON" : (pushConfigured ? "Push: OFF" : "Push: N/A")}
                                </button>
                            </div>
                            {!pushSupported ? (
                                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                                    Цей браузер не підтримує Web Push
                                </p>
                            ) : !pushConfigured ? (
                                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                                    Web Push недоступний: на сервері не налаштовані VAPID ключі
                                </p>
                            ) : null}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAll}
                                disabled={isLoading}
                                className="text-[10px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 border-b-4 border-amber-700"
                            >
                                <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                Відмітити всі прочитаними
                            </button>
                        )}
                    </div>

                    <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                        {notifications.length === 0 ? (
                            <div className="p-8 sm:p-12 text-center flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-white/5">
                                    <Bell className="w-8 h-8 text-slate-600" />
                                </div>
                                <p className="text-slate-500 font-bold text-sm">Все опрацьовано. <br /><span className="text-[10px] uppercase font-black opacity-50">Немає нових сповіщень</span></p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((n) => {
                                    const Content = (
                                        <div className="flex gap-4">
                                            <div className={`mt-1 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border border-white/10 ${n.priority === 'URGENT' ? 'bg-red-500/20 text-red-400' : n.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {n.type === 'CRITICAL_RATING' ? <AlertTriangle className="w-5 h-5" /> : n.type === 'STALE_REPORT' ? <Clock className="w-5 h-5" /> : n.type === 'NEW_REPORT' ? <FileText className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-white font-black text-[11px] uppercase tracking-wide leading-tight">{n.title}</span>
                                                </div>
                                                <p className="text-slate-400 text-xs font-medium leading-relaxed">{n.message}</p>
                                                <div className="flex items-center justify-between pt-3">
                                                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">
                                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: uk })}
                                                    </span>
                                                    {n.link && (
                                                        <span className="text-[9px] font-black uppercase text-primary flex items-center gap-1 group-hover:underline tracking-widest">
                                                            Детальніше <ExternalLink className="w-2.5 h-2.5" />
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleMarkOne(e, n.id)}
                                                        className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-400 hover:text-white transition-all py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 active:scale-90 relative z-10"
                                                    >
                                                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                                        Прочитано
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )

                                    return (
                                        <div key={n.id} className="relative group">
                                            {n.link ? (
                                                <Link
                                                    href={n.link}
                                                    onClick={() => handleNotifyClick(n)}
                                                    className="block p-5 hover:bg-white/5 transition-all duration-300"
                                                >
                                                    {Content}
                                                </Link>
                                            ) : (
                                                <div className="p-5">
                                                    {Content}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-800/20 border-t border-white/5 text-center">
                        <Link
                            href="/admin/audit"
                            onClick={() => setIsOpen(false)}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                        >
                            Всі події в журналі аудиту
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
