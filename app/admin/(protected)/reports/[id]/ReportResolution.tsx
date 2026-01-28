'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, PhoneCall, FileEdit, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ReportResolutionProps {
    responseId: string
    initialNotes: string | null
    initialCategory: string | null
    canEdit: boolean
}

export default function ReportResolution({ responseId, initialNotes, initialCategory, canEdit }: ReportResolutionProps) {
    const [notes, setNotes] = useState(initialNotes || "")
    const [category, setCategory] = useState(initialCategory || "ASSISTANCE")
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!notes.trim() || !category) {
            toast.error('❌ Заповніть всі поля')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/admin/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    responseId,
                    resolutionNotes: notes,
                    incidentCategory: category
                })
            })
            if (res.ok) {
                toast.success('✅ Резолюцію успішно збережено')
                window.location.reload()
            } else {
                toast.error('❌ Помилка при збереженні резолюції')
            }
        } catch (error) {
            console.error(error)
            toast.error('❌ Помилка при збереженні резолюції')
        } finally {
            setSaving(false)
        }
    }

    // Read-only view when resolved
    if (!canEdit && initialNotes) {
        return (
            <div className="p-6 bg-green-50 rounded-[2.5rem] border border-green-200 space-y-4">
                <div className="flex items-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" />
                    Опрацьовано
                </div>
                <div className="space-y-3">
                    <div>
                        <p className="text-[10px] text-green-700 font-black uppercase tracking-widest mb-1">Категорія</p>
                        <p className="text-slate-900 font-semibold">{getCategoryLabel(initialCategory)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-green-700 font-black uppercase tracking-widest mb-1">Нотатки</p>
                        <p className="text-slate-700 italic">"{initialNotes}"</p>
                    </div>
                </div>
            </div>
        )
    }

    // Editable form
    if (canEdit) {
        return (
            <div className="p-6 bg-slate-900 rounded-[2.5rem] border border-slate-800 space-y-6 shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase tracking-tight italic">Результат перевірки</h3>
                        <p className="text-slate-400 text-xs font-medium">Зафіксуйте підсумки спілкування та перевірки</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Категорія інциденту</p>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white rounded-xl h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-xl">
                                <SelectItem value="TRAFFIC">Дорожній рух (ДТП, ПДР)</SelectItem>
                                <SelectItem value="DOC_CHECK">Перевірка документів</SelectItem>
                                <SelectItem value="ASSISTANCE">Допомога громадянину</SelectItem>
                                <SelectItem value="CRIME">Кримінальне правопорушення</SelectItem>
                                <SelectItem value="OTHER">Інше / Консультація</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                            <FileEdit className="w-3.5 h-3.5" />
                            Детальні нотатки (в т.ч. підсумок дзвінка)
                        </p>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Наприклад: Проведено телефонну розмову. Факт порушення не підтверджено. Проведено інструктаж..."
                            className="min-h-[120px] bg-slate-800 border-slate-700 text-white rounded-2xl resize-none focus:ring-primary shadow-inner"
                        />
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all group"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Зберегти та закрити кейс
                                <PhoneCall className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        )
    }

    return null
}

// Helper function for category labels
function getCategoryLabel(category: string | null): string {
    const labels: Record<string, string> = {
        'TRAFFIC': 'Дорожній рух (ДТП, ПДР)',
        'DOC_CHECK': 'Перевірка документів',
        'ASSISTANCE': 'Допомога громадянину',
        'CRIME': 'Кримінальне правопорушення',
        'OTHER': 'Інше / Консультація'
    }
    return labels[category || ''] || 'Не вказано'
}
