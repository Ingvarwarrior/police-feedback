'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import {
    Users, MessageSquare, Star, TrendingUp, AlertTriangle,
    Shield, ArrowUpRight, ArrowDownRight, Award, Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AnalyticsClientProps {
    trendData: any[]
    ratingsData: any[]
    officers: any[]
    citizensCount: number
    categoryStats: any[]
    totalReports: number
}

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function AnalyticsClient({
    trendData,
    ratingsData,
    officers,
    citizensCount,
    categoryStats,
    totalReports
}: AnalyticsClientProps) {

    const avgRating = ratingsData.reduce((acc, curr, idx) => acc + (curr.value * (idx + 1)), 0) / (totalReports || 1)

    // Top and Bottom Officers
    const topOfficers = officers.slice(0, 5)
    const bottomOfficers = officers.filter(o => o.totalResponses > 0).slice(-5).reverse()

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Actions */}
            <div className="flex justify-end gap-3 no-print">
                <Button
                    variant="outline"
                    className="rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 h-11 px-6 shadow-sm bg-white"
                    onClick={() => window.print()}
                >
                    <Printer className="w-4 h-4" />
                    Друк звіту
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <span className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                12%
                            </span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Звітів (30д)</p>
                        <h3 className="text-3xl font-black text-slate-900">{totalReports}</h3>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                                <Star className="w-6 h-6" />
                            </div>
                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-2 h-2 ${i < Math.round(avgRating) ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Середній бал</p>
                        <h3 className="text-3xl font-black text-slate-900">{avgRating.toFixed(2)}</h3>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Громадян у базі</p>
                        <h3 className="text-3xl font-black text-slate-900">{citizensCount}</h3>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-900 rounded-2xl text-white">
                                <Shield className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Активний склад</p>
                        <h3 className="text-3xl font-black text-slate-900">{officers.length}</h3>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Trend Chart */}
                <Card className="lg:col-span-2 border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-0 border-0 bg-transparent">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            Динаміка відгуків
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ fontWeight: 900, marginBottom: '4px' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#3b82f6"
                                        strokeWidth={4}
                                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        name="Кількість"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avg"
                                        stroke="#f59e0b"
                                        strokeWidth={4}
                                        dot={false}
                                        name="Сер. бал"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Ratings Distribution */}
                <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-0 border-0 bg-transparent">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" />
                            Розподіл оцінок
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ratingsData}>
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                    />
                                    <YAxis hide />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                                        {ratingsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Officers */}
                <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-emerald-600">
                            <Award className="w-5 h-5" />
                            Найкращі за рейтингом
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {topOfficers.map((o, idx) => (
                                <div key={o.id} className="flex items-center gap-4 p-6 hover:bg-slate-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900">{o.firstName} {o.lastName}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{o.badgeNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-amber-500 justify-end">
                                            <Star className="w-3 h-3 fill-current" />
                                            <span className="text-sm font-black">{o.avgScore.toFixed(1)}</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{o.totalResponses} в-ків</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Performance Concerns */}
                <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="w-5 h-5" />
                            Потребують уваги
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {bottomOfficers.map((o, idx) => (
                                <div key={o.id} className="flex items-center gap-4 p-6 hover:bg-slate-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-black text-xs">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900">{o.firstName} {o.lastName}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{o.badgeNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-rose-500 justify-end">
                                            <Star className="w-3 h-3 fill-current" />
                                            <span className="text-sm font-black">{o.avgScore.toFixed(1)}</span>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{o.totalResponses} в-ків</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
