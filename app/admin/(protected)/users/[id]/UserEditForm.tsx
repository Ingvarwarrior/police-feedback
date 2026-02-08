'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, Shield, Eye, EyeOff, Loader2, CheckCircle2, UserCog } from 'lucide-react'
import Link from 'next/link'
import { updateUser } from '../actions/userActions'
import { toast } from 'sonner'

import { PERMISSIONS_CONFIG } from '@/lib/permissions-config'

const PERMISSIONS = PERMISSIONS_CONFIG

interface UserEditFormProps {
    user: {
        id: string
        username: string
        email: string | null
        firstName: string | null
        lastName: string | null
        badgeNumber: string | null
        role: string
        [key: string]: any
    }
}

export default function UserEditForm({ user }: UserEditFormProps) {
    const [username, setUsername] = useState(user.username)
    const [email, setEmail] = useState(user.email || '')
    const [firstName, setFirstName] = useState(user.firstName || '')
    const [lastName, setLastName] = useState(user.lastName || '')
    const [badgeNumber, setBadgeNumber] = useState(user.badgeNumber || '')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [role, setRole] = useState(user.role)
    const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {}
        PERMISSIONS_CONFIG.forEach(p => {
            initial[p.id] = !!(user as any)[p.id]
        })
        return initial
    })
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const togglePermission = (id: string) => {
        setPermissions(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const setRolePresets = (newRole: string) => {
        setRole(newRole)
        if (newRole === 'ADMIN') {
            const allTrue: Record<string, boolean> = {}
            PERMISSIONS_CONFIG.forEach(p => allTrue[p.id] = true)
            setPermissions(allTrue)
        } else if (newRole === 'OFFICER_VIEWER') {
            const officerViewer: Record<string, boolean> = {}
            PERMISSIONS_CONFIG.forEach(p => officerViewer[p.id] = false)
            officerViewer.permViewOfficerStats = true
            officerViewer.permViewUnifiedRecords = true
            setPermissions(officerViewer)
        } else {
            const viewer: Record<string, boolean> = {}
            PERMISSIONS_CONFIG.forEach(p => viewer[p.id] = false)
            viewer.permViewReports = true
            viewer.permViewSensitiveData = true
            viewer.permEditNotes = true
            viewer.permChangeStatus = true
            viewer.permEditOfficers = true
            viewer.permViewOfficerStats = true
            viewer.permCreateEvaluations = true
            viewer.permViewUnifiedRecords = true
            viewer.permProcessUnifiedRecords = true
            viewer.permEditCitizens = true
            viewer.permMarkSuspicious = true
            setPermissions(viewer)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await updateUser(user.id, {
                username,
                email: email || undefined,
                firstName,
                lastName,
                badgeNumber,
                passwordHash: password || undefined, // Only update if provided
                role,
                ...permissions
            })
            toast.success("Дані користувача оновлено")
            router.push('/admin/users')
            router.refresh()
        } catch (error) {
            toast.error("Помилка при оновленні користувача")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Логін (username)</Label>
                    <Input
                        id="username"
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner text-lg font-medium"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email співробітника (опціонально)</Label>
                    <Input
                        id="email"
                        type="email"
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner text-lg font-medium"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Прізвище</Label>
                    <Input
                        id="lastName"
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner text-lg font-medium"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ім'я</Label>
                    <Input
                        id="firstName"
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner text-lg font-medium"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="badgeNumber" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Жетон</Label>
                    <Input
                        id="badgeNumber"
                        className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner text-lg font-medium"
                        value={badgeNumber}
                        onChange={(e) => setBadgeNumber(e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <Label htmlFor="password" title="password_label" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Новий пароль (залишити пустим, якщо не змінюється)</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-14 rounded-2xl border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-inner text-lg font-medium pr-14"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                        >
                            {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Рівень доступу (пресет)</Label>
                <div className="grid grid-cols-3 gap-4">
                    <button
                        type="button"
                        onClick={() => setRolePresets('VIEWER')}
                        className={`p-6 rounded-[2rem] border-2 text-left transition-all ${role === 'VIEWER' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="flex flex-col gap-3">
                            <div className={`p-2 rounded-xl w-fit ${role === 'VIEWER' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <Eye className="w-5 h-5" />
                            </div>
                            <div>
                                <p className={`font-black uppercase tracking-tighter italic ${role === 'VIEWER' ? 'text-primary' : 'text-slate-400'}`}>Інспектор</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">Опрацювання звітів</p>
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setRolePresets('OFFICER_VIEWER')}
                        className={`p-6 rounded-[2rem] border-2 text-left transition-all ${role === 'OFFICER_VIEWER' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="flex flex-col gap-3">
                            <div className={`p-2 rounded-xl w-fit ${role === 'OFFICER_VIEWER' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <p className={`font-black uppercase tracking-tighter italic ${role === 'OFFICER_VIEWER' ? 'text-primary' : 'text-slate-400'}`}>Кадри</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">Особовий склад</p>
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setRolePresets('ADMIN')}
                        className={`p-6 rounded-[2rem] border-2 text-left transition-all ${role === 'ADMIN' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="flex flex-col gap-3">
                            <div className={`p-2 rounded-xl w-fit ${role === 'ADMIN' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <UserCog className="w-5 h-5" />
                            </div>
                            <div>
                                <p className={`font-black uppercase tracking-tighter italic ${role === 'ADMIN' ? 'text-primary' : 'text-slate-400'}`}>Адміністратор</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">Повний доступ</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <div className="space-y-6 pt-2 border-t border-slate-100">
                <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Детальні дозволи (чекбокси)</Label>
                    <p className="text-xs text-slate-400 font-medium">Можна налаштувати доступ індивідуально</p>
                </div>

                <div className="grid gap-4">
                    {PERMISSIONS.map((perm) => (
                        <label
                            key={perm.id}
                            htmlFor={perm.id}
                            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${permissions[perm.id] ? 'bg-slate-50 border-primary/20 ring-1 ring-primary/5' : 'bg-white border-slate-100 opacity-60'}`}
                        >
                            <div className="pt-0.5 pointer-events-none">
                                <Checkbox
                                    id={perm.id}
                                    checked={permissions[perm.id]}
                                    onCheckedChange={() => togglePermission(perm.id)}
                                    className="rounded-md w-5 h-5"
                                />
                            </div>
                            <div>
                                <p className={`font-bold text-sm leading-none mb-1 ${permissions[perm.id] ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {perm.label}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                    {perm.desc}
                                </p>
                            </div>
                            {permissions[perm.id] && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                        </label>
                    ))}
                </div>
            </div>

            <Button type="submit" className="w-full h-16 rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] gap-3" disabled={loading}>
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                Зберегти зміни
            </Button>
        </form>
    )
}
