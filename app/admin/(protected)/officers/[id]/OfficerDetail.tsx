'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    ArrowLeft, Shield, Star, Award, TrendingUp, Phone, Activity, AlertTriangle, FileText, Trash2, CheckCircle2, XCircle, Users, Image as ImageIcon
} from "lucide-react"
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis,
    ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip
} from "recharts"
import { EditOfficerDialog } from "./EditOfficerDialog"
import { AddEvaluationDialog } from "../components/AddEvaluationDialog"
import { toast } from "sonner"
import { analyzeOfficerFeedback } from "./actions/analysisActions"
import { formatPhoneNumberForCall } from "@/lib/utils"
import { useAdminStore } from "@/lib/admin-store"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface OfficerDetailProps {
    officerId: string
    userRole: string
    canViewStats: boolean
    canExport: boolean
    canEdit: boolean
    canEvaluate: boolean
    canDelete: boolean
}

interface OfficerDetailData {
    officer: any
    stats: {
        totalFeedback: number
        totalEvaluations: number
        avgScores: {
            knowledge: number
            tactics: number
            communication: number
            professionalism: number
            physical: number
            overall: number
        }
        radarData: { subject: string, A: number, fullMark: number }[]
        trendData: { month: string, rating: number }[]
        qrUrl: string
        recentEvaluations: any[]
        recentFeedback: any[]
        taggedFeedback: any[]
    }
}

