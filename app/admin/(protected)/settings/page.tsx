import { checkPermission } from "@/lib/auth-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Shield } from "lucide-react"

export default async function SettingsPage() {
    await checkPermission("permManageSettings", true)

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Settings className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 italic">Налаштування системи</h1>
                    <p className="text-slate-500 font-medium">Керування глобальними параметрами платформи</p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Параметри доступу та безпеки
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-12 text-center text-slate-400 italic">
                    Модуль налаштувань знаходиться у розробці. <br />
                    Доступ дозволено відповідно до вашої ролі.
                </CardContent>
            </Card>
        </div>
    )
}
