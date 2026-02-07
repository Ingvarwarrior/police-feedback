import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await auth()
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const stats = await prisma.response.aggregate({
            _max: {
                id: true,
                createdAt: true
            },
            _count: {
                id: true
            },
            where: {
                status: 'NEW'
            }
        })

        return NextResponse.json({
            count: stats._count.id,
            latestId: stats._max.id,
            latestDate: stats._max.createdAt
        })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
