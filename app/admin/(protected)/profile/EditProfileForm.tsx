'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface EditProfileFormProps {
    currentFirstName: string | null
    currentLastName: string | null
    currentBadgeNumber: string | null
}

export default function EditProfileForm({ currentFirstName, currentLastName, currentBadgeNumber }: EditProfileFormProps) {
    const [isPending, startTransition] = useTransition()
    const [formData, setFormData] = useState({
        firstName: currentFirstName || '',
        lastName: currentLastName || '',
        badgeNumber: currentBadgeNumber || ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        startTransition(async () => {
            try {
                const res = await fetch('/api/admin/profile/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                })

                if (res.ok) {
                    toast.success("Дані оновлено")
                    window.location.reload()
                } else {
                    toast.error("Помилка оновлення")
                }
            } catch (err) {
                toast.error("Помилка оновлення")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="lastName" className="text-xs font-black uppercase tracking-widest text-slate-400">Прізвище</Label>
                <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1"
                    placeholder="Введіть прізвище"
                />
            </div>

            <div>
                <Label htmlFor="firstName" className="text-xs font-black uppercase tracking-widest text-slate-400">Ім'я</Label>
                <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1"
                    placeholder="Введіть ім'я"
                />
            </div>

            <div>
                <Label htmlFor="badgeNumber" className="text-xs font-black uppercase tracking-widest text-slate-400">Номер жетона</Label>
                <Input
                    id="badgeNumber"
                    value={formData.badgeNumber}
                    onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                    className="mt-1"
                    placeholder="Опціонально"
                />
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl font-bold uppercase tracking-wide"
            >
                {isPending ? 'Збереження...' : 'Зберегти зміни'}
            </Button>
        </form>
    )
}
