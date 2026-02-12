import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })
    const user = session.user as any
    if (user.role !== "ADMIN" && !user.permViewUsers && !user.permManageUsers) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                active: true,
                // Any user can potentially be an inspector
            },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true
            },
            orderBy: {
                email: 'asc'
            }
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error("Users fetch error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
