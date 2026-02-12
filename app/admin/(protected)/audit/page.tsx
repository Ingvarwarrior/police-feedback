import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, User, Shield, Clock, FileText, Search } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
    const session = await auth()
    if (!session?.user?.email) redirect("/admin/login")

    // Fetch user with permissions from DB (since session might be stale or incomplete)
    const currentUser = await prisma.user.findUnique({
        where: { username: session.user.email as string },
        select: {
            role: true,
            permViewAudit: true,
        }
    })

    if (currentUser?.role !== 'ADMIN' && !currentUser?.permViewAudit) {
        redirect("/admin/dashboard")
    }

    const logs = await prisma.auditLog.findMany({
        include: {
            actorUser: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    badgeNumber: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 100
    })

    const getActionColor = (action: string) => {
        if (action.includes('DELETE') || action.includes('RESET')) return 'text-rose-600 bg-rose-50'
        if (action.includes('CREATE') || action.includes('RESOLVE')) return 'text-emerald-600 bg-emerald-50'
        if (action.includes('ASSIGN')) return 'text-blue-600 bg-blue-50'
        return 'text-slate-600 bg-slate-50'
    }

    const getActionIcon = (action: string) => {
        if (action.includes('REPORT')) return <FileText className="w-3.5 h-3.5" />
        if (action.includes('USER')) return <User className="w-3.5 h-3.5" />
        if (action.includes('OFFICER')) return <Shield className="w-3.5 h-3.5" />
        return <Activity className="w-3.5 h-3.5" />
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-900 rounded-2xl shadow-lg ring-4 ring-slate-100">
                        <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase">Системний Аудит</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Останні 100 подій в реальному часі
                        </p>
                    </div>
                </div>
            </header>

            <Card className="border-0 shadow-2xl ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="border-b bg-slate-50/50 px-4 md:px-8 py-5 md:py-6">
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Журнал активності</CardTitle>
                        <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-200">
                            <Search className="w-3 h-3" />
                            Історія дій команди
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Час</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Інспектор</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Дія</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Об'єкт</th>
                                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Деталі</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 leading-none">
                                                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                    {new Date(log.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-black border border-slate-200">
                                                    {(log.actorUser?.lastName?.[0] || log.actorUser?.email?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div className="flex flex-col leading-tight">
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {log.actorUser?.lastName ? `${log.actorUser.lastName} ${log.actorUser.firstName}` : log.actorUser?.email}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                                                        {log.actorUser?.badgeNumber ? `#${log.actorUser.badgeNumber}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${getActionColor(log.action)}`}>
                                                {getActionIcon(log.action)}
                                                <span className="text-[10px] font-black uppercase tracking-tighter">
                                                    {log.action}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase mb-1">{log.entityType}</span>
                                                <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg w-fit border border-slate-200">
                                                    ID: {log.entityId?.slice(-8).toUpperCase() || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 max-w-xs">
                                            <p className="text-[10px] font-bold text-slate-600 truncate bg-white px-3 py-2 rounded-xl border border-slate-200 italic shadow-sm">
                                                {log.metadata || '—'}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                                            Історія дій порожня
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden p-4 space-y-3">
                        {logs.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-sm font-medium">Історія дій порожня</div>
                        ) : logs.map((log: any) => (
                            <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">
                                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">
                                            {new Date(log.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${getActionColor(log.action)}`}>
                                        {getActionIcon(log.action)}
                                        {log.action}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-900">
                                        {log.actorUser?.lastName ? `${log.actorUser.lastName} ${log.actorUser.firstName}` : log.actorUser?.email || "Невідомо"}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{log.entityType} • ID: {log.entityId?.slice(-8).toUpperCase() || 'N/A'}</p>
                                </div>
                                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                                    {log.metadata || '—'}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
