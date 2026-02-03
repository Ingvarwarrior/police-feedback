import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, LayoutDashboard, FileText, Settings, Users, Map as MapIcon, Activity } from "lucide-react"
import Image from "next/image"
import { Toaster } from "sonner"
import SignOutButton from "@/components/admin/SignOutButton"
import MobileNav from "@/components/admin/MobileNav"
import NotificationCenter from "@/components/admin/NotificationCenter"
import BirthdayNotifications from "@/components/admin/BirthdayNotifications"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user?.email) { // NextAuth.js stores the identifier in the email field
        redirect("/admin/login")
    }

    // Fetch full user data from database  
    const user = await prisma.user.findUnique({
        where: { username: session.user.email as string },
        select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            badgeNumber: true,
            role: true,
            permManageUsers: true,
            permViewAudit: true,
            permManageSettings: true,
            permManageMailAlerts: true,
        }
    })

    if (!user) {
        redirect('/admin/login')
    }

    const displayName = user.firstName || user.lastName
        ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
        : user.username || 'Admin'

    return (
        <div className="min-h-screen flex bg-neutral-50 print:block print:bg-white">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col no-print shadow-2xl relative z-20">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3 font-bold text-sm text-white uppercase tracking-tighter">
                    <Image src="/emblem.jpg" alt="Logo" width={40} height={50} className="w-10 h-auto shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                    <span className="text-blue-100">Патрульна поліція <br /> <span className="text-yellow-400">Хмільницького району</span></span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                        <LayoutDashboard className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                        Дашборд
                    </Link>
                    <Link href="/admin/analytics" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                        <Activity className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                        Аналітика
                    </Link>
                    <Link href="/admin/reports" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                        <FileText className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                        Відгуки громадян
                    </Link>
                    <Link href="/admin/map" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                        <MapIcon className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                        Мапа
                    </Link>
                    <Link href="/admin/citizens" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                        <Users className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                        Громадяни
                    </Link>
                    <Link href="/admin/officers" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                        <ShieldCheck className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                        Особовий склад
                    </Link>
                    {user?.permManageUsers || user?.permViewAudit || user?.role === 'ADMIN' ? (
                        <>
                            <Link href="/admin/users" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                                <Users className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                                Користувачі
                            </Link>
                            <Link href="/admin/audit" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                                <Activity className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                                Аудит
                            </Link>
                        </>
                    ) : null}

                    {user?.permManageSettings || user?.role === 'ADMIN' ? (
                        <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                            <Settings className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                            Налаштування
                        </Link>
                    ) : null}

                    {user?.permManageMailAlerts || user?.role === 'ADMIN' ? (
                        <Link href="/admin/mail-alerts" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                            <ShieldCheck className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                            Сповіщення
                        </Link>
                    ) : null}
                    <Link href="/admin/profile" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all group hover:pl-4">
                        <Settings className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                        Мій профіль
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="mb-4 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-1">Користувач</p>
                        <p className="text-sm font-bold text-white truncate">{displayName}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{user.role}</p>
                    </div>
                    <SignOutButton />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
                {/* Desktop Top Header */}
                <header className="h-16 bg-white border-b border-slate-100 hidden md:flex items-center justify-between px-8 no-print shadow-sm relative z-30">
                    <div className="flex items-center gap-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Система оперативного моніторингу</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <BirthdayNotifications />
                        <NotificationCenter />
                        <div className="h-8 w-px bg-slate-100" />
                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="text-right">
                                <p className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors">{displayName}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{user.role}</p>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs border border-transparent group-hover:border-primary/20 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                                {(user.lastName?.[0] || user.firstName?.[0] || user.username?.[0] || 'A').toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:hidden no-print shadow-sm relative z-30">
                    <div className="flex items-center gap-3">
                        <Image src="/emblem.jpg" alt="Logo" width={32} height={40} className="w-8 h-auto" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Центр керування</p>
                            <p className="text-xs font-black text-slate-900">Моніторинг</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <BirthdayNotifications />
                        <NotificationCenter />
                        <MobileNav user={user as any} />
                    </div>
                </header>

                {/* Content Area */}
                <div id="admin-content-area" className="flex-1 overflow-y-auto p-4 md:p-8 print:overflow-visible print:p-0">
                    {children}
                </div>
            </main>

            <Toaster position="top-right" richColors />
        </div>
    )
}
