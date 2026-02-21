'use client'

import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { CheckSquare, FileText, Loader2, Search, Shield, UserPlus, XCircle } from "lucide-react"
import { parseServiceInvestigationPenaltyItems } from "./unifiedRecord.helpers"

type ServiceAction =
    | "CLOSE_NO_VIOLATION"
    | "INITIATE_SR"
    | "SET_ORDER"
    | "COMPLETE_LAWFUL"
    | "COMPLETE_UNLAWFUL"

type ServiceDecisionType = "ARTICLE_13" | "ARTICLE_19_PART_11" | "ARTICLE_19_PART_13"

type PenaltyDraft = {
    officerId: string
    decisionType: ServiceDecisionType
    penaltyType?: string
    penaltyOther?: string
}

interface ServiceInvestigationProcessPopoverProps {
    record: any
    onProcess: (payload: {
        id: string
        action: ServiceAction
        orderNumber?: string
        orderDate?: string
        penaltyType?: string
        penaltyOther?: string
        penaltyOfficerId?: string
        penalties?: Array<{
            officerId: string
            decisionType: ServiceDecisionType
            penaltyType?: string
            penaltyOther?: string
        }>
        officerIds?: string[]
        conclusionApprovedDate?: string
        penaltyByArticle13?: boolean
        penaltyOrderNumber?: string
        penaltyOrderDate?: string
    }) => Promise<void>
    trigger?: ReactNode
}

const PENALTY_OPTIONS = [
    "зауваження",
    "догана",
    "сувора догана",
    "попередження про неповну службову відповідність",
    "пониження у спеціальному званні на один ступінь",
    "звільнення з посади",
    "звільнення із служби в поліції",
    "інший варіант",
] as const

const DECISION_TYPE_OPTIONS: Array<{ value: ServiceDecisionType; label: string }> = [
    { value: "ARTICLE_13", label: "Стягнення за ст. 13 Дисциплінарного статуту НПУ" },
    { value: "ARTICLE_19_PART_11", label: "Захід за ч. 11 ст. 19 (попереджено про необхідність дотримання дисципліни)" },
    { value: "ARTICLE_19_PART_13", label: "Захід за ч. 13 ст. 19 (обмеженося раніше застосованим стягненням)" },
]

const PART_11_LABEL = "попереджено про необхідність дотримання службової дисципліни"
const PART_13_LABEL = "обмеженося раніше застосованим дисциплінарним стягненням"

function inferDecisionTypeFromLegacy(record: any, penaltyType: string): ServiceDecisionType {
    const normalized = penaltyType.toLowerCase()
    if (record?.investigationPenaltyByArticle13 === false) {
        if (normalized.includes("обмеж")) return "ARTICLE_19_PART_13"
        return "ARTICLE_19_PART_11"
    }
    if (normalized.includes("обмеж")) return "ARTICLE_19_PART_13"
    if (normalized.includes("попереджено про необхідність")) return "ARTICLE_19_PART_11"
    return "ARTICLE_13"
}

function getStageLabel(stage?: string | null) {
    const raw = String(stage || "REPORT_REVIEW")
    if (raw === "REPORT_REVIEW") return "Етап 1: розгляд рапорту/доповідної"
    if (raw === "SR_INITIATED") return "Етап 2: ініційовано службове розслідування"
    if (raw === "SR_ORDER_ASSIGNED") return "Етап 3: наказ про призначення СР"
    if (raw === "SR_COMPLETED_LAWFUL") return "Завершено: дії правомірні"
    if (raw === "SR_COMPLETED_UNLAWFUL") return "Завершено: дії неправомірні"
    if (raw === "CHECK_COMPLETED_NO_VIOLATION") return "Завершено: порушень дисципліни не виявлено"
    return raw
}

