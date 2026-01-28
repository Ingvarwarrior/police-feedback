'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { OfficerForm } from "../components/OfficerForm"

export default function NewOfficerPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (data: any) => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/officers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                toast.success('✅ Офіцера додано успішно')
                router.push('/admin/officers')
            } else {
                const text = await res.text()
                toast.error(`❌ Помилка: ${text}`)
            }
        } catch (error) {
            toast.error('❌ Помилка мережі')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/officers">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Новий офіцер</h1>
                    <p className="text-slate-500">Додавання облікової картки поліцейського</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <OfficerForm onSubmit={handleSubmit} loading={loading} />
            </div>
        </div>
    )
}
