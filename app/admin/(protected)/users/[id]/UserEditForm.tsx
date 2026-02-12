'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Save, Shield, Eye, EyeOff, Loader2, CheckCircle2, UserCog, Briefcase, ClipboardList, SearchCheck } from 'lucide-react'
import Link from 'next/link'
import { updateUser } from '../actions/userActions'
import { toast } from 'sonner'

import { PERMISSIONS_CONFIG } from '@/lib/permissions-config'
import { ROLE_PRESETS, buildPermissionsMap, getRolePresetById } from '@/lib/role-presets'

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
    const [selectedPresetId, setSelectedPresetId] = useState('CUSTOM')
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
        setSelectedPresetId('CUSTOM')
        setPermissions(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const applyPreset = (presetId: string) => {
        const preset = getRolePresetById(presetId)
        if (!preset) return
        setSelectedPresetId(presetId)
        setRole(preset.roleValue)
        setPermissions(buildPermissionsMap(preset.enabledPermissions))
    }

    const getPresetIcon = (presetId: string) => {
        if (presetId === 'ADMIN') return UserCog
        if (presetId === 'SUPERVISOR') return Briefcase
        if (presetId === 'HR') return Shield
        if (presetId === 'AUDITOR') return SearchCheck
        if (presetId === 'EO_OPERATOR') return ClipboardList
        return Eye
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
                <div className="grid md:grid-cols-2 gap-4">
                    {ROLE_PRESETS.map((preset) => {
                        const Icon = getPresetIcon(preset.id)
                        const isSelected = selectedPresetId === preset.id

                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyPreset(preset.id)}
                                className={`p-5 rounded-[2rem] border-2 text-left transition-all ${isSelected ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 hover:border-slate-200'}`}
                            >
                                <div className="flex flex-col gap-3">
                                    <div className={`p-2 rounded-xl w-fit ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className={`font-black uppercase tracking-tighter italic ${isSelected ? 'text-primary' : 'text-slate-400'}`}>{preset.title}</p>
                                        <p className="text-[11px] font-semibold text-slate-600 mt-1">{preset.shortDesc}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{preset.fullDesc}</p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
                {selectedPresetId === 'CUSTOM' ? (
                    <p className="text-xs font-semibold text-amber-600">Увімкнено індивідуальний режим: права змінено вручну.</p>
                ) : null}
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
