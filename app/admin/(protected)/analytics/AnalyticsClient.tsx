'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
    AreaChart, Area
} from 'recharts'
import { useRouter } from 'next/navigation'
import {
    Users, MessageSquare, Star, TrendingUp, AlertTriangle,
    Shield, ArrowUpRight, Award, Printer, Clock, Lock,
    UserCheck, BarChart3, PieChart as PieIcon, Brain, Clock3,
    MapPin, Zap, ClipboardList, ListTodo, CheckCircle
} from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"


interface AnalyticsClientProps {
    period: string
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
        suspiciousIps: { hash: string, count: number, phones: string[] }[]
    }
    correlationData: any[]
    timePatterns: {
        hourlyData: any[]
        dayOfWeekData: any[]
        burnoutAlerts: any[]
    }
    unifiedRecordStats: {
        totalByType: { recordType: string, _count: number }[]
        inspectorPerformance: {
            id: string,
            name: string,
            assigned: number,
            processed: number,
            pending: number
        }[]
    }
}

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
const PIE_COLORS = ['#fbbf24', '#3b82f6', '#10b981', '#f87171']

export default function AnalyticsClient({
    period,
    trendData,
    ratingsData,
    officers,
    citizensCount,
    categoryStats,
    totalReports,
    efficiency,
    trust,
    correlationData,
    timePatterns,
    unifiedRecordStats,
}: AnalyticsClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'feedback' | 'personnel' | 'citizens' | 'efficiency' | 'time' | 'geo' | 'predictions' | 'unified'>('feedback')
    const [selectedInspectorId, setSelectedInspectorId] = useState<string | 'all'>('all')

    const avgRating = ratingsData.reduce((acc, curr, idx) => acc + (curr.value * (idx + 1)), 0) / (totalReports || 1)

    // Personnel Metrics
    const ratedOfficers = officers.filter(o => o.avgScore > 0 && o.totalResponses > 0)
    const topOfficers = ratedOfficers.slice(0, 5)
    const bottomOfficers = ratedOfficers.slice(-5).reverse()

    const tabs = [
        { id: 'feedback', label: 'Відгуки', icon: MessageSquare },
        { id: 'unified', label: 'ЄО та Звернення', icon: ClipboardList },
        { id: 'personnel', label: 'Особовий склад', icon: Shield },
        { id: 'citizens', label: 'Громадяни', icon: Users },
        { id: 'efficiency', label: 'Ефективність', icon: TrendingUp },
        { id: 'time', label: 'Час', icon: Clock3 },
        { id: 'predictions', label: 'Прогнози', icon: Zap },
    ]

    const handlePeriodChange = (val: string) => {
        router.push(`/admin/analytics?period=${val}`)
    }

    const selectedInspector = unifiedRecordStats.inspectorPerformance.find(i => i.id === selectedInspectorId)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Navigation & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 no-print">
                {/* Mobile Navigation */}
                <div className="sm:hidden w-full">
                    <Select value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                        <SelectTrigger className="w-full h-12 rounded-[1.5rem] bg-slate-100 border-0 font-black uppercase text-[10px] tracking-widest px-5 shadow-inner">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-[1.5rem] border-slate-200 shadow-2xl">
                            {tabs.map((tab) => (
                                <SelectItem
                                    key={tab.id}
                                    value={tab.id}
                                    className="font-black uppercase text-[10px] tracking-widest py-3 focus:bg-slate-50"
                                >
                                    <div className="flex items-center gap-2">
                                        <tab.icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1.5 rounded-[2rem] w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0",
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

                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={handlePeriodChange}>
                        <SelectTrigger className="w-full sm:w-40 h-11 rounded-2xl bg-white border-slate-200 font-bold text-xs px-5 shadow-sm">
                            <SelectValue placeholder="Період" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
                            <SelectItem value="7" className="font-bold text-xs py-3">Останні 7 днів</SelectItem>
                            <SelectItem value="30" className="font-bold text-xs py-3">Останні 30 днів</SelectItem>
                            <SelectItem value="90" className="font-bold text-xs py-3">Останні 90 днів</SelectItem>
                            <SelectItem value="365" className="font-bold text-xs py-3">За рік</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        className="w-full sm:w-auto rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 h-11 px-6 shadow-sm bg-white"
                        onClick={() => window.print()}
                    >
                        <Printer className="w-4 h-4" />
                        Друк звіту
                    </Button>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="space-y-8">
                {activeTab === 'unified' && (
                    <div className="space-y-8">
                        {/* Overall Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] bg-gradient-to-br from-blue-50 to-white">
                                <CardContent className="p-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Всього ЄО</p>
                                            <h3 className="text-4xl font-black text-slate-900">
                                                {unifiedRecordStats.totalByType.find(t => t.recordType === 'EO')?._count || 0}
                                            </h3>
                                        </div>
                                        <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                                            <ClipboardList className="w-6 h-6" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] bg-gradient-to-br from-amber-50 to-white">
                                <CardContent className="p-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Всього Звернень</p>
                                            <h3 className="text-4xl font-black text-slate-900">
                                                {unifiedRecordStats.totalByType.find(t => t.recordType === 'ZVERN')?._count || 0}
                                            </h3>
                                        </div>
                                        <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem] bg-gradient-to-br from-emerald-50 to-white">
                                <CardContent className="p-8">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Виконано (Загалом)</p>
                                            <h3 className="text-4xl font-black text-slate-900">
                                                {unifiedRecordStats.inspectorPerformance.reduce((acc, curr) => acc + curr.processed, 0)}
                                            </h3>
                                        </div>
                                        <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                                            <CheckCircle className="w-6 h-6" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Inspector-Specific Stats */}
                        <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <ListTodo className="w-5 h-5 text-blue-500" /> Статистика за виконавцем
                                    </CardTitle>
                                    <Select value={selectedInspectorId} onValueChange={setSelectedInspectorId}>
                                        <SelectTrigger className="w-full sm:w-64 h-11 rounded-xl bg-white border-slate-200 font-bold text-xs px-5 shadow-sm">
                                            <SelectValue placeholder="Оберіть інспектора..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-200 shadow-2xl">
                                            <SelectItem value="all" className="font-bold text-xs py-3">Усі інспектори (середнє)</SelectItem>
                                            {unifiedRecordStats.inspectorPerformance.map(i => (
                                                <SelectItem key={i.id} value={i.id} className="font-bold text-xs py-3">
                                                    {i.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2 text-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Призначено</p>
                                        <h4 className="text-5xl font-black text-blue-600">
                                            {selectedInspectorId === 'all'
                                                ? unifiedRecordStats.inspectorPerformance.reduce((acc, curr) => acc + curr.assigned, 0)
                                                : selectedInspector?.assigned || 0
                                            }
                                        </h4>
                                    </div>
                                    <div className="space-y-2 text-center p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100/50">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Розглянуто</p>
                                        <h4 className="text-5xl font-black text-emerald-600">
                                            {selectedInspectorId === 'all'
                                                ? unifiedRecordStats.inspectorPerformance.reduce((acc, curr) => acc + curr.processed, 0)
                                                : selectedInspector?.processed || 0
                                            }
                                        </h4>
                                    </div>
                                    <div className="space-y-2 text-center p-6 bg-amber-50/50 rounded-3xl border border-amber-100/50">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Залишилося</p>
                                        <h4 className="text-5xl font-black text-amber-600">
                                            {selectedInspectorId === 'all'
                                                ? unifiedRecordStats.inspectorPerformance.reduce((acc, curr) => acc + curr.pending, 0)
                                                : selectedInspector?.pending || 0
                                            }
                                        </h4>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Summary Table */}
                        <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="p-8 bg-white border-b border-slate-50">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <TableHead className="p-0 h-auto font-black text-slate-900 border-none">Зведена таблиця виконавців</TableHead>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="border-slate-50 hover:bg-transparent">
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest px-8">Виконавець</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Призначено</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Розглянуто</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">В роботі</TableHead>
                                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-right px-8">Прогрес</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {unifiedRecordStats.inspectorPerformance.sort((a, b) => b.assigned - a.assigned).map((item) => (
                                            <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                                                <TableCell className="font-bold text-slate-900 px-8 py-4">{item.name}</TableCell>
                                                <TableCell className="text-center font-bold text-slate-600">{item.assigned}</TableCell>
                                                <TableCell className="text-center font-bold text-emerald-600">{item.processed}</TableCell>
                                                <TableCell className="text-center font-bold text-amber-600">{item.pending}</TableCell>
                                                <TableCell className="text-right px-8 py-4">
                                                    <div className="flex items-center justify-end gap-3 font-black text-xs">
                                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500 rounded-full"
                                                                style={{ width: `${item.assigned > 0 ? (item.processed / item.assigned) * 100 : 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="w-10">
                                                            {item.assigned > 0 ? Math.round((item.processed / item.assigned) * 100) : 0}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'feedback' && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardContent className="p-5 sm:p-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Звітів (30д)</p>
                                    <h3 className="text-3xl font-black text-slate-900">{totalReports}</h3>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardContent className="p-5 sm:p-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Середній бал</p>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-3xl font-black text-slate-900">{avgRating.toFixed(2)}</h3>
                                        <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:p-8">
                            <Card className="lg:col-span-2 border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardHeader className="p-5 sm:p-8 pb-0">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-blue-500" /> Динаміка задоволеності
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 sm:p-8 h-[350px]">
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
                                <CardHeader className="p-5 sm:p-8 pb-0">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <Star className="w-4 h-4 text-amber-500" /> Розподіл оцінок
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 sm:p-8 h-[350px]">
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
                            <CardHeader className="p-5 sm:p-8 pb-0">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-rose-500" /> Проблемні категорії (найнижчий бал)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 sm:p-8 h-[350px]">
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:p-8">
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-5 sm:p-8 border-b border-slate-50 bg-slate-50/30">
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
                                <CardHeader className="p-5 sm:p-8 border-b border-slate-50 bg-slate-50/30">
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
                            <CardHeader className="p-5 sm:p-8 pb-0">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-500" /> Кореляція: Оцінка громадян vs Внутрішня
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 sm:p-8 h-[400px]">
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:p-8">
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardHeader className="p-5 sm:p-8">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <Lock className="w-4 h-4" /> Індекс довіри (Анонімність)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 sm:p-8 h-[350px]">
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
                                <CardHeader className="p-5 sm:p-8">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <UserCheck className="w-4 h-4" /> Рівень залученості
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 sm:p-8 h-[350px]">
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
                                <CardHeader className="p-5 sm:p-8">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-rose-600">
                                        <AlertTriangle className="w-5 h-5" /> Аналіз безпеки (Підозріла активність IP)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 sm:p-8 pt-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {trust.suspiciousIps.map((ip: any) => (
                                            <div key={ip.hash} className="bg-white p-4 rounded-2xl shadow-sm space-y-3 border border-slate-100">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                        <span className="text-xs font-mono text-slate-500">{ip.hash.substring(0, 16)}...</span>
                                                    </div>
                                                    <span className="text-sm font-black text-rose-600">{ip.count} відгуків</span>
                                                </div>

                                                {ip.phones && ip.phones.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50">
                                                        {ip.phones.map((phone: string) => (
                                                            <div key={phone} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                                                                {phone}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:p-8">
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


                {activeTab === 'time' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:p-8">
                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardHeader className="p-5 sm:p-8 pb-0">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <Clock3 className="w-4 h-4 text-blue-500" /> Години пік (Негатив по годинах)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 sm:p-8 h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={timePatterns.hourlyData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                            <Bar dataKey="negativeCount" name="Негативних" fill="#ef4444" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                                <CardHeader className="p-5 sm:p-8 pb-0">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                        <Clock3 className="w-4 h-4 text-emerald-500" /> День тижня
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 sm:p-8 h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={timePatterns.dayOfWeekData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 5]} />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                            <Bar dataKey="avgRating" name="Середній бал" fill="#10b981" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {timePatterns.burnoutAlerts && timePatterns.burnoutAlerts.length > 0 && (
                            <Card className="border-0 shadow-lg shadow-amber-200/50 rounded-[2rem] border-l-8 border-amber-500 bg-amber-50/30">
                                <CardHeader className="p-5 sm:p-8">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-amber-600">
                                        <AlertTriangle className="w-5 h-5" /> Попередження про вигорання
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 sm:p-8 pt-0">
                                    <div className="space-y-3">
                                        {timePatterns.burnoutAlerts.map((alert: any, idx: number) => (
                                            <div key={idx} className={cn(
                                                "flex items-center justify-between p-4 rounded-xl",
                                                alert.alertLevel === 'critical' ? 'bg-rose-100 border-2 border-rose-500' : 'bg-amber-100 border-2 border-amber-500'
                                            )}>
                                                <div>
                                                    <p className="font-black text-slate-900">{alert.officerName}</p>
                                                    <p className="text-xs text-slate-500">
                                                        Тренд: <span className={alert.trend === 'declining' ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{alert.trend === 'declining' ? '📉 Погіршення' : '📈 Покращення'}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-slate-900">{alert.currentRating.toFixed(1)}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">30д: {alert.last30Days.toFixed(1)} | 90д: {alert.last90Days.toFixed(1)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}



                {activeTab === 'predictions' && (
                    <div className="space-y-8">
                        <Card className="border-0 shadow-lg shadow-blue-200/50 rounded-[2rem] bg-gradient-to-br from-blue-50 to-indigo-50">
                            <CardHeader className="p-5 sm:p-8">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-blue-600">
                                    <Zap className="w-5 h-5" /> Прогноз на наступний місяць
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 sm:p-8 pt-0">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Очікуваний рейтинг</p>
                                        <p className="text-5xl font-black text-blue-600">{avgRating.toFixed(1)}</p>
                                        <p className="text-xs text-slate-400 mt-2">На основі тренду 30 днів</p>
                                    </div>
                                    <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Очікувана кількість</p>
                                        <p className="text-5xl font-black text-slate-900">{Math.round(totalReports * 1.05)}</p>
                                        <p className="text-xs text-emerald-500 mt-2 font-bold">+5% зростання</p>
                                    </div>
                                    <div className="bg-white p-5 sm:p-8 rounded-xl shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ризик конфліктів</p>
                                        <p className="text-5xl font-black text-amber-500">{timePatterns.burnoutAlerts.length > 0 ? 'Високий' : 'Низький'}</p>
                                        <p className="text-xs text-slate-400 mt-2">{timePatterns.burnoutAlerts.length} офіцерів під ризиком</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-[2rem]">
                            <CardHeader className="p-5 sm:p-8">
                                <CardTitle className="text-sm font-black uppercase tracking-widest">Рекомендації системи</CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 sm:p-8 pt-0 space-y-3">
                                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black flex-shrink-0">1</div>
                                    <div>
                                        <p className="font-bold text-slate-900">Працювати з категоріями низького рейтингу</p>
                                        <p className="text-sm text-slate-600">Проаналізуйте проблемні категорії у вкладці "Відгуки"</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl">
                                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black flex-shrink-0">2</div>
                                    <div>
                                        <p className="font-bold text-slate-900">Звернути увагу на офіцерів під ризиком</p>
                                        <p className="text-sm text-slate-600">У вкладці "Час" є {timePatterns.burnoutAlerts.length} попереджень про вигорання</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black flex-shrink-0">3</div>
                                    <div>
                                        <p className="font-bold text-slate-900">Посилити моніторинг у години пік</p>
                                        <p className="text-sm text-slate-600">Часова аналітика показує найбільш конфліктні години доби</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

            </div>
        </div >
    )
}
