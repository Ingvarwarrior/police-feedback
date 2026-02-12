"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import {
    Calendar,
    MapPin,
    User,
    ClipboardList,
    FileText,
    Shield,
    Clock,
    CheckCircle2,
    AlertCircle,
    Building2,
    Info,
    History
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getRecordTypeLabel } from "./unifiedRecord.helpers"

interface ViewRecordDialogProps {
    record: any
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function ViewRecordDialog({ record, isOpen, onOpenChange }: ViewRecordDialogProps) {
    if (!record) return null

    const safeFormat = (date: any, formatStr: string) => {
        try {
            if (!date) return "—";
            const d = new Date(date);
            if (isNaN(d.getTime())) return "—";
            return format(d, formatStr, { locale: uk });
        } catch (e) {
            return "—";
        }
    }

    const statusMap: Record<string, { label: string, color: string, icon: any }> = {
        "PENDING": { label: "Очікує", color: "text-amber-600 bg-amber-50 border-amber-100", icon: Clock },
        "IN_PROGRESS": { label: "В роботі", color: "text-blue-600 bg-blue-50 border-blue-100", icon: Clock },
        "PROCESSED": { label: "Виконано", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: CheckCircle2 },
    }

    const currentStatus = statusMap[record.status] || { label: record.status, color: "text-slate-600 bg-slate-50", icon: Info }
    const isApplication = record.recordType === "APPLICATION"
    const isDetentionProtocol = record.recordType === "DETENTION_PROTOCOL"
    const isSpecialCard = isApplication || isDetentionProtocol

    const getBirthDateFromAddress = () => {
        if (!record.address || typeof record.address !== "string") return "Не вказано"
        if (!record.address.startsWith("DOB:")) return record.address
        const iso = record.address.replace("DOB:", "")
        const [y, m, d] = iso.split("-")
        if (!y || !m || !d) return iso
        return `${d}.${m}.${y}`
    }

    const getProtocolNumberFormatted = () => {
        const val = String(record.eoNumber || "").trim()
        const match = val.match(/^Серія\s+(.+?)\s+№\s*(.+)$/i)
        if (match) return `серія ${match[1]} №${match[2]}`
        return val || "—"
    }

    const headerTitle = isApplication
        ? `Рапорт №${record.eoNumber || "—"}`
        : isDetentionProtocol
            ? `Протокол ${getProtocolNumberFormatted()}`
            : `№${record.eoNumber || "—"}`

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95%] sm:w-full sm:max-w-[700px] bg-white rounded-[2rem] sm:rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90dvh]">
                <DialogHeader className="p-5 sm:p-8 md:p-10 bg-slate-900 text-white relative shrink-0">
                    <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12">
                        <FileText className="w-40 h-40" />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", currentStatus.color)}>
                                <currentStatus.icon className="w-3 h-3" />
                                {currentStatus.label}
                            </div>
                            <div className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest border border-white/5">
                                {getRecordTypeLabel(record.recordType, record.eoNumber)}
                            </div>
                        </div>

                        <div>
                            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Картка реєстру</p>
                            <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none break-words">
                                {headerTitle}
                            </DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-4 sm:p-8 md:p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {isDetentionProtocol ? "Дата протоколу" : isApplication ? "Дата рапорту" : "Дата реєстрації"}
                                    </p>
                                    <p className="font-bold text-slate-900">
                                        {safeFormat(record.eoDate, "PPP")}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {isDetentionProtocol ? "ПІБ кого затримали" : isApplication ? "ПІБ до кого застосовано" : "Заявник"}
                                    </p>
                                    <p className="font-bold text-slate-900">{record.applicant || "Не вказано"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                                    {isSpecialCard ? <Calendar className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {isSpecialCard ? "Дата народження" : "Місце події (Адреса)"}
                                    </p>
                                    <p className="font-bold text-slate-900">{isSpecialCard ? getBirthDateFromAddress() : (record.address || "Не вказано")}</p>
                                    {!isSpecialCard && record.district && (
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">{record.district} район</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Відповідальний виконавець</p>
                                    {record.assignedUser ? (
                                        <p className="font-bold text-slate-900">
                                            {record.assignedUser.lastName} {record.assignedUser.firstName}
                                            <span className="ml-2 text-[10px] font-medium text-slate-400 lowercase">(@{record.assignedUser.username})</span>
                                        </p>
                                    ) : (
                                        <p className="font-bold text-slate-400 italic">Не призначено</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Linked Officers Section for Processed Records */}
                    {record.status === 'PROCESSED' && (
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Поліцейські (учасники)</h3>
                                </div>
                                {!record.concernsBpp && (
                                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 italic">
                                        Не стосується БПП
                                    </span>
                                )}
                            </div>

                            {record.concernsBpp ? (
                                record.officers && record.officers.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {record.officers.map((officer: any) => (
                                            <div key={officer.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{officer.lastName} {officer.firstName}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">Жетон: #{officer.badgeNumber}</span>
                                                </div>
                                                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                    <Shield className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs font-bold text-slate-400 italic px-2">Поліцейських не зазначено</p>
                                )
                            ) : null}
                        </div>
                    )}

                    {/* Full Description */}
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-slate-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Фабула / Опис події</h3>
                        </div>
                        <p className="text-sm font-black text-slate-900 leading-relaxed uppercase italic">
                            {record.description}
                        </p>
                    </div>

                    {/* Resolution Section */}
                    {record.status === 'PROCESSED' && (
                        <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-900">Результат розгляду (Рішення)</h3>
                            </div>
                            <p className="text-sm font-bold text-emerald-800 leading-relaxed">
                                {record.resolution}
                            </p>
                            <div className="flex justify-between items-center pt-2">
                                <p className="text-[10px] font-black uppercase tracking-tighter text-emerald-600 italic">Списано в справу</p>
                                {record.resolutionDate && (
                                    <p className="text-[10px] font-bold text-emerald-600">
                                        {safeFormat(record.resolutionDate, "dd.MM.yyyy HH:mm")}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Deadline & Extensions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 border border-slate-200 rounded-3xl space-y-3 bg-white shadow-sm">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Термін виконання</h4>
                            </div>
                            <div className="flex items-end justify-between">
                                <p className={cn("text-xl font-black italic",
                                    record.status !== 'PROCESSED' && record.deadline && new Date(record.deadline) < new Date() ? "text-red-500" : "text-slate-900"
                                )}>
                                    {safeFormat(record.deadline, "dd MMMM yyyy")}
                                </p>
                                {record.extensionStatus === 'APPROVED' && (
                                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold uppercase tracking-tight">
                                        Продовжено
                                    </div>
                                )}
                            </div>
                        </div>

                        {record.extensionStatus === 'PENDING' && (
                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl space-y-3 animate-pulse">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Запит на продовження</h4>
                                </div>
                                <p className="text-xs font-bold text-amber-800 italic">"{record.extensionReason}"</p>
                            </div>
                        )}
                    </div>

                    {/* History / Meta */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-2 text-slate-400">
                            <History className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">Створено: {safeFormat(record.createdAt, "dd.MM.yyyy HH:mm")}</span>
                        </div>
                        {record.importedAt && (
                            <div className="flex items-center gap-2 text-slate-400">
                                <Building2 className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">Імпортовано: {safeFormat(record.importedAt, "dd.MM.yyyy HH:mm")}</span>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 sm:p-8 bg-slate-50 border-t border-slate-100 shrink-0 sticky bottom-0">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.01]"
                    >
                        Закрити
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
