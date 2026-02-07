import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await auth()
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { role: true }
    })

    if (currentUser?.role !== 'ADMIN') {
        return new NextResponse("Forbidden", { status: 403 })
    }

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

    return NextResponse.json(users)
}
