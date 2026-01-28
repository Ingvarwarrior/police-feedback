import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserPlus } from 'lucide-react'
import Link from 'next/link'
import NewUserForm from './NewUserForm'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function NewUserPage() {
    const session = await auth()
    const userRole = session?.user as any

    if (userRole?.role !== 'ADMIN' && !userRole?.permManageUsers) {
        redirect("/admin/dashboard")
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
            <div className="flex items-center gap-4">
                <Link href="/admin/users">
                    <Button variant="outline" size="icon" className="rounded-xl">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase italic">Новий співробітник</h1>
                    <p className="text-slate-500 text-sm font-medium">Створення облікового запису для інспектора</p>
                </div>
            </div>

            <Card className="border-0 shadow-2xl ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Реєстрація інспектора</CardTitle>
                            <CardDescription>Вкажіть дані для входу та налаштуйте права доступу</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <NewUserForm />
                </CardContent>
            </Card>
        </div>
    )
}
