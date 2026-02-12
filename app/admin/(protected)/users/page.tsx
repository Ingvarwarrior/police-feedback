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

    if (user?.role !== 'ADMIN' && !user?.permViewUsers && !user?.permManageUsers) {
        redirect("/admin/dashboard")
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic transition-colors duration-300">Керування персоналом</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium italic transition-colors duration-300">Додавання та налаштування доступів для інспекторів</p>
                </div>
                {(user?.role === 'ADMIN' || user?.permCreateUsers || user?.permManageUsers) ? (
                    <Link href="/admin/users/new" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto rounded-2xl font-black uppercase tracking-widest gap-2 h-12 px-6 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                            <UserPlus className="w-5 h-5" />
                            <span className="truncate">Додати інспектора</span>
                        </Button>
                    </Link>
                ) : null}
            </div>

            <div className="grid gap-6">
                <Card className="border-0 shadow-xl ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-300">
                    <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800 px-8 py-6 flex flex-row items-center justify-between transition-colors duration-300">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-400 dark:text-slate-500 transition-colors duration-300">
                            <Users className="w-4 h-4 text-primary" />
                            Зареєстровані користувачі
                        </CardTitle>
                        <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase transition-colors duration-300">
                            Всього: {users.length}
                        </span>
                    </CardHeader>
                    <CardContent className="p-0">
                        <UserTable users={users} />
                    </CardContent>
                </Card>

                <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/20 flex gap-4 text-xs text-amber-800 dark:text-amber-400 font-medium transition-colors duration-300">
                    <div className="p-2 bg-amber-200 dark:bg-amber-900/40 rounded-xl h-fit transition-colors duration-300">
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
