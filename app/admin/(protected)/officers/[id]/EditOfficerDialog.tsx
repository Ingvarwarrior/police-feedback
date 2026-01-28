'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { OfficerForm } from "../components/OfficerForm"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface EditOfficerDialogProps {
    officer: any
}

export function EditOfficerDialog({ officer }: EditOfficerDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (data: any) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/officers/${officer.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                toast.success('✅ Профіль оновлено')
                setOpen(false)
                router.refresh()
            } else {
                toast.error('❌ Помилка оновлення')
            }
        } catch (error) {
            toast.error('❌ Помилка мережі')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                    <Pencil className="w-4 h-4" />
                    <span className="hidden sm:inline">Редагувати профіль</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Редагування профілю</DialogTitle>
                </DialogHeader>
                <OfficerForm
                    initialData={officer}
                    onSubmit={handleSubmit}
                    loading={loading}
                    submitLabel="Оновити профіль"
                />
            </DialogContent>
        </Dialog>
    )
}
