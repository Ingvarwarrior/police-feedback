'use client'

import React, { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Search,
    Calendar as CalendarIcon,
    MapPin,
    User,
    ClipboardList,
    FileText,
    CheckCircle2,
    Clock,
    Filter,
    ArrowUpDown,
    Download,
    Edit2,
    Trash2,
    Briefcase,
    CheckSquare,
    Square,
    MoreVertical,
    UserPlus,
    XCircle,
    Loader2,
    Eye,
    Shield
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

import CreateRecordDialog from "./CreateRecordDialog"
import ViewRecordDialog from "./ViewRecordDialog"
import RecordProcessPopover from "./RecordProcessPopover"
import ImportDialog from "./ImportDialog"
import {
    deleteUnifiedRecordAction,
    bulkDeleteUnifiedRecordsAction,
    bulkAssignUnifiedRecordsAction,
    bulkUpdateResolutionAction,
    processUnifiedRecordAction,
    requestExtensionAction,
    reviewExtensionAction,
    returnForRevisionAction
} from "../actions/recordActions"
import {
    getApplicationBirthDate,
    getAssignedInspectorName,
    getRecordTypeLabel,
    isApplicationLike,
    normalizeRecordType,
} from "./unifiedRecord.helpers"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"

interface RecordListProps {
    initialRecords: any[]
    users: { id: string, firstName: string | null, lastName: string | null, username: string }[]
    currentUser: {
        id: string
        role: string
        firstName: string | null
        lastName: string | null
        username: string
    }
}

const FILTERS_STORAGE_KEY = "pf:filters:unified-record"

export default function RecordList({ initialRecords, users = [], currentUser }: RecordListProps) {
    const [records, setRecords] = useState(
        initialRecords
            .filter(r => r.recordType !== 'RAPORT')
            .map((r: any) => ({ ...r, recordType: normalizeRecordType(r.recordType, r.eoNumber) }))
    )
    const [filterSearch, setFilterSearch] = useState("")
    const [filterCategory, setFilterCategory] = useState("ALL")
    const [activeTab, setActiveTab] = useState("EO")
    const [filterStatus, setFilterStatus] = useState("PENDING") // Default to pending for better focus
    const [filterAssignment, setFilterAssignment] = useState("ALL") // ALL, ASSIGNED, UNASSIGNED
    const [filterEoNumber, setFilterEoNumber] = useState("")
    const [filterInspector, setFilterInspector] = useState("ALL")
    const [sortBy, setSortBy] = useState("newest")
    const [periodFrom, setPeriodFrom] = useState("")
    const [periodTo, setPeriodTo] = useState("")
    const [quickPreset, setQuickPreset] = useState<"ALL" | "MINE" | "OVERDUE" | "UNASSIGNED">("ALL")

    // View state
    const [viewRecord, setViewRecord] = useState<any>(null)
    const [isViewOpen, setIsViewOpen] = useState(false)

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)


    const searchParams = useSearchParams()

    useEffect(() => {
        setRecords(
            initialRecords
                .filter(r => r.recordType !== 'RAPORT')
                .map((r: any) => ({ ...r, recordType: normalizeRecordType(r.recordType, r.eoNumber) }))
        )
    }, [initialRecords])

    useEffect(() => {
        try {
            const raw = localStorage.getItem(FILTERS_STORAGE_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw)
            if (typeof parsed.filterSearch === "string") setFilterSearch(parsed.filterSearch)
            if (typeof parsed.filterCategory === "string") setFilterCategory(parsed.filterCategory)
            if (typeof parsed.filterStatus === "string") setFilterStatus(parsed.filterStatus)
            if (typeof parsed.filterAssignment === "string") setFilterAssignment(parsed.filterAssignment)
            if (typeof parsed.filterEoNumber === "string") setFilterEoNumber(parsed.filterEoNumber)
            if (typeof parsed.filterInspector === "string") setFilterInspector(parsed.filterInspector)
            if (typeof parsed.sortBy === "string") setSortBy(parsed.sortBy)
            if (typeof parsed.periodFrom === "string") setPeriodFrom(parsed.periodFrom)
            if (typeof parsed.periodTo === "string") setPeriodTo(parsed.periodTo)
            if (typeof parsed.quickPreset === "string") setQuickPreset(parsed.quickPreset)
            if (typeof parsed.activeTab === "string" && ["ALL", "EO", "ZVERN", "APPLICATION", "DETENTION_PROTOCOL"].includes(parsed.activeTab)) {
                setActiveTab(parsed.activeTab)
            }
        } catch {
            // ignore malformed local storage
        }
    }, [])

    useEffect(() => {
        localStorage.setItem(
            FILTERS_STORAGE_KEY,
            JSON.stringify({
                filterSearch,
                filterCategory,
                filterStatus,
                filterAssignment,
                filterEoNumber,
                filterInspector,
                sortBy,
                periodFrom,
                periodTo,
                quickPreset,
                activeTab,
            })
        )
    }, [
        filterSearch,
        filterCategory,
        filterStatus,
        filterAssignment,
        filterEoNumber,
        filterInspector,
        sortBy,
        periodFrom,
        periodTo,
        quickPreset,
        activeTab,
    ])

    // Auto-view record if recordId is in URL
    useEffect(() => {
        const recordId = searchParams.get('recordId')
        if (recordId && initialRecords.length > 0) {
            const record = initialRecords.find(r => r.id === recordId)
            if (record && record.recordType !== 'RAPORT') {
                setViewRecord(record)
                setIsViewOpen(true)
                // Optionally clear the tab filter if needed, but usually it's fine
                setActiveTab(record.recordType || 'ALL')
            }
        }
    }, [searchParams, initialRecords])


    const filteredRecords = useMemo(() => {
        let result = [...records]

        // Apply Tab filter
        if (activeTab !== 'ALL') {
            result = result.filter(r => r.recordType === activeTab)
        }

        // Apply search filter
        if (filterSearch.trim()) {
            const lowerSearch = filterSearch.trim().toLowerCase()
            result = result.filter(r =>
                (r.eoNumber && String(r.eoNumber).toLowerCase().includes(lowerSearch)) ||
                (r.description?.toLowerCase().includes(lowerSearch)) ||
                (r.address?.toLowerCase().includes(lowerSearch)) ||
                (r.applicant?.toLowerCase().includes(lowerSearch)) ||
                (r.officers?.some((o: any) =>
                    o.lastName?.toLowerCase().includes(lowerSearch) ||
                    o.firstName?.toLowerCase().includes(lowerSearch)
                ))
            )
        }

        // Apply category filter
        if (filterCategory !== 'ALL') {
            result = result.filter(r => r.category === filterCategory)
        }

        // Apply status filter
        if (filterStatus === 'PENDING') {
            result = result.filter(r => r.status !== 'PROCESSED')
        } else if (filterStatus === 'PROCESSED') {
            result = result.filter(r => r.status === 'PROCESSED')
        }

        // Apply assignment filter
        if (filterAssignment === 'ASSIGNED') {
            result = result.filter(r => r.assignedUserId !== null)
        } else if (filterAssignment === 'UNASSIGNED') {
            result = result.filter(r => r.assignedUserId === null)
        }

        // Apply EO number dedicated filter
        if (filterEoNumber.trim()) {
            const lowerEo = filterEoNumber.trim().toLowerCase()
            result = result.filter(r => r.eoNumber && String(r.eoNumber).toLowerCase().includes(lowerEo))
        }

        // Apply inspector filter
        if (filterInspector !== 'ALL') {
            result = result.filter(r => r.assignedUserId === filterInspector)
        }

        if (quickPreset === "MINE") {
            result = result.filter(r => r.assignedUserId === currentUser.id)
        }

        if (quickPreset === "UNASSIGNED") {
            result = result.filter(r => r.assignedUserId === null)
        }

        if (quickPreset === "OVERDUE") {
            const now = new Date()
            result = result.filter((r) => r.status !== "PROCESSED" && r.deadline && new Date(r.deadline) < now)
        }

        // Apply period filter (inclusive)
        if (periodFrom) {
            const from = new Date(periodFrom)
            from.setHours(0, 0, 0, 0)
            result = result.filter((r) => new Date(r.eoDate) >= from)
        }

        if (periodTo) {
            const to = new Date(periodTo)
            to.setHours(23, 59, 59, 999)
            result = result.filter((r) => new Date(r.eoDate) <= to)
        }

        // Apply sorting
        result.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.eoDate).getTime() - new Date(a.eoDate).getTime()
            if (sortBy === 'oldest') return new Date(a.eoDate).getTime() - new Date(b.eoDate).getTime()

            if (sortBy === 'eo_asc' || sortBy === 'eo_desc') {
                const valA = String(a.eoNumber || '')
                const valB = String(b.eoNumber || '')
                // Alphanumeric comparison
                const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                return sortBy === 'eo_asc' ? cmp : -cmp
            }

            return 0
        })

        return result
    }, [records, filterSearch, filterCategory, activeTab, filterStatus, filterAssignment, filterEoNumber, filterInspector, sortBy, quickPreset, periodFrom, periodTo, currentUser.id])

    const categories = useMemo(() => {
        const cats = new Set(initialRecords.map(r => r.category).filter(Boolean))
        return Array.from(cats)
    }, [initialRecords])

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredRecords.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredRecords.map(r => r.id))
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleDelete = async (id: string) => {
        setIsDeleting(true)
        try {
            await deleteUnifiedRecordAction(id)
            toast.success("Запис видалено")
            setRecords(prev => prev.filter(r => r.id !== id))
        } catch (error) {
            toast.error("Помилка видалення")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleBulkDelete = async () => {
        setIsDeleting(true)
        try {
            await bulkDeleteUnifiedRecordsAction(selectedIds)
            toast.success(`Видалено ${selectedIds.length} записів`)
            setRecords(prev => prev.filter(r => !selectedIds.includes(r.id)))
            setSelectedIds([])
        } catch (error) {
            toast.error("Помилка масового видалення")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleBulkAssign = async (userId: string) => {
        setIsAssigning(true)
        try {
            await bulkAssignUnifiedRecordsAction(selectedIds, userId)
            toast.success(`Призначено ${selectedIds.length} записів`)
            setRecords(prev => prev.map(r => selectedIds.includes(r.id) ? { ...r, assignedUserId: userId, assignedUser: users.find(u => u.id === userId) } : r))
            setSelectedIds([])
        } catch (error) {
            toast.error("Помилка масового призначення")
        } finally {
            setIsAssigning(false)
        }
    }

    const handleUpdateResolution = async (ids: string[], resolution: string, resolutionDate?: Date) => {
        try {
            await bulkUpdateResolutionAction(ids, resolution, resolutionDate)
            toast.success("Рішення оновлено")
            setRecords(prev => prev.map(r => ids.includes(r.id) ? { ...r, resolution, resolutionDate: resolutionDate?.toISOString() || null, status: "PROCESSED", processedAt: new Date().toISOString() } : r))
            setSelectedIds([])
        } catch (error) {
            toast.error("Помилка оновлення рішення")
        }
    }

    const handleProcess = async (id: string, resolution: string, officers: any[], concernsBpp: boolean) => {
        try {
            const officerIds = officers.map(o => o.id)
            const result: any = await processUnifiedRecordAction(id, resolution, officerIds, concernsBpp)

            if (result?.error) {
                toast.error(result.error)
                return
            }

            if (result?.success) {
                toast.success("Запис опрацьовано")

                setRecords(records.map(r =>
                    r.id === id
                        ? {
                            ...r,
                            status: 'PROCESSED',
                            resolution,
                            processedAt: new Date().toISOString(),
                            concernsBpp,
                            officers: officers
                        }
                        : r
                ))
            } else {
                toast.error("Невідома помилка при опрацюванні")
            }
        } catch (error: any) {
            console.error("handleProcess error:", error)
            toast.error("Помилка при опрацюванні запису")
        }
    }

    const handleRequestExtension = async (id: string, reason: string) => {
        try {
            await requestExtensionAction(id, reason)
            toast.success("Запит на продовження надіслано")
            setRecords(prev => prev.map(r => r.id === id ? { ...r, extensionStatus: "PENDING", extensionReason: reason } : r))
        } catch (error) {
            toast.error("Помилка запиту")
        }
    }

    const handleReviewExtension = async (id: string, approved: boolean) => {
        try {
            await reviewExtensionAction(id, approved)
            toast.success(approved ? "Продовження погоджено" : "Продовження відхилено")
            // Refresh records or update local state
            // For simplicity, let's just update local state if we have the new deadline
            setRecords(prev => prev.map(r => {
                if (r.id === id) {
                    const newDeadline = approved && r.deadline
                        ? new Date(new Date(r.deadline).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
                        : r.deadline
                    return { ...r, extensionStatus: approved ? "APPROVED" : "REJECTED", deadline: newDeadline }
                }
                return r
            }))
        } catch (error) {
            toast.error("Помилка розгляду запиту")
        }
    }

    const resolutionPresets = [
        "Складено адмінпротокол",
        "Проведено профілактичну бесіду",
        "Надіслано за належністю",
        "Долучено до матеріалів справи",
        "Кримінальне провадження",
        "Списано в справу"
    ]

    const handleExport = () => {
        const itemsToExport = selectedIds.length > 0
            ? records.filter(r => selectedIds.includes(r.id))
            : filteredRecords

        if (itemsToExport.length === 0) {
            toast.error("Немає записів для експорту")
            return
        }

        const exportData = itemsToExport.map(r => ({
            "Дата звернення": format(new Date(r.eoDate), 'dd.MM.yyyy', { locale: uk }),
            "№ ЄО/Звернення": r.eoNumber || '-',
            "Заявник": r.applicant || '-',
            "Виконавець": r.assignedUser ? `${r.assignedUser.lastName} ${r.assignedUser.firstName || ''}`.trim() : (r.assignedUserId === 'unassigned' ? 'Не призначено' : '—'),
            "Тип": getRecordTypeLabel(r.recordType, r.eoNumber),
            "Категорія": r.category || '-',
            "Статус": r.status === 'PROCESSED' ? 'Опрацьовано' : 'В роботі',
            "Рішення": r.resolution || '-'
        }))

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Unified Records")
        XLSX.writeFile(wb, `export_records_${format(new Date(), 'dd_MM_yyyy')}.xlsx`)

        toast.success(`Експортовано ${itemsToExport.length} записів`)
    }

    const resetFilters = () => {
        setFilterSearch("")
        setFilterEoNumber("")
        setFilterCategory("ALL")
        setFilterStatus("ALL")
        setFilterAssignment("ALL")
        setFilterInspector("ALL")
        setSortBy("newest")
        setPeriodFrom("")
        setPeriodTo("")
        setQuickPreset("ALL")
    }

    return (
        <div className="space-y-6">
            {/* Tabs & Actions Bar */}
            <div className="space-y-3">
                <Tabs value={activeTab} className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="bg-white/80 backdrop-blur-md p-1.5 rounded-[2rem] border border-slate-300 shadow-xl min-h-16 h-auto flex flex-wrap items-stretch justify-start w-full gap-1">
                        <TabsTrigger
                            value="ALL"
                            className="rounded-[1.2rem] sm:rounded-[1.5rem] px-3 sm:px-6 md:px-10 min-h-[44px] h-auto font-black uppercase tracking-widest text-[9px] sm:text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-800 data-[state=active]:to-slate-950 data-[state=active]:text-white transition-all duration-300 gap-2 sm:gap-3 grow sm:grow-0 basis-[calc(50%-0.25rem)] sm:basis-auto whitespace-normal leading-tight shadow-sm"
                        >
                            Всі записи
                            <span className="bg-slate-200/50 text-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="EO"
                            className="rounded-[1.2rem] sm:rounded-[1.5rem] px-3 sm:px-6 md:px-10 min-h-[44px] h-auto font-black uppercase tracking-widest text-[9px] sm:text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-800 data-[state=active]:text-white transition-all duration-300 gap-2 sm:gap-3 grow sm:grow-0 basis-[calc(50%-0.25rem)] sm:basis-auto whitespace-normal leading-tight shadow-sm"
                        >
                            Єдиний облік
                            <span className="bg-blue-50/50 text-blue-600 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.filter(r => r.recordType === 'EO').length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="ZVERN"
                            className="rounded-[1.2rem] sm:rounded-[1.5rem] px-3 sm:px-6 md:px-10 min-h-[44px] h-auto font-black uppercase tracking-widest text-[9px] sm:text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white transition-all duration-300 gap-2 sm:gap-3 grow sm:grow-0 basis-[calc(50%-0.25rem)] sm:basis-auto whitespace-normal leading-tight shadow-sm"
                        >
                            Звернення
                            <span className="bg-amber-50/50 text-amber-600 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.filter(r => r.recordType === 'ZVERN').length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="APPLICATION"
                            className="rounded-[1.2rem] sm:rounded-[1.5rem] px-3 sm:px-6 md:px-10 min-h-[44px] h-auto font-black uppercase tracking-widest text-[9px] sm:text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-red-700 data-[state=active]:text-white transition-all duration-300 gap-2 sm:gap-3 grow sm:grow-0 basis-[calc(50%-0.25rem)] sm:basis-auto whitespace-normal leading-tight shadow-sm"
                        >
                            Застосування сили/спецзасобів
                            <span className="bg-rose-50/50 text-rose-700 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.filter(r => r.recordType === 'APPLICATION').length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="DETENTION_PROTOCOL"
                            className="rounded-[1.2rem] sm:rounded-[1.5rem] px-3 sm:px-6 md:px-10 min-h-[44px] h-auto font-black uppercase tracking-widest text-[9px] sm:text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-600 data-[state=active]:to-violet-700 data-[state=active]:text-white transition-all duration-300 gap-2 sm:gap-3 grow sm:grow-0 basis-[calc(50%-0.25rem)] sm:basis-auto whitespace-normal leading-tight shadow-sm"
                        >
                            Протоколи затримання
                            <span className="bg-fuchsia-50/50 text-fuchsia-700 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.filter(r => r.recordType === 'DETENTION_PROTOCOL').length}
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {currentUser.role === 'ADMIN' && (
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 p-2 bg-white/90 backdrop-blur-md rounded-[2rem] border border-slate-200 shadow-xl w-full justify-start min-h-16 transition-all hover:shadow-2xl">
                        <CreateRecordDialog
                            users={users}
                            initialData={{ recordType: activeTab === 'ALL' ? 'EO' : activeTab }}
                            lockRecordType={activeTab !== 'ALL'}
                        />
                        {(activeTab === 'ALL' || activeTab === 'EO') && <ImportDialog defaultRecordType="EO" />}
                        {(activeTab === 'ZVERN') && <ImportDialog defaultRecordType="ZVERN" />}
                    </div>
                )}
            </div>

            {/* Filters Bar */}
            <div className="ds-filter-panel space-y-3">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
                    <div className="relative xl:col-span-2">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Пошук: № ЄО, подія, ПІБ, поліцейський"
                            className="h-11 rounded-xl pl-9"
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                        />
                    </div>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Всі статуси</SelectItem>
                            <SelectItem value="PENDING">В роботі</SelectItem>
                            <SelectItem value="PROCESSED">Опрацьовано</SelectItem>
                        </SelectContent>
                    </Select>

                    {currentUser.role === 'ADMIN' ? (
                        <Select value={filterInspector} onValueChange={setFilterInspector}>
                            <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="Виконавець" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Всі виконавці</SelectItem>
                                {users.map(u => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.lastName} {u.firstName?.charAt(0)}.
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Select value={filterAssignment} onValueChange={setFilterAssignment}>
                            <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="Виконавець" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Всі</SelectItem>
                                <SelectItem value="ASSIGNED">Призначені</SelectItem>
                                <SelectItem value="UNASSIGNED">Без виконавця</SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="h-11 rounded-xl">
                            <ArrowUpDown className="mr-2 h-4 w-4 text-slate-400" />
                            <SelectValue placeholder="Сортування" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Спочатку нові</SelectItem>
                            <SelectItem value="oldest">Спочатку старі</SelectItem>
                            <SelectItem value="eo_asc">№ ЄО (зростання)</SelectItem>
                            <SelectItem value="eo_desc">№ ЄО (спадання)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="h-11 rounded-xl" />
                    <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="h-11 rounded-xl" />

                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="h-11 rounded-xl">
                            <Filter className="mr-2 h-4 w-4 text-slate-400" />
                            <SelectValue placeholder="Категорія" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Всі категорії</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        className="h-11 rounded-xl"
                        onClick={resetFilters}
                    >
                        Скинути фільтри
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setQuickPreset("ALL")}
                        className={cn("ds-chip-muted", quickPreset === "ALL" && "ds-chip-active")}
                    >
                        Всі
                    </button>
                    <button
                        type="button"
                        onClick={() => setQuickPreset("MINE")}
                        className={cn("ds-chip-muted", quickPreset === "MINE" && "ds-chip-active")}
                    >
                        Мої
                    </button>
                    <button
                        type="button"
                        onClick={() => setQuickPreset("OVERDUE")}
                        className={cn("ds-chip-muted", quickPreset === "OVERDUE" && "ds-chip-active")}
                    >
                        Прострочені
                    </button>
                    <button
                        type="button"
                        onClick={() => setQuickPreset("UNASSIGNED")}
                        className={cn("ds-chip-muted", quickPreset === "UNASSIGNED" && "ds-chip-active")}
                    >
                        Без виконавця
                    </button>
                </div>
            </div>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className={cn(
                            "h-12 rounded-xl px-4 border-slate-300 font-bold gap-2 transition-all text-slate-700",
                            selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white hover:bg-slate-100"
                        )}
                        onClick={toggleSelectAll}
                    >
                        {selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? (
                            <CheckSquare className="w-4 h-4" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                        Вибрати всі
                    </Button>

                    <Button
                        variant="outline"
                        className="h-12 rounded-xl px-4 border-slate-300 hover:bg-slate-100 text-slate-700 font-bold gap-2"
                        onClick={handleExport}
                    >
                        <Download className="w-4 h-4" />
                        Експорт {selectedIds.length > 0 && `(${selectedIds.length})`}
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg shadow-blue-100/50 rounded-[2rem] bg-gradient-to-br from-blue-50 to-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ClipboardList className="w-16 h-16 text-blue-600" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">
                            {filterSearch || filterCategory !== 'ALL' || activeTab !== 'ALL' || quickPreset !== "ALL" ? "Знайдено записів" : "Всього записів"}
                        </p>
                        <h3 className="text-3xl font-black text-slate-900">{filteredRecords.length}</h3>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-lg shadow-emerald-100/50 rounded-[2rem] bg-gradient-to-br from-emerald-50 to-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Прийнято рішень</p>
                        <h3 className="text-3xl font-black text-slate-900">
                            {filteredRecords.filter(r => r.status === 'PROCESSED').length}
                        </h3>
                    </CardContent>
                </Card>
            </div>

            {/* Records List */}
            <div className="space-y-4">
                {filteredRecords.length === 0 ? (
                    <div className="ds-empty-state">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-600 transition-colors duration-300">
                            <FileText className="w-10 h-10" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="ds-empty-title transition-colors duration-300">Записів не знайдено</h3>
                            <p className="ds-empty-description transition-colors duration-300">Скиньте фільтри або створіть/імпортуйте новий запис.</p>
                        </div>
                        <div className="ds-empty-actions">
                            <Button variant="outline" className="rounded-xl" onClick={resetFilters}>
                                Скинути фільтри
                            </Button>
                            {currentUser.role === "ADMIN" ? (
                                <>
                                    <CreateRecordDialog
                                        users={users}
                                        initialData={{ recordType: activeTab === 'ALL' ? 'EO' : activeTab }}
                                        lockRecordType={activeTab !== 'ALL'}
                                    />
                                    {(activeTab === 'ALL' || activeTab === 'EO') && <ImportDialog defaultRecordType="EO" />}
                                </>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredRecords.map((record) => (
                            <Card key={record.id} className={cn(
                                "border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group border border-transparent bg-white dark:bg-slate-900/50 backdrop-blur-sm",
                                selectedIds.includes(record.id) ? "border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/10 dark:ring-blue-500/20" : "hover:border-blue-100 dark:hover:border-blue-900"
                            )}>
                                <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row relative">
                                        {/* Row Selection Checkbox */}
                                        <button
                                            onClick={() => toggleSelect(record.id)}
                                            className={cn(
                                                "absolute left-4 top-4 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                                selectedIds.includes(record.id) ? "bg-blue-600 text-white" : "bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 opacity-0 group-hover:opacity-100"
                                            )}
                                        >
                                            <CheckSquare className="w-4 h-4" />
                                        </button>

                                        {/* Status Sidebar */}
                                        <div className={`w-full lg:w-2 ${record.status === 'PROCESSED' ? 'bg-emerald-500' : (record.assignedUser || record.officerName ? 'bg-blue-500' : 'bg-amber-500')}`} />

                                        <div className="flex-1 p-5 md:p-8">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] md:text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-full shrink-0 transition-colors duration-300">
                                                            {record.eoNumber}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <CalendarIcon className="w-3.5 h-3.5" />
                                                            <span className="text-[10px] font-bold">
                                                                {format(new Date(record.eoDate), 'dd MMMM yyyy', { locale: uk })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <h3
                                                        onClick={() => {
                                                            setViewRecord(record)
                                                            setIsViewOpen(true)
                                                        }}
                                                        className="mt-2 cursor-pointer break-words text-base font-semibold leading-tight text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400 md:text-lg"
                                                    >
                                                        {record.recordType === 'APPLICATION'
                                                            ? `Рапорт №${record.eoNumber}`
                                                            : record.recordType === 'DETENTION_PROTOCOL'
                                                                ? `Протокол ${record.eoNumber || "—"}`
                                                                : (record.description || 'Без опису')}
                                                    </h3>
                                                    {record.recordType === 'APPLICATION' && (
                                                        <p className="mt-1 text-xs font-semibold tracking-wide text-slate-500">Застосування сили/спецзасобів</p>
                                                    )}
                                                    {record.recordType === 'DETENTION_PROTOCOL' && (
                                                        <p className="mt-1 text-xs font-semibold tracking-wide text-slate-500">Протоколи затримання</p>
                                                    )}
                                                </div>

                                                <div className="flex flex-row md:flex-wrap gap-1 md:gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 md:h-8 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex-1 md:flex-none"
                                                        onClick={() => {
                                                            setViewRecord(record)
                                                            setIsViewOpen(true)
                                                        }}
                                                    >
                                                        <Eye className="w-3.5 h-3.5 md:mr-1.5" />
                                                        <span className="hidden md:inline">Переглянути</span>
                                                    </Button>

                                                    {currentUser.role === 'ADMIN' && (
                                                        <>
                                                            <CreateRecordDialog
                                                                initialData={record}
                                                                users={users}
                                                                trigger={
                                                                    <Button variant="ghost" size="sm" className="h-9 md:h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex-1 md:flex-none">
                                                                        <Edit2 className="w-3.5 h-3.5 md:mr-1.5" />
                                                                        <span className="hidden md:inline">Змінити</span>
                                                                    </Button>
                                                                }
                                                            />

                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-9 md:h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all flex-1 md:flex-none">
                                                                        <Trash2 className="w-3.5 h-3.5 md:mr-1.5" />
                                                                        <span className="hidden md:inline">Видалити</span>
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="text-xl font-black uppercase italic tracking-tight">Будьте обережні!</AlertDialogTitle>
                                                                        <AlertDialogDescription className="text-slate-500 font-medium">
                                                                            Ви впевнені, що хочете видалити цей запис ({record.eoNumber})? <br />
                                                                            Цю дію неможливо буде скасувати.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter className="bg-slate-50 p-6 -m-6 mt-6 rounded-b-[2rem]">
                                                                        <AlertDialogCancel className="rounded-xl border-none font-bold text-slate-500">Скасувати</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDelete(record.id)}
                                                                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                                                                        >
                                                                            Так, видалити
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </>
                                                    )}

                                                    {record.deadline && record.status !== 'PROCESSED' && (
                                                        <div className={cn(
                                                            "px-2 md:px-3 py-1 flex items-center gap-1.5 rounded-lg border text-[8px] md:text-[9px] font-black uppercase tracking-wider transition-colors duration-300",
                                                            new Date(record.deadline) < new Date() ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700"
                                                        )}>
                                                            <Clock className="w-3 h-3" />
                                                            До: {format(new Date(record.deadline), 'dd.MM.yy')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <User className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs font-black uppercase tracking-widest">
                                                            {record.recordType === 'APPLICATION'
                                                                ? 'ПІБ'
                                                                : record.recordType === 'DETENTION_PROTOCOL'
                                                                    ? 'ПІБ кого затримали'
                                                                    : 'Заявник'}
                                                        </span>
                                                        </div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white transition-colors duration-300">
                                                        {isApplicationLike(record)
                                                            ? (record.applicant || '—')
                                                            : (<><span className="text-slate-400 text-[10px] mr-1">Гр.</span> {record.applicant || '—'}</>)}
                                                        </p>
                                                    </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <FileText className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs font-black uppercase tracking-widest">
                                                            {isApplicationLike(record) ? 'Дата народження / дії' : 'Результат'}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1">
                                                        {isApplicationLike(record) ? (
                                                            <>
                                                                <div className="text-sm font-bold italic text-slate-700 dark:text-slate-300 transition-colors duration-300">
                                                                    {getApplicationBirthDate(record)}
                                                                </div>
                                                                <div className={cn(
                                                                    "text-sm font-bold italic transition-colors duration-300",
                                                                    record.status === 'PROCESSED'
                                                                        ? "text-emerald-700 dark:text-emerald-400"
                                                                        : (record.assignedUserId ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400")
                                                                )}>
                                                                    {record.status === 'PROCESSED'
                                                                        ? (record.resolution || 'Виконано')
                                                                        : (record.assignedUserId ? (record.resolution ? 'Потребує доопрацювання/В процесі...' : 'В процесі розгляду...') : 'Не призначено')}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className={cn(
                                                                "text-sm font-bold italic transition-colors duration-300",
                                                                record.status === 'PROCESSED' ? "text-emerald-700 dark:text-emerald-400" : (record.assignedUserId ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400")
                                                            )}>
                                                                {record.status === 'PROCESSED'
                                                                    ? (record.resolution || 'Виконано')
                                                                    : (record.assignedUserId ? (record.resolution ? 'Потребує доопрацювання/В процесі...' : 'В процесі розгляду...') : 'Не призначено')}
                                                            </div>
                                                        )}

                                                        {record.resolutionDate && (
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium italic">
                                                                <CalendarIcon className="w-3 h-3" />
                                                                Виконано: {format(new Date(record.resolutionDate), "dd.MM.yyyy", { locale: uk })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tagged Officers */}
                                                {((isApplicationLike(record) || record.concernsBpp) && record.officers && record.officers.length > 0) && (
                                                    <div className="space-y-3 col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <Shield className="w-4 h-4 shrink-0" />
                                                            <span className="text-xs font-black uppercase tracking-widest">
                                                                {isApplicationLike(record) ? "Поліцейські, яких стосується" : "Прив'язані поліцейські"}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {record.officers.map((officer: any) => (
                                                                <div key={officer.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-tight italic">
                                                                    {officer.lastName} {officer.firstName?.charAt(0)}.
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {(isApplicationLike(record) && (!record.officers || record.officers.length === 0)) && (
                                                    <div className="space-y-3 col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <Shield className="w-4 h-4 shrink-0" />
                                                            <span className="text-xs font-black uppercase tracking-widest">Поліцейські, яких стосується</span>
                                                        </div>
                                                        <p className="text-xs font-bold italic text-slate-400">Не вказано</p>
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Briefcase className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs font-black uppercase tracking-widest">{isApplicationLike(record) ? 'Виконавець' : 'Відповідальний'}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {isApplicationLike(record) && currentUser.role !== 'ADMIN' ? (
                                                            <p className="text-sm font-bold text-slate-900">{getAssignedInspectorName(record)}</p>
                                                        ) : (
                                                            <Select
                                                                defaultValue={record.assignedUserId || undefined}
                                                                onValueChange={async (val) => {
                                                                    const targetIds = selectedIds.includes(record.id) ? selectedIds : [record.id]
                                                                    setIsAssigning(true)
                                                                    try {
                                                                        await bulkAssignUnifiedRecordsAction(targetIds, val)
                                                                        toast.success(targetIds.length > 1 ? `Призначено ${targetIds.length} записів` : "Інспектора призначено")
                                                                        setRecords(prev => prev.map(r => targetIds.includes(r.id) ? { ...r, assignedUserId: val, assignedUser: users.find(u => u.id === val) } : r))
                                                                        setSelectedIds([])
                                                                    } catch (error) {
                                                                        toast.error("Помилка призначення")
                                                                    } finally {
                                                                        setIsAssigning(false)
                                                                    }
                                                                }}
                                                                disabled={isAssigning || currentUser.role !== 'ADMIN'}
                                                            >
                                                                <SelectTrigger className="h-10 rounded-xl border-slate-300 bg-white hover:bg-slate-50 transition-all text-sm font-black text-slate-900 w-full shadow-sm">
                                                                    <SelectValue placeholder="Оберіть інспектора..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                                    {users.map(user => (
                                                                        <SelectItem key={user.id} value={user.id}>
                                                                            {user.lastName} {user.firstName || user.username}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}

                                                        {record.status === 'PROCESSED' && (
                                                            <div className="mt-4">
                                                                <RecordProcessPopover
                                                                    recordId={record.id}
                                                                    onProcess={handleProcess}
                                                                    initialResolution={record.resolution || ""}
                                                                    initialOfficers={record.officers || []}
                                                                    initialConcernsBpp={record.concernsBpp}
                                                                    mode={isApplicationLike(record) ? "application" : "default"}
                                                                    trigger={
                                                                        <Button variant="outline" className="w-full border-slate-200 text-slate-600 rounded-xl font-bold h-9 gap-2 hover:bg-slate-50 transition-all">
                                                                            <Edit2 className="w-3.5 h-3.5" />
                                                                            Коригувати дані
                                                                        </Button>
                                                                    }
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Single "DONE" Button for assigned user */}
                                                        {record.assignedUserId === currentUser.id && record.status !== 'PROCESSED' && (
                                                            <div className="flex flex-col gap-2 mt-4">
                                                                <RecordProcessPopover
                                                                    recordId={record.id}
                                                                    onProcess={handleProcess}
                                                                    mode={isApplicationLike(record) ? "application" : "default"}
                                                                />

                                                                {!isApplicationLike(record) && (record.extensionStatus !== 'PENDING' ? (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button variant="outline" className="w-full border-slate-200 text-slate-600 rounded-xl font-bold h-9 gap-2">
                                                                                <Clock className="w-4 h-4" />
                                                                                Продовжити строк
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="p-4 rounded-2xl w-80 shadow-2xl border-none space-y-3">
                                                                            <h4 className="font-black uppercase text-xs tracking-widest text-blue-600">Причина продовження:</h4>
                                                                            <Textarea
                                                                                placeholder="Напр. Додаткова перевірка..."
                                                                                className="rounded-xl bg-slate-50 border-none"
                                                                            />
                                                                            <Button
                                                                                className="w-full bg-blue-600 text-white rounded-xl font-bold"
                                                                                onClick={(e) => {
                                                                                    const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement
                                                                                    handleRequestExtension(record.id, textarea.value)
                                                                                }}
                                                                            >
                                                                                Надіслати запит (+15 днів)
                                                                            </Button>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                ) : (
                                                                        <div className="bg-amber-50 text-amber-700 text-[10px] font-bold p-2 rounded-xl text-center border border-amber-100">
                                                                            Запит на продовження очікує розгляду
                                                                        </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Admin Review for extensions or Return for Revision */}
                                                        {!isApplicationLike(record) && currentUser.role === 'ADMIN' && (
                                                            <div className="mt-3 space-y-2">
                                                                {record.extensionStatus === 'PENDING' && (
                                                                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
                                                                        <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" /> Запит на продовження
                                                                        </p>
                                                                        <p className="text-xs font-bold text-slate-700 italic">"{record.extensionReason}"</p>
                                                                        <div className="flex gap-2">
                                                                            <Button
                                                                                size="sm"
                                                                                className="flex-1 bg-emerald-600 text-white rounded-lg font-bold h-8 text-[10px]"
                                                                                onClick={() => handleReviewExtension(record.id, true)}
                                                                            >
                                                                                Погодити
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="flex-1 border-red-200 text-red-600 rounded-lg font-bold h-8 text-[10px]"
                                                                                onClick={() => handleReviewExtension(record.id, false)}
                                                                            >
                                                                                Відхилити
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {record.status === 'PROCESSED' && (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                className="w-full border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold h-9 gap-2"
                                                                            >
                                                                                <ArrowUpDown className="w-4 h-4" />
                                                                                Повернути на доопрацювання
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="p-4 rounded-2xl w-80 shadow-2xl border-none space-y-3">
                                                                            <h4 className="font-black uppercase text-xs tracking-widest text-red-600">Причина повернення:</h4>
                                                                            <Textarea
                                                                                placeholder="Вкажіть, що потрібно виправити..."
                                                                                className="rounded-xl bg-slate-50 border-none min-h-[80px]"
                                                                            />
                                                                            <Button
                                                                                className="w-full bg-red-600 text-white rounded-xl font-bold"
                                                                                onClick={async (e) => {
                                                                                    const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement
                                                                                    if (!textarea.value) return toast.error("Вкажіть причину")
                                                                                    try {
                                                                                        const res = await returnForRevisionAction(record.id, textarea.value)
                                                                                        if (res.success) {
                                                                                            toast.success("Запис повернуто на доопрацювання")
                                                                                        }
                                                                                    } catch (err: any) {
                                                                                        toast.error(err.message)
                                                                                    }
                                                                                }}
                                                                            >
                                                                                Підтвердити повернення
                                                                            </Button>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                )}
                                                            </div>
                                                        )}

                                                        {record.officerName && !record.assignedUser && (
                                                            <p className="text-[10px] font-medium text-slate-400 mt-1 italic pl-1">
                                                                З файлу: {record.officerName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Bulk Actions Floating Toolbar */}
            {
                selectedIds.length > 0 && (
                    <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 w-[95%] md:w-auto">
                        <div className="bg-slate-900 text-white px-4 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-center gap-4 md:gap-8 border border-white/10 backdrop-blur-xl max-h-[80vh] overflow-y-auto md:overflow-visible">
                            <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Вибрано</span>
                                    <span className="text-sm md:text-xl font-black italic">{selectedIds.length} записів</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="h-8 w-8 rounded-lg hover:bg-white/10 text-slate-400 p-0 md:hidden"
                                    onClick={() => setSelectedIds([])}
                                >
                                    <XCircle className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="h-px md:h-11 w-full md:w-px bg-white/10" />

                            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                                {currentUser.role === 'ADMIN' && (
                                    <Select onValueChange={(val) => handleBulkAssign(val)}>
                                        <SelectTrigger className="h-10 md:h-12 rounded-xl md:rounded-2xl bg-white/10 border-white/20 hover:bg-white/20 transition-all min-w-[140px] md:min-w-[200px] text-[10px] md:text-sm font-bold text-white shadow-lg">
                                            <UserPlus className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2 text-blue-300" />
                                            <SelectValue placeholder="Призначити..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                            {users.map(user => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.lastName} {user.firstName || user.username}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button className="h-10 md:h-12 rounded-xl md:rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold px-3 md:px-6 transition-all gap-1 md:gap-2 text-[10px] md:text-sm shadow-lg">
                                            <CheckCircle2 className="w-3 md:w-4 h-3 md:h-4" />
                                            Рішення
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 md:w-80 p-6 rounded-[2rem] border-none shadow-2xl space-y-4 mb-4">
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-black uppercase tracking-tight italic">Рішення для {selectedIds.length} записів:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {resolutionPresets.map(preset => (
                                                    <button
                                                        key={preset}
                                                        onClick={() => handleUpdateResolution(selectedIds, preset)}
                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-bold transition-all w-full text-left"
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {currentUser.role === 'ADMIN' && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="h-10 md:h-12 rounded-xl md:rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold px-3 md:px-6 transition-all gap-1 md:gap-2 text-[10px] md:text-sm">
                                                <Trash2 className="w-3 md:w-4 h-3 md:h-4" />
                                                <span className="hidden sm:inline">Видалити</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl w-[90%] md:w-full">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-lg md:text-xl font-black uppercase italic tracking-tight">Масове видалення</AlertDialogTitle>
                                                <AlertDialogDescription className="text-sm md:text-base text-slate-500 font-medium">
                                                    Ви впевнені, що хочете видалити {selectedIds.length} вибраних записів?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="bg-slate-50 p-4 md:p-6 -m-4 md:-m-6 mt-4 md:mt-6 rounded-b-[2rem] flex-col md:flex-row gap-2">
                                                <AlertDialogCancel className="rounded-xl border-none font-bold text-slate-500 mt-0">Скасувати</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleBulkDelete}
                                                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                                                >
                                                    Так, видалити все
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}

                                <Button
                                    variant="ghost"
                                    className="h-10 md:h-12 w-10 md:w-12 rounded-xl md:rounded-2xl hover:bg-white/10 text-slate-400 p-0 hidden md:flex"
                                    onClick={() => setSelectedIds([])}
                                >
                                    <XCircle className="w-5 md:w-6 h-5 md:h-6" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
            < ViewRecordDialog
                record={viewRecord}
                isOpen={isViewOpen}
                onOpenChange={setIsViewOpen}
            />
        </div >
    )
}
