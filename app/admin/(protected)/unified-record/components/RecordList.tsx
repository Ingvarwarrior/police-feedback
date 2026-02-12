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
    CalendarCheck2,
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
    TabsContent,
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

export default function RecordList({ initialRecords, users = [], currentUser }: RecordListProps) {
    const [records, setRecords] = useState(initialRecords.filter(r => r.recordType !== 'RAPORT'))
    const [filterSearch, setFilterSearch] = useState("")
    const [filterCategory, setFilterCategory] = useState("ALL")
    const [activeTab, setActiveTab] = useState("ALL")
    const [filterStatus, setFilterStatus] = useState("PENDING") // Default to pending for better focus
    const [filterAssignment, setFilterAssignment] = useState("ALL") // ALL, ASSIGNED, UNASSIGNED
    const [filterEoNumber, setFilterEoNumber] = useState("")
    const [filterInspector, setFilterInspector] = useState("ALL")
    const [sortBy, setSortBy] = useState("newest")
    const [showOnlyMine, setShowOnlyMine] = useState(false)

    // View state
    const [viewRecord, setViewRecord] = useState<any>(null)
    const [isViewOpen, setIsViewOpen] = useState(false)

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)


    const searchParams = useSearchParams()

    useEffect(() => {
        setRecords(initialRecords.filter(r => r.recordType !== 'RAPORT'))
    }, [initialRecords])

    const getApplicationBirthDate = (record: any) => {
        const val = record?.address || ""
        if (typeof val !== "string") return "—"
        if (!val.startsWith("DOB:")) return "—"
        const iso = val.replace("DOB:", "")
        if (!iso) return "—"
        const [y, m, d] = iso.split("-")
        if (!y || !m || !d) return iso
        return `${d}.${m}.${y}`
    }

    const isApplicationLike = (record: any) => record.recordType === "APPLICATION" || record.recordType === "DETENTION_PROTOCOL"

    const getAssignedInspectorName = (record: any) => {
        if (!record.assignedUser) return "Не призначено"
        return `${record.assignedUser.lastName || ""} ${record.assignedUser.firstName || ""}`.trim() || record.assignedUser.username || "Призначено"
    }

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

        // Apply "show only mine" filter
        if (showOnlyMine) {
            result = result.filter(r => r.assignedUserId === currentUser.id)
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
    }, [records, filterSearch, filterCategory, activeTab, filterStatus, filterAssignment, filterEoNumber, filterInspector, sortBy, showOnlyMine, currentUser.id])

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
            "Тип": r.recordType === 'EO' ? 'ЄО' : r.recordType === 'ZVERN' ? 'Звернення' : r.recordType === 'APPLICATION' ? 'Застосування' : 'Протоколи затримання',
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

    return (
        <div className="space-y-6">
            {/* Tabs & Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Tabs defaultValue="ALL" className="w-full sm:w-auto" onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="bg-white/80 backdrop-blur-md p-1.5 rounded-[2rem] border border-slate-300 shadow-xl h-16 flex items-center justify-start w-full sm:w-fit overflow-x-auto no-scrollbar gap-1">
                        <TabsTrigger
                            value="ALL"
                            className="rounded-[1.5rem] px-6 md:px-10 h-full font-black uppercase tracking-widestr text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-800 data-[state=active]:to-slate-950 data-[state=active]:text-white transition-all duration-300 gap-3 shrink-0 shadow-sm"
                        >
                            Всі записи
                            <span className="bg-slate-200/50 text-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="EO"
                            className="rounded-[1.5rem] px-6 md:px-10 h-full font-black uppercase tracking-widest text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-800 data-[state=active]:text-white transition-all duration-300 gap-3 shrink-0 shadow-sm"
                        >
                            Єдиний облік
                            <span className="bg-blue-50/50 text-blue-600 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.filter(r => r.recordType === 'EO').length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="ZVERN"
                            className="rounded-[1.5rem] px-6 md:px-10 h-full font-black uppercase tracking-widest text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white transition-all duration-300 gap-3 shrink-0 shadow-sm"
                        >
                            Звернення
                            <span className="bg-amber-50/50 text-amber-600 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.filter(r => r.recordType === 'ZVERN').length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="APPLICATION"
                            className="rounded-[1.5rem] px-6 md:px-10 h-full font-black uppercase tracking-widest text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-red-700 data-[state=active]:text-white transition-all duration-300 gap-3 shrink-0 shadow-sm"
                        >
                            Застосування
                            <span className="bg-rose-50/50 text-rose-700 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.filter(r => r.recordType === 'APPLICATION').length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="DETENTION_PROTOCOL"
                            className="rounded-[1.5rem] px-6 md:px-10 h-full font-black uppercase tracking-widest text-[10px] md:text-[11px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-600 data-[state=active]:to-violet-700 data-[state=active]:text-white transition-all duration-300 gap-3 shrink-0 shadow-sm"
                        >
                            Протоколи затримання
                            <span className="bg-fuchsia-50/50 text-fuchsia-700 px-2.5 py-1 rounded-xl text-[10px] font-black min-w-[24px] text-center">
                                {records.filter(r => r.recordType === 'DETENTION_PROTOCOL').length}
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {currentUser.role === 'ADMIN' && (
                    <div className="flex items-center gap-3 p-2 bg-white/90 backdrop-blur-md rounded-[2rem] border border-slate-200 shadow-xl w-full sm:w-auto justify-center sm:justify-start h-16 overflow-x-auto no-scrollbar transition-all hover:shadow-2xl">
                        <CreateRecordDialog users={users} initialData={{ recordType: activeTab === 'ALL' ? 'EO' : activeTab }} />
                        {(activeTab === 'ALL' || activeTab === 'EO') && <ImportDialog defaultRecordType="EO" />}
                        {(activeTab === 'ZVERN') && <ImportDialog defaultRecordType="ZVERN" />}
                    </div>
                )}
            </div>

            {/* Status Tabs (Combined with Type tabs for a logical flow) */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 rounded-[2.5rem] border border-slate-300 w-full sm:w-fit shadow-inner">
                <button
                    onClick={() => setFilterStatus('PENDING')}
                    className={cn(
                        "px-6 sm:px-8 py-3 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all gap-3 flex items-center flex-1 sm:flex-none justify-center border-none",
                        filterStatus === 'PENDING' ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg ring-2 ring-blue-200" : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                    )}
                >
                    <Clock className={cn("w-4 h-4", filterStatus === 'PENDING' ? "text-white" : "text-blue-500")} />
                    В роботі
                    <span className={cn(
                        "px-2.5 py-1 rounded-xl text-[9px] font-black min-w-[20px] shadow-sm",
                        filterStatus === 'PENDING' ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"
                    )}>
                        {records.filter(r => (activeTab === 'ALL' || r.recordType === activeTab) && r.status !== 'PROCESSED').length}
                    </span>
                </button>
                <button
                    onClick={() => setFilterStatus('PROCESSED')}
                    className={cn(
                        "px-6 sm:px-8 py-3 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all gap-3 flex items-center flex-1 sm:flex-none justify-center border-none",
                        filterStatus === 'PROCESSED' ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg ring-2 ring-emerald-200" : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                    )}
                >
                    <CheckCircle2 className={cn("w-4 h-4", filterStatus === 'PROCESSED' ? "text-white" : "text-emerald-500")} />
                    Опрацьовані
                    <span className={cn(
                        "px-2.5 py-1 rounded-xl text-[9px] font-black min-w-[20px] shadow-sm",
                        filterStatus === 'PROCESSED' ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600"
                    )}>
                        {records.filter(r => (activeTab === 'ALL' || r.recordType === activeTab) && r.status === 'PROCESSED').length}
                    </span>
                </button>
                <button
                    onClick={() => setFilterStatus('ALL')}
                    className={cn(
                        "px-6 sm:px-8 py-3 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all gap-3 flex items-center flex-1 sm:flex-none justify-center border-none",
                        filterStatus === 'ALL' ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg ring-2 ring-slate-300" : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                    )}
                >
                    <ClipboardList className={cn("w-4 h-4", filterStatus === 'ALL' ? "text-white" : "text-slate-400")} />
                    Всі
                    <span className={cn(
                        "px-2.5 py-1 rounded-xl text-[9px] font-black min-w-[20px] shadow-sm",
                        filterStatus === 'ALL' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    )}>
                        {records.filter(r => (activeTab === 'ALL' || r.recordType === activeTab)).length}
                    </span>
                </button>
            </div>

            {/* Assignment Filters (Admin Only) */}
            {
                currentUser.role === 'ADMIN' && (
                    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-[2.2rem] border border-slate-300 w-full sm:w-fit shadow-inner">
                        <button
                            onClick={() => setFilterAssignment('ALL')}
                            className={cn(
                                "flex-1 sm:flex-none px-6 sm:px-7 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all gap-2.5 flex items-center justify-center border-none",
                                filterAssignment === 'ALL' ? "bg-gradient-to-r from-slate-800 to-slate-950 text-white shadow-md ring-2 ring-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                            )}
                        >
                            Всі
                            <span className={cn(
                                "px-2 py-0.5 rounded-xl text-[9px] font-black min-w-[20px] shadow-xs transition-colors duration-300",
                                filterAssignment === 'ALL' ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                            )}>
                                {records.filter(r => (activeTab === 'ALL' || r.recordType === activeTab) && (filterStatus === 'ALL' || (filterStatus === 'PENDING' ? r.status !== 'PROCESSED' : r.status === 'PROCESSED'))).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setFilterAssignment('ASSIGNED')}
                            className={cn(
                                "flex-1 sm:flex-none px-6 sm:px-7 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all gap-2.5 flex items-center justify-center border-none",
                                filterAssignment === 'ASSIGNED' ? "bg-gradient-to-r from-indigo-500 to-blue-700 text-white shadow-md ring-2 ring-blue-100 dark:ring-blue-900" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
                            )}
                        >
                            <User className={cn("w-3.5 h-3.5", filterAssignment === 'ASSIGNED' ? "text-white" : "text-indigo-500")} />
                            Призначені
                            <span className={cn(
                                "px-2 py-0.5 rounded-xl text-[9px] font-black min-w-[20px] shadow-xs",
                                filterAssignment === 'ASSIGNED' ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                            )}>
                                {filteredRecords.filter(r => r.assignedUserId !== null).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setFilterAssignment('UNASSIGNED')}
                            className={cn(
                                "flex-1 sm:flex-none px-6 sm:px-7 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all gap-2.5 flex items-center justify-center border-none",
                                filterAssignment === 'UNASSIGNED' ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md ring-2 ring-amber-100 dark:ring-amber-900" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
                            )}
                        >
                            <UserPlus className={cn("w-3.5 h-3.5", filterAssignment === 'UNASSIGNED' ? "text-white" : "text-amber-500")} />
                            Непризначені
                            <span className={cn(
                                "px-2 py-0.5 rounded-xl text-[9px] font-black min-w-[20px] shadow-xs",
                                filterAssignment === 'UNASSIGNED' ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                            )}>
                                {filteredRecords.filter(r => r.assignedUserId === null).length}
                            </span>
                        </button>
                    </div>
                )
            }
            {/* Filters Bar */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-5 md:p-7 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 flex flex-col xl:flex-row gap-5 items-center justify-between transition-all hover:shadow-2xl hover:shadow-slate-300/50 dark:hover:shadow-slate-900/50">
                <div className="flex flex-col md:flex-row gap-5 w-full xl:w-auto flex-1">
                    <div className="relative group flex-1 md:max-w-xs transition-all">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                            placeholder="№ ЄО..."
                            className="pl-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl h-14 focus-visible:ring-4 focus-visible:ring-blue-500/10 dark:focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border-2 transition-all"
                            value={filterEoNumber}
                            onChange={(e) => setFilterEoNumber(e.target.value)}
                        />
                    </div>

                    <div className="relative group flex-[2] transition-all">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                            placeholder="Пошук за подією або прізвищем..."
                            className="pl-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl h-14 focus-visible:ring-4 focus-visible:ring-blue-500/10 dark:focus-visible:ring-blue-500/20 focus-visible:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border-2 transition-all font-medium"
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {currentUser.role === 'ADMIN' && (
                        <Select value={filterInspector} onValueChange={setFilterInspector}>
                            <SelectTrigger className="flex-1 md:w-[220px] rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-14 font-black uppercase tracking-widest text-[10px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-blue-400 transition-all">
                                <User className="w-4 h-4 mr-2 text-slate-400" />
                                <SelectValue placeholder="Інспектор" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-200 shadow-2xl overflow-hidden p-1 bg-white/95 backdrop-blur-sm">
                                <SelectItem value="ALL" className="rounded-xl font-bold text-slate-500 uppercase tracking-widest text-[9px] focus:bg-slate-100 transition-colors">Всі інспектори</SelectItem>
                                {users.map(u => (
                                    <SelectItem key={u.id} value={u.id} className="rounded-xl font-black uppercase tracking-widest text-[10px] focus:bg-blue-50 focus:text-blue-700 transition-colors">
                                        {u.lastName} {u.firstName?.charAt(0)}.
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="flex-1 md:w-[200px] rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-14 font-black uppercase tracking-widest text-[10px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-blue-400 transition-all">
                            <Filter className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Категорія" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 shadow-2xl overflow-hidden p-1 bg-white/95 backdrop-blur-sm">
                            <SelectItem value="ALL" className="rounded-xl font-bold text-slate-500 uppercase tracking-widest text-[9px] focus:bg-slate-100 transition-colors">Всі категорії</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat} className="rounded-xl font-black uppercase tracking-widest text-[10px] focus:bg-blue-50 focus:text-blue-700 transition-colors">
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="flex-1 md:w-[200px] rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-14 font-black uppercase tracking-widest text-[10px] text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-blue-400 transition-all">
                            <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Сортування" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 shadow-2xl overflow-hidden p-1 bg-white/95 backdrop-blur-sm">
                            <SelectItem value="newest" className="rounded-xl font-black uppercase tracking-widest text-[10px] focus:bg-blue-50 focus:text-blue-700 transition-colors">Спочатку нові</SelectItem>
                            <SelectItem value="oldest" className="rounded-xl font-black uppercase tracking-widest text-[10px] focus:bg-blue-50 focus:text-blue-700 transition-colors">Спочатку старі</SelectItem>
                            <SelectItem value="eo_asc" className="rounded-xl font-black uppercase tracking-widest text-[10px] focus:bg-blue-50 focus:text-blue-700 transition-colors">№ ЄО (зростання)</SelectItem>
                            <SelectItem value="eo_desc" className="rounded-xl font-black uppercase tracking-widest text-[10px] focus:bg-blue-50 focus:text-blue-700 transition-colors">№ ЄО (спадання)</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="h-10 w-px bg-slate-200 hidden sm:block mx-1" />

                    <Button
                        variant={showOnlyMine ? "default" : "outline"}
                        onClick={() => setShowOnlyMine(!showOnlyMine)}
                        className={cn(
                            "h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all px-8 gap-3 border-2 shrink-0",
                            showOnlyMine ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl border-blue-400" : "border-slate-200 text-slate-700 hover:bg-white hover:border-blue-400 bg-slate-50"
                        )}
                    >
                        <CalendarCheck2 className={cn("w-4 h-4", showOnlyMine ? "text-white" : "text-blue-500")} />
                        {showOnlyMine ? "Мої завдання" : "Всі записи"}
                    </Button>

                    <Button
                        variant="ghost"
                        className="h-14 w-14 rounded-2xl bg-slate-100 border-2 border-slate-200 text-slate-400 hover:bg-white hover:text-red-500 hover:border-red-400 transition-all group shrink-0"
                        onClick={() => {
                            setFilterSearch("");
                            setFilterEoNumber("");
                            setFilterCategory("ALL");
                            setFilterStatus("ALL");
                            setFilterAssignment("ALL");
                            setFilterInspector("ALL");
                        }}
                    >
                        <Filter className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </Button>
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
                            {filterSearch || filterCategory !== 'ALL' || activeTab !== 'ALL' || showOnlyMine ? "Знайдено записів" : "Всього записів"}
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
                            {filteredRecords.filter(r => r.resolution).length}
                        </h3>
                    </CardContent>
                </Card>
            </div>

            {/* Records List */}
            <div className="space-y-4">
                {filteredRecords.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-600 transition-colors duration-300">
                            <FileText className="w-10 h-10" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight transition-colors duration-300">Записів не знайдено</h3>
                            <p className="text-slate-500 dark:text-slate-400 transition-colors duration-300">Завантажте Excel-файл або змініть параметри пошуку</p>
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
                                                        className="text-base md:text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight leading-tight mt-2 break-words cursor-pointer"
                                                    >
                                                        {record.recordType === 'APPLICATION'
                                                            ? `Рапорт №${record.eoNumber}`
                                                            : record.recordType === 'DETENTION_PROTOCOL'
                                                                ? `Протокол ${record.eoNumber || "—"}`
                                                                : (record.description || 'Без опису')}
                                                    </h3>
                                                    {record.recordType === 'APPLICATION' && (
                                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Застосування</p>
                                                    )}
                                                    {record.recordType === 'DETENTION_PROTOCOL' && (
                                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Протоколи затримання</p>
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
                                                        <span className="text-xs font-black uppercase tracking-widest">{isApplicationLike(record) ? 'Дата народження' : 'Результат'}</span>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className={cn(
                                                            "text-sm font-bold italic transition-colors duration-300",
                                                            record.status === 'PROCESSED' ? "text-emerald-700 dark:text-emerald-400" : (record.assignedUserId ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400")
                                                        )}>
                                                            {isApplicationLike(record)
                                                                ? getApplicationBirthDate(record)
                                                                : (record.status === 'PROCESSED' ? (record.resolution || 'Виконано') : (record.assignedUserId ? (record.resolution ? 'Потребує доопрацювання/В процесі...' : 'В процесі розгляду...') : 'Не призначено'))}
                                                        </div>
                                                        {!isApplicationLike(record) && record.resolutionDate && (
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium italic">
                                                                <CalendarIcon className="w-3 h-3" />
                                                                Виконано: {format(new Date(record.resolutionDate), "dd.MM.yyyy", { locale: uk })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tagged Officers */}
                                                {!isApplicationLike(record) && record.concernsBpp && record.officers && record.officers.length > 0 && (
                                                    <div className="space-y-3 col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <Shield className="w-4 h-4 shrink-0" />
                                                            <span className="text-xs font-black uppercase tracking-widest">Прив'язані поліцейські</span>
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

                                                        {!isApplicationLike(record) && record.status === 'PROCESSED' && (
                                                            <div className="mt-4">
                                                                <RecordProcessPopover
                                                                    recordId={record.id}
                                                                    onProcess={handleProcess}
                                                                    initialResolution={record.resolution || ""}
                                                                    initialOfficers={record.officers || []}
                                                                    initialConcernsBpp={record.concernsBpp}
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
                                                        {!isApplicationLike(record) && record.assignedUserId === currentUser.id && record.status !== 'PROCESSED' && (
                                                            <div className="flex flex-col gap-2 mt-4">
                                                                <RecordProcessPopover
                                                                    recordId={record.id}
                                                                    onProcess={handleProcess}
                                                                />

                                                                {record.extensionStatus !== 'PENDING' ? (
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
                                                                )}
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
