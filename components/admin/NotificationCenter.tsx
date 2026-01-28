'use client'

import { useState, useEffect, useRef } from "react"
import { Bell, X, Check, ExternalLink, AlertTriangle, Clock, Info, FileText } from "lucide-react"
import { getNotifications, markAsRead, markAllAsRead, checkStaleReports } from "@/app/admin/(protected)/actions/notificationActions"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { uk } from "date-fns/locale"

import { toast } from "sonner"

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications()
            setNotifications(data)
        } catch (error) {
            console.error("Failed to fetch notifications", error)
        }
    }

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
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const unreadCount = notifications.length

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
