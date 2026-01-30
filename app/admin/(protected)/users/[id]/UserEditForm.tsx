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

const PERMISSIONS = [
    { id: 'permViewReports', label: 'Перегляд звітів', desc: 'Дозволяє бачити список та деталі відгуків.' },
    { id: 'permAssignReports', label: 'Призначення звітів', desc: 'Дозволяє призначати інспекторів на розгляд звітів.' },
    { id: 'permViewSensitiveData', label: 'Чутливі дані', desc: 'Дозволяє бачити повні контактні дані громадян.' },
    { id: 'permBulkActionReports', label: 'Масові дії', desc: 'Дозволяє виконувати дії над групою звітів (архів, видалення).' },
    { id: 'permEditNotes', label: 'Редагування нотаток', desc: 'Дозволяє залишати та змінювати внутрішні коментарі.' },
    { id: 'permChangeStatus', label: 'Зміна статусів', desc: 'Дозволяє переводити звіти між робочими станами.' },
    { id: 'permExportData', label: 'Експорт даних', desc: 'Дозволяє вивантажувати звіти у форматі Excel/CSV.' },
    { id: 'permManageUsers', label: 'Керування персоналом', desc: 'Дозволяє створювати та редагувати інших користувачів.' },
    { id: 'permDeleteReports', label: 'Видалення звітів', desc: 'Дозволяє безповоротно видаляти звіти з системи.' },
    { id: 'permCreateOfficers', label: 'Створення офіцерів', desc: 'Дозволяє додавати нових офіцерів та імпортувати списки.' },
    { id: 'permEditOfficers', label: 'Редагування офіцерів', desc: 'Дозволяє змінювати дані діючих офіцерів.' },
    { id: 'permDeleteOfficers', label: 'Видалення офіцерів', desc: 'Дозволяє видаляти офіцерів з бази.' },
    { id: 'permViewOfficerStats', label: 'Статистика офіцерів', desc: 'Дозволяє переглядати розширену аналітику по офіцеру.' },
    { id: 'permCreateEvaluations', label: 'Оцінювання офіцерів', desc: 'Дозволяє створювати внутрішні оцінки та атестації.' },
    { id: 'permManageOfficerStatus', label: 'Статус офіцера', desc: 'Дозволяє змінювати статус (відпустка, звільнений).' },
    { id: 'permEditCitizens', label: 'Редагування громадян', desc: 'Дозволяє редагувати дані громадян (VIP, нотатки).' },
    { id: 'permDeleteCitizens', label: 'Видалення громадян', desc: 'Дозволяє видаляти досьє громадян.' },
    { id: 'permMarkSuspicious', label: 'Маркування громадян', desc: 'Дозволяє позначати громадян як підозрілих або VIP.' },
    { id: 'permViewAudit', label: 'Перегляд аудиту', desc: 'Дозволяє переглядати історію дій всіх користувачів.' },
    { id: 'permManageSettings', label: 'Налаштування системи', desc: 'Дозволяє змінювати глобальні налаштування.' },
    { id: 'permManageMailAlerts', label: 'Поштові сповіщення', desc: 'Керування списком отримувачів сповіщень.' },
]

interface UserEditFormProps {
    user: {
        id: string
        username: string
        email: string | null
        firstName: string | null
        lastName: string | null
        badgeNumber: string | null
        role: string
        permViewReports: boolean
        permAssignReports: boolean
        permViewSensitiveData: boolean
        permBulkActionReports: boolean
        permEditNotes: boolean
        permChangeStatus: boolean
        permExportData: boolean
        permManageUsers: boolean
        permDeleteReports: boolean
        permCreateOfficers: boolean
        permEditOfficers: boolean
        permDeleteOfficers: boolean
        permViewOfficerStats: boolean
        permCreateEvaluations: boolean
        permManageOfficerStatus: boolean
        permEditCitizens: boolean
        permDeleteCitizens: boolean
        permMarkSuspicious: boolean
        permViewAudit: boolean
        permManageSettings: boolean
        permManageMailAlerts: boolean
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
    const [permissions, setPermissions] = useState<Record<string, boolean>>({
        permViewReports: user.permViewReports,
        permAssignReports: user.permAssignReports,
        permViewSensitiveData: user.permViewSensitiveData,
        permBulkActionReports: user.permBulkActionReports,
        permEditNotes: user.permEditNotes,
        permChangeStatus: user.permChangeStatus,
        permExportData: user.permExportData,
        permManageUsers: user.permManageUsers,
        permDeleteReports: user.permDeleteReports,
        permCreateOfficers: user.permCreateOfficers,
        permEditOfficers: user.permEditOfficers,
        permDeleteOfficers: user.permDeleteOfficers,
        permViewOfficerStats: user.permViewOfficerStats,
        permCreateEvaluations: user.permCreateEvaluations,
        permManageOfficerStatus: user.permManageOfficerStatus,
        permEditCitizens: user.permEditCitizens,
        permDeleteCitizens: user.permDeleteCitizens,
        permMarkSuspicious: user.permMarkSuspicious,
        permViewAudit: user.permViewAudit,
        permManageSettings: user.permManageSettings,
        permManageMailAlerts: user.permManageMailAlerts,
    })
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const togglePermission = (id: string) => {
        setPermissions(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const setRolePresets = (newRole: string) => {
        setRole(newRole)
        if (newRole === 'ADMIN') {
            setPermissions({
                permViewReports: true,
                permAssignReports: true,
                permViewSensitiveData: true,
                permBulkActionReports: true,
                permEditNotes: true,
                permChangeStatus: true,
                permExportData: true,
                permManageUsers: true,
                permDeleteReports: true,
                permCreateOfficers: true,
                permEditOfficers: true,
                permDeleteOfficers: true,
                permViewOfficerStats: true,
                permCreateEvaluations: true,
                permManageOfficerStatus: true,
                permEditCitizens: true,
                permDeleteCitizens: true,
                permMarkSuspicious: true,
                permViewAudit: true,
                permManageSettings: true,
                permManageMailAlerts: true,
            })
        } else {
            setPermissions({
                permViewReports: true,
                permAssignReports: false,
                permViewSensitiveData: false,
                permBulkActionReports: false,
                permEditNotes: true,
                permChangeStatus: true,
                permExportData: false,
                permManageUsers: false,
                permDeleteReports: false,
                permCreateOfficers: false,
                permEditOfficers: false,
                permDeleteOfficers: false,
                permViewOfficerStats: false,
                permCreateEvaluations: false,
                permManageOfficerStatus: false,
                permEditCitizens: false,
                permDeleteCitizens: false,
                permMarkSuspicious: false,
                permViewAudit: false,
                permManageSettings: false,
                permManageMailAlerts: false,
            })
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
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setRolePresets('VIEWER')}
                        className={`p-6 rounded-[2rem] border-2 text-left transition-all ${role === 'VIEWER' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${role === 'VIEWER' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <Eye className="w-5 h-5" />
                            </div>
                            <p className={`font-black uppercase tracking-tighter italic ${role === 'VIEWER' ? 'text-primary' : 'text-slate-400'}`}>Інспектор</p>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setRolePresets('ADMIN')}
                        className={`p-6 rounded-[2rem] border-2 text-left transition-all ${role === 'ADMIN' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${role === 'ADMIN' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <Shield className="w-5 h-5" />
                            </div>
                            <p className={`font-black uppercase tracking-tighter italic ${role === 'ADMIN' ? 'text-primary' : 'text-slate-400'}`}>Адміністратор</p>
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
