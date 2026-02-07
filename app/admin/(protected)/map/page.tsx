import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import MapWrapper from "./MapWrapper"

export const metadata = {
    title: 'Мапа моніторингу | Адмін-панель',
}

export default async function MapPage() {
    const session = await auth()
    if (!session?.user?.email) redirect("/admin/login")

    // Verify Access
    const currentUser = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true }
    })

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
