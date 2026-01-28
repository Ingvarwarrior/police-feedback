import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, Shield } from "lucide-react"
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import UserTable from "./UserTable"

export default async function UsersPage() {
    const session = await auth()
    const user = session?.user as any

    if (user?.role !== 'ADMIN' && !user?.permManageUsers) {
        redirect("/admin/dashboard")
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Керування персоналом</h1>
                    <p className="text-slate-500 font-medium italic">Додавання та налаштування доступів для інспекторів</p>
                </div>
                <Link href="/admin/users/new" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto rounded-2xl font-black uppercase tracking-widest gap-2 h-12 px-6 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                        <UserPlus className="w-5 h-5" />
                        <span className="truncate">Додати інспектора</span>
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6">
                <Card className="border-0 shadow-xl ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b px-8 py-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
                            <Users className="w-4 h-4 text-primary" />
                            Зареєстровані користувачі
                        </CardTitle>
                        <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase">
                            Всього: {users.length}
                        </span>
                    </CardHeader>
                    <CardContent className="p-0">
                        <UserTable users={users} />
                    </CardContent>
                </Card>

                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4 text-xs text-amber-800 font-medium">
                    <div className="p-2 bg-amber-200 rounded-xl h-fit">
                        <Shield className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-black uppercase tracking-widest mb-1">Важливо щодо безпеки</p>
                        <p className="leading-relaxed">Створюйте окремих користувачів для кожного інспектора. Це дозволить відстежувати, хто саме залишав нотатки до звітів. Ніколи не передавайте свій пароль адміністратора колегам.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
