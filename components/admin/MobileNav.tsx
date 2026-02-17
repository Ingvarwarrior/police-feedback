'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, LayoutDashboard, FileText, Users, Settings, LogOut, ShieldCheck, Map as MapIcon, Activity, ClipboardList, PhoneCall, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import { ThemeToggle } from "@/components/ThemeToggle"

interface MobileNavProps {
    user: {
        email: string | null
        firstName: string | null
        lastName: string | null
        role: string
        permViewReports: boolean
        permViewUnifiedRecords: boolean
        permViewAnalytics: boolean
        permViewMap: boolean
        permViewOfficerStats: boolean
        permCreateOfficers: boolean
        permEditOfficers: boolean
        permDeleteOfficers: boolean
        permCreateEvaluations: boolean
        permManageOfficerStatus: boolean
        permManageUsers: boolean
        permViewUsers: boolean
        permViewAudit: boolean
        permManageSettings: boolean
        permManageMailAlerts: boolean
    }
}

export default function MobileNav({ user }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const displayName = user.firstName || user.lastName
        ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
        : user.email?.split('@')[0] || 'Admin'

    const isAdmin = user.role === 'ADMIN'
    const canViewAnalytics = isAdmin || user.permViewAnalytics
    const canViewReports = isAdmin || user.permViewReports
    const canViewUnifiedRecords = isAdmin || user.permViewUnifiedRecords
    const canViewMap = isAdmin || user.permViewMap
    const canViewCitizens = canViewReports
    const canViewOfficers =
        isAdmin ||
        user.permViewOfficerStats ||
        user.permCreateOfficers ||
        user.permEditOfficers ||
        user.permDeleteOfficers ||
        user.permCreateEvaluations ||
        user.permManageOfficerStatus

    type MobileNavSubItem = {
        href: string
        label: string
        tab?: string
        status?: string
    }

    type MobileNavItem = {
        href: string
        label: string
        icon: LucideIcon
        permission?: boolean
        children?: MobileNavSubItem[]
    }

    const navItems: MobileNavItem[] = [
        {
            href: "/admin/dashboard",
            label: "Дашборд",
            icon: LayoutDashboard,
            permission: true
        },
        {
            href: "/admin/analytics",
            label: "Аналітика",
            icon: Activity,
            permission: canViewAnalytics
        },
        {
            href: "/admin/reports",
            label: "Відгуки громадян",
            icon: FileText,
            permission: canViewReports
        },
        {
            href: "/admin/unified-record?activeTab=ALL&status=PENDING",
            label: "ВИКОНАВЧА ДИСЦИПЛІНА",
            icon: ClipboardList,
            permission: canViewUnifiedRecords,
            children: [
                { href: "/admin/unified-record?activeTab=EO&status=ALL", label: "Єдиний облік", tab: "EO", status: "ALL" },
                { href: "/admin/unified-record?activeTab=ZVERN&status=ALL", label: "Звернення", tab: "ZVERN", status: "ALL" },
                { href: "/admin/unified-record?activeTab=APPLICATION&status=ALL", label: "Застосування сили/спецзасобів", tab: "APPLICATION", status: "ALL" },
                { href: "/admin/unified-record?activeTab=DETENTION_PROTOCOL&status=ALL", label: "Протоколи затримання", tab: "DETENTION_PROTOCOL", status: "ALL" },
                { href: "/admin/unified-record?activeTab=SERVICE_INVESTIGATION&status=ALL", label: "Службові розслідування", tab: "SERVICE_INVESTIGATION", status: "ALL" },
            ],
        },
        {
            href: "/admin/callbacks",
            label: "Callback",
            icon: PhoneCall,
            permission: canViewReports
        },
        {
            href: "/admin/map",
            label: "Мапа",
            icon: MapIcon,
            permission: canViewMap
        },
        {
            href: "/admin/citizens",
            label: "Громадяни",
            icon: Users,
            permission: canViewCitizens
        },
        { href: "/admin/officers", label: "Особовий склад", icon: ShieldCheck, permission: canViewOfficers },
        {
            href: "/admin/users",
            label: "Користувачі",
            icon: Users,
            permission: user.role === 'ADMIN' || user.permManageUsers || user.permViewUsers
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
                        {navItems.filter(item => item.permission !== false).map((item) => {
                            const itemPath = item.href.split("?")[0]
                            const isUnifiedRoot =
                                itemPath === "/admin/unified-record" &&
                                pathname === "/admin/unified-record" &&
                                (searchParams.get("activeTab") || "ALL") === "ALL" &&
                                (searchParams.get("status") || "PENDING") === "PENDING"
                            const isItemActive = itemPath === pathname && (itemPath !== "/admin/unified-record" ? true : isUnifiedRoot)

                            return (
                                <div key={item.href} className="space-y-2">
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${isItemActive
                                            ? 'bg-gradient-to-r from-blue-900/50 to-slate-800 border border-blue-500/30 text-yellow-400 shadow-lg shadow-blue-900/20'
                                            : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'}`}
                                    >
                                        <item.icon className={`w-5 h-5 ${isItemActive ? 'text-yellow-400' : 'text-slate-500'}`} />
                                        {item.label}
                                    </Link>

                                    {item.children && pathname === "/admin/unified-record" ? (
                                        <div className="ml-3 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-2 space-y-1">
                                            {item.children.map((child) => {
                                                const isChildActive =
                                                    (searchParams.get("activeTab") || "") === (child.tab || "") &&
                                                    (searchParams.get("status") || "ALL") === (child.status || "ALL")
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${isChildActive
                                                            ? "bg-blue-900/40 text-blue-200 border border-blue-500/30"
                                                            : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                                                            }`}
                                                    >
                                                        <span className={`h-1.5 w-1.5 rounded-full ${isChildActive ? "bg-blue-300" : "bg-slate-500"}`} />
                                                        {child.label}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            )
                        })}
                    </nav>

                    <div className="p-6 border-t border-slate-800 bg-slate-900">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Тема</p>
                                <p className="text-xs font-bold text-slate-500">Змінити вигляд</p>
                            </div>
                            <ThemeToggle />
                        </div>
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
