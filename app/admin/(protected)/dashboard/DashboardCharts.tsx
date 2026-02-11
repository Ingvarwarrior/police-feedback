'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, BarChart2, Map as MapIcon, Sun, Moon, Clock } from "lucide-react"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts'
import DashboardMapWrapper from "./DashboardMapWrapper"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

interface DashboardChartsProps {
    trendData: { date: string, count: number, fullDate?: string }[]
    districtData: { name: string, count: number }[]
    heatmapData: { lat: number, lon: number }[]
    shiftData: { name: string, value: number, color: string }[]
    timeDistributionData: { name: string, value: number }[]
}

export default function DashboardCharts({
    trendData,
    districtData,
    heatmapData,
    shiftData,
    timeDistributionData
}: DashboardChartsProps) {
    const router = useRouter()
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const COLORS = ['#1e293b', '#2563eb', '#4f46e5', '#7c3aed', '#9333ea']
    const axisColor = isDark ? '#94a3b8' : '#64748b'
    const gridColor = isDark ? '#334155' : '#e2e8f0'
    const tooltipStyle = {
        backgroundColor: isDark ? '#0f172a' : '#fff',
        borderColor: isDark ? '#1e293b' : '#e2e8f0',
        color: isDark ? '#cbd5e1' : '#0f172a',
        borderRadius: '16px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    }

    return (
        <div className="space-y-6">
            {/* ... previous grid ... */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-6 sm:px-8 py-4 sm:py-6 transition-colors duration-300">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-slate-200">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Динаміка відгуків
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 py-6 sm:py-8 h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={trendData}
                                onClick={(data: any) => {
                                    if (data && data.activePayload && data.activePayload[0]) {
                                        const fullDate = data.activePayload[0].payload.fullDate;
                                        if (fullDate) {
                                            router.push(`/admin/reports?date=${fullDate}`)
                                        }
                                    }
                                }}
                                className="cursor-pointer"
                            >
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis
                                    dataKey="date"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: axisColor, fontWeight: 700 }}
                                />
                                <YAxis
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: axisColor, fontWeight: 700 }}
                                />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    itemStyle={{ fontWeight: 900, color: isDark ? '#fff' : '#0f172a' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorCount)"
                                    activeDot={{ r: 6, strokeWidth: 0, className: "animate-ping" }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-6 sm:px-8 py-4 sm:py-6 transition-colors duration-300">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-slate-200">
                            <BarChart2 className="w-4 h-4 text-primary" />
                            Топ локацій
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 py-6 sm:py-8 h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={districtData}
                                layout="vertical"
                                onClick={(data: any) => {
                                    if (data && data.activePayload && data.activePayload[0]) {
                                        const location = data.activePayload[0].payload.name;
                                        router.push(`/admin/reports?search=${encodeURIComponent(location)}`)
                                    }
                                }}
                                className="cursor-pointer"
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    fontSize={10}
                                    width={80}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: axisColor, fontWeight: 800 }}
                                />
                                <Tooltip
                                    cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                                    contentStyle={tooltipStyle}
                                />
                                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                                    {districtData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-5 sm:px-8 py-4 sm:py-6 transition-colors duration-300">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-slate-200">
                            <MapIcon className="w-4 h-4 text-primary" />
                            Теплова карта активності
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 h-[400px]">
                        <DashboardMapWrapper points={heatmapData} />
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-5 sm:px-8 py-4 sm:py-6 transition-colors duration-300">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-slate-200">
                                <Clock className="w-4 h-4 text-indigo-500" />
                                Час інцидентів
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6 py-4 sm:py-6 h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={timeDistributionData}>
                                    <XAxis
                                        dataKey="name"
                                        fontSize={8}
                                        tick={{ fill: axisColor, fontWeight: 800 }}
                                        tickFormatter={(val) => val.split('-')[0]}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50 backdrop-blur-sm transition-all duration-300">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-5 sm:px-8 py-4 sm:py-6 transition-colors duration-300">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-slate-200">
                                <Sun className="w-4 h-4 text-amber-500" />
                                Аналіз змін
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 sm:px-8 py-4 sm:py-6 h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={shiftData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {shiftData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke={isDark ? '#0f172a' : '#fff'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </RePieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
