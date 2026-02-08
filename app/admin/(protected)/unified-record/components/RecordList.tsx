'use client'

import React, { useState, useMemo, useEffect } from "react"
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
    Eye
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

import CreateRecordDialog from "./CreateRecordDialog"
import ViewRecordDialog from "./ViewRecordDialog"
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
    const [records, setRecords] = useState(initialRecords)
    const [filterSearch, setFilterSearch] = useState("")
    const [filterCategory, setFilterCategory] = useState("ALL")
    const [activeTab, setActiveTab] = useState("ALL")
    const [sortBy, setSortBy] = useState("newest")
    const [showOnlyMine, setShowOnlyMine] = useState(false)

    // View state
    const [viewRecord, setViewRecord] = useState<any>(null)
    const [isViewOpen, setIsViewOpen] = useState(false)

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)

    useEffect(() => {
        setRecords(initialRecords)
    }, [initialRecords])

    const filteredRecords = useMemo(() => {
        let result = [...records]

        // Apply Tab filter
        if (activeTab !== 'ALL') {
            result = result.filter(r => r.recordType === activeTab)
        }

        // Apply search filter
        if (filterSearch) {
            const lowerSearch = filterSearch.toLowerCase()
            result = result.filter(r =>
                r.eoNumber.toLowerCase().includes(lowerSearch) ||
                (r.description?.toLowerCase().includes(lowerSearch)) ||
                (r.address?.toLowerCase().includes(lowerSearch)) ||
                (r.applicant?.toLowerCase().includes(lowerSearch))
            )
        }

        // Apply category filter
        if (filterCategory !== 'ALL') {
            result = result.filter(r => r.category === filterCategory)
        }

        // Apply "show only mine" filter
        if (showOnlyMine) {
            result = result.filter(r => r.assignedUserId === currentUser.id)
        }

        // Apply sorting
        result.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.eoDate).getTime() - new Date(a.eoDate).getTime()
            if (sortBy === 'oldest') return new Date(a.eoDate).getTime() - new Date(b.eoDate).getTime()
            return 0
        })

        return result
    }, [records, filterSearch, filterCategory, activeTab, sortBy, showOnlyMine, currentUser.id])

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

    const handleProcess = async (id: string, resolution: string) => {
        try {
            await processUnifiedRecordAction(id, resolution)
            toast.success("Картку опрацьовано")
            setRecords(prev => prev.map(r => r.id === id ? { ...r, status: "PROCESSED", resolution, processedAt: new Date().toISOString() } : r))
        } catch (error) {
            toast.error("Помилка опрацювання")
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

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <Tabs defaultValue="ALL" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm h-14 mb-2 w-full justify-start overflow-x-auto overflow-y-hidden no-scrollbar">
                    <TabsTrigger
                        value="ALL"
                        className="rounded-xl px-4 md:px-8 h-full font-black uppercase tracking-widest text-[9px] md:text-[10px] data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all gap-2 shrink-0"
                    >
                        Все записи
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[9px]">
                            {records.length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="EO"
                        className="rounded-xl px-4 md:px-8 h-full font-black uppercase tracking-widest text-[9px] md:text-[10px] data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all gap-2 shrink-0"
                    >
                        Єдиний облік
                        <span className="bg-blue-50 text-blue-500 px-2 py-0.5 rounded-md text-[9px]">
                            {records.filter(r => r.recordType === 'EO').length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="ZVERN"
                        className="rounded-xl px-4 md:px-8 h-full font-black uppercase tracking-widest text-[9px] md:text-[10px] data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all gap-2 shrink-0"
                    >
                        Звернення
                        <span className="bg-amber-50 text-amber-500 px-2 py-0.5 rounded-md text-[9px]">
                            {records.filter(r => r.recordType === 'ZVERN').length}
                        </span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
            {/* Filters Bar */}
            <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                        placeholder="Пошук за номером, адресою чи змістом..."
                        className="pl-12 bg-slate-50 border-0 rounded-2xl h-12 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="flex-1 md:w-[180px] rounded-xl border-slate-200 bg-white h-12 font-medium">
                            <Filter className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Категорія" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="ALL">Всі категорії</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="flex-1 md:w-[180px] rounded-xl border-slate-200 bg-white h-12 font-medium">
                            <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Сортування" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="newest">Спочатку нові</SelectItem>
                            <SelectItem value="oldest">Спочатку старі</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="h-8 w-px bg-slate-100 hidden sm:block mx-1" />

                    <Button
                        variant={showOnlyMine ? "default" : "outline"}
                        onClick={() => setShowOnlyMine(!showOnlyMine)}
                        className={cn(
                            "h-12 rounded-xl font-bold transition-all px-6 gap-2",
                            showOnlyMine ? "bg-slate-900 text-white shadow-lg" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <CalendarCheck2 className="w-4 h-4" />
                        {showOnlyMine ? "Мої завдання" : "Всі записи"}
                    </Button>
                </div>
            </div>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className={cn(
                            "h-12 rounded-xl px-4 border-slate-200 font-bold gap-2 transition-all",
                            selectedIds.length === filteredRecords.length && filteredRecords.length > 0 ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white hover:bg-slate-50"
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

                    <Button variant="outline" className="h-12 rounded-xl px-4 border-slate-200 hover:bg-slate-50 font-bold gap-2">
                        <Download className="w-4 h-4" />
                        Експорт
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Всього записів</p>
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
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <FileText className="w-10 h-10" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Записів не знайдено</h3>
                            <p className="text-slate-500">Завантажте Excel-файл або змініть параметри пошуку</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredRecords.map((record) => (
                            <Card key={record.id} className={cn(
                                "border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group border border-transparent",
                                selectedIds.includes(record.id) ? "border-blue-200 ring-2 ring-blue-500/10" : "hover:border-blue-100"
                            )}>
                                <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row relative">
                                        {/* Row Selection Checkbox */}
                                        <button
                                            onClick={() => toggleSelect(record.id)}
                                            className={cn(
                                                "absolute left-4 top-4 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                                selectedIds.includes(record.id) ? "bg-blue-600 text-white" : "bg-white/80 border border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100"
                                            )}
                                        >
                                            <CheckSquare className="w-4 h-4" />
                                        </button>

                                        {/* Status Sidebar */}
                                        <div className={`w-full lg:w-2 ${record.resolution ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                                        <div className="flex-1 p-5 md:p-8">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] md:text-sm font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full shrink-0">
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
                                                        className="text-base md:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-tight mt-2 break-words cursor-pointer"
                                                    >
                                                        {record.description || 'Без опису'}
                                                    </h3>
                                                </div>

                                                <div className="flex flex-row md:flex-wrap gap-1 md:gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 md:h-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all flex-1 md:flex-none"
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
                                                            "px-2 md:px-3 py-1 flex items-center gap-1.5 rounded-lg border text-[8px] md:text-[9px] font-black uppercase tracking-wider",
                                                            new Date(record.deadline) < new Date() ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-600 border-slate-100"
                                                        )}>
                                                            <Clock className="w-3 h-3" />
                                                            До: {format(new Date(record.deadline), 'dd.MM.yy')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <User className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs font-bold uppercase tracking-widest">Заявник</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700">
                                                        <span className="text-slate-400 text-[10px] mr-1">Гр.</span> {record.applicant || '—'}
                                                    </p>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <FileText className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs font-bold uppercase tracking-widest">Результат</span>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className={cn(
                                                            "text-sm font-bold italic",
                                                            record.resolution ? "text-emerald-700" : (record.assignedUser || record.officerName ? "text-blue-600" : "text-amber-600")
                                                        )}>
                                                            {record.resolution || (record.assignedUser || record.officerName ? 'В процесі розгляду...' : 'Не призначено')}
                                                        </div>
                                                        {record.resolutionDate && (
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium italic">
                                                                <CalendarIcon className="w-3 h-3" />
                                                                Виконано: {format(new Date(record.resolutionDate), "dd.MM.yyyy", { locale: uk })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Briefcase className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs font-bold uppercase tracking-widest">Відповідальний</span>
                                                    </div>
                                                    <div className="space-y-1">
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
                                                            <SelectTrigger className="h-9 rounded-xl border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-all text-sm font-bold w-full">
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

                                                        {/* Single "DONE" Button for assigned user */}
                                                        {record.assignedUserId === currentUser.id && record.status !== 'PROCESSED' && (
                                                            <div className="flex flex-col gap-2 mt-4">
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest h-12 gap-2 shadow-lg shadow-emerald-900/10 transition-all hover:scale-[1.02]">
                                                                            <CheckSquare className="w-5 h-5" />
                                                                            ВИКОНАНО
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="p-4 rounded-[2rem] w-80 shadow-2xl border-none space-y-4 bg-white">
                                                                        <div className="space-y-3">
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Виберіть результат:</p>
                                                                            <div className="grid gap-2">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    className="justify-start h-auto py-3 px-4 rounded-xl text-left font-bold text-sm bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                                                                                    onClick={() => handleProcess(record.id, "Списано до справи")}
                                                                                >
                                                                                    <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                                                                                    Списано до справи
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    className="justify-start h-auto py-3 px-4 rounded-xl text-left font-bold text-sm bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition-all"
                                                                                    onClick={() => handleProcess(record.id, "Надано письмову відповідь")}
                                                                                >
                                                                                    <FileText className="w-4 h-4 mr-2 shrink-0" />
                                                                                    Надано письмову відповідь
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    className="justify-start h-auto py-3 px-4 rounded-xl text-left font-bold text-sm bg-slate-50 hover:bg-amber-50 hover:text-amber-700 transition-all"
                                                                                    onClick={() => handleProcess(record.id, "Надіслано до іншого органу/підрозділу")}
                                                                                >
                                                                                    <MoreVertical className="w-4 h-4 mr-2 shrink-0" />
                                                                                    Надіслано до іншого органу
                                                                                </Button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="pt-2 border-t border-slate-100 space-y-3">
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Свій варіант:</p>
                                                                            <Textarea
                                                                                placeholder="Вкажіть рішення..."
                                                                                className="rounded-xl bg-slate-50 border-none min-h-[100px] font-medium"
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' && e.ctrlKey) {
                                                                                        handleProcess(record.id, e.currentTarget.value)
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <Button
                                                                                className="w-full bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs h-10"
                                                                                onClick={(e) => {
                                                                                    const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement
                                                                                    handleProcess(record.id, textarea.value)
                                                                                }}
                                                                            >
                                                                                Зберегти свій варіант
                                                                            </Button>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>

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
                                                        {currentUser.role === 'ADMIN' && (
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
            {selectedIds.length > 0 && (
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
                                    <SelectTrigger className="h-10 md:h-12 rounded-xl md:rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 transition-all min-w-[140px] md:min-w-[200px] text-[10px] md:text-sm font-bold">
                                        <UserPlus className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2 text-blue-400" />
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
                                    <Button className="h-10 md:h-12 rounded-xl md:rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 font-bold px-3 md:px-6 transition-all gap-1 md:gap-2 text-[10px] md:text-sm">
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
            )}
            <ViewRecordDialog
                record={viewRecord}
                isOpen={isViewOpen}
                onOpenChange={setIsViewOpen}
            />
        </div>
    )
}
