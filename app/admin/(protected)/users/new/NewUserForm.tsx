'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { UserPlus, Shield, Eye, EyeOff, Loader2, CheckCircle2, UserCog, ClipboardList, SearchCheck } from 'lucide-react'
import Link from 'next/link'
import { createUser } from '../actions/userActions'
import { toast } from 'sonner'

import { PERMISSIONS_CONFIG } from '@/lib/permissions-config'
import { ROLE_PRESETS, buildPermissionsMap, getRolePresetById } from '@/lib/role-presets'

const PERMISSIONS = PERMISSIONS_CONFIG

export default function NewUserForm() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [badgeNumber, setBadgeNumber] = useState('')
    const [selectedPresetId, setSelectedPresetId] = useState('INSPECTOR')
    const [role, setRole] = useState<'ADMIN' | 'OFFICER_VIEWER' | 'VIEWER'>(() => getRolePresetById('INSPECTOR')!.roleValue)
    const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
        const inspectorPreset = getRolePresetById('INSPECTOR')
        return buildPermissionsMap(inspectorPreset?.enabledPermissions || [])
    })

    const applyPreset = (presetId: string) => {
        const preset = getRolePresetById(presetId)
        if (!preset) return
        setSelectedPresetId(presetId)
        setRole(preset.roleValue)
        setPermissions(buildPermissionsMap(preset.enabledPermissions))
    }
    const [isPending, setIsPending] = useState(false)

    const togglePermission = (id: string) => {
        setSelectedPresetId('CUSTOM')
        setPermissions(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const getPresetIcon = (presetId: string) => {
        if (presetId === 'ADMIN') return UserCog
        if (presetId === 'HR') return Shield
        if (presetId === 'AUDITOR') return SearchCheck
        if (presetId === 'EO_OPERATOR') return ClipboardList
        return Eye
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsPending(true)

        try {
            await createUser({
                username,
                email: email || undefined,
                passwordHash: password,
                firstName,
                lastName,
                badgeNumber,
                role,
                ...(permissions as any)
            })
            toast.success('Користувача успішно створено')
            router.push('/admin/users')
        } catch (err: any) {
            toast.error(err.message || 'Помилка при створенні користувача')
        } finally {
            setIsPending(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Логін (username)</Label>
                    <Input
                        id="username"
                        placeholder="inspector_ivan"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="h-12 rounded-2xl border-slate-200 focus-visible:ring-primary shadow-sm bg-slate-50/50"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email адреса (опціонально)</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="inspector@police.gov.ua"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-2xl border-slate-200 focus-visible:ring-primary shadow-sm bg-slate-50/50"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="password" title="password_label" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Тимчасовий пароль</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 rounded-2xl border-slate-200 focus-visible:ring-primary shadow-sm bg-slate-50/50 pr-12"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Прізвище</Label>
                    <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="h-12 rounded-2xl border-slate-200 focus-visible:ring-primary shadow-sm bg-slate-50/50"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Ім'я</Label>
                    <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="h-12 rounded-2xl border-slate-200 focus-visible:ring-primary shadow-sm bg-slate-50/50"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="badgeNumber" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Жетон</Label>
                    <Input
                        id="badgeNumber"
                        value={badgeNumber}
                        onChange={(e) => setBadgeNumber(e.target.value)}
                        required
                        className="h-12 rounded-2xl border-slate-200 focus-visible:ring-primary shadow-sm bg-slate-50/50"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Рівень доступу (пресет)</Label>
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

            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Дозволи та доступ</h3>
                </div>

                <div className="grid gap-3">
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
                                <p className={`font-bold text-sm leading-none mb-1 ${permissions[perm.id] ? 'text-slate-900' : 'text-slate-400'}`}>{perm.label}</p>
                                <p className="text-xs text-slate-500 font-medium">{perm.desc}</p>
                            </div>
                            {permissions[perm.id] && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                        </label>
                    ))}
                </div>
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                Створити обліковий запис
            </Button>
        </form >
    )
}
