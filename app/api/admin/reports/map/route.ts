import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const points = await prisma.geoPoint.findMany({
            include: {
                response: {
                    select: {
                        id: true,
                        rateOverall: true,
                        comment: true,
                        createdAt: true
                    }
                }
            }
        })

        const data = points.map(p => ({
            id: p.responseId,
            lat: p.lat,
            lon: p.lon,
            rating: p.response.rateOverall,
            comment: p.response.comment ? p.response.comment.substring(0, 50) + '...' : 'Без коментарів',
            date: p.response.createdAt
        }))

        return NextResponse.json(data)
    } catch (error) {
        console.error("Map data fetch error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
