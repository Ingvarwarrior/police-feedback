'use client'

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Download, Eye, Star, Search, ArrowUpDown, Calendar as LucideCalendar, MapPin, FileText, Trash2, CheckCircle2, Archive, UserPlus, Check, MoreHorizontal, X, Loader2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
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
import { bulkUpdateReports, deleteReport, bulkDeleteReports } from "./[id]/actions/reportActions"
import { toast } from "sonner"
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
import * as Papa from "papaparse"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

interface ReportsListProps {
    initialResponses: any[]
    users?: any[]
    currentUser: any
}

// Helper: Calculate priority based on rating and attachments
const getPriority = (response: any): 'urgent' | 'important' | 'standard' => {
    if (response.rateOverall <= 2 || (response._count?.attachments > 0 && response.rateOverall <= 3)) {
        return 'urgent'
    }
    if (response.rateOverall === 3 || response.wantContact) {
        return 'important'
    }
    return 'standard'
}

export default function ReportsList({ initialResponses, users = [], currentUser }: ReportsListProps) {
    const isAdmin = currentUser?.role === 'ADMIN'
    const canDelete = isAdmin || currentUser?.permDeleteReports
    const canExport = isAdmin || currentUser?.permExportData
    const router = useRouter()
    const searchParams = useSearchParams()

    const [mainTab, setMainTab] = useState<'all' | 'active' | 'processed'>(() => {
        const status = searchParams.get('status')
        if (!status) return 'all'
        if (['RESOLVED', 'ARCHIVED', 'REVIEWED'].includes(status)) return 'processed'
        return 'active'
    })
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'ALL')
    const [quickFilter, setQuickFilter] = useState(() => searchParams.get('quick') || 'ALL')
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || "")
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        if (from && to) return { from: new Date(from), to: new Date(to) }
        if (from) return { from: new Date(from) }
        return undefined
    })
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || "newest")
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isBulkLoading, setIsBulkLoading] = useState(false)

    const processedResponses = useMemo(() => {
        let result = [...initialResponses]

        // 0. Main Tab Filter (Skip if looking for specific date or search, to search global)
        // If deep linking with date/search, we might want to search across all tabs or respect the default?
        // Let's respect the current tab for now, but maybe auto-switch to ALL if needed?
        // Logic: specific filters usually imply "find this regardless of status" but existing logic splits logic.
        // Let's keep existing split for safety, but if user comes from "Critical" chart, it might be resolved.
        // The dashboard "Critical" link goes to "?rating=1,2".

        // 0. Main Tab Filter
        if (mainTab === 'active') {
            result = result.filter(r => ['NEW', 'ASSIGNED'].includes(r.status))
        } else if (mainTab === 'processed') {
            result = result.filter(r => ['RESOLVED', 'ARCHIVED', 'REVIEWED'].includes(r.status))
        }

        // 1. Status Filter
        if (statusFilter !== 'ALL') {
            result = result.filter(r => r.status === statusFilter)
        }

        // 2. Quick Filter
        if (quickFilter === 'URGENT') {
            result = result.filter(r => getPriority(r) === 'urgent')
        } else if (quickFilter === 'WITH_PHOTO') {
            result = result.filter(r => (r._count?.attachments || 0) > 0)
        } else if (quickFilter === 'WITH_CONTACT') {
            result = result.filter(r => r.wantContact)
        } else if (quickFilter === 'TODAY') {
            const today = new Date().toDateString()
            result = result.filter(r => new Date(r.createdAt).toDateString() === today)
        }

        // 3. Date Range Filter (Inclusive)
        if (dateRange?.from) {
            result = result.filter(r => {
                const date = new Date(r.createdAt)
                const from = new Date(dateRange.from!)
                from.setHours(0, 0, 0, 0)

                if (dateRange.to) {
                    const to = new Date(dateRange.to)
                    to.setHours(23, 59, 59, 999)
                    return date >= from && date <= to
                }

                const dayEnd = new Date(from)
                dayEnd.setHours(23, 59, 59, 999)
                return date >= from && date <= dayEnd
            })
        }

        // 4. Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            result = result.filter(r =>
                (r.districtOrCity?.toLowerCase().includes(term)) ||
                (r.patrolRef?.toLowerCase().includes(term)) ||
                (r.internalNotes?.toLowerCase().includes(term)) ||
                (r.comment?.toLowerCase().includes(term))
            )
        }

        // 5. Sorting
        result.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            if (sortBy === 'rating-high') return (b.rateOverall || 0) - (a.rateOverall || 0)
            if (sortBy === 'rating-low') return (a.rateOverall || 0) - (b.rateOverall || 0)
            return 0
        })

        return result
    }, [initialResponses, mainTab, statusFilter, quickFilter, searchTerm, sortBy, dateRange])

    const exportToCSV = (items = processedResponses) => {
        const csvData = items.map(r => ({
            "ID": r.id,
            "Дата створення": new Date(r.createdAt).toLocaleString('uk-UA'),
            "Час події": r.interactionDate ? new Date(r.interactionDate).toLocaleDateString('uk-UA') + (r.interactionTime ? ` (${r.interactionTime})` : '') : '-',
            "Локація": r.districtOrCity || '-',
            "Об'єкт": r.patrolRef || '-',
            "Офіцер": r.officerName ? `${r.officerName} (${r.badgeNumber || '-'})` : '-',
            "Тип події": r.incidentType || '-',
            "Статус": r.status === 'NEW' ? 'Новий' : r.status === 'ASSIGNED' ? 'В роботі' : r.status === 'RESOLVED' ? 'Вирішено' : 'Архів',
            "Загальна оцінка": r.rateOverall,
            "Ввічливість": r.ratePoliteness || '-',
            "Професіоналізм": r.rateProfessionalism || '-',
            "Ефективність": r.rateEffectiveness || '-',
            "Є Контакт": r.wantContact ? 'Так' : 'Ні',
            "Ім'я контакту": r.contact?.name || '-',
            "Телефон": r.contact?.phone || '-',
            "Коментар": r.comment || "",
            "Виконавець": r.assignedTo ? r.assignedTo.email : '-'
        }))

        const csvString = Papa.unparse(csvData)
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = `reports_export_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const exportToPDF = async () => {
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()

        // Doc title
        doc.setFont("helvetica", "bold")
        doc.text("Police Feedback Registry", 14, 20)
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)

        let y = 40
        const headers = ["Date", "Location", "Object", "Status", "Rating"]
        doc.setFillColor(240, 240, 240)
        doc.rect(14, y - 5, 182, 7, 'F')
        doc.text(headers[0], 14, y)
        doc.text(headers[1], 40, y)
        doc.text(headers[2], 90, y)
        doc.text(headers[3], 130, y)
        doc.text(headers[4], 160, y)

        doc.setFont("helvetica", "normal")
        y += 10

        processedResponses.slice(0, 20).forEach((r) => {
            if (y > 270) {
                doc.addPage()
                y = 20
            }
            doc.text(new Date(r.createdAt).toLocaleDateString(), 14, y)
            doc.text(r.districtOrCity?.slice(0, 15) || '-', 40, y)
            doc.text(r.patrolRef?.slice(0, 15) || '-', 90, y)
            doc.text(r.status, 130, y)
            doc.text(String(r.rateOverall), 160, y)
            y += 8
        })

        doc.save(`reports_registry_${new Date().toISOString().slice(0, 10)}.pdf`)
    }

    return (
        <div className="space-y-6">
            {/* Main Tabs (Simpler) */}
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-sm mx-auto lg:mx-0 shadow-inner">
                <button
                    onClick={() => { setMainTab('all'); setStatusFilter('ALL'); }}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mainTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                    Все
                </button>
                <button
                    onClick={() => { setMainTab('active'); setStatusFilter('ALL'); }}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mainTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                    Активні
                </button>
                <button
                    onClick={() => { setMainTab('processed'); setStatusFilter('ALL'); }}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mainTab === 'processed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                    Опрацьовані
                </button>
            </div>

            <div className="flex flex-col gap-6">
                {/* Search & Sort Row */}
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Пошук звіту..."
                            className="pl-11 h-12 rounded-2xl border-slate-200 bg-white shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[180px] h-12 rounded-2xl border-slate-200 bg-white shadow-sm font-bold text-xs uppercase tracking-tight">
                                <ArrowUpDown className="w-3.5 h-3.5 mr-2 text-primary" />
                                <SelectValue placeholder="Сортування" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                                <SelectItem value="newest" className="font-bold text-xs uppercase tracking-tight">Спочатку нові</SelectItem>
                                <SelectItem value="oldest" className="font-bold text-xs uppercase tracking-tight">Спочатку старі</SelectItem>
                                <SelectItem value="rating-high" className="font-bold text-xs uppercase tracking-tight">Найвищий рейтинг</SelectItem>
                                <SelectItem value="rating-low" className="font-bold text-xs uppercase tracking-tight">Найнижчий рейтинг</SelectItem>
                            </SelectContent>
                        </Select>

                        {canExport && (
                            <>
                                <Button
                                    onClick={() => exportToCSV()}
                                    variant="outline"
                                    className="h-12 gap-2 rounded-2xl font-bold border-slate-200 bg-white hover:bg-slate-50 px-6 shrink-0"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">CSV</span>
                                </Button>

                                <Button
                                    onClick={exportToPDF}
                                    className="h-12 gap-2 rounded-2xl font-bold shadow-lg shadow-primary/10 bg-primary hover:bg-primary/90 px-6 shrink-0"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="hidden sm:inline">PDF</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Quick Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 shrink-0">Швидкі фільтри:</p>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-tight gap-2",
                                    dateRange?.from && "bg-slate-900 text-white hover:bg-slate-800"
                                )}
                            >
                                <LucideCalendar className="w-3 h-3" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "dd.MM", { locale: uk })} - {format(dateRange.to, "dd.MM", { locale: uk })}
                                        </>
                                    ) : (
                                        format(dateRange.from, "dd MMMM", { locale: uk })
                                    )
                                ) : (
                                    "Вибрати період"
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-[2rem] border-slate-200 shadow-2xl" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={1}
                                locale={uk}
                            />
                            {dateRange?.from && (
                                <div className="p-3 border-t border-slate-100 flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-[10px] font-black uppercase"
                                        onClick={() => setDateRange(undefined)}
                                    >
                                        Скинути
                                    </Button>
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>

                    {[
                        { id: 'ALL', label: '🔍 Всі', color: 'slate' },
                        { id: 'URGENT', label: '🔴 Терміново', color: 'red' },
                        { id: 'WITH_PHOTO', label: '📸 З медіа', color: 'blue' },
                        { id: 'WITH_CONTACT', label: '☎️ З контактом', color: 'emerald' },
                    ].map(f => (
                        <Button
                            key={f.id}
                            variant={quickFilter === f.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setQuickFilter(f.id)}
                            className="rounded-full text-[10px] font-black px-4 shrink-0"
                        >
                            {f.label}
                        </Button>
                    ))}
                </div>

                {/* Status Tabs (Desktop) & Filter Trigger (Mobile) */}
                <div className="flex items-center justify-between gap-4">
                    <div className="hidden lg:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <Button
                            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('ALL')}
                            className="rounded-full text-[10px] uppercase font-black px-6"
                        >
                            Усі ({mainTab === 'active' ? initialResponses.filter(r => ['NEW', 'ASSIGNED'].includes(r.status)).length : mainTab === 'processed' ? initialResponses.filter(r => ['RESOLVED', 'ARCHIVED', 'REVIEWED'].includes(r.status)).length : initialResponses.length})
                        </Button>
                        {(mainTab === 'active' ? ['NEW', 'ASSIGNED'] : mainTab === 'processed' ? ['RESOLVED', 'ARCHIVED', 'REVIEWED'] : ['NEW', 'ASSIGNED', 'RESOLVED', 'ARCHIVED', 'REVIEWED']).map(s => {
                            const count = initialResponses.filter(r => r.status === s).length
                            return (
                                <Button
                                    key={s}
                                    variant={statusFilter === s ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setStatusFilter(s)}
                                    className="rounded-full text-[10px] uppercase font-black px-6 shrink-0"
                                >
                                    {s === 'NEW' ? 'Нові' : s === 'ASSIGNED' ? 'В роботі' : s === 'RESOLVED' ? 'Вирішено' : s === 'ARCHIVED' ? 'Архів' : 'Переглянуто'} ({count})
                                </Button>
                            )
                        })}
                    </div>

                    <div className="lg:hidden w-full flex gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold gap-2">
                                    <Search className="w-4 h-4" />
                                    Фільтри
                                    {(statusFilter !== 'ALL' || quickFilter !== 'ALL') && (
                                        <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2.5rem] p-8">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Налаштування фільтрів</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-8 py-4">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Статус звіту</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['ALL', ...(mainTab === 'active' ? ['NEW', 'ASSIGNED'] : ['RESOLVED', 'ARCHIVED', 'REVIEWED'])].map(s => (
                                                <Button
                                                    key={s}
                                                    variant={statusFilter === s ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setStatusFilter(s)}
                                                    className="rounded-xl text-[10px] font-black uppercase"
                                                >
                                                    {s === 'ALL' ? 'Всі' : s === 'NEW' ? 'Нові' : s === 'ASSIGNED' ? 'В роботі' : s === 'RESOLVED' ? 'Вирішено' : s === 'ARCHIVED' ? 'Архів' : 'Переглянуто'}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Категорії</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'ALL', label: 'Всі' },
                                                { id: 'URGENT', label: 'Терміново' },
                                                { id: 'WITH_PHOTO', label: 'З медіа' },
                                                { id: 'WITH_CONTACT', label: 'З контактом' },
                                                { id: 'TODAY', label: 'Сьогодні' },
                                            ].map(f => (
                                                <Button
                                                    key={f.id}
                                                    variant={quickFilter === f.id ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setQuickFilter(f.id)}
                                                    className="rounded-xl text-[10px] font-black uppercase"
                                                >
                                                    {f.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <DialogTrigger asChild>
                                        <Button className="w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                            Застосувати
                                        </Button>
                                    </DialogTrigger>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block relative w-full overflow-x-auto rounded-3xl border border-slate-100 shadow-sm bg-white">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-slate-50/50">
                            <th className="px-8 py-4 text-left align-middle">
                                <button
                                    onClick={() => {
                                        if (selectedIds.length === processedResponses.length) setSelectedIds([])
                                        else setSelectedIds(processedResponses.map(r => r.id))
                                    }}
                                    className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selectedIds.length === processedResponses.length ? 'bg-primary border-primary' : 'bg-white border-slate-300'}`}
                                >
                                    {selectedIds.length === processedResponses.length && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                            </th>
                            <th className="h-12 px-6 text-left align-middle font-black text-slate-400 uppercase text-[9px] tracking-widest"><div className="flex items-center gap-2"><LucideCalendar className="w-3 h-3" /> Дата</div></th>
                            <th className="h-12 px-6 text-left align-middle font-black text-slate-400 uppercase text-[9px] tracking-widest"><div className="flex items-center gap-2"><MapPin className="w-3 h-3" /> Локація</div></th>
                            <th className="h-12 px-6 text-left align-middle font-black text-slate-400 uppercase text-[9px] tracking-widest">Об'єкт</th>
                            <th className="h-12 px-6 text-center align-middle font-black text-slate-400 uppercase text-[9px] tracking-widest">Статус</th>
                            <th className="h-12 px-6 text-center align-middle font-black text-slate-400 uppercase text-[9px] tracking-widest">Виконавець</th>
                            <th className="h-12 px-6 text-center align-middle font-black text-slate-400 uppercase text-[9px] tracking-widest">Рейтинг</th>
                            <th className="h-12 px-6 text-center align-middle font-black text-slate-400 uppercase text-[9px] tracking-widest">Медіа</th>
                            <th className="h-12 px-6 text-center align-middle font-black text-slate-400 uppercase text-[9px] tracking-widest">Контакт</th>
                            <th className="h-12 px-6 text-right align-middle font-black text-slate-400 uppercase text-[9px] tracking-widest">Дії</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {processedResponses.map((resp: any) => {
                            const priority = getPriority(resp)
                            return (
                                <tr
                                    key={resp.id}
                                    onClick={() => router.push(`/admin/reports/${resp.id}`)}
                                    className={`transition-colors group cursor-pointer ${selectedIds.includes(resp.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-slate-100/80'}`}
                                >
                                    <td className="px-8 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => {
                                                if (selectedIds.includes(resp.id)) setSelectedIds(selectedIds.filter(id => id !== resp.id))
                                                else setSelectedIds([...selectedIds, resp.id])
                                            }}
                                            className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selectedIds.includes(resp.id) ? 'bg-primary border-primary' : 'bg-white border-slate-200 group-hover:border-slate-400'}`}
                                        >
                                            {selectedIds.includes(resp.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                        </button>
                                    </td>
                                    <td className="px-8 py-4 align-middle font-bold text-slate-900 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>{new Date(resp.createdAt).toLocaleDateString('uk-UA')}</span>
                                            <span className="text-[10px] font-medium text-slate-400">{new Date(resp.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 align-middle truncate max-w-[180px]">
                                        <div className="flex items-center gap-2">
                                            {priority === 'urgent' && (
                                                <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Терміново" />
                                            )}
                                            {priority === 'important' && (
                                                <span className="shrink-0 w-2 h-2 rounded-full bg-yellow-500" title="Важливо" />
                                            )}
                                            <span className="text-slate-600 font-medium truncate">{resp.districtOrCity || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 align-middle">
                                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight">
                                            {resp.patrolRef || '-'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 align-middle text-center">
                                        {resp.status === 'NEW' && <span className="bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">Новий</span>}
                                        {resp.status === 'ASSIGNED' && <span className="bg-amber-500 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">В роботі</span>}
                                        {resp.status === 'RESOLVED' && <span className="bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">Вирішено</span>}
                                        {resp.status === 'REVIEWED' && <span className="bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">Переглянуто</span>}
                                        {resp.status === 'ARCHIVED' && <span className="bg-slate-400 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">Архівовано</span>}
                                    </td>
                                    <td className="px-8 py-4 align-middle text-center">
                                        {resp.assignedTo ? (
                                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                {resp.assignedTo.firstName || resp.assignedTo.lastName
                                                    ? `${resp.assignedTo.firstName || ''} ${resp.assignedTo.lastName || ''}`.trim()
                                                    : resp.assignedTo.email.split('@')[0]}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] font-black tracking-widest opacity-30">—</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 align-middle text-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full font-black text-xs ring-1 ring-amber-200/50">
                                            {resp.rateOverall}
                                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 align-middle text-center">
                                        {(resp._count?.attachments || 0) > 0 ? (
                                            <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black">
                                                {resp._count.attachments}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] font-black tracking-widest opacity-30">—</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 align-middle">
                                        <div className="flex flex-col group/name">
                                            <span className="text-[10px] font-black uppercase tracking-tight text-slate-400 mb-0.5">Від</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm">{resp.contact?.name || 'Анонімно'}</span>
                                                <Link
                                                    href={resp.citizenId ? `/admin/citizens/${resp.citizenId}` : (resp.contact ? `/admin/citizens?q=${encodeURIComponent(resp.contact.phone)}` : `/admin/citizens?q=${encodeURIComponent(resp.ipHash)}`)}
                                                    className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 bg-slate-100 rounded hover:bg-primary hover:text-white"
                                                    title="Досьє"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Link>
                                            </div>
                                            {resp.wantContact && (
                                                <span className="text-[9px] text-emerald-600 font-black uppercase mt-1 flex items-center gap-1">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                    Контакт
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/reports/${resp.id}`}>
                                                <Button variant="outline" size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-wider h-9 px-4 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                                    <FileText className="w-3.5 h-3.5 mr-2" />
                                                    Деталі
                                                </Button>
                                            </Link>
                                            {canDelete && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm h-9 w-9">
                                                            {isDeleting === resp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-[2rem] border-rose-100 p-8">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-xl font-black uppercase text-rose-600 flex items-center gap-2">
                                                                <AlertTriangle className="w-6 h-6" />
                                                                Видалення звіту
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-600 font-medium pt-2">
                                                                Ви впевнені, що хочете безповоротно видалити цей звіт?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="mt-6 gap-2">
                                                            <AlertDialogCancel className="rounded-2xl h-12 font-bold focus:ring-0">Скасувати</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={async () => {
                                                                    setIsDeleting(resp.id)
                                                                    try {
                                                                        await deleteReport(resp.id)
                                                                        toast.success('Звіт видалено')
                                                                        router.refresh()
                                                                    } catch (err) {
                                                                        toast.error('Помилка видалення')
                                                                    } finally {
                                                                        setIsDeleting(null)
                                                                    }
                                                                }}
                                                                className="rounded-2xl h-12 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest shadow-lg shadow-rose-500/20"
                                                            >
                                                                Видалити
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div >

            {/* Quick Filters */}
            < div className="flex items-center gap-2 mb-6 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0" >
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Швидкі фільтри:</span>
                <div className="grid grid-cols-2 sm:flex gap-2 flex-1">
                    {['ВСІ', 'НОВІ', 'В РОБОТІ', 'ВИРІШЕНІ', 'АРХІВНІ', 'ТЕРМІНОВО'].map((f) => (
                        <button
                            key={f}
                            onClick={() => {
                                if (f === 'ВСІ') setQuickFilter('ALL')
                                else if (f === 'НОВІ') setQuickFilter('NEW')
                                else if (f === 'В РОБОТІ') setQuickFilter('ASSIGNED')
                                else if (f === 'ВИРІШЕНІ') setQuickFilter('RESOLVED')
                                else if (f === 'АРХІВНІ') setQuickFilter('ARCHIVED')
                                else if (f === 'ТЕРМІНОВО') setQuickFilter('URGENT')
                            }}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap",
                                quickFilter === f ||
                                    (f === 'ВСІ' && quickFilter === 'ALL') ||
                                    (f === 'НОВІ' && quickFilter === 'NEW') ||
                                    (f === 'В РОБОТІ' && quickFilter === 'ASSIGNED') ||
                                    (f === 'ВИРІШЕНІ' && quickFilter === 'RESOLVED') ||
                                    (f === 'АРХІВНІ' && quickFilter === 'ARCHIVED') ||
                                    (f === 'ТЕРМІНОВО' && quickFilter === 'URGENT')
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div >
            {/* Mobile Card View */}
            < div className="lg:hidden space-y-4" >
                {
                    processedResponses.length === 0 ? (
                        <div className="px-8 py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                    <FileText className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-900 font-bold text-lg">Немає звітів</p>
                            </div>
                        </div>
                    ) : (
                        <div className="block sm:hidden space-y-4">
                            {processedResponses.map((resp: any) => {
                                const priority = getPriority(resp)
                                return (
                                    <div
                                        key={resp.id}
                                        className="bg-white rounded-3xl p-5 border-2 border-slate-100 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden"
                                    >
                                        {/* Priority indicator */}
                                        {priority === 'urgent' && (
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
                                        )}

                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-slate-900 font-black text-lg">
                                                        {resp.districtOrCity || 'Без локації'}
                                                    </span>
                                                    {priority === 'urgent' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                                </div>
                                                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                                                    {new Date(resp.createdAt).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl font-black text-sm ring-1 ring-amber-200/50">
                                                {resp.rateOverall}
                                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                            </div>
                                        </div>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                                                {resp.patrolRef || 'Невідомий об\'єкт'}
                                            </span>
                                            {resp.status === 'NEW' && <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">Новий</span>}
                                            {resp.status === 'ASSIGNED' && <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">В роботі</span>}
                                            {resp.status === 'RESOLVED' && <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">Вирішено</span>}
                                            {resp.wantContact && <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">📞 Контакт</span>}
                                            {(resp._count?.attachments || 0) > 0 && <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">📸 {resp._count.attachments}</span>}
                                        </div>

                                        {/* Assignee */}
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <div className="flex items-center gap-2">
                                                {resp.assignedTo ? (
                                                    <>
                                                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] font-black text-white">
                                                            {(resp.assignedTo.lastName || resp.assignedTo.firstName || resp.assignedTo.email)[0].toUpperCase()}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-600">
                                                            {resp.assignedTo.firstName || resp.assignedTo.lastName
                                                                ? `${resp.assignedTo.firstName || ''} ${resp.assignedTo.lastName || ''}`.trim()
                                                                : resp.assignedTo.email.split('@')[0]}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-300 uppercase italic">Не призначено</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Link href={`/admin/reports/${resp.id}`}>
                                                    <Button variant="secondary" size="sm" className="rounded-xl font-black text-[10px] uppercase px-3 h-8">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                                {canDelete && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="sm" className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 px-3">
                                                                {isDeleting === resp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="rounded-[2rem] border-rose-100 p-6 mx-4">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-lg font-black uppercase text-rose-600 flex items-center gap-2">
                                                                    <AlertTriangle className="w-5 h-5" />
                                                                    Видалення звіту
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription className="text-slate-600 font-medium pt-2 text-sm">
                                                                    Ви впевнені? Ця дія незворотна.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
                                                                <AlertDialogCancel className="rounded-xl h-10 font-bold focus:ring-0 w-full sm:w-auto">Скасувати</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        setIsDeleting(resp.id);
                                                                        try {
                                                                            await deleteReport(resp.id);
                                                                            toast.success('Звіт видалено');
                                                                            router.refresh();
                                                                        } catch (err) {
                                                                            toast.error('Помилка');
                                                                        } finally {
                                                                            setIsDeleting(null);
                                                                        }
                                                                    }}
                                                                    className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 font-black uppercase text-xs tracking-widest shadow-lg shadow-rose-500/20 w-full sm:w-auto"
                                                                >
                                                                    Видалити
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                }
            </div >

            {/* Floating Bulk Actions Bar */}
            {
                selectedIds.length > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-slate-900 text-white rounded-[2.5rem] px-8 py-4 shadow-2xl shadow-blue-900/40 flex items-center gap-8 border border-white/10 ring-1 ring-white/5 backdrop-blur-xl">
                            <div className="flex items-center gap-4 pr-8 border-r border-white/10">
                                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-sm font-black text-white shadow-lg shadow-primary/30">
                                    {selectedIds.length}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Вибрано звітів</span>
                                    <button onClick={() => setSelectedIds([])} className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase text-left">Скасувати</button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => exportToCSV(selectedIds.map(id => initialResponses.find(r => r.id === id)).filter(Boolean))}
                                    className="h-11 px-6 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border border-white/5"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Експорт
                                </button>

                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={async () => {
                                                setIsBulkLoading(true);
                                                try {
                                                    await bulkUpdateReports(selectedIds, { status: 'RESOLVED' });
                                                    toast.success(`Опрацьовано ${selectedIds.length} звітів`);
                                                    setSelectedIds([]);
                                                    router.refresh();
                                                } catch (e) {
                                                    toast.error("Помилка при масовому оновленні");
                                                } finally {
                                                    setIsBulkLoading(false);
                                                }
                                            }}
                                            disabled={isBulkLoading}
                                            className="h-11 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                                        >
                                            {isBulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                            Вирішено
                                        </button>

                                        <button
                                            onClick={async () => {
                                                setIsBulkLoading(true);
                                                try {
                                                    await bulkUpdateReports(selectedIds, { status: 'ARCHIVED' });
                                                    toast.success(`Архівовано ${selectedIds.length} звітів`);
                                                    setSelectedIds([]);
                                                    router.refresh();
                                                } catch (e) {
                                                    toast.error("Помилка при архівації");
                                                } finally {
                                                    setIsBulkLoading(false);
                                                }
                                            }}
                                            disabled={isBulkLoading}
                                            className="h-11 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 border border-white/5"
                                        >
                                            {isBulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                                            В архів
                                        </button>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button className="h-11 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border border-white/5 shadow-lg shadow-blue-500/20">
                                                    <UserPlus className="w-3.5 h-3.5" />
                                                    Призначити
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="rounded-[2.5rem] bg-slate-900 border-white/10 text-white p-8 max-w-sm">
                                                <DialogHeader>
                                                    <DialogTitle className="text-xl font-black uppercase tracking-tight italic">Виберіть інспектора</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid grid-cols-1 gap-2 py-6">
                                                    {users.map(u => (
                                                        <button
                                                            key={u.id}
                                                            onClick={async () => {
                                                                setIsBulkLoading(true);
                                                                try {
                                                                    await bulkUpdateReports(selectedIds, { assignedToId: u.id, status: 'ASSIGNED' });
                                                                    toast.success(`Призначено ${selectedIds.length} звітів на ${u.lastName || u.firstName || u.email}`);
                                                                    setSelectedIds([]);
                                                                    router.refresh();
                                                                } catch (e) {
                                                                    toast.error("Помилка при призначенні");
                                                                } finally {
                                                                    setIsBulkLoading(false);
                                                                }
                                                            }}
                                                            className="w-full px-4 py-3 rounded-2xl bg-white/5 hover:bg-primary transition-all text-left font-bold text-sm border border-white/5 flex items-center justify-between group"
                                                        >
                                                            <span>{u.firstName || u.lastName ? `${u.lastName || ''} ${u.firstName || ''}`.trim() : u.email} <span className="text-[10px] opacity-40 block">{u.email}</span></span>
                                                            <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </>
                                )}

                                {isAdmin && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button className="h-11 px-6 rounded-2xl bg-rose-500 hover:bg-rose-600 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 text-white">
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Видалити
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-[2.5rem] border-rose-100 p-8">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-xl font-black uppercase text-rose-600 flex items-center gap-2">
                                                    <AlertTriangle className="w-6 h-6" />
                                                    Масове видалення звітів
                                                </AlertDialogTitle>
                                                <AlertDialogDescription className="text-slate-600 font-medium pt-2">
                                                    Ви впевнені, що хочете видалити {selectedIds.length} звітів?
                                                    <br />
                                                    Ця дія незворотна, всі пов'язані дані будуть видалені.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="mt-6 gap-2">
                                                <AlertDialogCancel className="rounded-2xl h-12 font-bold focus:ring-0">Скасувати</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={async () => {
                                                        setIsBulkLoading(true);
                                                        try {
                                                            await bulkDeleteReports(selectedIds);
                                                            toast.success(`Видалено ${selectedIds.length} звітів`);
                                                            setSelectedIds([]);
                                                            router.refresh();
                                                        } catch (e) {
                                                            toast.error('Помилка при видаленні');
                                                        } finally {
                                                            setIsBulkLoading(false);
                                                        }
                                                    }}
                                                    className="rounded-2xl h-12 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest shadow-lg shadow-rose-500/20"
                                                >
                                                    Видалити
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

