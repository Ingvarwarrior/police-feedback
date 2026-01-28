import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const total = await prisma.response.count()

        const highSatisfaction = await prisma.response.count({
            where: { rateOverall: { gte: 4 } }
        })

        const politenessStats = await prisma.response.aggregate({
            where: { ratePoliteness: { not: null } },
            _avg: { ratePoliteness: true },
            _count: { ratePoliteness: true }
        })

        const satisfactionRate = total > 0 ? (highSatisfaction / total) * 100 : 0
        const politenessRate = (politenessStats._avg.ratePoliteness || 0) * 20 // Convert 5-star to percentage

        return NextResponse.json({
            total,
            satisfactionRate: Math.round(satisfactionRate),
            politenessRate: Math.round(politenessRate)
        })
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