export default function OfficerDetail({ officerId, userRole, canViewStats, canExport, canEdit, canEvaluate, canDelete }: OfficerDetailProps) {
    const router = useRouter()
    const [data, setData] = useState<OfficerDetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEvalOpen, setIsEvalOpen] = useState(false)
    const [printMode, setPrintMode] = useState<'DOSSIER' | null>(null)
    const [analysis, setAnalysis] = useState<any>(null)
    const isAdmin = userRole === 'ADMIN'
    const { removeOfficer, updateOfficer } = useAdminStore()

    useEffect(() => {
        if (officerId) {
            fetchOfficerData()
        }
    }, [officerId])

    const fetchOfficerData = async () => {
        try {
            const res = await fetch(`/api/admin/officers/${officerId}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)
                const analysisResult = await analyzeOfficerFeedback(officerId)
                setAnalysis(analysisResult)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteOfficer = async () => {
        try {
            const res = await fetch(`/api/admin/officers/${officerId}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success("Офіцера повністю видалено")
                removeOfficer(officerId)
                router.push('/admin/officers')
            } else {
                toast.error("Помилка видалення")
            }
        } catch (error) {
            toast.error("Помилка мережі")
        }
    }

    const handleDeleteEvaluation = async (evalId: string) => {
        try {
            const res = await fetch(`/api/admin/officers/${officerId}/evaluations/${evalId}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success("Оцінку видалено")
                fetchOfficerData()
            } else {
                toast.error("Помилка видалення")
            }
        } catch (error) {
            toast.error("Помилка мережі")
        }
    }

    const handlePrint = (mode: 'DOSSIER') => {
        setPrintMode(mode)
        setTimeout(() => {
            window.print()
            setPrintMode(null)
        }, 100)
    }

    if (loading) return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Завантаження профілю...</div>
    if (!data) return <div className="p-12 text-center text-rose-500 font-bold">Офіцера не знайдено</div>

    const { officer, stats } = data
    const scores = stats.avgScores
    const isRedFlag = scores.overall > 0 && scores.overall < 3.0

    return (
        <div className="space-y-8">
            {/* Red Flag Alert */}
            {isRedFlag && (
                <div className="bg-rose-50 border border-rose-200 rounded-[2.5rem] p-6 flex items-center gap-6 text-rose-900 shadow-sm animate-pulse no-print">
                    <div className="bg-rose-100 p-4 rounded-3xl">
                        <AlertTriangle className="w-8 h-8 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="font-black uppercase tracking-tight text-sm">Низький рейтинг компетенцій</h3>
                        <p className="text-sm font-medium opacity-80 italic">Загальний показник ({scores.overall}/5) нижче норми. Рекомендується перегляд професійної діяльності.</p>
                    </div>
                </div>
            )}

            {/* Redesigned Header - Vertical Schematic */}
            <div className={`no-print ${printMode === 'DOSSIER' ? 'hidden' : ''} bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 flex flex-col items-center text-center`}>
                <div className="w-full flex justify-start mb-6">
                    <Link href="/admin/officers" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 font-bold uppercase tracking-widest text-[10px]">
                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                        Назад до списку
                    </Link>
                </div>

                {/* Vertical Stack */}
                <div className="flex flex-col items-center max-w-2xl w-full">
                    {/* Large Photo */}
                    <div className="relative w-48 h-60 md:w-64 md:h-80 rounded-[2.5rem] overflow-hidden bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xl border-[6px] border-white ring-1 ring-slate-100 mb-8 transform hover:scale-[1.02] transition-transform duration-500">
                        {officer.imageUrl ? (
                            <img src={officer.imageUrl} alt="Officer" className="w-full h-full object-cover" />
                        ) : (
                            <Shield className="w-24 h-24 opacity-10" />
                        )}
                    </div>

                    {/* ПІБ and Details */}
                    <div className="space-y-6 w-full">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight uppercase italic mb-2">
                                {officer.lastName} <br />
                                {officer.firstName} {officer.middleName}
                            </h1>
                            <p className="text-primary font-black uppercase tracking-[0.3em] text-sm">
                                {officer.department || officer.district || 'УПП Хмільницький район'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 pt-10 border-t border-slate-100 text-left">
                            <DetailRow label="Звання" value={officer.rank || 'Офіцер'} icon={<Award className="w-5 h-5 text-primary" />} />
                            <DetailRow label="Жетон" value={officer.badgeNumber} icon={<Shield className="w-5 h-5 text-primary" />} />
                            <DetailRow label="Дата народження" value={officer.birthDate ? new Date(officer.birthDate).toLocaleDateString() : '—'} icon={<Star className="w-5 h-5 text-primary" />} />
                            <DetailRow label="Телефон" value={officer.phone || '—'} icon={<Phone className="w-5 h-5 text-primary" />} />
                            <DetailRow label="Освіта" value={officer.education || '—'} icon={<FileText className="w-5 h-5 text-primary" />} />
                            <DetailRow label="Домашня адреса" value={officer.address || '—'} icon={<Activity className="w-5 h-5 text-primary" />} />
                        </div>

                        {/* Service History Section */}
                        {officer.serviceHistory && (
                            <div className="w-full mt-8 pt-8 border-t border-slate-100 text-left">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-primary" />
                                    Служба в ОВС
                                </h3>
                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {officer.serviceHistory}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Top Actions */}
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-8 border-t border-slate-50">
                            {canEdit && <EditOfficerDialog officer={officer} />}
                            {canExport && (
                                <Button
                                    onClick={() => handlePrint('DOSSIER')}
                                    variant="outline"
                                    className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 border-slate-200 hover:bg-slate-50 gap-2 px-6"
                                >
                                    <FileText className="w-4 h-4" />
                                    Експорт досьє
                                </Button>
                            )}
                            {canDelete && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 text-rose-500 hover:bg-rose-50 hover:text-rose-600 px-6">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Видалити
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[3rem] border-0 shadow-2xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-2xl font-black uppercase text-slate-900 italic">Видалити офіцера?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-500 font-medium pb-4 leading-relaxed">
                                                Це повністю видалить картку офіцера та всю його історію. Відгуки громадян будуть відв'язані. Цю дію неможливо скасувати.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-2xl font-bold border-slate-200 h-12 px-8 uppercase tracking-widest text-xs">Скасувати</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteOfficer} className="rounded-2xl bg-rose-500 hover:bg-rose-600 font-black px-10 h-12 uppercase tracking-widest text-xs">
                                                ТАК, ВИДАЛИТИ
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Only Header (Hidden on UI) */}
            <div className={`${printMode === 'DOSSIER' ? 'print:block' : 'hidden'} border-b-4 border-slate-900 pb-8 mb-8`}>
                <div className="flex justify-between items-start">
                    <div className="flex gap-8">
                        <div className="w-36 h-44 rounded-lg overflow-hidden shrink-0 border-2 border-slate-900 shadow-md">
                            {officer.imageUrl ? (
                                <img src={officer.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                    <Shield className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h1 className="text-4xl font-black uppercase text-slate-900 leading-none">{officer.lastName}</h1>
                                <h1 className="text-4xl font-black uppercase text-slate-900">{officer.firstName} {officer.middleName}</h1>
                            </div>
                            <p className="text-xl font-bold text-slate-600">{officer.department || 'УПП Хмільницький район'}</p>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-3 mt-8">
                                <div className="text-sm"><span className="font-black uppercase text-[10px] text-slate-400 block mb-1">Звання:</span> <span className="font-bold">{officer.rank || '—'}</span></div>
                                <div className="text-sm"><span className="font-black uppercase text-[10px] text-slate-400 block mb-1">Жетон:</span> <span className="font-bold">#{officer.badgeNumber}</span></div>
                                <div className="text-sm"><span className="font-black uppercase text-[10px] text-slate-400 block mb-1">Дата нар.:</span> <span className="font-bold">{officer.birthDate ? new Date(officer.birthDate).toLocaleDateString() : '—'}</span></div>
                                <div className="text-sm"><span className="font-black uppercase text-[10px] text-slate-400 block mb-1">Телефон:</span> <span className="font-bold">{officer.phone || '—'}</span></div>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                            ПАТРУЛЬНА ПОЛІЦІЯ<br />УКРАЇНИ
                        </div>
                    </div>
                </div>
            </div>

            {/* Prominent Evaluate Button before Charts */}
            {canEvaluate && (
                <div className="flex justify-center pt-4 no-print">
                    <AddEvaluationDialog
                        officerId={officer.id}
                        onSuccess={fetchOfficerData}
                        open={isEvalOpen}
                        setOpen={setIsEvalOpen}
                    />
                </div>
            )}

            {/* Analytics Grid */}
            {canViewStats ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
                    {/* Radar Chart */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden leading-none h-[400px]">
                        <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                Профіль компетенцій
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                                    <Radar
                                        name="Rating"
                                        dataKey="A"
                                        stroke="#6366f1"
                                        fill="#6366f1"
                                        fillOpacity={0.6}
                                    />
                                    <ReTooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Trend Chart */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden h-[400px]">
                        <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                Динаміка рейтингу
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 h-[320px]">
                            {stats.trendData.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.trendData}>
                                        <XAxis dataKey="month" fontSize={10} tick={{ fill: '#94a3b8' }} />
                                        <YAxis domain={[0, 5]} fontSize={10} tick={{ fill: '#94a3b8' }} />
                                        <ReTooltip />
                                        <Area type="monotone" dataKey="rating" stroke="#10b981" fill="#10b98110" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                                    Недостатньо даних для побудови тренду
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* AI Smart Analysis - Full Width */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden bg-indigo-50/30 lg:col-span-2 no-print">
                        <CardHeader className="bg-white/50 border-b px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-indigo-700">
                                <Activity className="w-4 h-4" />
                                Smart Analysis (AI Feedback Analysis)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            {analysis ? (
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            <span>Настрій відгуків громадян</span>
                                            <span className="text-emerald-600">Критичний поріг: 3.0</span>
                                        </div>
                                        <div className="flex h-4 rounded-full overflow-hidden shadow-inner bg-slate-200 border-2 border-white">
                                            <div style={{ width: `${(analysis.sentiment.positive / (analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative || 1)) * 100}%` }} className="bg-emerald-500" />
                                            <div style={{ width: `${(analysis.sentiment.neutral / (analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative || 1)) * 100}%` }} className="bg-amber-400" />
                                            <div style={{ width: `${(analysis.sentiment.negative / (analysis.sentiment.positive + analysis.sentiment.neutral + analysis.sentiment.negative || 1)) * 100}%` }} className="bg-rose-500" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {analysis.strengths.map((s: string, i: number) => (
                                            <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700 bg-white/60 p-4 rounded-2xl border border-indigo-100/50">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                                {s}
                                            </div>
                                        ))}
                                        {analysis.weaknesses.map((w: string, i: number) => (
                                            <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700 bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                                                <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                                {w}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 text-xs italic py-10">
                                    Очікуємо на більшу кількість відгуків для запуску AI аналітики
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] no-print">
                    Доступ до детальної аналітики обмежено адміністратором
                </div>
            )}

            {/* Summary Stats Cards */}
            {canViewStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
                    <Card className="bg-slate-900 text-white border-none shadow-xl rounded-[2rem] overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />
                        <CardContent className="pt-8 pb-8 relative z-10">
                            <div className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Середній рейтинг</div>
                            <div className="text-5xl font-black flex items-baseline gap-2 italic">
                                {scores.overall || '0'} <span className="text-lg text-slate-600 not-italic">/ 5.0</span>
                            </div>
                            <div className="mt-6 flex gap-1.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star key={star} className={`w-5 h-5 ${star <= scores.overall ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <StatsCard title="Комунікація" value={scores.communication} icon="💬" />
                    <StatsCard title="Тактика" value={scores.tactics} icon="⚡" />
                    <StatsCard title="Знання НПА" value={scores.knowledge} icon="📚" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
                {/* Evaluations History */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 italic">
                        <div className="w-1.5 h-6 bg-primary" />
                        Атестаційний журнал
                    </h2>
                    <div className="space-y-4">
                        {stats.recentEvaluations.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                Офіційні оцінки відсутні
                            </div>
                        ) : (
                            stats.recentEvaluations.map((ev: any) => (
                                <Card key={ev.id} className="overflow-hidden group rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-100">
                                    <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between py-4 px-8">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {new Date(ev.createdAt).toLocaleDateString()} • {ev.type}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-900 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                                                СЕРЕДНЯ: {(() => {
                                                    const s = [ev.scoreKnowledge, ev.scoreTactics, ev.scoreCommunication, ev.scoreProfessionalism, ev.scorePhysical].filter(v => v > 0);
                                                    return s.length > 0 ? (s.reduce((a, b) => a + b, 0) / s.length).toFixed(1) : '—';
                                                })()}
                                            </div>
                                            {isAdmin && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button className="text-slate-300 hover:text-rose-500 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-[2rem]">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="font-black uppercase">Видалити запис?</AlertDialogTitle>
                                                            <AlertDialogDescription>Це видалить оцінку безповоротно.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="rounded-xl font-bold">Ні</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteEvaluation(ev.id)} className="rounded-xl bg-rose-500 font-bold">ТАК</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        {ev.notes && <p className="text-sm text-slate-600 italic bg-blue-50/50 p-5 rounded-2xl mb-6 leading-relaxed border border-blue-100/30">"{ev.notes}"</p>}

                                        {/* Low Rating Issues */}
                                        {ev.issuesJson && (() => {
                                            const issues = JSON.parse(ev.issuesJson).filter((i: any) => i.description || (i.attachmentIds && i.attachmentIds.length > 0));
                                            if (issues.length === 0) return null;

                                            return (
                                                <div className="mb-8 space-y-4">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Виявлені зауваження:</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {issues.map((issue: any, i: number) => {
                                                            const catLabels: any = {
                                                                knowledge: 'Знання законодавства',
                                                                tactics: 'Тактика та безпека',
                                                                communication: 'Комунікація',
                                                                professionalism: 'Професіоналізм',
                                                                physical: 'Фізична підготовка'
                                                            };
                                                            const issueAttachments = ev.attachments?.filter((a: any) => issue.attachmentIds?.includes(a.id)) || [];

                                                            return (
                                                                <div key={i} className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex flex-col gap-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">{catLabels[issue.category] || issue.category}</span>
                                                                    </div>
                                                                    {issue.description && <p className="text-xs text-slate-700 font-medium leading-relaxed">{issue.description}</p>}

                                                                    {issueAttachments.length > 0 && (
                                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                                            {issueAttachments.map((attach: any) => (
                                                                                <a
                                                                                    key={attach.id}
                                                                                    href={`/api/uploads/${attach.pathOrKey}`}
                                                                                    target="_blank"
                                                                                    className="relative w-16 h-16 rounded-lg overflow-hidden border border-rose-200 bg-white group hover:scale-105 transition-transform"
                                                                                >
                                                                                    <img
                                                                                        src={`/api/uploads/${attach.pathOrKey}`}
                                                                                        alt="Evidence"
                                                                                        className="w-full h-full object-cover"
                                                                                    />
                                                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                                        <ImageIcon className="w-4 h-4 text-white" />
                                                                                    </div>
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <div>Знання: <span className="text-slate-900 block text-sm mt-1">{ev.scoreKnowledge || '-'}</span></div>
                                            <div>Тактика: <span className="text-slate-900 block text-sm mt-1">{ev.scoreTactics || '-'}</span></div>
                                            <div>Комунікація: <span className="text-slate-900 block text-sm mt-1">{ev.scoreCommunication || '-'}</span></div>
                                            <div>Профі: <span className="text-slate-900 block text-sm mt-1">{ev.scoreProfessionalism || '-'}</span></div>
                                            <div>Фіз: <span className="text-slate-900 block text-sm mt-1">{ev.scorePhysical || '-'}</span></div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Citizen Feedback & Tagged Reports */}
                <div className="lg:col-span-1 space-y-12">
                    {/* Tagged Reports First (As requested) */}
                    {stats.taggedFeedback.length > 0 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 italic">
                                <div className="w-1.5 h-6 bg-amber-500" />
                                <Users className="w-5 h-5 text-amber-500" />
                                Згадки у звітах (Наряд)
                            </h2>
                            <div className="space-y-4">
                                {stats.taggedFeedback.map((fb: any) => (
                                    <div key={fb.id} className={`p-6 rounded-[2rem] border shadow-sm group hover:shadow-md transition-all ${fb.isConfirmed === false ? 'bg-slate-50 border-slate-200 grayscale opacity-70' : 'bg-amber-50/30 border-amber-100'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">{new Date(fb.createdAt).toLocaleDateString()}</span>
                                                {fb.isConfirmed === false && (
                                                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md">
                                                        <XCircle className="w-2.5 h-2.5" /> Не підтверджено
                                                    </span>
                                                )}
                                            </div>
                                            <span className="flex items-center gap-1.5 font-black text-amber-500 bg-white px-3 py-1 rounded-full text-xs italic border border-amber-100">
                                                {fb.rateOverall} <Star className="w-3 h-3 fill-current" />
                                            </span>
                                        </div>
                                        <p className="text-slate-600 text-sm line-clamp-3 italic leading-relaxed">"{fb.comment || 'Без коментаря'}"</p>
                                        <Link href={`/admin/reports/${fb.id}`} className="text-[10px] font-black uppercase text-amber-600 hover:underline mt-4 inline-flex items-center gap-2 tracking-[0.2em]">
                                            Детальніше <ArrowLeft className="w-3 h-3 rotate-180" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 italic">
                            <div className="w-1.5 h-6 bg-emerald-500" />
                            Безпосередні відгуки
                        </h2>
                        <div className="space-y-4">
                            {stats.recentFeedback.map((fb: any) => (
                                <div key={fb.id} className={`p-6 rounded-[2rem] border shadow-sm group hover:shadow-md transition-all ${fb.isConfirmed === false ? 'bg-slate-50 border-slate-200 grayscale opacity-70' : 'bg-white border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{new Date(fb.createdAt).toLocaleDateString()}</span>
                                            {fb.isConfirmed === false && (
                                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md">
                                                    <XCircle className="w-2.5 h-2.5" /> Не підтверджено
                                                </span>
                                            )}
                                        </div>
                                        <span className="flex items-center gap-1.5 font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-full text-xs italic">
                                            {fb.rateOverall} <Star className="w-3 h-3 fill-current" />
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-sm line-clamp-3 italic leading-relaxed">"{fb.comment || 'Коментар не залишено'}"</p>
                                    <Link href={`/admin/reports/${fb.id}`} className="text-[10px] font-black uppercase text-primary hover:underline mt-4 inline-flex items-center gap-2 tracking-[0.2em]">
                                        Переглянути звіт <ArrowLeft className="w-3 h-3 rotate-180" />
                                    </Link>
                                </div>
                            ))}
                            {stats.recentFeedback.length === 0 && (
                                <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                    Прямих відгуків немає
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DetailRow({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 group">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                {icon}
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">{label}:</p>
                <p className="text-sm font-bold text-slate-900 leading-none">{value}</p>
            </div>
        </div>
    )
}

function StatsCard({ title, value, icon }: any) {
    return (
        <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden bg-white">
            <CardContent className="pt-8 pb-8">
                <div className="flex justify-between items-start mb-6">
                    <div className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">{title}</div>
                    <div className="text-2xl">{icon}</div>
                </div>
                <div className="text-3xl font-black text-slate-900 italic">
                    {value || '0'} <span className="text-xs text-slate-400 font-medium not-italic">/ 5.0</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 mt-6 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                        style={{ width: `${(value / 5) * 100}%` }}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
