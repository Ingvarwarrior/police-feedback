import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Shield } from "lucide-react"
import AnalyticsClient from "./AnalyticsClient"
import { subDays, startOfDay, endOfDay } from "date-fns"
import { getHourlyDistribution, detectBurnout, getDayOfWeekDistribution } from "@/lib/time-analytics"

export default async function AnalyticsPage(props: { searchParams: Promise<{ period?: string, from?: string, to?: string }> }) {
    const searchParams = await props.searchParams
    const session = await auth()
    const userPerms = session?.user as any
    if (userPerms?.role !== 'ADMIN' && !userPerms?.permViewAnalytics) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="p-4 bg-red-50 rounded-full text-red-500">
                    <Shield className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter">Доступ обмежено</h1>
                <p className="text-slate-500 max-w-xs text-center">У вас немає прав для перегляду аналітичного центру. Зверніться до адміністратора.</p>
            </div>
        )
    }

    const fromParam = searchParams.from
    const toParam = searchParams.to

    let startDate: Date
    let endDate: Date = new Date()

    if (fromParam) {
        startDate = startOfDay(new Date(fromParam))
        if (toParam) {
            endDate = endOfDay(new Date(toParam))
        } else {
            endDate = endOfDay(new Date())
        }
    } else {
        const period = searchParams.period || '30'
        const days = parseInt(period) || 30
        startDate = startOfDay(subDays(new Date(), days))
        endDate = endOfDay(new Date())
    }

    const [
        responses,
        officers,
        citizens,
        categoryStats,
        resolutionStats,
        unifiedRecordStats,
        unifiedRecordsByInspector,
        applicationDetentionRecords
    ] = await Promise.all([
        prisma.response.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
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
                comment: true,
                officerId: true,
                geoPoint: true,
                contact: {
                    select: { phone: true }
                }
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
            where: { rateOverall: { gt: 0 }, createdAt: { gte: startDate, lte: endDate } },
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
                createdAt: { gte: startDate, lte: endDate }
            },
            select: { createdAt: true, resolutionDate: true }
        }),
        // New stats for Unified Records - filtering by eoDate for accurate reporting
        (prisma as any).unifiedRecord.groupBy({
            where: { eoDate: { gte: startDate, lte: endDate } },
            by: ['recordType'],
            _count: true
        }),
        (prisma as any).unifiedRecord.findMany({
            where: { eoDate: { gte: startDate, lte: endDate } },
            select: {
                id: true,
                assignedUserId: true,
                status: true,
                assignedUser: {
                    select: { firstName: true, lastName: true }
                },
                recordType: true
            }
        }),
        (prisma as any).unifiedRecord.findMany({
            where: {
                eoDate: { gte: startDate, lte: endDate },
                recordType: { in: ['APPLICATION', 'DETENTION_PROTOCOL'] }
            },
            select: {
                eoDate: true,
                recordType: true,
                status: true,
                resolution: true,
                assignedUserId: true,
                assignedUser: {
                    select: { firstName: true, lastName: true }
                }
            }
        })
    ]) as any[]

    // Process Unified Record stats by inspector
    const inspectorStatsMap: Record<string, {
        id: string,
        name: string,
        recordType: string, // Add record type
        assigned: number,
        processed: number,
        pending: number
    }> = {}

    // Include all officers who are users as potential inspectors
    const users = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'USER'] } },
        select: { id: true, firstName: true, lastName: true }
    })

    // Initialize for all supported unified record types for all users
    users.forEach((u: any) => {
        ['EO', 'ZVERN', 'APPLICATION', 'DETENTION_PROTOCOL'].forEach(type => {
            const compositeKey = `${u.id}_${type}`
            inspectorStatsMap[compositeKey] = {
                id: u.id,
                name: `${u.lastName} ${u.firstName || ''}`.trim(),
                recordType: type,
                assigned: 0,
                processed: 0,
                pending: 0
            }
        })
    })

    unifiedRecordsByInspector.forEach((r: any) => {
        const userId = r.assignedUserId || 'unassigned'
        const type = r.recordType || 'EO' // Default to EO if missing
        const compositeKey = `${userId}_${type}`

        // Dynamically add to map if not pre-populated (e.g. user role changed or unassigned)
        if (!inspectorStatsMap[compositeKey]) {
            inspectorStatsMap[compositeKey] = {
                id: userId,
                name: r.assignedUser ? `${r.assignedUser.lastName} ${r.assignedUser.firstName || ''}`.trim() : (userId === 'unassigned' ? 'Не призначено' : 'Невідомий'),
                recordType: type,
                assigned: 0,
                processed: 0,
                pending: 0
            }
        }

        inspectorStatsMap[compositeKey].assigned++
        if (r.status === 'PROCESSED') {
            inspectorStatsMap[compositeKey].processed++
        } else {
            inspectorStatsMap[compositeKey].pending++
        }
    })

    // Filter to show only relevant rows + the mandatory "unassigned" one
    const inspectorPerformance = Object.values(inspectorStatsMap).filter(s => s.assigned > 0 || s.id === 'unassigned')

    // 1. Daily Trends
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dailyTrends: Record<string, { date: string, count: number, avg: number }> = {}
    for (let i = 0; i <= diffDays; i++) {
        const d = subDays(endDate, i)
        const dateStr = d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
        dailyTrends[dateStr] = { date: dateStr, count: 0, avg: 0 }
    }
    responses.forEach((r: any) => {
        const dateStr = new Date(r.createdAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
        if (dailyTrends[dateStr] && r.rateOverall && r.rateOverall > 0) {
            dailyTrends[dateStr].count++
            dailyTrends[dateStr].avg += r.rateOverall
        }
    })
    const trendData = Object.values(dailyTrends).reverse().map(t => ({
        ...t,
        avg: t.count > 0 ? t.avg / t.count : 0
    }))

    // 2. Ratings distribution
    const ratingsDist = [0, 0, 0, 0, 0]
    responses.forEach((r: any) => {
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
    const resolutionTimes = resolutionStats.map((s: any) => {
        return (new Date(s.resolutionDate!).getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60) // hours
    })
    const avgResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a: number, b: number) => a + b, 0) / resolutionTimes.length
        : 0

    // 4. Trust/Anonymity
    const anonymityData = [
        { name: 'Анонімно', value: responses.filter((r: any) => !r.wantContact).length },
        { name: 'Залишили контакти', value: responses.filter((r: any) => r.wantContact).length },
    ]

    // 5. Citizen Engagement
    const recurringCount = citizens.filter((c: any) => c._count.responses > 1).length
    const uniqueCount = citizens.length - recurringCount
    const engagementData = [
        { name: 'Унікальні', value: uniqueCount },
        { name: 'Постійні', value: recurringCount },
    ]

    // 6. Personnel Correlation (Internal vs Citizen)
    const correlationData = officers.map((o: any) => {
        const evals = o.evaluations || []
        const internalScores: number[] = []

        evals.forEach((e: any) => {
            if (e.scoreKnowledge && e.scoreKnowledge > 0) internalScores.push(e.scoreKnowledge)
            if (e.scoreTactics && e.scoreTactics > 0) internalScores.push(e.scoreTactics)
            if (e.scoreCommunication && e.scoreCommunication > 0) internalScores.push(e.scoreCommunication)
            if (e.scoreProfessionalism && e.scoreProfessionalism > 0) internalScores.push(e.scoreProfessionalism)
            if (e.scorePhysical && e.scorePhysical > 0) internalScores.push(e.scorePhysical)
        })

        const internalAvg = internalScores.length > 0
            ? internalScores.reduce((a, b) => a + b, 0) / internalScores.length
            : 0

        return {
            name: `${o.firstName[0]}. ${o.lastName}`,
            citizen: o.avgScore,
            internal: internalAvg,
            badge: o.badgeNumber
        }
    }).filter((d: any) => d.internal > 0 && d.citizen > 0).slice(0, 10)

    // 7. Security (Suspicious IPs)
    const ipClusters: Record<string, { count: number, phones: Set<string> }> = {}
    responses.forEach((r: any) => {
        if (r.ipHash) {
            if (!ipClusters[r.ipHash]) {
                ipClusters[r.ipHash] = { count: 0, phones: new Set() }
            }
            ipClusters[r.ipHash].count++
            if (r.contact?.phone) {
                ipClusters[r.ipHash].phones.add(r.contact.phone)
            }
        }
    })
    const suspiciousIps = Object.entries(ipClusters)
        .filter(([_, data]) => data.count > 3)
        .map(([hash, data]) => ({
            hash,
            count: data.count,
            phones: Array.from(data.phones)
        }))
        .sort((a, b) => b.count - a.count)

    const ratedResponses = responses.filter((r: any) => r.rateOverall && r.rateOverall > 0)
    const hourlyData = getHourlyDistribution(ratedResponses)
    const dayOfWeekData = getDayOfWeekDistribution(ratedResponses)
    const burnoutAlerts = officers
        .map((o: any) => detectBurnout(o.id, `${o.firstName} ${o.lastName}`, ratedResponses))
        .filter(Boolean)
        .filter((alert: any) => alert!.alertLevel !== 'none')
        .sort((a: any, b: any) => {
            const levelOrder: any = { 'critical': 3, 'warning': 2, 'none': 1 }
            return levelOrder[b!.alertLevel] - levelOrder[a!.alertLevel]
        })

    const appDetentionTrendMap: Record<string, {
        date: string
        total: number
        applications: number
        detentions: number
    }> = {}
    for (let i = 0; i <= diffDays; i++) {
        const d = subDays(endDate, i)
        const dateStr = d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
        appDetentionTrendMap[dateStr] = { date: dateStr, total: 0, applications: 0, detentions: 0 }
    }

    const appDetentionStatusMap: Record<string, number> = {
        "Очікує": 0,
        "В роботі": 0,
        "Опрацьовано": 0,
        "Інше": 0
    }
    const appDetentionResolutionMap: Record<string, number> = {}
    const appDetentionInspectorMap: Record<string, {
        id: string
        name: string
        assigned: number
        processed: number
        pending: number
        applications: number
        detentions: number
    }> = {}

    const normalizeResolution = (value?: string | null) => {
        if (!value || !value.trim()) return "Не вказано"
        const raw = value.trim()
        const lowered = raw.toLowerCase()
        if (lowered.includes('списано')) return "Списано до справи"
        if (lowered.includes('ініційовано') || lowered.includes('ср')) return "Ініційовано СР"
        if (lowered.includes('письмов') && lowered.includes('відповід')) return "Надано письмову відповідь"
        if (lowered.includes('до іншого органу') || lowered.includes('надіслано')) return "Надіслано до іншого органу"
        return raw.length > 70 ? `${raw.slice(0, 70)}...` : raw
    }

    applicationDetentionRecords.forEach((record: any) => {
        const dateStr = new Date(record.eoDate).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
        if (appDetentionTrendMap[dateStr]) {
            appDetentionTrendMap[dateStr].total++
            if (record.recordType === 'APPLICATION') appDetentionTrendMap[dateStr].applications++
            if (record.recordType === 'DETENTION_PROTOCOL') appDetentionTrendMap[dateStr].detentions++
        }

        const status = record.status === 'PROCESSED'
            ? 'Опрацьовано'
            : record.status === 'IN_PROGRESS'
                ? 'В роботі'
                : record.status === 'PENDING'
                    ? 'Очікує'
                    : 'Інше'
        appDetentionStatusMap[status] = (appDetentionStatusMap[status] || 0) + 1

        const resolution = normalizeResolution(record.resolution)
        appDetentionResolutionMap[resolution] = (appDetentionResolutionMap[resolution] || 0) + 1

        const inspectorId = record.assignedUserId || 'unassigned'
        if (!appDetentionInspectorMap[inspectorId]) {
            appDetentionInspectorMap[inspectorId] = {
                id: inspectorId,
                name: record.assignedUser
                    ? `${record.assignedUser.lastName} ${record.assignedUser.firstName || ''}`.trim()
                    : 'Не призначено',
                assigned: 0,
                processed: 0,
                pending: 0,
                applications: 0,
                detentions: 0
            }
        }

        appDetentionInspectorMap[inspectorId].assigned++
        if (record.status === 'PROCESSED') {
            appDetentionInspectorMap[inspectorId].processed++
        } else {
            appDetentionInspectorMap[inspectorId].pending++
        }
        if (record.recordType === 'APPLICATION') {
            appDetentionInspectorMap[inspectorId].applications++
        } else if (record.recordType === 'DETENTION_PROTOCOL') {
            appDetentionInspectorMap[inspectorId].detentions++
        }
    })

    const appDetentionTrendData = Object.values(appDetentionTrendMap).reverse()
    const appDetentionStatusData = Object.entries(appDetentionStatusMap).map(([name, value]) => ({ name, value }))
    const appDetentionResolutionData = Object.entries(appDetentionResolutionMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    const appDetentionInspectors = Object.values(appDetentionInspectorMap)
        .sort((a, b) => b.assigned - a.assigned)

    const displayPeriod = fromParam && toParam
        ? `${new Date(fromParam).toLocaleDateString('uk-UA')} - ${new Date(toParam).toLocaleDateString('uk-UA')}`
        : `останні ${searchParams.period || '30'} днів`

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Аналітичний центр</h1>
                <p className="text-slate-500 font-medium">Моніторинг показників та ефективності за {displayPeriod}</p>
            </div>

            <AnalyticsClient
                startDate={fromParam || startDate.toISOString().split('T')[0]}
                endDate={toParam || endDate.toISOString().split('T')[0]}
                trendData={trendData}
                ratingsData={ratingsData}
                officers={officers}
                citizensCount={citizens.length}
                categoryStats={categoryStats}
                totalReports={ratedResponses.length}
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
                timePatterns={{
                    hourlyData,
                    dayOfWeekData,
                    burnoutAlerts: burnoutAlerts as any[]
                }}
                unifiedRecordStats={{
                    totalByType: unifiedRecordStats as any,
                    inspectorPerformance
                }}
                applicationDetentionStats={{
                    totals: {
                        total: applicationDetentionRecords.length,
                        applications: applicationDetentionRecords.filter((r: any) => r.recordType === 'APPLICATION').length,
                        detentions: applicationDetentionRecords.filter((r: any) => r.recordType === 'DETENTION_PROTOCOL').length,
                        processed: applicationDetentionRecords.filter((r: any) => r.status === 'PROCESSED').length,
                        pending: applicationDetentionRecords.filter((r: any) => r.status !== 'PROCESSED').length
                    },
                    trendData: appDetentionTrendData,
                    statusData: appDetentionStatusData,
                    resolutionData: appDetentionResolutionData,
                    inspectors: appDetentionInspectors
                }}
            />
        </div>
    )
}
