import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/auth-utils"
import AnalyticsClient from "./AnalyticsClient"
import { subDays, startOfDay, endOfDay } from "date-fns"

export default async function AnalyticsPage() {
    await checkPermission("permViewReports", true)

    // Fetch data for the last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30)

    const [
        responses,
        officers,
        citizensCount,
        recentFeedback
    ] = await Promise.all([
        prisma.response.findMany({
            where: {
                createdAt: {
                    gte: thirtyDaysAgo
                }
            },
            select: {
                createdAt: true,
                rateOverall: true,
                incidentType: true,
                status: true
            }
        }),
        prisma.officer.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                badgeNumber: true,
                avgScore: true,
                totalResponses: true
            },
            orderBy: {
                avgScore: 'desc'
            }
        }),
        prisma.citizen.count(),
        prisma.response.groupBy({
            by: ['incidentType'],
            _count: true,
            _avg: {
                rateOverall: true
            }
        })
    ])

    // Process responses for daily trends
    const dailyTrends: Record<string, { date: string, count: number, avg: number }> = {}
    for (let i = 0; i < 30; i++) {
        const d = subDays(new Date(), i)
        const dateStr = d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
        dailyTrends[dateStr] = { date: dateStr, count: 0, avg: 0 }
    }

    responses.forEach(r => {
        const dateStr = new Date(r.createdAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
        if (dailyTrends[dateStr]) {
            dailyTrends[dateStr].count++
            dailyTrends[dateStr].avg += (r.rateOverall || 0)
        }
    })

    const trendData = Object.values(dailyTrends).reverse().map(t => ({
        ...t,
        avg: t.count > 0 ? t.avg / t.count : 0
    }))

    // Ratings distribution
    const ratingsDist = [0, 0, 0, 0, 0]
    responses.forEach(r => {
        if (r.rateOverall && r.rateOverall >= 1 && r.rateOverall <= 5) {
            ratingsDist[Math.floor(r.rateOverall) - 1]++
        }
    })

    const ratingsData = [
        { name: '1 ★', value: ratingsDist[0] },
        { name: '2 ★', value: ratingsDist[1] },
        { name: '3 ★', value: ratingsDist[2] },
        { name: '4 ★', value: ratingsDist[3] },
        { name: '5 ★', value: ratingsDist[4] },
    ]

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Аналітичний центр</h1>
                <p className="text-slate-500 font-medium">Моніторинг показників та ефективності за останні 30 днів</p>
            </div>

            <AnalyticsClient
                trendData={trendData}
                ratingsData={ratingsData}
                officers={officers}
                citizensCount={citizensCount}
                categoryStats={recentFeedback}
                totalReports={responses.length}
            />
        </div>
    )
}
