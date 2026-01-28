'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Phone, Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatPhoneNumberForCall } from "@/lib/utils"
import DeleteCitizenButton from "./DeleteCitizenButton"
import { bulkDeleteCitizens } from "./actions/citizenActions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Loader2, AlertTriangle } from "lucide-react"

export default function CitizensList({ citizens, currentUser }: { citizens: any[], currentUser: any }) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)

    // Admin or specific permission
    const canDelete = currentUser?.role === 'ADMIN' || currentUser?.permDeleteCitizens

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const toggleAll = () => {
        setSelectedIds(selectedIds.length === citizens.length ? [] : citizens.map(c => c.id))
    }

    return (
        <>
            {/* Desktop Table */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden hidden sm:block">
                <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Усього в базі: {citizens.length}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-slate-50/10">
                                    {canDelete && (
                                        <th className="h-12 px-6 text-left align-middle">
                                            <Checkbox
                                                checked={selectedIds.length === citizens.length && citizens.length > 0}
                                                onCheckedChange={toggleAll}
                                            />
                                        </th>
                                    )}
                                    <th className="h-12 px-8 text-left align-middle font-black text-slate-400 uppercase text-[10px] tracking-widest">Громадянин</th>
                                    <th className="h-12 px-6 text-center align-middle font-black text-slate-400 uppercase text-[10px] tracking-widest">Звітів</th>
                                    <th className="h-12 px-6 text-center align-middle font-black text-slate-400 uppercase text-[10px] tracking-widest">Статус</th>
                                    <th className="h-12 px-8 text-right align-middle font-black text-slate-400 uppercase text-[10px] tracking-widest">Дії</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {citizens.length === 0 && (
                                    <tr>
                                        <td colSpan={canDelete ? 5 : 4} className="px-8 py-12 text-center text-slate-400 font-medium uppercase text-xs tracking-widest italic opacity-50">
                                            Дані відсутні
                                        </td>
                                    </tr>
                                )}
                                {citizens.map((citizen: any) => (
                                    <tr key={citizen?.id || Math.random()} className="hover:bg-slate-50/50 transition-colors group">
                                        {canDelete && (
                                            <td className="px-6 py-5">
                                                <Checkbox
                                                    checked={selectedIds.includes(citizen.id)}
                                                    onCheckedChange={() => toggleSelection(citizen.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                        )}
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-black shadow-sm ring-1 ring-slate-200/50">
                                                    {citizen?.fullName?.[0]?.toUpperCase() || <Users className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{citizen?.fullName || 'Громадянин'}</p>
                                                    {citizen?.phone ? (
                                                        <a
                                                            href={`tel:${formatPhoneNumberForCall(citizen.phone)}`}
                                                            className="text-xs text-primary hover:underline flex items-center gap-1 font-bold"
                                                        >
                                                            <Phone className="w-3.5 h-3.5 stroke-[2.5px]" />
                                                            {citizen.phone}
                                                        </a>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 font-black tracking-widest flex items-center gap-1">
                                                            <Phone className="w-3.5 h-3.5 opacity-50" />
                                                            ID: {citizen?.ipHash?.slice(0, 8) || 'N/A'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-black shadow-sm ring-1 ring-blue-200/50">
                                                {citizen?._count?.responses || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex justify-center gap-2">
                                                {citizen?.isVip && (
                                                    <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[9px] font-black uppercase tracking-wider">VIP</span>
                                                )}
                                                {citizen?.isSuspicious ? (
                                                    <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[9px] font-black uppercase tracking-wider animate-pulse">⚠️ ПІДОЗРА</span>
                                                ) : (
                                                    !citizen?.isVip && <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-wider">Норма</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            {citizen?.id ? (
                                                <>
                                                    <Link href={`/admin/citizens/${citizen.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-10 w-10 gap-2 font-black uppercase text-[10px] tracking-widest hover:bg-primary/5 hover:text-primary transition-all rounded-xl">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    {canDelete && <DeleteCitizenButton id={citizen.id} />}
                                                </>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-4">
                {citizens.map((citizen: any) => (
                    <div key={citizen?.id || Math.random()} className="bg-white border-2 border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <div className="p-5">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-lg shadow-sm">
                                        {citizen?.fullName?.[0]?.toUpperCase() || <Users className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-base leading-tight mb-1">{citizen?.fullName || 'Громадянин'}</p>
                                        {citizen?.phone ? (
                                            <a
                                                href={`tel:${formatPhoneNumberForCall(citizen.phone)}`}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary rounded-lg text-xs font-bold active:scale-95 transition-transform"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                {citizen.phone}
                                            </a>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase opacity-60">
                                                ID: {citizen?.ipHash?.slice(0, 8) || 'N/A'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Link href={`/admin/citizens/${citizen?.id}`}>
                                        <Button variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0">
                                            <Eye className="w-4 h-4 text-slate-400" />
                                        </Button>
                                    </Link>
                                    {canDelete && (
                                        <div onClick={(e) => e.preventDefault()}>
                                            <DeleteCitizenButton id={citizen?.id} className="h-8 w-8 rounded-xl" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-black shadow-sm ring-1 ring-blue-200/50">
                                    {citizen?._count?.responses || 0} звітів
                                </span>
                                <div className="flex gap-2">
                                    {citizen?.isVip && (
                                        <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[9px] font-black uppercase tracking-wider">VIP</span>
                                    )}
                                    {citizen?.isSuspicious && (
                                        <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[9px] font-black uppercase tracking-wider animate-pulse">⚠️ ПІДОЗРА</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Bulk Actions Bar */}
            {canDelete && selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-slate-900 text-white rounded-[2.5rem] px-8 py-4 shadow-2xl shadow-blue-900/40 flex items-center gap-8 border border-white/10 ring-1 ring-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-4 pr-8 border-r border-white/10">
                            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-sm font-black text-white shadow-lg shadow-primary/30">
                                {selectedIds.length}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Вибрано досьє</span>
                                <button onClick={() => setSelectedIds([])} className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase text-left">Скасувати</button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button className="h-11 px-6 rounded-2xl bg-rose-500 hover:bg-rose-600 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 text-white">
                                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        Видалити
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] border-rose-100 p-8">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl font-black uppercase text-rose-600 flex items-center gap-2">
                                            <AlertTriangle className="w-6 h-6" />
                                            Масове видалення досьє
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-600 font-medium pt-2">
                                            Ви впевнені, що хочете видалити {selectedIds.length} досьє?
                                            <br />
                                            Звіти не будуть видалені, але стануть анонімними.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-6 gap-2">
                                        <AlertDialogCancel className="rounded-2xl h-12 font-bold focus:ring-0">Скасувати</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={async () => {
                                                setIsDeleting(true);
                                                try {
                                                    await bulkDeleteCitizens(selectedIds);
                                                    toast.success(`Видалено ${selectedIds.length} досьє`);
                                                    setSelectedIds([]);
                                                    router.refresh();
                                                } catch (e) {
                                                    toast.error('Помилка при видаленні');
                                                } finally {
                                                    setIsDeleting(false);
                                                }
                                            }}
                                            className="rounded-2xl h-12 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest shadow-lg shadow-rose-500/20"
                                        >
                                            Видалити
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
