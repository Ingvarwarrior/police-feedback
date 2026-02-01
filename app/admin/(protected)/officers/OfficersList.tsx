'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatPhoneNumberForCall } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Star, Shield, Trash2, AlertTriangle, Phone, RefreshCw } from "lucide-react"
import { AddEvaluationDialog } from "./components/AddEvaluationDialog"
import { ImportOfficersDialog } from "./ImportOfficersDialog"
import { useAdminStore } from "@/lib/admin-store"
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface Officer {
    id: string
    badgeNumber: string
    firstName: string
    lastName: string
    imageUrl: string | null
    rank: string | null
    department: string | null
    status: string
    avgScore: number
    totalEvaluations: number
    totalResponses: number
    phone?: string | null
}

interface OfficersListProps {
    currentUser: any
}

const RANK_PRIORITY: Record<string, number> = {
    'генерал': 100,
    'полковник': 90,
    'підполковник': 80,
    'майор': 70,
    'капітан': 60,
    'старший лейтенант': 50,
    'лейтенант': 40,
    'молодший лейтенант': 30,
    'старший сержант': 20,
    'сержант': 10,
    'капрал': 5,
    'рядовий': 0
}

type SortKey = 'name' | 'rank' | 'rating' | 'reviews'
type SortDir = 'asc' | 'desc'

