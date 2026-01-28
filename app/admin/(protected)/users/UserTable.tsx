'use client'

import { useState, useTransition } from "react"
import { Trash2, Mail, Calendar, ToggleLeft, ToggleRight, UserCog, ShieldCheck, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toggleUserStatus, deleteUser, resetUserPassword } from "./actions/userActions"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserTableProps {
    users: any[]
}

export default function UserTable({ users }: UserTableProps) {
    const [isPending, startTransition] = useTransition()

    const handleToggleStatus = async (id: string, active: boolean) => {
        startTransition(async () => {
            try {
                await toggleUserStatus(id, active)
                toast.success(active ? "Користувача активовано" : "Користувача деактивовано")
            } catch (err: any) {
                toast.error(err.message || "Помилка при зміні статусу")
            }
        })
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Ви впевнені, що хочете видалити цього користувача?")) return

        startTransition(async () => {
            try {
                await deleteUser(id)
                toast.success("Користувача видалено")
            } catch (err: any) {
                toast.error(err.message || "Помилка при видаленні")
            }
        })
    }

    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [newPass, setNewPass] = useState("")

    const openResetDialog = (id: string) => {
        setSelectedUserId(id)
        setNewPass("")
        setResetDialogOpen(true)
    }

    const handleResetPassword = async () => {
        if (!selectedUserId || !newPass) return

        startTransition(async () => {
            try {
                await resetUserPassword(selectedUserId, newPass)
                toast.success("Пароль успішно скинуто")
                setResetDialogOpen(false)
            } catch (err: any) {
                toast.error(err.message || "Помилка скидання паролю")
            }
        })
    }

    return (
        <div className="space-y-4">
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Користувач</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Роль</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Дата реєстрації</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Статус</th>
                            <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Дії</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {users.map((user: any) => (
                            <tr key={user.id} className="transition-colors hover:bg-slate-50 group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                                            <p className="font-black">{(user.username?.[0] || 'U').toUpperCase()}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-slate-900 leading-none">
                                                    {user.lastName} {user.firstName}
                                                </p>
                                                {user.badgeNumber && <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-mono">#{user.badgeNumber}</span>}
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium">@{user.username} {user.email ? `(${user.email})` : ''}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    {user.role === 'ADMIN' ? (
                                        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest select-none">
                                            <ShieldCheck className="w-3 h-3" />
                                            Адміністратор
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest select-none">
                                            <Eye className="w-3 h-3" />
                                            Інспектор
                                        </span>
                                    )}
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <div className="inline-flex items-center gap-2 text-slate-500 font-medium text-xs">
                                        <Calendar className="w-3 h-3 text-slate-300" />
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <button
                                        onClick={() => handleToggleStatus(user.id, !user.active)}
                                        disabled={isPending}
                                        className={`transition-all ${user.active ? 'text-green-500' : 'text-slate-300'} disabled:opacity-50`}
                                    >
                                        {user.active ? (
                                            <div className="flex items-center gap-1 justify-center">
                                                <ToggleRight className="w-6 h-6" />
                                                <span className="text-[10px] font-black uppercase">Активний</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 justify-center">
                                                <ToggleLeft className="w-6 h-6" />
                                                <span className="text-[10px] font-black uppercase text-slate-400">Вимкнено</span>
                                            </div>
                                        )}
                                    </button>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openResetDialog(user.id)}
                                            className="text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg"
                                        >
                                            <div className="rotate-90">
                                                <div className="-rotate-90"><div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-key-round"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" /><circle cx="16.5" cy="7.5" r=".5" /></svg></div></div>
                                            </div>
                                        </Button>
                                        <Link href={`/admin/users/${user.id}`}>
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg">
                                                <UserCog className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={isPending}
                                            onClick={() => handleDelete(user.id)}
                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {users.map((user: any) => (
                    <div key={user.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl">
                                    {(user.username?.[0] || 'U').toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 leading-tight">
                                        {user.lastName || user.firstName ? `${user.lastName || ''} ${user.firstName || ''}` : 'Без імені'}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium break-all">@{user.username} {user.email ? `(${user.email})` : ''}</div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {user.role === 'ADMIN' ? (
                                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                        Admin
                                    </span>
                                ) : (
                                    <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                        Inspector
                                    </span>
                                )}
                                {user.badgeNumber && <span className="text-[10px] font-mono text-slate-400">#{user.badgeNumber}</span>}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50 gap-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleToggleStatus(user.id, !user.active)}
                                    disabled={isPending}
                                    className={`p-2 rounded-xl transition-colors ${user.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    {user.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                </button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openResetDialog(user.id)}
                                    className="bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl w-9 h-9"
                                >
                                    <div className="rotate-90">
                                        <div className="-rotate-90"><div className="w-4 h-4"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-key-round"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" /><circle cx="16.5" cy="7.5" r=".5" /></svg></div></div>
                                    </div>
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Link href={`/admin/users/${user.id}`}>
                                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs font-bold uppercase">
                                        Налаштування
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isPending}
                                    onClick={() => handleDelete(user.id)}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl w-9 h-9"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Скидання паролю</DialogTitle>
                        <DialogDescription>
                            Введіть новий пароль для користувача. Ця дія миттєво змінить пароль.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Новий пароль</Label>
                            <Input
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                placeholder="******"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Скасувати</Button>
                        <Button onClick={handleResetPassword} disabled={!newPass || isPending}>Зберегти</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
