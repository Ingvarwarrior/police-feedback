'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateInternalNotes } from './actions/reportActions'
import { Save, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface InternalNotesProps {
    id: string
    initialNotes: string | null
    canEdit?: boolean
}

export default function InternalNotes({ id, initialNotes, canEdit = true }: InternalNotesProps) {
    const [notes, setNotes] = useState(initialNotes || '')
    const [isPending, startTransition] = useTransition()

    const hasChanged = notes !== (initialNotes || '')

    const handleSave = () => {
        startTransition(async () => {
            try {
                await updateInternalNotes(id, notes)
                toast.success("Нотатки збережено")
            } catch (err) {
                toast.error("Помилка при збереженні нотаток")
            }
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 transition-colors duration-300">
                    <Lock className="w-3 h-3" />
                    Внутрішні нотатки (тільки для інспекторів)
                </div>
                {hasChanged && canEdit && (
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isPending}
                        className="h-8 rounded-lg font-bold text-[10px] uppercase tracking-widest gap-2"
                    >
                        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Зберегти
                    </Button>
                )}
            </div>
            <Textarea
                placeholder={canEdit ? "Введіть результати перевірки або коментарі для колег..." : "У вас немає прав для редагування нотаток"}
                className="min-h-[150px] rounded-2xl border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 focus-visible:ring-primary shadow-inner bg-slate-50/50 dark:bg-slate-800/50 p-4 transition-colors duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending || !canEdit}
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic transition-colors duration-300">Ці записи не бачать громадяни.</p>
        </div>
    )
}
