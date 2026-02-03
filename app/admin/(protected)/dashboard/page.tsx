import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, Star, TrendingUp, Clock, Award, Shield } from "lucide-react"
import Link from "next/link"
import DashboardCharts from "./DashboardCharts"
import { LiveClock } from "@/components/admin/LiveClock"
import { RealtimeDashboard } from "@/components/admin/RealtimeDashboard"

export default async function DashboardPage() {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Optimized: single query instead of 5 separate ones
    const [dbStats, avgRatings, recentResponses, allOfficers, alertCount] = await Promise.all([
        // Combined counts
        prisma.response.groupBy({
            by: ['status'],
            _count: { id: true },
        }),
        // Average ratings
        prisma.response.aggregate({
            where: { rateOverall: { gt: 0 } },
            _avg: {
                rateOverall: true,
                ratePoliteness: true,
                rateProfessionalism: true,
                rateEffectiveness: true,
            }
        }),
        // Recent responses
        prisma.response.findMany({
            take: 8,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                createdAt: true,
                rateOverall: true,
                districtOrCity: true,
                status: true,
                comment: true,
                incidentCategory: true,
                _count: { select: { attachments: true } }
            }
        }),
        // Top performing officers
        (prisma.officer as any).findMany({
            include: {
                evaluations: {
                    select: {
                        scoreKnowledge: true,
                        scoreTactics: true,
                        scoreCommunication: true,
                        scoreProfessionalism: true,
                        scorePhysical: true
                    }
                }
            },
            take: 50
        }),
        // Critical alerts (Rating <= 2 in last 24h)
        prisma.response.count({
            where: {
                rateOverall: { lte: 2 },
                createdAt: { gte: twentyFourHoursAgo }
            }
        })
    ])

    // Calculate rankings using allOfficers (the 4th result)
    const topOfficers = allOfficers ? (allOfficers as any[]).map(o => {
        const evals = o.evaluations || []
        if (evals.length === 0) return { ...o, avgRating: 0 }

        const allScores: number[] = []
        evals.forEach((e: any) => {
            if (e.scoreKnowledge) allScores.push(e.scoreKnowledge)
            if (e.scoreTactics) allScores.push(e.scoreTactics)
            if (e.scoreCommunication) allScores.push(e.scoreCommunication)
            if (e.scoreProfessionalism) allScores.push(e.scoreProfessionalism)
            if (e.scorePhysical) allScores.push(e.scorePhysical)
        })

        const avgRating = allScores.length > 0
            ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1))
            : 0

        return { ...o, avgRating }
    })
        .filter(o => o.avgRating > 0)
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 5) : []

    const totalResponses = await prisma.response.count()
    const contactRequests = await prisma.response.count({ where: { wantContact: true } })
    const unreviewedCount = dbStats.find((s: any) => s.status === 'NEW')?._count.id || 0

    // Trend Data (Last 14 days)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    // Simplified grouping for SQLite: fetch and group in JS if needed, 
    // but Prisma should support this. Using 'as any' to bypass the stubborn type error.
    const dailyTrends = await (prisma.response as any).groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: fourteenDaysAgo } },
        _count: { id: true },
        orderBy: { createdAt: 'asc' }
    })

    // Format for charts (group by actual date string)
    const trendMap = new Map<string, number>()
    for (let i = 0; i < 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        trendMap.set(d.toLocaleDateString('uk-UA'), 0)
    }

    (dailyTrends as any[]).forEach((t: any) => {
        const dateStr = new Date(t.createdAt).toLocaleDateString('uk-UA')
        if (trendMap.has(dateStr)) {
            trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + (t._count.id || 0))
        }
    })

    const trendData = Array.from(trendMap.entries())
        .map(([date, count]) => ({
            date: date.split('.')[0] + '/' + date.split('.')[1],
            fullDate: date,
            count
        }))
        .reverse()

    // Previous 14 days for comparison
    const twentyEightDaysAgo = new Date()
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)

    const prevTrends = await (prisma.response as any).groupBy({
        by: ['createdAt'],
        where: {
            createdAt: {
                gte: twentyEightDaysAgo,
                lt: fourteenDaysAgo
            }
        },
        _count: { id: true },
    })

    const prevCount = prevTrends.reduce((acc: number, curr: any) => acc + (curr._count.id || 0), 0)
    const currentCount = trendData.reduce((acc, curr) => acc + curr.count, 0)
    const trendPercentage = prevCount === 0 ? 100 : Math.round(((currentCount - prevCount) / prevCount) * 100)

    // District Data
    const districtStats = await (prisma.response as any).groupBy({
        by: ['districtOrCity'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
    })

    const districtData = (districtStats as any[]).map((d: any) => ({
        name: d.districtOrCity || 'Інше',
        count: d._count.id
    }))

    // 1. Heatmap Data
    const heatmapData = await prisma.geoPoint.findMany({
        select: { lat: true, lon: true }
    })

    // 2. Interaction Time Analysis (Granular)
    const timeDistribution = await (prisma.response as any).groupBy({
        by: ['interactionTime'],
        _count: { id: true },
        where: { interactionTime: { not: null } }
    })

    const timeDistributionData = [
        "00:00-03:00", "03:00-06:00", "06:00-09:00",
        "09:00-12:00", "12:00-15:00", "15:00-18:00",
        "18:00-21:00", "21:00-00:00"
    ].map(slot => ({
        name: slot,
        value: (timeDistribution as any[]).find((t: any) => t.interactionTime === slot)?._count.id || 0
    }))

    // 3. Shift Analysis (Day vs Night) - based on creation time as fallback
    const allTimestamps = await prisma.response.findMany({
        select: { createdAt: true }
    })
    let dayCount = 0
    let nightCount = 0
    allTimestamps.forEach(r => {
        const hour = new Date(r.createdAt).getHours()
        if (hour >= 8 && hour < 20) dayCount++
        else nightCount++
    })
    const shiftData = [
        { name: 'День', value: dayCount, color: '#3b82f6' },
        { name: 'Ніч', value: nightCount, color: '#0f172a' }
    ]

    const stats = [
        {
            title: "Нові звіти",
            value: unreviewedCount,
            icon: Clock,
            color: "text-blue-600",
            bg: "bg-blue-50",
            href: "/admin/reports?status=NEW"
        },
        {
            title: "Всього оцінок",
            value: totalResponses,
            icon: FileText,
            color: "text-slate-700",
            bg: "bg-slate-100",
            trend: trendPercentage,
            href: "/admin/reports"
        },
        {
            title: "Критичні бали",
            value: alertCount,
            icon: Shield,
            color: "text-rose-600",
            bg: "bg-rose-50",
            alert: alertCount > 0,
            href: "/admin/reports?rating=1,2"
        },
        {
            title: "Сер. рейтинг",
            value: avgRatings._avg.rateOverall ? avgRatings._avg.rateOverall.toFixed(2) : "0.00",
            icon: Star,
            color: "text-amber-600",
            bg: "bg-amber-50",
        },
    ]

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                        Центр <span className="text-blue-600">Керування</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Система моніторингу в реальному часі
                    </p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <LiveClock />
                    <RealtimeDashboard />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.title} className="relative group">
                        <Card className={`border-0 shadow-lg ring-1 ring-slate-200 rounded-[2rem] overflow-hidden transition-all hover:ring-blue-400/50 hover:shadow-2xl hover:shadow-blue-100 ${stat.alert ? 'ring-rose-500 ring-2' : ''}`}>
                            {'href' in stat && <Link href={stat.href as string} className="absolute inset-0 z-10" />}
                            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-5 sm:px-6">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} group-hover:rotate-12 transition-transform shadow-inner`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent className="pb-8 px-5 sm:px-6">
                                <div className="flex items-end justify-between">
                                    <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{stat.value}</div>
                                    {stat.trend !== undefined && (
                                        <div className={`text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-sm ${stat.trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            <TrendingUp className="w-3 h-3" />
                                            {stat.trend > 0 ? '+' : ''}{stat.trend}%
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <DashboardCharts
                trendData={trendData}
                districtData={districtData}
                heatmapData={heatmapData}
                shiftData={shiftData}
                timeDistributionData={timeDistributionData}
            />

            <div className="grid gap-8 lg:grid-cols-12 items-start">
                {/* Live Feed Component */}
                <Card className="lg:col-span-8 border-0 shadow-xl ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden bg-slate-50/30 backdrop-blur-sm">
                    <CardHeader className="border-b bg-white px-5 sm:px-8 py-4 sm:py-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Shield className="w-4 h-4" />
                                </div>
                                Оперативна стрічка
                            </CardTitle>
                            <Link href="/admin/reports" className="text-[10px] font-black uppercase text-blue-600 hover:underline">
                                Всі звіти →
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 bg-white">
                        <div className="divide-y divide-slate-100">
                            {recentResponses.map((res: any) => (
                                <div key={res.id} className="group relative px-5 sm:px-8 py-4 sm:py-6 hover:bg-slate-50 transition-all flex flex-col sm:flex-row gap-6">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full ${res.status === 'NEW' ? 'bg-blue-500 animate-pulse' : 'bg-slate-200'}`} />
                                            <p className="font-black text-slate-900 text-sm tracking-tight">#{res.id.slice(-8).toUpperCase()}</p>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">• {new Date(res.createdAt).toLocaleDateString('uk-UA')} {new Date(res.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-2 italic">
                                            "{res.comment || 'Без коментаря'}"
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border border-slate-200">
                                                {res.districtOrCity || 'Локація н/в'}
                                            </span>
                                            {res._count?.attachments > 0 && (
                                                <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border border-blue-100 flex items-center gap-1">
                                                    📸 {res._count.attachments}
                                                </span>
                                            )}
                                            {res.incidentCategory && (
                                                <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border border-blue-100">
                                                    {res.incidentCategory}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 border-t sm:border-0 pt-4 sm:pt-0 border-slate-100">
                                        <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm border ${res.rateOverall >= 4 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : res.rateOverall <= 2 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                            <span className="text-xl font-black">{res.rateOverall}</span>
                                            <Star className={`w-4 h-4 ${res.rateOverall >= 4 ? 'fill-emerald-500' : 'fill-current'}`} />
                                        </div>
                                        <Link href={`/admin/reports/${res.id}`} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200 group-hover:scale-110">
                                            <TrendingUp className="w-4 h-4 rotate-90" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Performance & Categories Column */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="border-0 shadow-xl ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
                        <CardHeader className="border-b border-white/10 px-5 sm:px-8 py-4 sm:py-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
                                <Award className="w-4 h-4 text-yellow-500" />
                                Кращі в службі
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 sm:px-8 py-6">
                            <div className="space-y-6">
                                {topOfficers.map((o: any, idx: number) => (
                                    <div key={o.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner transition-transform group-hover:-rotate-12 ${idx === 0 ? 'bg-yellow-500 text-slate-900' : 'bg-white/10 text-white'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm tracking-tight text-white/90">
                                                    {o.lastName} {o.firstName[0]}.
                                                </p>
                                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{o.rank || 'Офіцер'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                                            <span className="text-sm font-black text-yellow-500">{o.avgRating}</span>
                                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50 px-5 sm:px-8 py-4 sm:py-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest">Якість за напрямками</CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 sm:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                            {[
                                { label: "Ввічливість", val: avgRatings._avg.ratePoliteness, tint: "from-blue-600 to-indigo-600" },
                                { label: "Професійність", val: avgRatings._avg.rateProfessionalism, tint: "from-indigo-600 to-violet-600" },
                                { label: "Ефективність", val: avgRatings._avg.rateEffectiveness, tint: "from-emerald-600 to-teal-600" },
                            ].map((row) => (
                                <div key={row.label} className="space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                                        <span>{row.label}</span>
                                        <span className="text-slate-900 font-black">{(row.val || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className={`h-full bg-gradient-to-r ${row.tint} rounded-full transition-all duration-1000 shadow-lg`}
                                            style={{ width: `${((row.val || 0) / 5) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

