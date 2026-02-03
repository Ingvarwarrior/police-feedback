'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
    AreaChart, Area
} from 'recharts'
import {
    Users, MessageSquare, Star, TrendingUp, AlertTriangle,
    Shield, ArrowUpRight, Award, Printer, Clock, Lock,
    UserCheck, BarChart3, PieChart as PieIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AnalyticsClientProps {
    trendData: any[]
    ratingsData: any[]
    officers: any[]
    citizensCount: number
    categoryStats: any[]
    totalReports: number
    efficiency: {
        avgResolutionTime: number
        resolutionRate: number
    }
    trust: {
        anonymityData: any[]
        engagementData: any[]
        suspiciousIps: any[]
    }
    correlationData: any[]
}

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
const PIE_COLORS = ['#fbbf24', '#3b82f6', '#10b981', '#f87171']

export default function AnalyticsClient({
    trendData,
    ratingsData,
    officers,
    citizensCount,
    categoryStats,
    totalReports,
    efficiency,
    trust,
    correlationData
}: AnalyticsClientProps) {
    const [activeTab, setActiveTab] = useState<'feedback' | 'personnel' | 'citizens' | 'efficiency'>('feedback')

    const avgRating = ratingsData.reduce((acc, curr, idx) => acc + (curr.value * (idx + 1)), 0) / (totalReports || 1)

    // Personnel Metrics
    const topOfficers = officers.slice(0, 5)
    const bottomOfficers = officers.filter(o => o.totalResponses > 0).slice(-5).reverse()

    const tabs = [
        { id: 'feedback', label: 'Відгуки', icon: MessageSquare },
        { id: 'personnel', label: 'Особовий склад', icon: Shield },
        { id: 'citizens', label: 'Громадяни', icon: Users },
        { id: 'efficiency', label: 'Ефективність', icon: TrendingUp },
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Navigation & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 no-print">
                <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                activeTab === tab.id
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <Button
                    variant="outline"
                    className="rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 h-11 px-6 shadow-sm bg-white"
                    onClick={() => window.print()}
                >
                    <Printer className="w-4 h-4" />
                    Друк звіту
                </Button>
            </div>

            {/* Content Tabs */}
            <div className="space-y-8">
                {activeTab === 'feedback' && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardContent className="p-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Звітів (30д)</p>
                                    <h3 className="text-3xl font-black text-slate-900">{totalReports}</h3>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardContent className="p-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Середній бал</p>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-3xl font-black text-slate-900">{avgRating.toFixed(2)}</h3>
                                        <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <Card className="lg:col-span-2 border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardHeader className="p-8 pb-0">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-blue-500" /> Динаміка задоволеності
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trendData}>
                                            <defs>
                                                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 5]} />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                            <Area type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorAvg)" name="Рейтинг" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardHeader className="p-8 pb-0">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <Star className="w-4 h-4 text-amber-500" /> Розподіл оцінок
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ratingsData} layout="vertical">
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#1e293b' }} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} />
                                            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                                {ratingsData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                            <CardHeader className="p-8 pb-0">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-rose-500" /> Проблемні категорії (найнижчий бал)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={categoryStats.map(s => ({
                                            name: s.incidentType || 'Не вказано',
                                            avg: s._avg.rateOverall || 0,
                                            count: s._count
                                        })).sort((a, b) => a.avg - b.avg)}
                                    >
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 5]} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                        <Bar dataKey="avg" radius={[8, 8, 8, 8]}>
                                            {categoryStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry._avg.rateOverall < 3 ? '#ef4444' : '#3b82f6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </>
                )}

                {activeTab === 'personnel' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-emerald-600">
                                        <Award className="w-5 h-5" /> Найкращі за рейтингом
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-50">
                                        {topOfficers.map((o, idx) => (
                                            <div key={o.id} className="flex items-center gap-4 p-6 hover:bg-slate-50 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">#{idx + 1}</div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-900">{o.firstName} {o.lastName}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{o.badgeNumber}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1 text-amber-500 justify-end">
                                                        <Star className="w-3 h-3 fill-current" />
                                                        <span className="text-sm font-black">{o.avgScore.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-rose-600">
                                        <AlertTriangle className="w-5 h-5" /> Потребують уваги (Конфліктність)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-50">
                                        {bottomOfficers.map((o, idx) => (
                                            <div key={o.id} className="flex items-center gap-4 p-6 hover:bg-slate-50 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-black text-xs">#{idx + 1}</div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-900">{o.firstName} {o.lastName}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{o.badgeNumber}</p>
                                                </div>
                                                <div className="text-right text-rose-500">
                                                    <span className="text-sm font-black">{o.avgScore.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                            <CardHeader className="p-8 pb-0">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-500" /> Кореляція: Оцінка громадян vs Внутрішня
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={correlationData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 5]} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                        <Legend verticalAlign="top" align="right" />
                                        <Bar dataKey="citizen" name="Громадяни" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="internal" name="Внутрішня" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'citizens' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <Lock className="w-4 h-4" /> Індекс довіри (Анонімність)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={trust.anonymityData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                                {trust.anonymityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <UserCheck className="w-4 h-4" /> Рівень залученості
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={trust.engagementData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                                {trust.engagementData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {trust.suspiciousIps && trust.suspiciousIps.length > 0 && (
                            <Card className="border-0 shadow-lg shadow-rose-200/50 rounded-[2rem] border-l-8 border-rose-500 bg-rose-50/30">
                                <CardHeader className="p-8">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-rose-600">
                                        <AlertTriangle className="w-5 h-5" /> Аналіз безпеки (Підозріла активність IP)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {trust.suspiciousIps.map((ip: any) => (
                                            <div key={ip.hash} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                    <span className="text-xs font-mono text-slate-500">{ip.hash.substring(0, 16)}...</span>
                                                </div>
                                                <span className="text-sm font-black text-rose-600">{ip.count} відгуків</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-6 uppercase font-bold tracking-widest text-center">Ці пристрої надіслали більше 3 відгуків за останні 30 днів</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {activeTab === 'efficiency' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] bg-slate-900 text-white">
                            <CardContent className="p-12 text-center space-y-4">
                                <Clock className="w-12 h-12 mx-auto text-blue-400 mb-4" />
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Сер. швидкість вирішення</p>
                                <h3 className="text-6xl font-black">{efficiency.avgResolutionTime.toFixed(1)} <span className="text-xl text-slate-500 uppercase">гoд.</span></h3>
                                <p className="text-slate-400 text-sm max-w-xs mx-auto">Середній час від подачі відгуку до статусу "Вирішено" за останні 30 днів.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                            <CardContent className="p-12 text-center space-y-4">
                                <BarChart3 className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Відсоток опрацювання</p>
                                <h3 className="text-6xl font-black">{efficiency.resolutionRate.toFixed(1)}%</h3>
                                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mt-4">
                                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${efficiency.resolutionRate}%` }} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
