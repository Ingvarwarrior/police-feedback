'use client'

import { useEffect, useMemo, useState, type ReactNode } from "react"
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

type ServiceAction =
    | "CLOSE_NO_VIOLATION"
    | "INITIATE_SR"
    | "SET_ORDER"
    | "COMPLETE_LAWFUL"
    | "COMPLETE_UNLAWFUL"

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
    }) => Promise<void>
    trigger?: ReactNode
}

const PENALTY_OPTIONS = [
    "зауваження",
    "догана",
    "сувора догана",
    "попереджено про неповну службову відповідність",
    "звільнення",
    "обмежено раніше накладеним стягненням",
    "попереджено про необхідність дотримання службової дисципліни",
    "інший варіант",
] as const

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
    const [penaltyType, setPenaltyType] = useState("")
    const [penaltyOther, setPenaltyOther] = useState("")
    const [penaltyOfficerId, setPenaltyOfficerId] = useState("")

    const [taggedOfficers, setTaggedOfficers] = useState<any[]>([])
    const [officerSearchQuery, setOfficerSearchQuery] = useState("")
    const [officerSearchResults, setOfficerSearchResults] = useState<any[]>([])
    const [isSearchingOfficers, setIsSearchingOfficers] = useState(false)

    const stage = String(record?.investigationStage || "REPORT_REVIEW")
    const isFinalStage = stage === "CHECK_COMPLETED_NO_VIOLATION" || stage === "SR_COMPLETED_LAWFUL" || stage === "SR_COMPLETED_UNLAWFUL"

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
        setTaggedOfficers(officers)
        setOrderNumber(record?.investigationOrderNumber || "")
        setOrderDate(record?.investigationOrderDate ? new Date(record.investigationOrderDate).toISOString().slice(0, 10) : "")
        setPenaltyType(record?.investigationPenaltyType || "")
        setPenaltyOther(record?.investigationPenaltyOther || "")
        setPenaltyOfficerId(record?.investigationPenaltyOfficerId || officers[0]?.id || "")
        setOfficerSearchQuery("")
        setOfficerSearchResults([])
    }, [record?.id, record?.investigationOrderNumber, record?.investigationOrderDate, record?.investigationPenaltyType, record?.investigationPenaltyOther, record?.investigationPenaltyOfficerId, record?.officers])

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

    const officersForSelect = useMemo(() => {
        return taggedOfficers.map((officer: any) => ({
            id: officer.id,
            label: `${officer.lastName || ""} ${officer.firstName || ""}`.trim() || officer.badgeNumber || officer.id,
            badgeNumber: officer.badgeNumber || "",
        }))
    }, [taggedOfficers])

    const closeContainer = () => {
        setIsDesktopOpen(false)
        setIsMobileOpen(false)
    }

    const submit = async (action: ServiceAction) => {
        if (isProcessing) return
        setIsProcessing(true)
        try {
            await onProcess({
                id: record.id,
                action,
                orderNumber: orderNumber.trim() || undefined,
                orderDate: orderDate || undefined,
                penaltyType: penaltyType.trim() || undefined,
                penaltyOther: penaltyOther.trim() || undefined,
                penaltyOfficerId: penaltyOfficerId || undefined,
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

                        {taggedOfficers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {taggedOfficers.map((officer: any) => (
                                    <div key={officer.id} className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-700">
                                        <span>{officer.lastName} {officer.firstName}</span>
                                        <button
                                            type="button"
                                            className="hover:text-blue-900"
                                            onClick={() => {
                                                setTaggedOfficers((prev) => prev.filter((item) => item.id !== officer.id))
                                                if (penaltyOfficerId === officer.id) {
                                                    setPenaltyOfficerId("")
                                                }
                                            }}
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
                                            setTaggedOfficers((prev) => [...prev, officer])
                                            if (!penaltyOfficerId) {
                                                setPenaltyOfficerId(officer.id)
                                            }
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

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Поліцейський</Label>
                            <Select value={penaltyOfficerId} onValueChange={setPenaltyOfficerId}>
                                <SelectTrigger className="h-10 rounded-xl">
                                    <SelectValue placeholder="Оберіть поліцейського" />
                                </SelectTrigger>
                                <SelectContent>
                                    {officersForSelect.map((officer) => (
                                        <SelectItem key={officer.id} value={officer.id}>
                                            {officer.label}{officer.badgeNumber ? ` (${officer.badgeNumber})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Варіант стягнення</Label>
                            <Select value={penaltyType} onValueChange={setPenaltyType}>
                                <SelectTrigger className="h-10 rounded-xl">
                                    <SelectValue placeholder="Оберіть стягнення" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PENALTY_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {penaltyType === "інший варіант" && (
                            <Input
                                value={penaltyOther}
                                onChange={(e) => setPenaltyOther(e.target.value)}
                                placeholder="Вкажіть інший варіант стягнення"
                                className="h-10 rounded-xl"
                            />
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
            <PopoverContent className="w-[380px] rounded-[1.5rem] border-none p-4 shadow-2xl space-y-4" align="end">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-700">Службове розслідування</p>
                </div>
                {content}
            </PopoverContent>
        </Popover>
    )
}
