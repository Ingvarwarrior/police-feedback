'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, UserPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AssignmentControlProps {
    responseId: string
    currentAssigneeId: string | null
    canEdit: boolean
}

export default function AssignmentControl({ responseId, currentAssigneeId, canEdit }: AssignmentControlProps) {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [assigning, setAssigning] = useState(false)

    useEffect(() => {
        if (!canEdit) return

        async function fetchUsers() {
            setLoading(true)
            try {
                const res = await fetch('/api/admin/users')
                if (res.ok) {
                    const data = await res.json()
                    setUsers(data)
                }
            } catch (error) {
                console.error("Failed to fetch users", error)
            } finally {
                setLoading(false)
            }
        }
        fetchUsers()
    }, [canEdit])

    const handleAssign = async (userId: string) => {
        setAssigning(true)
        try {
            const res = await fetch('/api/admin/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    responseId,
                    assignedToId: userId === 'unassigned' ? null : userId
                })
            })

            if (res.ok) {
                const assignedUser = users.find(u => u.id === userId)
                const userName = userId === 'unassigned'
                    ? 'Нікому'
                    : assignedUser?.firstName || assignedUser?.lastName
                        ? `${assignedUser?.firstName || ''} ${assignedUser?.lastName || ''}`.trim()
                        : assignedUser?.email || 'іншому інспектору'
                toast.success(`✅ Звіт успішно призначено ${userName}`)
                window.location.reload()
            } else {
                toast.error('❌ Помилка при призначенні')
            }
        } catch (error) {
            console.error(error)
            toast.error('❌ Помилка мережі')
        } finally {
            setAssigning(false)
        }
    }

    if (!canEdit) {
        return (
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-medium py-2 transition-colors duration-300">
                <Shield className="w-4 h-4" />
                <span>Призначення обмежено</span>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest flex items-center gap-2 transition-colors duration-300">
                <UserPlus className="w-3.5 h-3.5" />
                Відповідальний за опрацювання
            </p>
            <Select
                defaultValue={currentAssigneeId || 'unassigned'}
                onValueChange={handleAssign}
                disabled={assigning || loading}
            >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ring-offset-white dark:ring-offset-slate-900 focus:ring-primary transition-colors duration-300">
                    <SelectValue placeholder="Виберіть виконавця" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    <SelectItem value="unassigned" className="text-slate-400 dark:text-slate-500 italic">Не призначено</SelectItem>
                    {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                            {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.email} ({u.role})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {assigning && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Оновлення...
                </div>
            )}
        </div>
    )
}
