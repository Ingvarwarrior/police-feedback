import { prisma } from "@/lib/prisma"
import { Activity, FileText, Shield, User, Clock } from "lucide-react"
import { format } from "date-fns"
import { uk } from "date-fns/locale"

interface UserAuditLogProps {
    userId: string
}

export default async function UserAuditLog({ userId }: UserAuditLogProps) {
    const logs = await prisma.auditLog.findMany({
        where: {
            actorUserId: userId
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 50
    })

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Activity className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Історія дій порожня</h3>
                <p className="text-slate-500 max-w-sm mt-2">Користувач ще не виконав жодної дії в системі.</p>
            </div>
        )
    }

    const getActionColor = (action: string) => {
        if (action.includes('DELETE') || action.includes('RESET')) return 'text-rose-600 bg-rose-50 border-rose-100'
        if (action.includes('CREATE') || action.includes('RESOLVE')) return 'text-emerald-600 bg-emerald-50 border-emerald-100'
        if (action.includes('ASSIGN')) return 'text-blue-600 bg-blue-50 border-blue-100'
        return 'text-slate-600 bg-slate-50 border-slate-200'
    }

    const getActionIcon = (action: string) => {
        if (action.includes('REPORT')) return <FileText className="w-3.5 h-3.5" />
        if (action.includes('USER')) return <User className="w-3.5 h-3.5" />
        if (action.includes('OFFICER')) return <Shield className="w-3.5 h-3.5" />
        return <Activity className="w-3.5 h-3.5" />
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                    Останні 50 дій
                </h3>
            </div>

            <div className="relative border-l border-slate-200 ml-4 space-y-8">
                {logs.map((log) => (
                    <div key={log.id} className="relative pl-8 group">
                        <div className={`absolute -left-[9px] top-1 w-[18px] h-[18px] rounded-full border-2 border-white shadow-sm flex items-center justify-center ${getActionColor(log.action).split(' ')[1]}`}>
                            <div className={`w-2 h-2 rounded-full ${getActionColor(log.action).split(' ')[0].replace('text', 'bg')}`} />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-100 transition-all hover:shadow-md hover:border-slate-200">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getActionColor(log.action)}`}>
                                        {getActionIcon(log.action)}
                                        {log.action}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                        {log.entityType} #{log.entityId?.slice(-6)}
                                    </span>
                                </div>

                                {log.metadata && (
                                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg font-mono">
                                        {log.metadata}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 shrink-0">
                                <Clock className="w-3.5 h-3.5" />
                                {format(log.createdAt, "d MMMM HH:mm", { locale: uk })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
