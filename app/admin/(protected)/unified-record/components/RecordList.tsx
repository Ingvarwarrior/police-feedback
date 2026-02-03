'use client'

import { useState, useMemo } from "react"
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
    Loader2
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

import CreateRecordDialog from "./CreateRecordDialog"
import {
    deleteUnifiedRecordAction,
    bulkDeleteUnifiedRecordsAction,
    bulkAssignUnifiedRecordsAction
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

interface RecordListProps {
    initialRecords: any[]
    users?: { id: string, firstName: string | null, lastName: string | null, username: string }[]
}

export default function RecordList({ initialRecords, users = [] }: RecordListProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("ALL")
    const [sortBy, setSortBy] = useState("newest")

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)

    const filteredRecords = useMemo(() => {
        let result = [...initialRecords]

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase()
            result = result.filter(r =>
                r.eoNumber.toLowerCase().includes(lowerSearch) ||
                (r.description?.toLowerCase().includes(lowerSearch)) ||
                (r.address?.toLowerCase().includes(lowerSearch)) ||
                (r.applicant?.toLowerCase().includes(lowerSearch))
            )
        }

        if (categoryFilter !== 'ALL') {
            result = result.filter(r => r.category === categoryFilter)
        }

        result.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.eoDate).getTime() - new Date(a.eoDate).getTime()
            if (sortBy === 'oldest') return new Date(a.eoDate).getTime() - new Date(b.eoDate).getTime()
            return 0
        })

        return result
    }, [initialRecords, searchTerm, categoryFilter, sortBy])

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
            setSelectedIds([])
        } catch (error) {
            toast.error("Помилка масового призначення")
        } finally {
            setIsAssigning(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                        placeholder="Пошук за номером, адресою чи змістом..."
                        className="pl-12 bg-slate-50 border-0 rounded-2xl h-12 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white h-12 font-medium">
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
                        <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white h-12 font-medium">
                            <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Сортування" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="newest">Спочатку нові</SelectItem>
                            <SelectItem value="oldest">Спочатку старі</SelectItem>
                        </SelectContent>
                    </Select>

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
                                                        <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                                                            {record.eoNumber}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <CalendarIcon className="w-3.5 h-3.5" />
                                                            <span className="text-[10px] font-bold">
                                                                {format(new Date(record.eoDate), 'dd MMMM yyyy', { locale: uk })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-tight mt-2">
                                                        {record.description || 'Без опису'}
                                                    </h3>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <CreateRecordDialog
                                                        initialData={record}
                                                        users={users}
                                                        trigger={
                                                            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                                                Змінити
                                                            </Button>
                                                        }
                                                    />

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                                                Видалити
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

                                                    {record.category && (
                                                        <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-wider">
                                                            {record.category}
                                                        </span>
                                                    )}
                                                    {record.resolution && (
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Рішення прийнято
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <MapPin className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs font-bold uppercase tracking-widest">Адреса та район</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700">
                                                        {record.address || 'Не вказано'}
                                                        {record.district && <span className="text-slate-400 font-medium ml-1">({record.district})</span>}
                                                    </p>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <User className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs font-bold uppercase tracking-widest">Заявник / Офіцер</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-bold text-slate-700">
                                                            <span className="text-slate-400 text-[10px] mr-1">Гр.</span> {record.applicant || '—'}
                                                        </p>
                                                        {record.assignedUser ? (
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <Briefcase className="w-3 h-3 text-blue-500" />
                                                                <p className="text-[10px] font-bold text-slate-900">
                                                                    {record.assignedUser.lastName || ''} {record.assignedUser.firstName || record.assignedUser.username}
                                                                </p>
                                                            </div>
                                                        ) : record.officerName ? (
                                                            <p className="text-[10px] font-medium text-slate-500">
                                                                Відповідальний: {record.officerName}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <FileText className="w-4 h-4 shrink-0" />
                                                        <span className="text-xs font-bold uppercase tracking-widest">Результат</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-emerald-700 italic">
                                                        {record.resolution || 'В процесі розгляду...'}
                                                    </p>
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
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5">
                    <div className="bg-slate-900 text-white px-8 py-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-8 border border-white/10 backdrop-blur-xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Вибрано</span>
                            <span className="text-xl font-black italic">{selectedIds.length} записів</span>
                        </div>

                        <div className="h-10 w-px bg-white/10" />

                        <div className="flex items-center gap-3">
                            <Select onValueChange={(val) => handleBulkAssign(val)}>
                                <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 transition-all min-w-[200px] text-sm font-bold">
                                    <UserPlus className="w-4 h-4 mr-2 text-blue-400" />
                                    <SelectValue placeholder="Призначити вибрані..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.lastName} {user.firstName || user.username}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="h-12 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold px-6 transition-all gap-2">
                                        <Trash2 className="w-4 h-4" />
                                        Видалити
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl font-black uppercase italic tracking-tight">Масове видалення</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-500 font-medium">
                                            Ви впевнені, що хочете видалити {selectedIds.length} вибраних записів? <br />
                                            Ця дія незворотна.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="bg-slate-50 p-6 -m-6 mt-6 rounded-b-[2rem]">
                                        <AlertDialogCancel className="rounded-xl border-none font-bold text-slate-500">Скасувати</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleBulkDelete}
                                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                                        >
                                            Так, видалити все
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button
                                variant="ghost"
                                className="h-12 w-12 rounded-2xl hover:bg-white/10 text-slate-400 p-0"
                                onClick={() => setSelectedIds([])}
                            >
                                <XCircle className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
