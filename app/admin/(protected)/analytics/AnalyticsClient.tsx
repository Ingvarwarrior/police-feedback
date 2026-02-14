'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, CheckCircle2, Clock3, ClipboardList, FileSpreadsheet, Printer, Users } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AnalyticsClientProps {
  startDate: string
  endDate: string
  overview: {
    totalRecords: number
    totalProcessed: number
    totalInProgress: number
    totalPending: number
  }
  trendData: { date: string; total: number; eo: number; zvern: number; application: number; detention: number }[]
  typeData: { key: string; name: string; value: number }[]
  statusData: { key: string; name: string; value: number }[]
  executorData: {
    id: string
    name: string
    assigned: number
    processed: number
    pending: number
    inProgress: number
    eo: number
    zvern: number
    application: number
    detention: number
  }[]
  survey: {
    totalResponses: number
    ratedResponses: number
    averageRating: number
    resolvedResponses: number
    resolutionRate: number
    ratingDistribution: { name: string; value: number }[]
  }
}

type TabId = 'overview' | 'records' | 'executors' | 'survey'

const PIE_COLORS = ['#0f172a', '#2563eb', '#10b981', '#f59e0b', '#e11d48']

export default function AnalyticsClient({
  startDate,
  endDate,
  overview,
  trendData,
  typeData,
  statusData,
  executorData,
  survey,
}: AnalyticsClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('overview')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Огляд' },
    { id: 'records', label: 'Типи записів' },
    { id: 'executors', label: 'Виконавці' },
    { id: 'survey', label: 'Опитування' },
  ]

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set(type, value)
    params.delete('period')
    router.push(`/admin/analytics?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="hidden flex-wrap gap-2 sm:flex">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={[
                'rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition',
                tab === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="sm:hidden">
          <Select value={tab} onValueChange={(value) => setTab(value as TabId)}>
            <SelectTrigger className="h-11 rounded-xl font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="date"
            value={startDate}
            onChange={(event) => handleDateChange('from', event.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => handleDateChange('to', event.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
          />
          <Button onClick={() => window.print()} variant="outline" className="h-10 rounded-xl">
            <Printer className="mr-2 h-4 w-4" /> Друк
          </Button>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-3xl border-slate-200">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Всього записів</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{overview.totalRecords}</p>
                </div>
                <ClipboardList className="h-7 w-7 text-slate-400" />
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-slate-200">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Опрацьовано</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{overview.totalProcessed}</p>
                </div>
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-slate-200">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-500">В роботі</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{overview.totalInProgress}</p>
                </div>
                <Clock3 className="h-7 w-7 text-blue-500" />
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-slate-200">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-amber-500">Очікує</p>
                  <p className="mt-1 text-3xl font-black text-slate-900">{overview.totalPending}</p>
                </div>
                <FileSpreadsheet className="h-7 w-7 text-amber-500" />
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Динаміка реєстрації</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="Всього" stroke="#0f172a" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="application" name="Застосування" stroke="#e11d48" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="detention" name="Затримання" stroke="#a21caf" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'records' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Структура по типах</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Кількість" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Статуси виконання</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={105}>
                    {statusData.map((entry, index) => (
                      <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'executors' && (
        <Card className="rounded-3xl border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <Users className="h-4 w-4" /> Навантаження виконавців
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:hidden">
              {executorData.map((row) => {
                const progress = row.assigned ? Math.round((row.processed / row.assigned) * 100) : 0
                return (
                  <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Всього: {row.assigned}</p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{progress}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-emerald-50 px-2.5 py-2 text-emerald-700">Опрацьовано: {row.processed}</div>
                      <div className="rounded-xl bg-blue-50 px-2.5 py-2 text-blue-700">В роботі: {row.inProgress}</div>
                      <div className="rounded-xl bg-amber-50 px-2.5 py-2 text-amber-700">Очікує: {row.pending}</div>
                      <div className="rounded-xl bg-slate-100 px-2.5 py-2 text-slate-700">ЄО/Зв/Заст/Затр: {row.eo}/{row.zvern}/{row.application}/{row.detention}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-3 font-black">Виконавець</th>
                    <th className="px-3 py-3 text-center font-black">Всього</th>
                    <th className="px-3 py-3 text-center font-black">Опрацьовано</th>
                    <th className="px-3 py-3 text-center font-black">В роботі</th>
                    <th className="px-3 py-3 text-center font-black">Очікує</th>
                    <th className="px-3 py-3 text-center font-black">ЄО</th>
                    <th className="px-3 py-3 text-center font-black">Звернення</th>
                    <th className="px-3 py-3 text-center font-black">Застосування</th>
                    <th className="px-3 py-3 text-center font-black">Затримання</th>
                    <th className="px-3 py-3 text-right font-black">Прогрес</th>
                  </tr>
                </thead>
                <tbody>
                  {executorData.map((row) => {
                    const progress = row.assigned ? Math.round((row.processed / row.assigned) * 100) : 0
                    return (
                      <tr key={row.id} className="border-b border-slate-50">
                        <td className="px-3 py-4 font-bold text-slate-900">{row.name}</td>
                        <td className="px-3 py-4 text-center font-semibold">{row.assigned}</td>
                        <td className="px-3 py-4 text-center font-semibold text-emerald-600">{row.processed}</td>
                        <td className="px-3 py-4 text-center font-semibold text-blue-600">{row.inProgress}</td>
                        <td className="px-3 py-4 text-center font-semibold text-amber-600">{row.pending}</td>
                        <td className="px-3 py-4 text-center">{row.eo}</td>
                        <td className="px-3 py-4 text-center">{row.zvern}</td>
                        <td className="px-3 py-4 text-center">{row.application}</td>
                        <td className="px-3 py-4 text-center">{row.detention}</td>
                        <td className="px-3 py-4 text-right">
                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black">{progress}%</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'survey' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Показники опитування</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Всього анкет</p>
                  <p className="mt-1 text-2xl font-black">{survey.totalResponses}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Оцінено</p>
                  <p className="mt-1 text-2xl font-black">{survey.ratedResponses}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Середній бал</p>
                  <p className="mt-1 text-2xl font-black">{survey.averageRating.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Вирішено</p>
                  <p className="mt-1 text-2xl font-black">{survey.resolvedResponses}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Рівень вирішення</p>
                <p className="mt-1 text-3xl font-black text-emerald-600">{survey.resolutionRate.toFixed(1)}%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, survey.resolutionRate)}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                <BarChart3 className="h-4 w-4" /> Розподіл оцінок
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={survey.ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {survey.ratingDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
