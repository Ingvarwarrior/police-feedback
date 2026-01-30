'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, UserPlus, Shield, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { createUser } from '../actions/userActions'
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

export default function NewUserForm() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [badgeNumber, setBadgeNumber] = useState('')
    const [role, setRole] = useState('VIEWER')
    const [permissions, setPermissions] = useState<Record<string, boolean>>({
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
    const [isPending, setIsPending] = useState(false)

    const togglePermission = (id: string) => {
        setPermissions(prev => ({ ...prev, [id]: !prev[id] }))
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
                permViewReports: permissions.permViewReports,
                permAssignReports: permissions.permAssignReports,
                permViewSensitiveData: permissions.permViewSensitiveData,
                permBulkActionReports: permissions.permBulkActionReports,
                permManageUsers: permissions.permManageUsers,
                permEditNotes: permissions.permEditNotes,
                permChangeStatus: permissions.permChangeStatus,
                permExportData: permissions.permExportData,
                permDeleteReports: permissions.permDeleteReports,
                permCreateOfficers: permissions.permCreateOfficers,
                permEditOfficers: permissions.permEditOfficers,
                permDeleteOfficers: permissions.permDeleteOfficers,
                permViewOfficerStats: permissions.permViewOfficerStats,
                permCreateEvaluations: permissions.permCreateEvaluations,
                permManageOfficerStatus: permissions.permManageOfficerStatus,
                permEditCitizens: permissions.permEditCitizens,
                permDeleteCitizens: permissions.permDeleteCitizens,
                permMarkSuspicious: permissions.permMarkSuspicious,
                permViewAudit: permissions.permViewAudit,
                permManageSettings: permissions.permManageSettings,
                permManageMailAlerts: permissions.permManageMailAlerts,
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
