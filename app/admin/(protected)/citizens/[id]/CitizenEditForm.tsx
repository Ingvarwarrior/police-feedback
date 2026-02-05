'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Save, Loader2, User, FileText, Star, AlertTriangle } from "lucide-react"

interface CitizenEditFormProps {
    citizen: any
    canEdit: boolean
    canMarkSuspicious: boolean
}

export default function CitizenEditForm({ citizen, canEdit, canMarkSuspicious }: CitizenEditFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        fullName: citizen.fullName || "",
        internalNotes: citizen.internalNotes || "",
        isVip: citizen.isVip || false,
        isSuspicious: citizen.isSuspicious || false,
        newPhone: "",
    })

    const handlePhoneChange = (val: string) => {
        let normalized = val
        if (val.startsWith('0') && val.length >= 10) {
            normalized = '+38' + val
        }
        setFormData({ ...formData, newPhone: normalized })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/admin/citizens/${citizen.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                toast.success("✅ Досьє оновлено")
                setFormData(prev => ({ ...prev, newPhone: "" }))
                router.refresh()
            } else {
                toast.error("❌ Помилка при збереженні")
            }
        } catch (err) {
            toast.error("❌ Помилка мережі")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Редагування досьє
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Повне ім'я (для бази)</Label>
                        <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder="Наприклад: Петренко Іван Сергійович"
                            className="h-12 rounded-xl"
                            disabled={!canEdit}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPhone" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Додати номер телефону</Label>
                        <Input
                            id="newPhone"
                            value={formData.newPhone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="+380..."
                            className="h-12 rounded-xl border-dashed border-primary/30"
                            disabled={!canEdit}
                        />
                        <p className="text-[9px] text-slate-400 font-medium">Якщо вказати новий номер, всі звіти з цим номером перейдуть у це досьє.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="internalNotes" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Внутрішні нотатки</Label>
                        <Textarea
                            id="internalNotes"
                            value={formData.internalNotes}
                            onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                            placeholder="Додаткова інформація для адмін-панелі..."
                            className="min-h-[120px] rounded-xl resize-none"
                            disabled={!canEdit}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-200/50 rounded-lg text-amber-600">
                                    <Star className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-900">VIP Статус</p>
                                    <p className="text-[10px] text-amber-600 font-medium">Пріоритетна категорія</p>
                                </div>
                            </div>
                            <Switch
                                checked={formData.isVip}
                                onCheckedChange={(val) => setFormData({ ...formData, isVip: val })}
                                disabled={!canEdit}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-200/50 rounded-lg text-red-600">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-red-900">Підозрілий</p>
                                    <p className="text-[10px] text-red-600 font-medium">Маркер для безпеки</p>
                                </div>
                            </div>
                            <Switch
                                checked={formData.isSuspicious}
                                onCheckedChange={(val) => setFormData({ ...formData, isSuspicious: val })}
                                disabled={!canEdit || !canMarkSuspicious}
                            />
                        </div>
                    </div>

                    {canEdit && (
                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest gap-2 text-lg shadow-lg shadow-primary/20"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Зберегти зміни
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </form>
    )
}
