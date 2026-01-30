import { checkPermission } from "@/lib/auth-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Bell } from "lucide-react"

export default async function MailAlertsPage() {
    await checkPermission("permManageMailAlerts", true)

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
                    <Mail className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 italic">Поштові сповіщення</h1>
                    <p className="text-slate-500 font-medium">Налаштування розсилок та екстрених повідомлень</p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Тригери сповіщень
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-12 text-center text-slate-400 italic">
                    Керування поштовими сповіщеннями буде доступне у наступному оновленні. <br />
                    Наразі система працює у режимі автоматичних сповіщень адміністраторів.
                </CardContent>
            </Card>
        </div>
    )
}
