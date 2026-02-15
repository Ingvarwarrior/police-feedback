import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import OfficersList from "./OfficersList"
import { Shield } from "lucide-react"

export default async function OfficersPage() {
    const session = await auth()
    if (!session?.user?.email) return null

    const currentUser = await prisma.user.findUnique({
        where: { username: session.user.email as string },
        select: {
            role: true,
            permViewOfficerStats: true,
            permCreateOfficers: true,
            permEditOfficers: true,
            permDeleteOfficers: true,
            permCreateEvaluations: true,
            permManageOfficerStatus: true,
        }
    })

    const canAccessOfficerModule =
        currentUser?.role === "ADMIN" ||
        !!currentUser?.permViewOfficerStats ||
        !!currentUser?.permCreateOfficers ||
        !!currentUser?.permEditOfficers ||
        !!currentUser?.permDeleteOfficers ||
        !!currentUser?.permCreateEvaluations ||
        !!currentUser?.permManageOfficerStatus

    if (!canAccessOfficerModule) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="p-4 bg-red-50 rounded-full text-red-500">
                    <Shield className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter">Доступ обмежено</h1>
                <p className="text-slate-500 max-w-xs text-center">
                    У вас немає прав для перегляду особового складу. Зверніться до адміністратора.
                </p>
            </div>
        )
    }

    return <OfficersList currentUser={currentUser} />
}
