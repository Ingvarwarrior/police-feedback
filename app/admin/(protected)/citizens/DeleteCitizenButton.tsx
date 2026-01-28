'use client'

import React, { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteCitizen } from './actions/citizenActions'
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

interface DeleteCitizenButtonProps {
    id: string
    variant?: 'ghost' | 'outline' | 'default'
    className?: string
    showText?: boolean
}

export default function DeleteCitizenButton({ id, variant = "ghost", className, showText = false }: DeleteCitizenButtonProps) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleDelete = () => {
        startTransition(async () => {
            try {
                await deleteCitizen(id)
                toast.success('Досьє громадянина видалено')
                router.refresh()
            } catch (err) {
                toast.error('Помилка при видаленні')
            }
        })
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant={variant}
                    className={className || "rounded-2xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm h-10 w-10"}
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {showText && <span className="ml-2">Видалити досьє</span>}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] border-rose-100 p-8">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase text-rose-600 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        Видалення громадянина
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-600 font-medium pt-2">
                        Ви впевнені, що хочете видалити цей профіль?
                        <br />
                        Самі звіти **не будуть видалені**, але вони від'єднаються від цього досьє.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-2">
                    <AlertDialogCancel className="rounded-2xl h-12 font-bold focus:ring-0">Скасувати</AlertDialogCancel>
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
