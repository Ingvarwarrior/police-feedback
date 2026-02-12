import { auth } from "@/auth"
import AnalyticsClient from "./AnalyticsClient"
import { prisma } from "@/lib/prisma"
import { endOfDay, format, startOfDay, subDays } from "date-fns"
import { Shield } from "lucide-react"

type SearchParams = {
  period?: string
  from?: string
  to?: string
}

type UnifiedRecordRow = {
  eoNumber: string
  eoDate: Date
  createdAt: Date
  recordType: string | null
  status: string | null
  assignedUserId: string | null
  assignedUser: { firstName: string | null; lastName: string | null } | null
}

function getTypeLabel(type: string) {
  if (type === "EO") return "ЄО"
  if (type === "ZVERN") return "Звернення"
  if (type === "APPLICATION") return "Застосування"
  if (type === "DETENTION_PROTOCOL") return "Протоколи затримання"
  return "Інше"
}

function getStatusLabel(status: string) {
  if (status === "PROCESSED") return "Опрацьовано"
  if (status === "IN_PROGRESS") return "В роботі"
  if (status === "PENDING") return "Очікує"
  return "Інше"
}

function normalizeRecordType(recordType?: string | null, eoNumber?: string | null) {
  const raw = (recordType || "").trim().toUpperCase()
  if (raw === "EO" || raw === "ZVERN" || raw === "APPLICATION" || raw === "DETENTION_PROTOCOL") {
    return raw
  }

  const number = (eoNumber || "").trim().toUpperCase()
  if (number.startsWith("APP-")) return "APPLICATION"
  if (number.startsWith("DET-") || number.startsWith("DTP-")) return "DETENTION_PROTOCOL"
  if (number.startsWith("ZV-") || number.startsWith("ZVERN-")) return "ZVERN"
  if (number.length > 0) return "EO"
  return "OTHER"
}

