'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Settings as SettingsIcon,
    Shield,
    Bell,
    Save,
    Loader2,
    Database,
    AlertTriangle,
    Building2,
    Calendar,
    MessageSquare
} from 'lucide-react'
import { runPiiCleanupNow, updateSettings } from './actions/settingsActions'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

interface SettingsFormProps {
    initialSettings: any
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [isPending, setIsPending] = useState(false)
    const [isCleanupPending, setIsCleanupPending] = useState(false)
    const [lastCleanupSummary, setLastCleanupSummary] = useState<string | null>(null)
    const [formData, setFormData] = useState(initialSettings)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsPending(true)
        try {
            await updateSettings(formData)
            toast.success('Налаштування успішно збережено')
        } catch (error: any) {
            toast.error(error.message || 'Помилка при збереженні')
        } finally {
            setIsPending(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target
        setFormData((prev: any) => ({ ...prev, [id]: value }))
    }

    const handleSwitchChange = (id: string, checked: boolean) => {
        setFormData((prev: any) => ({ ...prev, [id]: checked }))
    }

    const handleRunPiiCleanup = async () => {
        setIsCleanupPending(true)
        try {
            const result = await runPiiCleanupNow()
            setLastCleanupSummary(`Оновлено контактів: ${result.updatedContacts}. Дата межі: ${new Date(result.cutoffDate).toLocaleDateString('uk-UA')}.`)
            toast.success(`PII очищено: ${result.updatedContacts} записів`)
        } catch (error: any) {
            toast.error(error.message || 'Помилка при очищенні PII')
        } finally {
            setIsCleanupPending(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <SettingsIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 italic">Налаштування системи</h1>
                        <p className="text-slate-500 font-medium">Керування глобальними параметрами платформи</p>
                    </div>
                </div>
                <Button
                    type="submit"
                    disabled={isPending}
                    className="h-12 w-full lg:w-auto px-6 lg:px-8 rounded-2xl font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Зберегти зміни
                </Button>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-auto mb-8 grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <TabsTrigger value="general" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest gap-2">
                        <Building2 className="w-4 h-4" /> Загальні
                    </TabsTrigger>
                    <TabsTrigger value="triggers" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest gap-2">
                        <AlertTriangle className="w-4 h-4" /> Тригери
                    </TabsTrigger>
                    <TabsTrigger value="survey" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest gap-2">
                        <MessageSquare className="w-4 h-4" /> Опитування
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-xl py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] tracking-widest gap-2">
                        <Shield className="w-4 h-4" /> Безпека
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6 outline-none">
                    <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary" />
                                Дані підрозділу
                            </CardTitle>
                            <CardDescription>Використовуються в офіційних PDF-звітах та бланках</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="unitName" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Назва підрозділу</Label>
                                    <Input
                                        id="unitName"
                                        value={formData.unitName}
                                        onChange={handleChange}
                                        className="h-12 rounded-2xl bg-slate-50/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergencyPhone" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Телефон чергової частини</Label>
                                    <Input
                                        id="emergencyPhone"
                                        value={formData.emergencyPhone}
                                        onChange={handleChange}
                                        className="h-12 rounded-2xl bg-slate-50/50"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unitAddress" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Юридична адреса</Label>
                                <Input
                                    id="unitAddress"
                                    value={formData.unitAddress}
                                    onChange={handleChange}
                                    className="h-12 rounded-2xl bg-slate-50/50"
                                />
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Використовується в публічному опитуванні та службових бланках/експортах.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="triggers" className="space-y-6 outline-none">
                    <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Bell className="w-4 h-4 text-amber-500" />
                                Автоматичні сповіщення
                            </CardTitle>
                            <CardDescription>Налаштування порогів для миттєвого реагування</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid gap-8 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-amber-50 p-4 rounded-2xl border border-amber-100/50">
                                        <div className="space-y-1">
                                            <Label htmlFor="criticalRatingThreshold" className="text-sm font-bold text-amber-900">Критичний рейтинг</Label>
                                            <p className="text-xs text-amber-700/70 font-medium">Рейтинг відгуку, при якому надсилається alert</p>
                                        </div>
                                        <Input
                                            id="criticalRatingThreshold"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="5"
                                            value={formData.criticalRatingThreshold}
                                            onChange={handleChange}
                                            className="w-20 h-10 text-center font-black rounded-xl border-amber-200"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="warningKeywords" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Ключові слова для тривоги</Label>
                                    <Textarea
                                        id="warningKeywords"
                                        value={formData.warningKeywords}
                                        onChange={handleChange}
                                        placeholder="Розділяйте комою"
                                        className="min-h-[100px] rounded-2xl bg-slate-50/50 p-4"
                                    />
                                    <p className="text-[10px] text-slate-400 italic">Відгуки з цими словами будуть помічені як "Пріоритетні"</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Працює в реальному часі: впливає на критичні сповіщення і позначення відгуку як підозрілого.
                            </p>

                            <div className="pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                                    <div className="space-y-1">
                                        <Label htmlFor="sendAssignmentEmails" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-blue-500" />
                                            Email-сповіщення про призначення
                                        </Label>
                                        <p className="text-xs text-slate-500 font-medium">Надсилати інспекторам лист на пошту при призначенні нового ЄО чи звернення</p>
                                    </div>
                                    <Switch
                                        id="sendAssignmentEmails"
                                        checked={formData.sendAssignmentEmails}
                                        onCheckedChange={(checked) => handleSwitchChange('sendAssignmentEmails', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="survey" className="space-y-6 outline-none">
                    <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                                Контент опитування
                            </CardTitle>
                            <CardDescription>Повідомлення, які бачать громадяни</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="welcomeMessage" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Привітальне повідомлення</Label>
                                <Textarea
                                    id="welcomeMessage"
                                    value={formData.welcomeMessage}
                                    onChange={handleChange}
                                    className="min-h-[120px] rounded-2xl bg-slate-50/50 p-4"
                                />
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Одразу відображається на першому кроці анкети для громадян.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6 outline-none">
                    <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Database className="w-4 h-4 text-rose-500" />
                                Політика збереження даних
                            </CardTitle>
                            <CardDescription>Керування термінами зберігання PII (Захист ПД)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-center gap-6 p-6 bg-rose-50/30 rounded-3xl border border-rose-100/50">
                                <Calendar className="w-10 h-10 text-rose-500 shrink-0" />
                                <div className="space-y-1 flex-1">
                                    <Label htmlFor="piiRetentionDays" className="text-sm font-bold text-slate-900">Термін зберігання контактних даних</Label>
                                    <p className="text-xs text-slate-500 font-medium">Через скільки днів маскувати номер телефону та ПІБ заявника</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="piiRetentionDays"
                                        type="number"
                                        value={formData.piiRetentionDays}
                                        onChange={handleChange}
                                        className="w-24 h-12 text-center font-black rounded-2xl border-rose-200"
                                    />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400"> днів</span>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white rounded-2xl border border-rose-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRunPiiCleanup}
                                    disabled={isCleanupPending}
                                    className="rounded-xl"
                                >
                                    {isCleanupPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                                    Очистити PII зараз
                                </Button>
                                <p className="text-xs text-slate-600">
                                    {lastCleanupSummary || "Кнопка застосовує політику зберігання до вже наявних контактів."}
                                </p>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Для автоочистки налаштуйте cron на `/api/admin/cron/pii-retention` з `Authorization: Bearer CRON_SECRET`.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </form>
    )
}
