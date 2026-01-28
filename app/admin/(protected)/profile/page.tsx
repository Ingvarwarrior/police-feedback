import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { User, Shield, Key } from "lucide-react"
import ChangePasswordForm from "./ChangePasswordForm"
import EditProfileForm from "./EditProfileForm"

export default async function ProfilePage() {
    const session = await auth()
    if (!session?.user?.email) {
        return <div>Не авторизовано</div>
    }

    // Fetch full user data from database
    const user = await prisma.user.findUnique({
        where: { username: session.user.email as string },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            badgeNumber: true,
            role: true
        }
    })

    if (!user) {
        return <div>Користувача не знайдено</div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic">Мій профіль</h1>
                <p className="text-slate-500 font-medium">Керування обліковим записом та безпекою</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Profile Info Card */}
                <Card className="border-0 shadow-xl ring-1 ring-slate-200 rounded-3xl overflow-hidden h-fit">
                    <CardHeader className="bg-slate-50 border-b p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Особисті дані</CardTitle>
                                <CardDescription>Інформація про ваш обліковий запис</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <EditProfileForm
                            currentFirstName={user?.firstName}
                            currentLastName={user?.lastName}
                            currentBadgeNumber={user?.badgeNumber}
                        />

                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">Email</label>
                                <div className="font-mono text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                    {user?.email}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">Роль</label>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                                        }`}>
                                        <Shield className="w-3 h-3 mr-1" />
                                        {user?.role}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Password Change Card */}
                <Card className="border-0 shadow-xl ring-1 ring-slate-200 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                                <Key className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold">Зміна паролю</CardTitle>
                                <CardDescription>Оновіть ваш пароль для входу</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ChangePasswordForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
