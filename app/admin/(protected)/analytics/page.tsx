import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/auth-utils"
import AnalyticsClient from "./AnalyticsClient"
import { subDays, startOfDay, endOfDay } from "date-fns"
import { extractKeywords, getSentimentDistribution } from "@/lib/text-analytics"
import { getHourlyDistribution, detectBurnout, getDayOfWeekDistribution } from "@/lib/time-analytics"

export default async function AnalyticsPage() {
    await checkPermission("permViewReports", true)

    // Fetch data for the last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30)

    const [
        responses,
        officers,
        citizens,
        categoryStats,
        resolutionStats
    ] = await Promise.all([
        prisma.response.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: {
                createdAt: true,
                rateOverall: true,
                ratePoliteness: true,
                rateProfessionalism: true,
                rateEffectiveness: true,
                incidentType: true,
                status: true,
                wantContact: true,
                ipHash: true,
                citizenId: true,
                resolutionDate: true,
                description: true,
                officerId: true,
                geoPoint: true
            }
        }),
        prisma.officer.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                badgeNumber: true,
                avgScore: true,
                totalResponses: true,
                evaluations: {
                    select: { scoreCommunication: true }
                }
            },
            orderBy: { avgScore: 'desc' }
        }),
        prisma.citizen.findMany({
            select: {
                id: true,
                _count: { select: { responses: true } },
                ipHash: true
            }
        }),
        prisma.response.groupBy({
            by: ['incidentType'],
            _count: true,
            _avg: {
                rateOverall: true
            }
        }),
        prisma.response.findMany({
            where: {
                status: 'RESOLVED',
                resolutionDate: { not: null },
                createdAt: { gte: thirtyDaysAgo }
            },
            select: { createdAt: true, resolutionDate: true }
        })
    ])

    // 1. Daily Trends
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

    // 2. Ratings distribution
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

    // 3. Efficiency (Resolution Speed)
    const resolutionTimes = resolutionStats.map(s => {
        return (new Date(s.resolutionDate!).getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60) // hours
    })
    const avgResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0

    // 4. Trust/Anonymity
    const anonymityData = [
        { name: 'Анонімно', value: responses.filter(r => !r.wantContact).length },
        { name: 'Залишили контакти', value: responses.filter(r => r.wantContact).length },
    ]

    // 5. Citizen Engagement
    const recurringCount = citizens.filter(c => c._count.responses > 1).length
    const uniqueCount = citizens.length - recurringCount
    const engagementData = [
        { name: 'Унікальні', value: uniqueCount },
        { name: 'Постійні', value: recurringCount },
    ]

    // 6. Personnel Correlation (Internal vs Citizen)
    const correlationData = officers.map(o => {
        const internalAvg = o.evaluations.length > 0
            ? o.evaluations.reduce((acc: any, curr: any) => acc + curr.scoreCommunication, 0) / o.evaluations.length
            : 0
        return {
            name: `${o.firstName[0]}. ${o.lastName}`,
            citizen: o.avgScore,
            internal: internalAvg,
            badge: o.badgeNumber
        }
    }).filter(d => d.internal > 0).slice(0, 10) // Top 10 for visibility

    // 7. Security (Suspicious IPs)
    const ipClusters: Record<string, number> = {}
    responses.forEach(r => {
        if (r.ipHash) {
            ipClusters[r.ipHash] = (ipClusters[r.ipHash] || 0) + 1
        }
    })
    const suspiciousIps = Object.entries(ipClusters)
        .filter(([_, count]) => count > 3) // More than 3 reports from same IP in 30 days
        .map(([hash, count]) => ({ hash, count }))
        .sort((a, b) => b.count - a.count)

    // Filter responses with valid ratings (exclude 0 or null)
    const ratedResponses = responses.filter(r => r.rateOverall && r.rateOverall > 0)

    // 8. AI Text Analytics
    const negativeResponses = ratedResponses.filter(r => r.rateOverall < 3)
    const negativeTexts = negativeResponses.map(r => r.description || '').filter(Boolean)
    const keywords = extractKeywords(negativeTexts)
    const sentimentDist = getSentimentDistribution(ratedResponses.map(r => r.description || ''))

    // 9. Time Analytics
    const hourlyData = getHourlyDistribution(ratedResponses)
    const dayOfWeekData = getDayOfWeekDistribution(ratedResponses)

    // 10. Burnout Detection
    const burnoutAlerts = officers
        .map(o => detectBurnout(o.id, `${o.firstName} ${o.lastName}`, ratedResponses))
        .filter(Boolean)
        .filter(alert => alert!.alertLevel !== 'none')
        .sort((a, b) => {
            const levelOrder = { 'critical': 3, 'warning': 2, 'none': 1 }
            return levelOrder[b!.alertLevel] - levelOrder[a!.alertLevel]
        })

    // 11. Geo clustering (prepare data for heatmap)
    const geoData = ratedResponses
        .filter(r => r.geoPoint)
        .map(r => ({
            lat: (r.geoPoint as any).coordinates[1],
            lng: (r.geoPoint as any).coordinates[0],
            rating: r.rateOverall,
            isNegative: r.rateOverall < 3
        }))

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
                citizensCount={citizens.length}
                categoryStats={categoryStats}
                totalReports={responses.length}
                efficiency={{
                    avgResolutionTime,
                    resolutionRate: responses.length > 0 ? (resolutionStats.length / responses.length) * 100 : 0
                }}
                trust={{
                    anonymityData,
                    engagementData,
                    suspiciousIps
                }}
                correlationData={correlationData}
                aiInsights={{
                    keywords,
                    sentimentDist
                }}
                timePatterns={{
                    hourlyData,
                    dayOfWeekData,
                    burnoutAlerts: burnoutAlerts as any[]
                }}
                geoData={geoData}
            />
        </div>
    )
}