export default function ServiceInvestigationProcessPopover({
    record,
    onProcess,
    trigger,
}: ServiceInvestigationProcessPopoverProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isDesktopOpen, setIsDesktopOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const [orderNumber, setOrderNumber] = useState("")
    const [orderDate, setOrderDate] = useState("")

    const [conclusionApprovedDate, setConclusionApprovedDate] = useState("")
    const [penaltyOrderNumber, setPenaltyOrderNumber] = useState("")
    const [penaltyOrderDate, setPenaltyOrderDate] = useState("")
    const [penaltyDrafts, setPenaltyDrafts] = useState<Record<string, PenaltyDraft>>({})

    const [taggedOfficers, setTaggedOfficers] = useState<any[]>([])
    const [officerSearchQuery, setOfficerSearchQuery] = useState("")
    const [officerSearchResults, setOfficerSearchResults] = useState<any[]>([])
    const [isSearchingOfficers, setIsSearchingOfficers] = useState(false)

    const stage = String(record?.investigationStage || "REPORT_REVIEW")
    const isFinalStage = stage === "CHECK_COMPLETED_NO_VIOLATION" || stage === "SR_COMPLETED_LAWFUL" || stage === "SR_COMPLETED_UNLAWFUL"
    const hasArticle13Selected = taggedOfficers.some((officer: any) =>
        (penaltyDrafts[officer.id]?.decisionType || "ARTICLE_13") === "ARTICLE_13"
    )

    useEffect(() => {
        if (typeof window === "undefined") return
        const mediaQuery = window.matchMedia("(max-width: 768px)")
        const apply = () => setIsMobile(mediaQuery.matches)
        apply()
        mediaQuery.addEventListener("change", apply)
        return () => mediaQuery.removeEventListener("change", apply)
    }, [])

    useEffect(() => {
        const officers = Array.isArray(record?.officers) ? record.officers : []
        const savedPenalties = parseServiceInvestigationPenaltyItems(record?.investigationPenaltyItems)
        const fallbackPenalty = record?.investigationPenaltyOfficerId && record?.investigationPenaltyType
            ? [{
                officerId: String(record.investigationPenaltyOfficerId),
                decisionType: inferDecisionTypeFromLegacy(record, String(record.investigationPenaltyType)),
                penaltyType: String(record.investigationPenaltyType),
                penaltyOther: String(record?.investigationPenaltyOther || ""),
            }]
            : []

        const sourcePenalties = savedPenalties.length > 0 ? savedPenalties : fallbackPenalty
        const draftMap: Record<string, PenaltyDraft> = {}

        for (const officer of officers) {
            const saved = sourcePenalties.find((item) => item.officerId === officer.id)
            draftMap[officer.id] = {
                officerId: officer.id,
                decisionType: saved?.decisionType || "ARTICLE_13",
                penaltyType: saved?.penaltyType || "",
                penaltyOther: saved?.penaltyOther || "",
            }
        }

        for (const saved of sourcePenalties) {
            if (draftMap[saved.officerId]) continue
            draftMap[saved.officerId] = {
                officerId: saved.officerId,
                decisionType: saved.decisionType || "ARTICLE_13",
                penaltyType: saved.penaltyType || "",
                penaltyOther: saved.penaltyOther || "",
            }
        }

        setTaggedOfficers(officers)
        setPenaltyDrafts(draftMap)
        setOrderNumber(record?.investigationOrderNumber || "")
        setOrderDate(record?.investigationOrderDate ? new Date(record.investigationOrderDate).toISOString().slice(0, 10) : "")
        setConclusionApprovedDate(
            record?.investigationConclusionApprovedAt
                ? new Date(record.investigationConclusionApprovedAt).toISOString().slice(0, 10)
                : ""
        )
        setPenaltyOrderNumber(record?.investigationPenaltyOrderNumber || "")
        setPenaltyOrderDate(
            record?.investigationPenaltyOrderDate
                ? new Date(record.investigationPenaltyOrderDate).toISOString().slice(0, 10)
                : ""
        )
        setOfficerSearchQuery("")
        setOfficerSearchResults([])
    }, [
        record?.id,
        record?.officers,
        record?.investigationOrderNumber,
        record?.investigationOrderDate,
        record?.investigationPenaltyItems,
        record?.investigationPenaltyOfficerId,
        record?.investigationPenaltyType,
        record?.investigationPenaltyOther,
        record?.investigationConclusionApprovedAt,
        record?.investigationPenaltyOrderNumber,
        record?.investigationPenaltyOrderDate,
    ])

    useEffect(() => {
        if (!officerSearchQuery.trim() || officerSearchQuery.length < 2) {
            setOfficerSearchResults([])
            return
        }

        const timer = setTimeout(async () => {
            setIsSearchingOfficers(true)
            try {
                const res = await fetch(`/api/admin/officers?search=${encodeURIComponent(officerSearchQuery)}`)
                if (res.ok) {
                    const data = await res.json()
                    setOfficerSearchResults(
                        data.filter((officer: any) => !taggedOfficers.some((tagged: any) => tagged.id === officer.id))
                    )
                }
            } catch (error) {
                console.error("Officer search error:", error)
            } finally {
                setIsSearchingOfficers(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [officerSearchQuery, taggedOfficers])

    const closeContainer = () => {
        setIsDesktopOpen(false)
        setIsMobileOpen(false)
    }

    const updatePenaltyDraft = (officerId: string, patch: Partial<PenaltyDraft>) => {
        setPenaltyDrafts((prev) => ({
            ...prev,
            [officerId]: {
                officerId,
                decisionType: prev[officerId]?.decisionType || "ARTICLE_13",
                penaltyType: prev[officerId]?.penaltyType || "",
                penaltyOther: prev[officerId]?.penaltyOther || "",
                ...patch,
            },
        }))
    }

    const addOfficerToTagged = (officer: any) => {
        setTaggedOfficers((prev) => {
            if (prev.some((item) => item.id === officer.id)) return prev
            return [...prev, officer]
        })
        setPenaltyDrafts((prev) => ({
            ...prev,
            [officer.id]: prev[officer.id] || {
                officerId: officer.id,
                decisionType: "ARTICLE_13",
                penaltyType: "",
                penaltyOther: "",
            },
        }))
    }

    const removeTaggedOfficer = (officerId: string) => {
        setTaggedOfficers((prev) => prev.filter((item) => item.id !== officerId))
        setPenaltyDrafts((prev) => {
            const copy = { ...prev }
            delete copy[officerId]
            return copy
        })
    }

    const buildPenaltyPayload = () => {
        return taggedOfficers
            .map((officer: any) => {
                const draft = penaltyDrafts[officer.id]
                const decisionType = draft?.decisionType || "ARTICLE_13"
                const penaltyType =
                    decisionType === "ARTICLE_19_PART_11"
                        ? PART_11_LABEL
                        : decisionType === "ARTICLE_19_PART_13"
                            ? PART_13_LABEL
                            : (draft?.penaltyType || "").trim()
                return {
                    officerId: officer.id,
                    decisionType,
                    penaltyType,
                    penaltyOther: (draft?.penaltyOther || "").trim() || undefined,
                }
            })
            .filter((item) => item.decisionType !== "ARTICLE_13" || (item.penaltyType || "").length > 0)
    }

    const submit = async (action: ServiceAction) => {
        if (isProcessing) return
        setIsProcessing(true)
        try {
            const penalties = buildPenaltyPayload()
            const hasArticle13 = penalties.some((item) => item.decisionType === "ARTICLE_13")
            const firstPenalty = penalties[0]
            await onProcess({
                id: record.id,
                action,
                orderNumber: orderNumber.trim() || undefined,
                orderDate: orderDate || undefined,
                penaltyType: firstPenalty?.penaltyType,
                penaltyOther: firstPenalty?.penaltyOther,
                penaltyOfficerId: firstPenalty?.officerId,
                penalties,
                officerIds: taggedOfficers.map((officer: any) => officer.id),
                conclusionApprovedDate: conclusionApprovedDate || undefined,
                penaltyByArticle13: hasArticle13,
                penaltyOrderNumber: penaltyOrderNumber.trim() || undefined,
                penaltyOrderDate: penaltyOrderDate || undefined,
            })
            closeContainer()
        } finally {
            setIsProcessing(false)
        }
    }

    const content = (
        <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Поточний етап</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{getStageLabel(stage)}</p>
            </div>

            {stage === "REPORT_REVIEW" && (
                <div className="space-y-2">
                    <Button
                        disabled={isProcessing}
                        onClick={() => submit("CLOSE_NO_VIOLATION")}
                        className="w-full justify-start h-auto py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                        Проведено перевірку - порушень службової дисципліни не виявлено
                    </Button>
                    <Button
                        disabled={isProcessing}
                        onClick={() => submit("INITIATE_SR")}
                        variant="outline"
                        className="w-full justify-start h-auto py-3 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 font-bold"
                    >
                        Ініційовано проведення службового розслідування
                    </Button>
                </div>
            )}

            {stage === "SR_INITIATED" && (
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Призначення СР (наказ)</p>
                    <div className="grid grid-cols-1 gap-2">
                        <Input
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder="Наказ №"
                            className="h-10 rounded-xl"
                        />
                        <Input
                            type="date"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                            className="h-10 rounded-xl"
                        />
                    </div>
                    <p className="text-[11px] text-slate-500">
                        Після збереження наказу строк на проведення СР автоматично становить 15 днів від дати наказу.
                    </p>
                    <Button
                        disabled={isProcessing}
                        onClick={() => submit("SET_ORDER")}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                        Призначено СР (Наказ № ... від ...)
                    </Button>
                </div>
            )}

            {stage === "SR_ORDER_ASSIGNED" && (
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Button
                            disabled={isProcessing}
                            onClick={() => submit("COMPLETE_LAWFUL")}
                            className="w-full justify-start h-auto py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                            Проведено СР - дії правомірні
                        </Button>
                    </div>

                    <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                            Проведено СР - дії неправомірні
                        </p>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                Дата затвердження висновку СР
                            </Label>
                            <Input
                                type="date"
                                value={conclusionApprovedDate}
                                onChange={(e) => setConclusionApprovedDate(e.target.value)}
                                className="h-10 rounded-xl"
                            />
                        </div>

                        {taggedOfficers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {taggedOfficers.map((officer: any) => (
                                    <div key={officer.id} className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-700">
                                        <span>{officer.lastName} {officer.firstName}</span>
                                        <button
                                            type="button"
                                            className="hover:text-blue-900"
                                            onClick={() => removeTaggedOfficer(officer.id)}
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={officerSearchQuery}
                                onChange={(e) => setOfficerSearchQuery(e.target.value)}
                                placeholder="Пошук поліцейського (прізвище/жетон)"
                                className="h-10 rounded-xl pl-9"
                            />
                            {isSearchingOfficers && (
                                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                            )}
                        </div>

                        {officerSearchResults.length > 0 && (
                            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                                {officerSearchResults.map((officer: any) => (
                                    <button
                                        key={officer.id}
                                        type="button"
                                        onClick={() => {
                                            addOfficerToTagged(officer)
                                            setOfficerSearchQuery("")
                                            setOfficerSearchResults([])
                                        }}
                                        className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{officer.lastName} {officer.firstName}</p>
                                            <p className="text-[10px] font-bold uppercase text-slate-500">{officer.badgeNumber || "Без жетона"}</p>
                                        </div>
                                        <UserPlus className="h-4 w-4 text-blue-600" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {taggedOfficers.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-2 text-xs font-medium text-slate-500">
                                Додайте поліцейських, для яких потрібно обрати стягнення.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                    Рішення по кожному поліцейському
                                </Label>
                                {taggedOfficers.map((officer: any) => {
                                    const draft = penaltyDrafts[officer.id] || {
                                        officerId: officer.id,
                                        decisionType: "ARTICLE_13",
                                        penaltyType: "",
                                        penaltyOther: "",
                                    }
                                    return (
                                        <div key={officer.id} className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
                                            <p className="text-xs font-bold text-slate-800">
                                                {officer.lastName} {officer.firstName} {officer.badgeNumber ? `(${officer.badgeNumber})` : ""}
                                            </p>
                                            <Select
                                                value={draft.decisionType || "ARTICLE_13"}
                                                onValueChange={(value: ServiceDecisionType) => {
                                                    if (value === "ARTICLE_19_PART_11") {
                                                        updatePenaltyDraft(officer.id, {
                                                            decisionType: value,
                                                            penaltyType: PART_11_LABEL,
                                                            penaltyOther: "",
                                                        })
                                                        return
                                                    }
                                                    if (value === "ARTICLE_19_PART_13") {
                                                        updatePenaltyDraft(officer.id, {
                                                            decisionType: value,
                                                            penaltyType: PART_13_LABEL,
                                                            penaltyOther: "",
                                                        })
                                                        return
                                                    }
                                                    updatePenaltyDraft(officer.id, {
                                                        decisionType: value,
                                                        penaltyType: "",
                                                        penaltyOther: "",
                                                    })
                                                }}
                                            >
                                                <SelectTrigger className="h-9 rounded-xl">
                                                    <SelectValue placeholder="Оберіть правову підставу" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DECISION_TYPE_OPTIONS.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            {draft.decisionType === "ARTICLE_13" ? (
                                                <>
                                                    <Select
                                                        value={draft.penaltyType || ""}
                                                        onValueChange={(value) => updatePenaltyDraft(officer.id, { penaltyType: value })}
                                                    >
                                                        <SelectTrigger className="h-9 rounded-xl">
                                                            <SelectValue placeholder="Оберіть стягнення (ст.13)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {PENALTY_OPTIONS.map((option) => (
                                                                <SelectItem key={option} value={option}>
                                                                    {option}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {draft.penaltyType === "інший варіант" && (
                                                        <Input
                                                            value={draft.penaltyOther || ""}
                                                            onChange={(e) => updatePenaltyDraft(officer.id, { penaltyOther: e.target.value })}
                                                            placeholder="Вкажіть інший варіант стягнення"
                                                            className="h-9 rounded-xl"
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700">
                                                    {draft.decisionType === "ARTICLE_19_PART_11"
                                                        ? "Застосовується захід: попереджено про необхідність дотримання службової дисципліни (ч.11 ст.19)."
                                                        : "Застосовується захід: обмеженося раніше застосованим дисциплінарним стягненням (ч.13 ст.19)."}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {hasArticle13Selected && (
                            <div className="grid grid-cols-1 gap-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                    Наказ про стягнення (обов'язково для ст. 13)
                                </Label>
                                <Input
                                    value={penaltyOrderNumber}
                                    onChange={(e) => setPenaltyOrderNumber(e.target.value)}
                                    placeholder="№ наказу на стягнення"
                                    className="h-10 rounded-xl"
                                />
                                <Input
                                    type="date"
                                    value={penaltyOrderDate}
                                    onChange={(e) => setPenaltyOrderDate(e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>
                        )}

                        <Button
                            disabled={isProcessing}
                            onClick={() => submit("COMPLETE_UNLAWFUL")}
                            className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                        >
                            Завершити СР (дії неправомірні)
                        </Button>
                    </div>
                </div>
            )}

            {isFinalStage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-bold text-emerald-800">Розслідування завершено.</p>
                    <p className="text-xs text-emerald-700 mt-1">
                        Для зміни базових даних використовуйте редагування картки.
                    </p>
                </div>
            )}
        </div>
    )

    if (isMobile) {
        return (
            <Dialog open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest gap-2">
                            <CheckSquare className="w-5 h-5" />
                            Опрацювати
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="!top-auto !left-0 !translate-x-0 !translate-y-0 inset-x-0 bottom-0 w-full max-w-none rounded-t-[1.5rem] rounded-b-none border-none p-0 gap-0 max-h-[85dvh] overflow-hidden">
                    <DialogHeader className="p-4 border-b border-slate-100">
                        <DialogTitle className="text-base font-black uppercase tracking-tight text-left flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-600" />
                            Службове розслідування
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4 overflow-y-auto space-y-4">{content}</div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Popover open={isDesktopOpen} onOpenChange={setIsDesktopOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest gap-2">
                        <CheckSquare className="w-5 h-5" />
                        Опрацювати
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent
                className="w-[calc(100vw-1.5rem)] max-w-[420px] rounded-[1.5rem] border-none p-4 shadow-2xl space-y-4"
                align="end"
            >
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-700">Службове розслідування</p>
                </div>
                {content}
            </PopoverContent>
        </Popover>
    )
}
