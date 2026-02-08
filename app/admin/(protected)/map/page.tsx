import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import MapWrapper from "./MapWrapper"
import { Shield } from "lucide-react"

export const metadata = {
    title: 'Мапа моніторингу | Адмін-панель',
}

export default async function MapPage() {
    const session = await auth()
    if (!session?.user?.email) redirect("/admin/login")

    // Verify Access
    const currentUser = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permViewMap: true }
    })

    const canViewMap = currentUser?.role === 'ADMIN' || currentUser?.role === 'INSPECTOR' || !!currentUser?.permViewMap

    if (!canViewMap) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="p-4 bg-red-50 rounded-full text-red-500">
                    <Shield className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter">Доступ обмежено</h1>
                <p className="text-slate-500 max-w-xs text-center">У вас немає прав для перегляду карти. Зверніться до адміністратора.</p>
            </div>
        )
    }

    const isAdmin = currentUser?.role === 'ADMIN'

    // Fetch users with location data (Admins only)
    let userLocations = []
    if (isAdmin) {
        userLocations = await prisma.user.findMany({
            where: {
                active: true,
                lastLat: { not: null },
                lastLon: { not: null }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                badgeNumber: true,
                email: true,
                lastLat: true,
                lastLon: true,
                lastLocationAt: true,
                role: true
            }
        })
    }

    return (
        <div className="h-full w-full relative">
            <MapWrapper initialUsers={userLocations} isAdmin={isAdmin} />
        </div>
    )
}
