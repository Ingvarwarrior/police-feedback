'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, LayoutDashboard, FileText, Users, Settings, LogOut, ShieldCheck, Map as MapIcon, Activity } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface MobileNavProps {
    user: {
        email: string | null
        firstName: string | null
        lastName: string | null
        role: string
        permManageUsers: boolean
        permViewAudit: boolean
        permManageSettings: boolean
        permManageMailAlerts: boolean
    }
}

export default function MobileNav({ user }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    const displayName = user.firstName || user.lastName
        ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
        : user.email?.split('@')[0] || 'Admin'

    const navItems = [
        { href: "/admin/dashboard", label: "Дашборд", icon: LayoutDashboard },
        { href: "/admin/analytics", label: "Аналітика", icon: Activity },
        { href: "/admin/reports", label: "Відгуки громадян", icon: FileText },
        { href: "/admin/map", label: "Мапа", icon: MapIcon },
        { href: "/admin/citizens", label: "Громадяни", icon: Users },
        { href: "/admin/officers", label: "Особовий склад", icon: ShieldCheck },
        {
            href: "/admin/users",
            label: "Користувачі",
            icon: Users,
            permission: user.role === 'ADMIN' || user.permManageUsers
        },
        {
            href: "/admin/audit",
            label: "Аудит",
            icon: Activity,
            permission: user.role === 'ADMIN' || user.permViewAudit
        },
        {
            href: "/admin/settings",
            label: "Налаштування",
            icon: Settings,
            permission: user.role === 'ADMIN' || user.permManageSettings
        },
        {
            href: "/admin/mail-alerts",
            label: "Сповіщення",
            icon: ShieldCheck,
            permission: user.role === 'ADMIN' || user.permManageMailAlerts
        },
        { href: "/admin/profile", label: "Мій профіль", icon: Settings },
    ]

    return (
        <>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="hover:bg-slate-800">
                <Menu className="w-6 h-6 text-yellow-400" />
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900 md:hidden flex flex-col">
                    <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 shadow-xl">
                        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-tighter italic text-white">
                            <span className="text-blue-100">Меню керування</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    <nav className="flex-1 p-6 space-y-4 overflow-y-auto">
                        {navItems.filter(item => item.permission !== false).map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${pathname === item.href
                                    ? 'bg-gradient-to-r from-blue-900/50 to-slate-800 border border-blue-500/30 text-yellow-400 shadow-lg shadow-blue-900/20'
                                    : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'}`}
                            >
                                <item.icon className={`w-5 h-5 ${pathname === item.href ? 'text-yellow-400' : 'text-slate-500'}`} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="p-6 border-t border-slate-800 bg-slate-900">
                        <div className="mb-6 px-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Користувач</p>
                            <p className="font-bold text-white truncate">{displayName}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{user.role}</p>
                        </div>
                        <Button
                            variant="destructive"
                            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest gap-3 shadow-lg shadow-red-200"
                            onClick={() => signOut({ callbackUrl: "/admin/login" })}
                        >
                            <LogOut className="w-5 h-5" />
                            Вийти з системи
                        </Button>
                    </div>
                </div>
            )}
        </>
    )
}
