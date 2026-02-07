import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import dynamic from 'next/dynamic'

const MapClient = dynamic(() => import("./MapClient"), {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 font-bold">Завантаження мапи...</div>
})

export const metadata = {
    title: 'Мапа моніторингу | Адмін-панель',
}

export default async function MapPage() {
    const session = await auth()
    if (!session?.user?.email) redirect("/admin/login")

    // Verify Admin Access
    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { role: true }
    })

    if (currentUser?.role !== 'ADMIN') {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-black text-rose-500 uppercase tracking-widest">Доступ заборонено</h1>
                    <p className="text-slate-500">Цей розділ доступний тільки адміністраторам.</p>
                </div>
            </div>
        )
    }

    // Fetch users with location data
    const users = await prisma.user.findMany({
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

    return (
        <div className="h-[calc(100vh-8rem)] w-full relative rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm">
            <MapClient initialUsers={users} />
        </div>
    )
}