export default async function AnalyticsPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams
  const session = await auth()
  const userPerms = session?.user as any

  if (userPerms?.role !== "ADMIN" && !userPerms?.permViewAnalytics) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-red-50 p-4 text-red-500">
          <Shield className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">Доступ обмежено</h1>
        <p className="max-w-xs text-center text-slate-500">
          У вас немає прав для перегляду аналітичного центру. Зверніться до адміністратора.
        </p>
      </div>
    )
  }

  const fromParam = searchParams.from
  const toParam = searchParams.to

  let startDate: Date
  let endDate: Date

  if (fromParam) {
    startDate = startOfDay(new Date(fromParam))
    endDate = toParam ? endOfDay(new Date(toParam)) : endOfDay(new Date())
  } else {
    const days = parseInt(searchParams.period || "30", 10) || 30
    startDate = startOfDay(subDays(new Date(), days))
    endDate = endOfDay(new Date())
  }

  const [responses, unifiedRecords] = await Promise.all([
    prisma.response.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true, rateOverall: true, status: true },
    }),
    (prisma as any).unifiedRecord.findMany({
      where: {
        OR: [
          { eoDate: { gte: startDate, lte: endDate } },
          { createdAt: { gte: startDate, lte: endDate } },
        ],
      },
      select: {
        eoNumber: true,
        eoDate: true,
        createdAt: true,
        recordType: true,
        status: true,
        assignedUserId: true,
        assignedUser: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
  ])

  const records = unifiedRecords as UnifiedRecordRow[]

  const dayMap: Record<
    string,
    { date: string; total: number; eo: number; zvern: number; application: number; detention: number }
  > = {}
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  for (let i = 0; i <= totalDays; i++) {
    const day = subDays(endDate, i)
    const key = format(day, "dd.MM")
    dayMap[key] = { date: key, total: 0, eo: 0, zvern: 0, application: 0, detention: 0 }
  }

  const typeMap: Record<string, number> = {
    EO: 0,
    ZVERN: 0,
    APPLICATION: 0,
    DETENTION_PROTOCOL: 0,
    OTHER: 0,
  }

  const statusMap: Record<string, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    PROCESSED: 0,
    OTHER: 0,
  }

  const executorMap: Record<
    string,
    {
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
    }
  > = {}

  for (const row of records) {
    const type = normalizeRecordType(row.recordType, row.eoNumber)
    const status = row.status && ["PENDING", "IN_PROGRESS", "PROCESSED"].includes(row.status) ? row.status : "OTHER"
    const effectiveDate = row.eoDate || row.createdAt
    const dateKey = format(new Date(effectiveDate), "dd.MM")

    typeMap[type] = (typeMap[type] || 0) + 1
    statusMap[status] = (statusMap[status] || 0) + 1

    if (dayMap[dateKey]) {
      dayMap[dateKey].total += 1
      if (type === "EO") dayMap[dateKey].eo += 1
      if (type === "ZVERN") dayMap[dateKey].zvern += 1
      if (type === "APPLICATION") dayMap[dateKey].application += 1
      if (type === "DETENTION_PROTOCOL") dayMap[dateKey].detention += 1
    }

    const executorId = row.assignedUserId || "unassigned"
    if (!executorMap[executorId]) {
      const firstName = row.assignedUser?.firstName || ""
      const lastName = row.assignedUser?.lastName || ""
      executorMap[executorId] = {
        id: executorId,
        name: executorId === "unassigned" ? "Не призначено" : `${lastName} ${firstName}`.trim(),
        assigned: 0,
        processed: 0,
        pending: 0,
        inProgress: 0,
        eo: 0,
        zvern: 0,
        application: 0,
        detention: 0,
      }
    }

    executorMap[executorId].assigned += 1
    if (status === "PROCESSED") executorMap[executorId].processed += 1
    if (status === "PENDING") executorMap[executorId].pending += 1
    if (status === "IN_PROGRESS") executorMap[executorId].inProgress += 1

    if (type === "EO") executorMap[executorId].eo += 1
    if (type === "ZVERN") executorMap[executorId].zvern += 1
    if (type === "APPLICATION") executorMap[executorId].application += 1
    if (type === "DETENTION_PROTOCOL") executorMap[executorId].detention += 1
  }

  const trendData = Object.values(dayMap).reverse()

  const typeData = Object.entries(typeMap).map(([key, value]) => ({
    key,
    name: key === "OTHER" ? "Інше" : getTypeLabel(key),
    value,
  }))

  const statusData = Object.entries(statusMap).map(([key, value]) => ({
    key,
    name: key === "OTHER" ? "Інше" : getStatusLabel(key),
    value,
  }))

  const executorData = Object.values(executorMap).sort((a, b) => b.assigned - a.assigned)

  const rated = responses.filter((r: any) => typeof r.rateOverall === "number" && r.rateOverall > 0)
  const averageRating = rated.length
    ? rated.reduce((sum: number, row: any) => sum + (row.rateOverall || 0), 0) / rated.length
    : 0

  const surveyStatusDone = responses.filter((r: any) => r.status === "RESOLVED").length
  const surveyResolutionRate = responses.length ? (surveyStatusDone / responses.length) * 100 : 0

  const ratingDistribution = [1, 2, 3, 4, 5].map((score) => ({
    name: `${score} ★`,
    value: rated.filter((r: any) => Math.round(r.rateOverall || 0) === score).length,
  }))

  const displayPeriod = fromParam && toParam
    ? `${new Date(fromParam).toLocaleDateString("uk-UA")} - ${new Date(toParam).toLocaleDateString("uk-UA")}`
    : `останні ${searchParams.period || "30"} днів`

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tight text-slate-900">Аналітика</h1>
        <p className="font-medium text-slate-500">Новий модуль статистики за {displayPeriod}</p>
      </div>

      <AnalyticsClient
        startDate={(fromParam || startDate.toISOString().split("T")[0]) as string}
        endDate={(toParam || endDate.toISOString().split("T")[0]) as string}
        overview={{
          totalRecords: records.length,
          totalProcessed: statusMap.PROCESSED || 0,
          totalInProgress: statusMap.IN_PROGRESS || 0,
          totalPending: statusMap.PENDING || 0,
        }}
        trendData={trendData}
        typeData={typeData}
        statusData={statusData}
        executorData={executorData}
        survey={{
          totalResponses: responses.length,
          ratedResponses: rated.length,
          averageRating,
          resolvedResponses: surveyStatusDone,
          resolutionRate: surveyResolutionRate,
          ratingDistribution,
        }}
      />
    </div>
  )
}
