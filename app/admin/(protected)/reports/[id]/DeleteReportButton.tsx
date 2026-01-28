'use client'

import React, { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteReport } from './actions/reportActions'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DeleteReportButtonProps {
    id: string
}

export default function DeleteReportButton({ id }: DeleteReportButtonProps) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleDelete = () => {
        startTransition(async () => {
            try {
                await deleteReport(id)
                toast.success('Звіт видалено')
                router.push('/admin/reports')
            } catch (err) {
                toast.error('Помилка при видаленні звіту')
            }
        })
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Видалити цей звіт
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2rem] border-rose-100 p-8">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase text-rose-600 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        Видалення звіту
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-600 font-medium pt-2">
                        Ви впевнені, що хочете безповоротно видалити цей звіт?
                        <br />
                        Всі пов'язані дані (фото, локація, коментарі) будуть знищені.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-2">
                    <AlertDialogCancel className="rounded-2xl h-12 font-bold">Скасувати</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="rounded-2xl h-12 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest shadow-lg shadow-rose-500/20"
                    >
                        Видалити
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
