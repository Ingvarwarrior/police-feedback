'use client'

import React, { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { updateReportStatus } from './actions/reportActions'
import { Check, Clock, Archive, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface StatusControlProps {
    id: string
    currentStatus: string
    canEdit?: boolean
}

const statusConfig: Record<string, { label: string, color: string, icon: any, variant: any }> = {
    'NEW': { label: 'Новий', color: 'bg-blue-600', icon: Clock, variant: 'default' },
    'ASSIGNED': { label: 'В роботі', color: 'bg-amber-500', icon: AlertCircle, variant: 'secondary' },
    'RESOLVED': { label: 'Вирішено', color: 'bg-emerald-600', icon: Check, variant: 'default' },
    'ARCHIVED': { label: 'В архіві', color: 'bg-slate-400', icon: Archive, variant: 'outline' },
}

export default function StatusControl({ id, currentStatus, canEdit = true }: StatusControlProps) {
    const [isPending, startTransition] = useTransition()

    const handleUpdate = (status: string) => {
        startTransition(async () => {
            try {
                await updateReportStatus(id, status)
                toast.success(`Статус оновлено: ${statusConfig[status].label}`)
            } catch (err) {
                toast.error("Помилка при оновленні статусу")
            }
        })
    }

    const current = statusConfig[currentStatus] || statusConfig['NEW']

    return (
        <div className="flex flex-col gap-4">
            <div className={`p-6 rounded-3xl border flex items-center justify-between transition-all ${current.color} text-white shadow-lg`}>
                <div className="flex items-center gap-3">
                    <current.icon className="w-6 h-6" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Поточний статус</p>
                        <p className="font-black text-xl uppercase italic tracking-tight">{current.label}</p>
                    </div>
                </div>
                {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                    <Button
                        key={key}
                        variant="outline"
                        disabled={key === currentStatus || isPending || !canEdit}
                        onClick={() => handleUpdate(key)}
                        className={`rounded-xl font-bold text-[10px] uppercase tracking-widest h-12 transition-all duration-300 ${key === currentStatus ? 'border-primary ring-1 ring-primary/20 bg-primary/5 dark:bg-primary/20' : 'border-slate-200 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        {cfg.label}
                    </Button>
                ))}
            </div>
        </div>
    )
}
