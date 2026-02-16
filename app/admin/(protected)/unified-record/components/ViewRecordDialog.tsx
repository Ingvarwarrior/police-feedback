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
    History,
    FileDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    buildServiceInvestigationPenaltySummary,
    formatDateTimeUa,
    getServiceInvestigationPenaltyValue,
    getRecordTypeLabel,
    getServiceInvestigationStageLabel,
    getServiceInvestigationTimeline,
    parseServiceInvestigationPenaltyItems,
} from "./unifiedRecord.helpers"

interface ViewRecordDialogProps {
    record: any
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

const PDF_SAFE_CHAR_MAP: Record<string, string> = {
    А: "A", а: "a", Б: "B", б: "b", В: "V", в: "v", Г: "H", г: "h", Ґ: "G", ґ: "g",
    Д: "D", д: "d", Е: "E", е: "e", Є: "Ye", є: "ie", Ж: "Zh", ж: "zh", З: "Z", з: "z",
    И: "Y", и: "y", І: "I", і: "i", Ї: "Yi", ї: "i", Й: "Y", й: "i", К: "K", к: "k",
    Л: "L", л: "l", М: "M", м: "m", Н: "N", н: "n", О: "O", о: "o", П: "P", п: "p",
    Р: "R", р: "r", С: "S", с: "s", Т: "T", т: "t", У: "U", у: "u", Ф: "F", ф: "f",
    Х: "Kh", х: "kh", Ц: "Ts", ц: "ts", Ч: "Ch", ч: "ch", Ш: "Sh", ш: "sh", Щ: "Shch", щ: "shch",
    Ь: "", ь: "", Ю: "Yu", ю: "iu", Я: "Ya", я: "ia",
}

function toPdfSafeText(value: string) {
    return value
        .split("")
        .map((char) => PDF_SAFE_CHAR_MAP[char] ?? char)
        .join("")
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
    const isServiceInvestigation = record.recordType === "SERVICE_INVESTIGATION"
    const isSpecialCard = isApplication || isDetentionProtocol
    const servicePenaltyItems = parseServiceInvestigationPenaltyItems(record?.investigationPenaltyItems)
    const servicePenaltySummary = buildServiceInvestigationPenaltySummary(record, 3)
    const servicePenaltyRows = servicePenaltyItems
        .map((item) => {
            const officer = Array.isArray(record?.officers)
                ? record.officers.find((entry: any) => entry.id === item.officerId)
                : null
            const officerLabel = officer
                ? `${officer.lastName || ""} ${officer.firstName || ""}`.trim() || officer.badgeNumber || item.officerId
                : item.officerId
            return {
                id: item.officerId,
                officerLabel,
                penaltyLabel: getServiceInvestigationPenaltyValue(item),
            }
        })
        .filter((item) => item.penaltyLabel)

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
            : isServiceInvestigation
                ? `${record.investigationDocType === "DOPOVIDNA" ? "Доповідна записка" : "Рапорт"} №${record.eoNumber || "—"}`
            : `№${record.eoNumber || "—"}`

    const handleExportPdf = async () => {
        const { jsPDF } = await import("jspdf")
        const doc = new jsPDF({ unit: "pt", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 40
        const contentWidth = pageWidth - margin * 2
        let y = 48

        const writeParagraph = (text: string, options?: { bold?: boolean; spacing?: number }) => {
            const safeText = toPdfSafeText(text)
            const lines = doc.splitTextToSize(safeText, contentWidth)
            const lineHeight = 14
            const blockHeight = lines.length * lineHeight

            if (y + blockHeight > pageHeight - margin) {
                doc.addPage()
                y = margin
            }

            doc.setFont("helvetica", options?.bold ? "bold" : "normal")
            doc.text(lines, margin, y)
            y += blockHeight + (options?.spacing ?? 8)
        }

        const officersText = record.officers?.length
            ? record.officers.map((officer: any) => `${officer.lastName || ""} ${officer.firstName || ""} (#${officer.badgeNumber || "—"})`).join(", ")
            : "Ne vkazano"

        writeParagraph("Unified Record Card Export", { bold: true, spacing: 12 })
        writeParagraph(`Number: ${headerTitle}`)
        writeParagraph(`Type: ${getRecordTypeLabel(record.recordType, record.eoNumber)}`)
        writeParagraph(`Status: ${currentStatus.label}`)
        writeParagraph(`Date: ${safeFormat(record.eoDate, "dd.MM.yyyy")}`)
        writeParagraph(`${isServiceInvestigation ? "Target" : "Applicant"}: ${record.applicant || "Ne vkazano"}`)
        writeParagraph(`${isSpecialCard ? "Birth date" : "Address"}: ${isSpecialCard ? getBirthDateFromAddress() : (record.address || "Ne vkazano")}`)
        writeParagraph(`District: ${record.district || "Ne vkazano"}`)
        writeParagraph(
            `Executor: ${record.assignedUser ? `${record.assignedUser.lastName || ""} ${record.assignedUser.firstName || ""}`.trim() : "Ne pryznacheno"}`
        )
        writeParagraph(`Officers: ${officersText}`)
        writeParagraph(`Description: ${record.description || "Ne vkazano"}`)
        if (isServiceInvestigation) {
            writeParagraph(`Service stage: ${getServiceInvestigationStageLabel(record)}`)
            writeParagraph(`Violation: ${record.investigationViolation || "Ne vkazano"}`)
            writeParagraph(`Document type: ${record.investigationDocType === "DOPOVIDNA" ? "Dopovidna zapyska" : "Raport"}`)
            if (record.investigationOrderNumber || record.investigationOrderDate) {
                writeParagraph(`Order: №${record.investigationOrderNumber || "—"} від ${safeFormat(record.investigationOrderDate, "dd.MM.yyyy")}`)
            }
            if (record.investigationConclusionApprovedAt) {
                writeParagraph(`SR conclusion approved at: ${safeFormat(record.investigationConclusionApprovedAt, "dd.MM.yyyy")}`)
            }
            if (record.investigationPenaltyByArticle13) {
                writeParagraph(`Penalty order: №${record.investigationPenaltyOrderNumber || "—"} від ${safeFormat(record.investigationPenaltyOrderDate, "dd.MM.yyyy")}`)
            } else if (record.investigationFinalResult === "UNLAWFUL") {
                writeParagraph("Penalty without article 13 order")
            }
            if (servicePenaltyRows.length > 0) {
                writeParagraph(`Penalty details: ${servicePenaltyRows.map((item) => `${item.officerLabel} - ${item.penaltyLabel}`).join("; ")}`)
            } else if (record.investigationPenaltyType) {
                writeParagraph(`Penalty: ${record.investigationPenaltyType}${record.investigationPenaltyOther ? ` (${record.investigationPenaltyOther})` : ""}`)
            }
        }
        writeParagraph(`Resolution: ${record.resolution || "Ne vkazano"}`)
        writeParagraph(`Deadline: ${safeFormat(record.deadline, "dd.MM.yyyy")}`)
        writeParagraph(`Created at: ${safeFormat(record.createdAt, "dd.MM.yyyy HH:mm")}`)
        if (record.importedAt) {
            writeParagraph(`Imported at: ${safeFormat(record.importedAt, "dd.MM.yyyy HH:mm")}`)
        }

        const safeNumber = String(record.eoNumber || record.id || "record")
            .replace(/[^\w.-]+/g, "_")
            .slice(0, 60)
        doc.save(`record_${safeNumber}.pdf`)
    }

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
                            <DialogTitle className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-none break-words">
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
                                    <p className="text-xs font-semibold tracking-wide text-slate-500">
                                        {isDetentionProtocol
                                            ? "Дата протоколу"
                                            : isApplication
                                                ? "Дата рапорту"
                                                : isServiceInvestigation
                                                    ? "Дата рапорту/доповідної"
                                                    : "Дата реєстрації"}
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
                                    <p className="text-xs font-semibold tracking-wide text-slate-500">
                                        {isDetentionProtocol
                                            ? "ПІБ кого затримали"
                                            : isApplication
                                                ? "ПІБ до кого застосовано"
                                                : isServiceInvestigation
                                                    ? "Відносно кого"
                                                    : "Заявник"}
                                    </p>
                                    <p className="font-bold text-slate-900">{record.applicant || "Не вказано"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                                    {isSpecialCard ? <Calendar className="w-5 h-5" /> : isServiceInvestigation ? <FileText className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold tracking-wide text-slate-500">
                                        {isSpecialCard ? "Дата народження" : isServiceInvestigation ? "Тип документа / етап" : "Місце події (Адреса)"}
                                    </p>
                                    <p className="font-bold text-slate-900">
                                        {isSpecialCard
                                            ? getBirthDateFromAddress()
                                            : isServiceInvestigation
                                                ? `${record.investigationDocType === "DOPOVIDNA" ? "Доповідна записка" : "Рапорт"}`
                                                : (record.address || "Не вказано")}
                                    </p>
                                    {isServiceInvestigation ? (
                                        <p className="text-xs font-medium text-slate-500">{getServiceInvestigationStageLabel(record)}</p>
                                    ) : null}
                                    {!isSpecialCard && !isServiceInvestigation && record.district && (
                                        <p className="text-xs font-medium text-slate-500">{record.district} район</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold tracking-wide text-slate-500">Відповідальний виконавець</p>
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
                    {(record.status === 'PROCESSED' || isServiceInvestigation) && (
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    <h3 className="text-sm font-semibold tracking-wide text-slate-900">Поліцейські (учасники)</h3>
                                </div>
                                {!record.concernsBpp && (
                                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 italic">
                                        Не стосується БПП
                                    </span>
                                )}
                            </div>

                            {record.concernsBpp || isServiceInvestigation ? (
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
                            <h3 className="text-sm font-semibold tracking-wide text-slate-900">
                                {isServiceInvestigation ? "Суть порушення" : "Фабула / Опис події"}
                            </h3>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                            {isServiceInvestigation
                                ? (record.investigationViolation || record.description || "Не вказано")
                                : record.description}
                        </p>
                    </div>

                    {isServiceInvestigation && (
                        <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-3">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-600" />
                                <h3 className="text-sm font-semibold tracking-wide text-blue-900">Етап службового розслідування</h3>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{getServiceInvestigationStageLabel(record)}</p>

                            <div className="space-y-2">
                                {getServiceInvestigationTimeline(record).map((step) => (
                                    <div
                                        key={step.key}
                                        className={cn(
                                            "rounded-xl border px-3 py-2 flex items-start justify-between gap-2",
                                            step.status === "done" && "border-emerald-100 bg-emerald-50/70",
                                            step.status === "current" && "border-blue-100 bg-blue-50/70",
                                            step.status === "pending" && "border-slate-200 bg-white",
                                            step.status === "skipped" && "border-slate-200 border-dashed bg-slate-100/80"
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <p className={cn(
                                                "text-xs font-semibold leading-tight",
                                                step.status === "done" && "text-emerald-800",
                                                step.status === "current" && "text-blue-800",
                                                step.status === "pending" && "text-slate-700",
                                                step.status === "skipped" && "text-slate-500"
                                            )}>
                                                {step.label}
                                            </p>
                                            {step.hint ? <p className="text-[11px] text-slate-500 mt-0.5">{step.hint}</p> : null}
                                        </div>
                                        <span className="shrink-0 text-[11px] font-bold text-slate-500">
                                            {step.at ? formatDateTimeUa(step.at) : (step.status === "skipped" ? "не застосовується" : "—")}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {(servicePenaltySummary || record.investigationConclusionApprovedAt || record.investigationPenaltyOrderNumber || record.investigationPenaltyOrderDate) && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Висновок та стягнення</p>
                                    {record.investigationConclusionApprovedAt && (
                                        <p className="text-xs font-bold text-slate-800">
                                            Дата затвердження висновку СР: {safeFormat(record.investigationConclusionApprovedAt, "dd.MM.yyyy")}
                                        </p>
                                    )}
                                    {servicePenaltyRows.length > 0 ? (
                                        <div className="space-y-1">
                                            {servicePenaltyRows.map((item) => (
                                                <p key={item.id} className="text-xs font-semibold text-slate-800">
                                                    {item.officerLabel}: {item.penaltyLabel}
                                                </p>
                                            ))}
                                        </div>
                                    ) : servicePenaltySummary ? (
                                        <p className="text-xs font-semibold text-slate-800">{servicePenaltySummary}</p>
                                    ) : null}

                                    {record.investigationPenaltyByArticle13 === true ? (
                                        <p className="text-xs font-bold text-rose-900">
                                            Наказ про стягнення №{record.investigationPenaltyOrderNumber || "—"} від{" "}
                                            {record.investigationPenaltyOrderDate
                                                ? safeFormat(record.investigationPenaltyOrderDate, "dd.MM.yyyy")
                                                : "—"}
                                        </p>
                                    ) : record.investigationPenaltyByArticle13 === false ? (
                                        <p className="text-xs font-semibold text-slate-700">
                                            Стягнення не відповідно до ст. 13 Дисциплінарного статуту НПУ (наказ не потрібен).
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Resolution Section */}
                    {record.status === 'PROCESSED' && (
                        <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-sm font-semibold tracking-wide text-emerald-900">Результат розгляду (Рішення)</h3>
                            </div>
                            {isServiceInvestigation ? (
                                <ol className="list-decimal space-y-1.5 pl-5 text-sm font-bold text-emerald-800">
                                    {record.investigationFinalResult === "UNLAWFUL" && (
                                        <li>Проведено СР - дії неправомірні.</li>
                                    )}
                                    {record.investigationFinalResult === "LAWFUL" && (
                                        <li>Проведено СР - дії правомірні.</li>
                                    )}
                                    {record.investigationStage === "CHECK_COMPLETED_NO_VIOLATION" && (
                                        <li>Проведено перевірку - порушень службової дисципліни не виявлено.</li>
                                    )}
                                    {record.investigationConclusionApprovedAt && (
                                        <li>
                                            Висновок СР затверджено: {safeFormat(record.investigationConclusionApprovedAt, "dd.MM.yyyy")}
                                        </li>
                                    )}
                                    {servicePenaltyRows.length > 0 && (
                                        <li>
                                            За результатами СР щодо поліцейських:
                                            <div className="mt-1.5 space-y-1 pl-1 text-[13px] font-semibold text-emerald-900">
                                                {servicePenaltyRows.map((item) => (
                                                    <p key={item.id}>• {item.officerLabel}: {item.penaltyLabel}</p>
                                                ))}
                                            </div>
                                        </li>
                                    )}
                                    {record.investigationPenaltyByArticle13 === true && (
                                        <li>
                                            Наказ про стягнення №{record.investigationPenaltyOrderNumber || "—"} від{" "}
                                            {record.investigationPenaltyOrderDate
                                                ? safeFormat(record.investigationPenaltyOrderDate, "dd.MM.yyyy")
                                                : "—"}
                                        </li>
                                    )}
                                    {record.investigationPenaltyByArticle13 === false && (
                                        <li>Заходи застосовано відповідно до ч.11/ч.13 ст.19 (без наказу про стягнення за ст.13).</li>
                                    )}
                                    {!record.investigationFinalResult && !record.investigationConclusionApprovedAt && !servicePenaltyRows.length && (
                                        <li>{record.resolution || "Рішення відсутнє"}</li>
                                    )}
                                </ol>
                            ) : (
                                <p className="text-sm font-bold text-emerald-800 leading-relaxed">
                                    {record.resolution}
                                </p>
                            )}
                            <div className="flex justify-between items-center pt-2">
                                <p className="text-xs font-semibold tracking-wide text-emerald-700">Списано в справу</p>
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
                                <h4 className="text-xs font-semibold tracking-wide text-slate-600">Термін виконання</h4>
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
                                    <h4 className="text-xs font-semibold tracking-wide text-amber-700">Запит на продовження</h4>
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
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExportPdf}
                            className="h-12 rounded-2xl border-slate-300 font-semibold tracking-wide"
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            PDF
                        </Button>
                        <Button
                            onClick={() => onOpenChange(false)}
                            className="h-12 flex-1 rounded-2xl bg-slate-900 hover:bg-black text-white font-semibold tracking-wide shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.01]"
                        >
                            Закрити
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