export default function OfficersList({ currentUser }: OfficersListProps) {
    const {
        officers,
        setOfficers,
        scrollPosition,
        setScrollPosition,
        searchTerm,
        setSearchTerm,
        lastFetched
    } = useAdminStore()

    const [isHydrated, setIsHydrated] = useState(false)
    const [loading, setLoading] = useState(true)
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; dir: SortDir }>({ key: 'name', dir: 'asc' })
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [evalOfficerId, setEvalOfficerId] = useState<string | null>(null)
    const [previewOfficer, setPreviewOfficer] = useState<Officer | null>(null)
    const [deleteOfficer, setDeleteOfficer] = useState<Officer | null>(null)

    const canCreate = currentUser?.role === 'ADMIN' || currentUser?.permCreateOfficers
    const canDelete = currentUser?.role === 'ADMIN' || currentUser?.permDeleteOfficers
    const router = useRouter()

    useEffect(() => {
        setIsHydrated(true)
        if (lastFetched) {
            setLoading(false)
            // Restore scroll position after rendering
            setTimeout(() => {
                const container = document.getElementById('admin-content-area')
                if (container) {
                    container.scrollTo({ top: scrollPosition, behavior: 'instant' as any })
                }
            }, 100)
        } else {
            fetchOfficers()
        }

        const handleScroll = (e: any) => {
            setScrollPosition(e.target.scrollTop)
        }

        const container = document.getElementById('admin-content-area')
        if (container) {
            container.addEventListener('scroll', handleScroll)
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll)
            }
        }
    }, [])

    const fetchOfficers = async (recalibrate = false) => {
        try {
            setLoading(true)
            const url = recalibrate ? '/api/admin/officers?recalibrate=true' : '/api/admin/officers'
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                setOfficers(data)
                if (recalibrate) toast.success("Статистику оновлено")
            }
        } catch (error) {
            console.error(error)
            toast.error("Помилка завантаження")
        } finally {
            setLoading(false)
        }
    }

    const handleRecalibrate = () => {
        fetchOfficers(true)
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/officers/${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success("Офіцера видалено")
                fetchOfficers()
            } else {
                toast.error("Помилка видалення")
            }
        } catch (e) {
            toast.error("Помилка з'єднання")
        }
    }

    const handleBulkDelete = async () => {
        try {
            const res = await fetch('/api/admin/officers/bulk', {
                method: 'DELETE',
                body: JSON.stringify({ ids: selectedIds }),
                headers: { 'Content-Type': 'application/json' }
            })
            if (res.ok) {
                const json = await res.json()
                toast.success(`Видалено ${json.count} офіцерів`)
                setSelectedIds([])
                fetchOfficers()
            } else {
                toast.error("Помилка масового видалення")
            }
        } catch (e) {
            toast.error("Помилка з'єднання")
        }
    }

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredOfficers.map(o => o.id))
        } else {
            setSelectedIds([])
        }
    }

    const toggleSelect = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id])
        } else {
            setSelectedIds(selectedIds.filter(i => i !== id))
        }
    }

    const getRankPriority = (rank: string | null) => {
        if (!rank) return -1
        // Try to find partial match if exact match fails
        const lowerRank = rank.toLowerCase()
        const key = Object.keys(RANK_PRIORITY).find(k => lowerRank.includes(k))
        return key ? RANK_PRIORITY[key] : 0
    }

    const filteredOfficers = officers
        .filter(o => {
            const matchesSearch =
                o.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.badgeNumber.includes(searchTerm) ||
                (o.department && o.department.toLowerCase().includes(searchTerm.toLowerCase()))
            return matchesSearch
        })
        .sort((a, b) => {
            const dir = sortConfig.dir === 'asc' ? 1 : -1

            switch (sortConfig.key) {
                case 'name':
                    return dir * a.lastName.localeCompare(b.lastName)
                case 'rank':
                    return dir * (getRankPriority(a.rank) - getRankPriority(b.rank))
                case 'rating':
                    return dir * (a.avgScore - b.avgScore)
                case 'reviews':
                    return dir * (a.totalEvaluations - b.totalEvaluations)
                default:
                    return 0
            }
        })

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Особовий склад</h1>
                    <p className="text-sm md:text-base text-slate-500 mt-1">Моніторинг ефективності та оцінювання офіцерів</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {canCreate && (
                        <ImportOfficersDialog onSuccess={fetchOfficers} />
                    )}
                    {canCreate && (
                        <Link href="/admin/officers/new" className="flex-1 md:flex-none">
                            <Button className="w-full md:w-auto bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Додати офіцера
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Filters & Actions - Sticky */}
            <div className="sticky top-[-1px] z-20 flex flex-col md:flex-row gap-4 items-center bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-sm border border-slate-200 -mx-1">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Пошук офіцера..."
                        className="pl-10 h-10 rounded-lg border-0 bg-slate-100 focus-visible:ring-0 placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setScrollPosition(0)
                        }}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {currentUser?.role === 'ADMIN' && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleRecalibrate}
                            disabled={loading}
                            className="h-10 w-10 rounded-lg border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Перерахувати статистику"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    )}
                    <Select value={`${sortConfig.key}-${sortConfig.dir}`} onValueChange={(val) => {
                        const [key, dir] = val.split('-') as [SortKey, SortDir]
                        setSortConfig({ key, dir })
                    }}>
                        <SelectTrigger className="w-full md:w-[240px] h-10 rounded-lg bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Сортування" />
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-xl">
                            <SelectItem value="name-asc">🔤 За прізвищем (А-Я)</SelectItem>
                            <SelectItem value="name-desc">🔤 За прізвищем (Я-А)</SelectItem>
                            <SelectItem value="rank-desc">👮 За званням (високі-низькі)</SelectItem>
                            <SelectItem value="rank-asc">👮 За званням (низькі-високі)</SelectItem>
                            <SelectItem value="rating-desc">⭐ Рейтинг (найкращі)</SelectItem>
                            <SelectItem value="rating-asc">⭐ Рейтинг (найгірші)</SelectItem>
                            <SelectItem value="reviews-desc">💬 Активність (багато відгуків)</SelectItem>
                            <SelectItem value="reviews-asc">💬 Активність (мало відгуків)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && canDelete && (
                <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-xl animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 px-3 py-1 rounded text-sm font-medium">
                            Обрано: {selectedIds.length}
                        </div>
                        <div className="text-sm text-slate-400">
                            Виберіть дію для застосування до обраних офіцерів
                        </div>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Видалити обраних
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Видалити обраних офіцерів?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Ви збираєтесь видалити {selectedIds.length} офіцерів. Ця дія незворотна і видалить також історію їх оцінювання.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Скасувати</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                                    Видалити ({selectedIds.length})
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            {/* Officers List (Desktop Table) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            {canDelete && (
                                <th className="w-12 px-6 py-4">
                                    <Checkbox
                                        checked={filteredOfficers.length > 0 && selectedIds.length === filteredOfficers.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </th>
                            )}
                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">Офіцер</th>
                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">Звання</th>
                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">Підрозділ</th>
                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">Рейтинг</th>
                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-500">Відгуки</th>
                            <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-slate-500">Дії</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={canDelete ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                                    Завантаження...
                                </td>
                            </tr>
                        ) : filteredOfficers.length === 0 ? (
                            <tr>
                                <td colSpan={canDelete ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                                    Офіцерів не знайдено
                                </td>
                            </tr>
                        ) : (
                            filteredOfficers.map(officer => (
                                <tr
                                    key={officer.id}
                                    onClick={() => {
                                        const container = document.getElementById('admin-content-area')
                                        if (container) {
                                            setScrollPosition(container.scrollTop)
                                        }
                                        router.push(`/admin/officers/${officer.id}`)
                                    }}
                                    className={`transition-colors cursor-pointer ${selectedIds.includes(officer.id) ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-100/80'}`}
                                >
                                    {canDelete && (
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.includes(officer.id)}
                                                onCheckedChange={(checked) => toggleSelect(officer.id, checked as boolean)}
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="cursor-pointer group relative"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewOfficer(officer);
                                                }}
                                            >
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 transition-transform duration-300 md:group-hover:scale-[1.1] relative z-10">
                                                    {officer.imageUrl ? (
                                                        <img
                                                            src={officer.imageUrl}
                                                            alt={`${officer.firstName} ${officer.lastName}`}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <Shield className="w-5 h-5" />
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{officer.lastName} {officer.firstName}</div>
                                                <div className="text-xs text-slate-500 font-mono">#{officer.badgeNumber}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-slate-700">{officer.rank || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600">{officer.department || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Star className={`w-4 h-4 ${officer.avgScore >= 4 ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />
                                            <span className="font-bold text-slate-900">{officer.avgScore > 0 ? officer.avgScore : '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <span className="font-medium text-slate-900">{officer.totalEvaluations}</span>
                                            <span className="text-slate-400 mx-1">/</span>
                                            <span className="text-slate-500">{officer.totalResponses}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-2">
                                            {officer.phone && (
                                                <a href={`tel:${formatPhoneNumberForCall(officer.phone)}`}>
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-emerald-100 text-emerald-600 hover:bg-emerald-50">
                                                        <Phone className="w-4 h-4" />
                                                    </Button>
                                                </a>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg border-blue-100 text-blue-600 hover:bg-blue-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEvalOfficerId(officer.id);
                                                }}
                                            >
                                                <Star className="w-4 h-4" />
                                            </Button>

                                            <Link href={`/admin/officers/${officer.id}`}>
                                                <Button variant="ghost" size="sm" className="rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900">
                                                    ДЕТАЛІ
                                                </Button>
                                            </Link>
                                            {canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-300 hover:text-red-500 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteOfficer(officer);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Officers List (Mobile Cards) */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-slate-400">Завантаження...</div>
                ) : filteredOfficers.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">Офіцерів не знайдено</div>
                ) : (
                    filteredOfficers.map(officer => (
                        <div key={officer.id} onClick={() => {
                            const container = document.getElementById('admin-content-area')
                            if (container) {
                                setScrollPosition(container.scrollTop)
                            }
                            router.push(`/admin/officers/${officer.id}`)
                        }} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-inner">
                                    {officer.imageUrl ? (
                                        <img src={officer.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><Shield className="w-8 h-8" /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-black text-slate-900 text-lg leading-tight mb-1">{officer.lastName} {officer.firstName}</h3>
                                            <p className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md w-fit">#{officer.badgeNumber}</p>
                                        </div>
                                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-black text-xs">
                                            {officer.avgScore > 0 ? officer.avgScore : '-'} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {officer.rank && <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">{officer.rank}</span>}
                                        {officer.department && <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">{officer.department}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between gap-2 overflow-hidden">
                                <div className="flex items-center gap-2">
                                    {officer.phone && (
                                        <a href={`tel:${formatPhoneNumberForCall(officer.phone)}`} onClick={(e) => e.stopPropagation()}>
                                            <Button size="icon" variant="outline" className="h-10 w-10 rounded-2xl border-emerald-100 text-emerald-600">
                                                <Phone className="w-4 h-4" />
                                            </Button>
                                        </a>
                                    )}
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-10 w-10 rounded-2xl border-blue-100 text-blue-600"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEvalOfficerId(officer.id);
                                        }}
                                    >
                                        <Star className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Button size="sm" variant="ghost" className="text-primary font-black uppercase tracking-widest text-[10px] h-10 px-4 rounded-xl hover:bg-primary/5">
                                    Деталі →
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Singleton Dialogs */}
            <Dialog open={!!previewOfficer} onOpenChange={(open) => !open && setPreviewOfficer(null)}>
                <DialogContent className="p-0 overflow-hidden bg-transparent border-0 shadow-none max-w-sm md:max-w-md w-auto">
                    {previewOfficer?.imageUrl ? (
                        <img
                            src={previewOfficer.imageUrl}
                            alt="Officer Full Photo"
                            className="w-full h-auto rounded-lg shadow-2xl ring-4 ring-white"
                        />
                    ) : (
                        <div className="bg-white p-8 rounded-lg flex flex-col items-center gap-4 text-center">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                                <Shield className="w-12 h-12" />
                            </div>
                            <p className="text-slate-500 font-medium">Фото відсутнє</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AddEvaluationDialog
                officerId={evalOfficerId || ""}
                onSuccess={fetchOfficers}
                open={!!evalOfficerId}
                setOpen={(open) => !open && setEvalOfficerId(null)}
                variant="list"
            />

            <AlertDialog open={!!deleteOfficer} onOpenChange={(open) => !open && setDeleteOfficer(null)}>
                <AlertDialogContent className="rounded-[2.5rem] border-0">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black uppercase italic">Видалити офіцера?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 font-medium">
                            Ви збираєтесь видалити офіцера <strong>{deleteOfficer?.lastName} {deleteOfficer?.firstName}</strong>. Ця дія незворотна.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-bold">Скасувати</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteOfficer) {
                                    handleDelete(deleteOfficer.id);
                                    setDeleteOfficer(null);
                                }
                            }}
                            className="rounded-xl bg-red-600 hover:bg-red-700 font-bold px-8"
                        >
                            ВИДАЛИТИ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

