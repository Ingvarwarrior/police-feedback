import { getDossierAuditLogs } from "../actions/auditActions"
import { Eye, Clock, User } from "lucide-react"

interface AuditLogSectionProps {
    citizenId: string
}

export default async function AuditLogSection({ citizenId }: AuditLogSectionProps) {
    const logs = await getDossierAuditLogs(citizenId)

    if (logs.length === 0) {
        return (
            <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Журнал переглядів порожній</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">
                            {log.actorUser ? `${log.actorUser.firstName || ''} ${log.actorUser.lastName || ''}`.trim() : 'Система'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">{log.actorUser?.email}</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">
                                {new Date(log.createdAt).toLocaleDateString('uk-UA')}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            {new Date(log.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}
