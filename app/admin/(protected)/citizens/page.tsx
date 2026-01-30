import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { checkPermission } from "@/lib/auth-utils"
import CitizensList from "./CitizensList"

export default async function CitizensPage() {
    await checkPermission("permViewReports", true)
    try {
        const session = await auth()
        if (!session?.user?.email) return null

        const [citizens, currentUser] = await Promise.all([
            prisma.citizen.findMany({
                include: {
                    _count: {
                        select: { responses: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.user.findUnique({
                where: { username: session.user.email as string },
                select: {
                    role: true,
                    permDeleteCitizens: true,
                    permEditCitizens: true,
                    permMarkSuspicious: true
                }
            })
        ])

        return (
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Реєстр громадян</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Керування профілями та досьє мешканців</p>
                    </div>
                </div>

                <CitizensList citizens={citizens} currentUser={currentUser} />
            </div>
        )
    } catch (error: any) {
        console.error("CRITICAL ERROR IN CITIZENS PAGE:", error)
        return (
            <div className="p-10 bg-slate-900 text-white min-h-screen font-mono">
                <h1 className="text-xl font-bold text-rose-500 mb-4">Diagnostic: Fatal Error</h1>
                <pre className="bg-slate-800 p-6 rounded-2xl border border-rose-900/50 text-xs overflow-auto">
                    {error?.message || String(error)}
                </pre>
                <p className="mt-4 text-slate-400">Спробуйте: npx prisma db push</p>
            </div>
        )
    }
}
