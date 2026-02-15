'use client'

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, Eye, Star, Search, ArrowUpDown, Calendar as LucideCalendar, MapPin, FileText, Trash2, CheckCircle2, Archive, UserPlus, Check, MoreHorizontal, X, Loader2, AlertTriangle, Volume2, VolumeX } from "lucide-react"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import {
    buildReportsCsvString,
    getPriority,
    maskSensitive,
    processReports,
} from "./reportsList.viewmodel"
import { useReportNotifications } from "./useReportNotifications"

interface ReportsListProps {
    initialResponses: any[]
    users?: any[]
    currentUser: any
}

const REPORTS_FILTERS_KEY = "pf:filters:reports"

export default function ReportsList({ initialResponses, users = [], currentUser }: ReportsListProps) {
    const isAdmin = currentUser?.role === 'ADMIN'
    const canDelete = isAdmin || currentUser?.permDeleteReports
    const canExport = isAdmin || currentUser?.permExportData
    const canViewSensitive = isAdmin || currentUser?.permViewSensitiveData
    const canBulkAction = isAdmin || currentUser?.permBulkActionReports
    const router = useRouter()
    const searchParams = useSearchParams()

    const [mainTab, setMainTab] = useState<'all' | 'active' | 'processed'>(() => {
        const status = searchParams.get('status')
        if (!status) return 'active'
        if (status === 'ALL') return 'all'
        if (['RESOLVED', 'ARCHIVED', 'REVIEWED'].includes(status)) return 'processed'
        return 'active'
    })
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'ALL')
    const [quickFilter, setQuickFilter] = useState(() => searchParams.get('quick') || 'ALL')
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || "")
    const [executorFilter, setExecutorFilter] = useState(() => searchParams.get('executor') || 'ALL')
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

    // Sound Notification State
    const [soundEnabled, setSoundEnabled] = useState(false)
    useReportNotifications(soundEnabled, router)

    useEffect(() => {
        try {
            const raw = localStorage.getItem(REPORTS_FILTERS_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw)
            if (typeof parsed.mainTab === 'string') setMainTab(parsed.mainTab)
            if (typeof parsed.statusFilter === 'string') setStatusFilter(parsed.statusFilter)
            if (typeof parsed.quickFilter === 'string') setQuickFilter(parsed.quickFilter)
            if (typeof parsed.searchTerm === 'string') setSearchTerm(parsed.searchTerm)
            if (typeof parsed.sortBy === 'string') setSortBy(parsed.sortBy)
            if (typeof parsed.executorFilter === 'string') setExecutorFilter(parsed.executorFilter)
            if (parsed.dateRange?.from) {
                setDateRange({
                    from: new Date(parsed.dateRange.from),
                    to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined,
                })
            }
        } catch {
            // ignore malformed local storage
        }
    }, [])

    useEffect(() => {
        localStorage.setItem(
            REPORTS_FILTERS_KEY,
            JSON.stringify({
                mainTab,
                statusFilter,
                quickFilter,
                searchTerm,
                sortBy,
                executorFilter,
                dateRange: {
                    from: dateRange?.from?.toISOString() || null,
                    to: dateRange?.to?.toISOString() || null,
                },
            })
        )
    }, [mainTab, statusFilter, quickFilter, searchTerm, sortBy, executorFilter, dateRange])

    const processedResponses = useMemo(() => {
        return processReports(initialResponses, {
            mainTab,
            statusFilter,
            quickFilter,
            searchTerm,
            sortBy,
            dateRange,
            executorFilter,
        })
    }, [initialResponses, mainTab, statusFilter, quickFilter, searchTerm, sortBy, dateRange, executorFilter])

    const exportToCSV = (items = processedResponses) => {
        const csvString = buildReportsCsvString(items, canViewSensitive)
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

    const resetFilters = () => {
        setStatusFilter("ALL")
        setQuickFilter("ALL")
        setSearchTerm("")
        setSortBy("newest")
        setExecutorFilter("ALL")
        setDateRange(undefined)
    }

    return (
        <div className="space-y-6">
            {/* Main Tabs (Simpler) */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full max-w-sm mx-auto lg:mx-0 shadow-inner transition-colors duration-300">
                <button
                    onClick={() => { setMainTab('all'); setStatusFilter('ALL'); }}
                    className={`flex-1 py-2.5 px-2 sm:px-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${mainTab === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    Все
                </button>
                <button
                    onClick={() => { setMainTab('active'); setStatusFilter('ALL'); }}
                    className={`flex-1 py-2.5 px-2 sm:px-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${mainTab === 'active' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    Активні
                </button>
                <button
                    onClick={() => { setMainTab('processed'); setStatusFilter('ALL'); }}
                    className={`flex-1 py-2.5 px-2 sm:px-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${mainTab === 'processed' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
                >
                    Опрацьовані
                </button>
            </div>

            <div className="flex justify-center lg:justify-end -mt-4 mb-2 lg:mt-0 lg:mb-0">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`rounded-full text-[10px] font-semibold tracking-wide gap-2 transition-all ${soundEnabled ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    {soundEnabled ? 'Звук увімкнено' : 'Звук вимкнено'}
                </Button>
            </div>

            <div className="flex flex-col gap-4">
                <div className="ds-filter-panel space-y-3">
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
                        <div className="relative xl:col-span-2">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Пошук: локація, об'єкт, коментар, офіцер, жетон"
                                className="h-11 rounded-xl pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="Статус" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Всі статуси</SelectItem>
                                {(mainTab === 'active' ? ['NEW', 'ASSIGNED'] : mainTab === 'processed' ? ['RESOLVED', 'ARCHIVED', 'REVIEWED'] : ['NEW', 'ASSIGNED', 'RESOLVED', 'ARCHIVED', 'REVIEWED']).map((statusValue) => (
                                    <SelectItem key={statusValue} value={statusValue}>
                                        {statusValue === 'NEW' ? 'Очікує' : statusValue === 'ASSIGNED' ? 'В роботі' : statusValue === 'RESOLVED' ? 'Опрацьовано' : statusValue === 'ARCHIVED' ? 'Архів' : 'Переглянуто'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={executorFilter} onValueChange={setExecutorFilter}>
                            <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="Виконавець" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Всі виконавці</SelectItem>
                                <SelectItem value="UNASSIGNED">Без виконавця</SelectItem>
                                {users.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                        {u.firstName || u.lastName ? `${u.lastName || ''} ${u.firstName || ''}`.trim() : u.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="h-11 rounded-xl">
                                <ArrowUpDown className="mr-2 h-4 w-4 text-slate-400" />
                                <SelectValue placeholder="Сортування" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Спочатку нові</SelectItem>
                                <SelectItem value="oldest">Спочатку старі</SelectItem>
                                <SelectItem value="rating-high">Найвищий рейтинг</SelectItem>
                                <SelectItem value="rating-low">Найнижчий рейтинг</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "h-11 justify-start rounded-xl text-left font-medium",
                                        dateRange?.from && "bg-slate-900 text-white hover:bg-slate-800"
                                    )}
                                >
                                    <LucideCalendar className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "dd.MM", { locale: uk })} - {format(dateRange.to, "dd.MM", { locale: uk })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "dd MMMM", { locale: uk })
                                        )
                                    ) : (
                                        "Період"
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-2xl" align="start">
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
                                    <div className="flex justify-end border-t border-slate-100 p-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs font-semibold"
                                            onClick={() => setDateRange(undefined)}
                                        >
                                            Скинути
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>

                        <div className="md:col-span-2 flex flex-wrap gap-2">
                            {[
                                { id: 'ALL', label: 'Всі' },
                                { id: 'URGENT', label: 'Терміново' },
                                { id: 'WITH_PHOTO', label: 'З медіа' },
                                { id: 'WITH_CONTACT', label: 'З контактом' },
                                { id: 'TODAY', label: 'Сьогодні' },
                            ].map((f) => (
                                <Button
                                    key={f.id}
                                    variant={quickFilter === f.id ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setQuickFilter(f.id)}
                                    className="rounded-xl text-xs font-semibold"
                                >
                                    {f.label}
                                </Button>
                            ))}
                        </div>

                        <Button variant="outline" className="h-11 rounded-xl" onClick={resetFilters}>
                            Скинути фільтри
                        </Button>
                    </div>

                    {canExport && (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                                onClick={() => exportToCSV()}
                                variant="outline"
                                className="h-10 gap-2 rounded-xl font-semibold"
                            >
                                <Download className="w-4 h-4" />
                                CSV
                            </Button>

                            <Button
                                onClick={exportToPDF}
                                className="h-10 gap-2 rounded-xl font-semibold"
                            >
                                <FileText className="w-4 h-4" />
                                PDF
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block relative w-full overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 transition-colors duration-300">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-800 transition-colors duration-300">
                            <th className="px-8 py-4 text-left align-middle">
                                <button
                                    onClick={() => {
                                        if (selectedIds.length === processedResponses.length) setSelectedIds([])
                                        else setSelectedIds(processedResponses.map(r => r.id))
                                    }}
                                    className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selectedIds.length === processedResponses.length ? 'bg-primary border-primary' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-300">
                        {processedResponses.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-8 py-12">
                                    <div className="ds-empty-state">
                                        <FileText className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="ds-empty-title">Немає звітів за поточними фільтрами</p>
                                        <p className="ds-empty-description">Скиньте фільтри і спробуйте знову.</p>
                                        <div className="ds-empty-actions">
                                            <Button variant="outline" className="rounded-xl" onClick={resetFilters}>
                                                Скинути фільтри
                                            </Button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : processedResponses.map((resp: any) => {
                            const priority = getPriority(resp)
                            return (
                                <tr
                                    key={resp.id}
                                    onClick={() => router.push(`/admin/reports/${resp.id}`)}
                                    className={`transition-colors group cursor-pointer ${selectedIds.includes(resp.id) ? 'bg-primary/5 dark:bg-blue-900/20 hover:bg-primary/10 dark:hover:bg-blue-900/30' : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80'}`}
                                >
                                    <td className="px-8 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => {
                                                if (selectedIds.includes(resp.id)) setSelectedIds(selectedIds.filter(id => id !== resp.id))
                                                else setSelectedIds([...selectedIds, resp.id])
                                            }}
                                            className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${selectedIds.includes(resp.id) ? 'bg-primary border-primary' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 group-hover:border-slate-400 dark:group-hover:border-slate-500'}`}
                                        >
                                            {selectedIds.includes(resp.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                        </button>
                                    </td>
                                    <td className="px-8 py-4 align-middle font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>{new Date(resp.createdAt).toLocaleDateString('uk-UA')}</span>
                                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{new Date(resp.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
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
                                            <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{resp.districtOrCity || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 align-middle">
                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-colors duration-300">
                                            {resp.patrolRef || '-'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 align-middle text-center">
                                        {resp.status === 'NEW' && <span className="status-chip-waiting">Очікує</span>}
                                        {resp.status === 'ASSIGNED' && <span className="status-chip-progress">В роботі</span>}
                                        {resp.status === 'RESOLVED' && <span className="status-chip-processed">Опрацьовано</span>}
                                        {resp.status === 'REVIEWED' && <span className="status-chip-processed">Опрацьовано</span>}
                                        {resp.status === 'ARCHIVED' && <span className="ds-chip-muted">Архів</span>}
                                    </td>
                                    <td className="px-8 py-4 align-middle text-center">
                                        {resp.assignedTo ? (
                                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md transition-colors duration-300">
                                                {resp.assignedTo.firstName || resp.assignedTo.lastName
                                                    ? `${resp.assignedTo.firstName || ''} ${resp.assignedTo.lastName || ''}`.trim()
                                                    : resp.assignedTo.email.split('@')[0]}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] font-black tracking-widest opacity-30">—</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 align-middle text-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-black text-xs ring-1 ring-amber-200/50 dark:ring-amber-800/50 transition-colors duration-300">
                                            {resp.rateOverall}
                                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 align-middle text-center">
                                        {(resp._count?.attachments || 0) > 0 ? (
                                            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl text-[10px] font-black transition-colors duration-300">
                                                {resp._count.attachments}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] font-black tracking-widest opacity-30">—</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-4 align-middle">
                                        <div className="flex flex-col group/name">
                                            <span className="text-[10px] font-black uppercase tracking-tight text-slate-400 dark:text-slate-500 mb-0.5">Від</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm transition-colors duration-300">{maskSensitive(resp.contact?.name || 'Анонімно', canViewSensitive)}</span>
                                                <Link
                                                    href={resp.citizenId ? `/admin/citizens/${resp.citizenId}` : (resp.contact ? `/admin/citizens?q=${encodeURIComponent(resp.contact.phone)}` : `/admin/citizens?q=${encodeURIComponent(resp.ipHash)}`)}
                                                    className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 bg-slate-100 dark:bg-slate-800 rounded hover:bg-primary dark:hover:bg-blue-600 hover:text-white"
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
                                                <Button variant="outline" size="sm" className="rounded-xl font-black text-[10px] uppercase tracking-wider h-9 px-4 hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white dark:border-slate-700 transition-all shadow-sm">
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

            {/* Mobile Card View */}
            < div className="lg:hidden space-y-4" >
                {
                    processedResponses.length === 0 ? (
                        <div className="ds-empty-state">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors duration-300">
                                    <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                                </div>
                                <p className="ds-empty-title transition-colors duration-300">Немає звітів</p>
                                <p className="ds-empty-description transition-colors duration-300">Змініть або скиньте фільтри.</p>
                                <div className="ds-empty-actions">
                                    <Button variant="outline" className="rounded-xl" onClick={resetFilters}>
                                        Скинути фільтри
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="block sm:hidden space-y-4">
                            {processedResponses.map((resp: any) => {
                                const priority = getPriority(resp)
                                return (
                                    <div
                                        key={resp.id}
                                        className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden"
                                    >
                                        {/* Priority indicator */}
                                        {priority === 'urgent' && (
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
                                        )}

                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-slate-900 dark:text-white font-black text-lg transition-colors duration-300">
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
                                            {resp.status === 'NEW' && <span className="status-chip-waiting">Очікує</span>}
                                            {resp.status === 'ASSIGNED' && <span className="status-chip-progress">В роботі</span>}
                                            {resp.status === 'RESOLVED' && <span className="status-chip-processed">Опрацьовано</span>}
                                            {resp.status === 'REVIEWED' && <span className="status-chip-processed">Опрацьовано</span>}
                                            {resp.status === 'ARCHIVED' && <span className="ds-chip-muted">Архів</span>}
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
                selectedIds.length > 0 && canBulkAction && (
                    <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500 w-[95%] sm:w-auto">
                        <div className="bg-slate-900 text-white rounded-2xl sm:rounded-[2.5rem] px-4 sm:px-8 py-3 sm:py-4 shadow-2xl shadow-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 border border-white/10 ring-1 ring-white/5 backdrop-blur-xl max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center gap-3 sm:gap-4 sm:pr-8 sm:border-r sm:border-white/10">
                                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-sm font-black text-white shadow-lg shadow-primary/30">
                                    {selectedIds.length}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Вибрано звітів</span>
                                    <button onClick={() => setSelectedIds([])} className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase text-left">Скасувати</button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => exportToCSV(selectedIds.map(id => initialResponses.find(r => r.id === id)).filter(Boolean))}
                                    className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border border-white/5 flex-1 sm:flex-none justify-center"
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
                                            className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 flex-1 sm:flex-none justify-center"
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
                                            className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 border border-white/5 flex-1 sm:flex-none justify-center"
                                        >
                                            {isBulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                                            В архів
                                        </button>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border border-white/5 shadow-lg shadow-blue-500/20 flex-1 sm:flex-none justify-center">
                                                    <UserPlus className="w-3.5 h-3.5" />
                                                    Призначити
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="rounded-[2rem] sm:rounded-[2.5rem] bg-slate-900 border-white/10 text-white p-4 sm:p-8 max-w-sm">
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
                                            <button className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-rose-500 hover:bg-rose-600 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 text-white flex-1 sm:flex-none justify-center">
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Видалити
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-[2rem] sm:rounded-[2.5rem] border-rose-100 p-4 sm:p-8">
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
