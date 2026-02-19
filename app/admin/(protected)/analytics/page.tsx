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
  id: string
  eoNumber: string
  eoDate: Date
  createdAt: Date
  recordType: string | null
  status: string | null
  assignedUserId: string | null
  assignedUser: { firstName: string | null; lastName: string | null } | null
  officers: Array<{
    id: string
    firstName: string
    lastName: string
    badgeNumber: string
  }>
  investigationStage: string | null
  investigationViolation: string | null
  investigationFinalResult: string | null
  investigationPenaltyType: string | null
  investigationPenaltyOther: string | null
  investigationPenaltyItems: string | null
  investigationPenaltyOfficerId: string | null
  investigationConclusionApprovedAt: Date | null
  investigationPenaltyByArticle13: boolean | null
  investigationPenaltyOrderNumber: string | null
  investigationPenaltyOrderDate: Date | null
}

type OfficerRow = {
  id: string
  firstName: string
  lastName: string
  badgeNumber: string
}

type ResponseOfficerLinkRow = {
  officerId: string | null
  taggedOfficers: Array<{ id: string }>
}

type OfficerEvaluationRow = {
  officerId: string
}

type ServicePenaltyDecisionType = "ARTICLE_13" | "ARTICLE_19_PART_11" | "ARTICLE_19_PART_13"

type ServicePenaltyItem = {
  officerId: string
  decisionType: ServicePenaltyDecisionType
  penaltyType: string | null
  penaltyOther: string | null
}

type ServiceExecutorRow = {
  id: string
  name: string
  total: number
  review: number
  initiated: number
  orderAssigned: number
  completedLawful: number
  completedUnlawful: number
  noViolation: number
}

type PenaltyReportRow = {
  recordId: string
  eoNumber: string
  eoDate: Date
  violation: string
  officerId: string
  officerName: string
  officerBadge: string
  decisionType: ServicePenaltyDecisionType
  decisionLabel: string
  penaltyLabel: string
  conclusionApprovedAt: Date | null
  penaltyOrderNumber: string | null
  penaltyOrderDate: Date | null
  executorName: string
}

function getTypeLabel(type: string) {
  if (type === "EO") return "ЄО"
  if (type === "ZVERN") return "Звернення"
  if (type === "APPLICATION") return "Застосування"
  if (type === "DETENTION_PROTOCOL") return "Протоколи затримання"
  if (type === "SERVICE_INVESTIGATION") return "Службові розслідування"
  return "Інше"
}

function getStatusLabel(status: string) {
  if (status === "PROCESSED") return "Опрацьовано"
  if (status === "APPROVAL") return "На погодженні"
  if (status === "REVIEW") return "На перевірці"
  if (status === "IN_PROGRESS") return "В роботі"
  if (status === "PENDING") return "Очікує"
  return "Інше"
}

function normalizeRecordType(recordType?: string | null, eoNumber?: string | null) {
  const raw = (recordType || "").trim().toUpperCase()
  if (raw === "EO" || raw === "ZVERN" || raw === "APPLICATION" || raw === "DETENTION_PROTOCOL" || raw === "SERVICE_INVESTIGATION") {
    return raw
  }

  const number = (eoNumber || "").trim().toUpperCase()
  if (number.startsWith("APP-")) return "APPLICATION"
  if (number.startsWith("DET-") || number.startsWith("DTP-")) return "DETENTION_PROTOCOL"
  if (number.startsWith("ZV-") || number.startsWith("ZVERN-")) return "ZVERN"
  if (number.length > 0) return "EO"
  return "OTHER"
}

function normalizeServiceStage(stage?: string | null) {
  const raw = String(stage || "").trim().toUpperCase()
  if (
    raw === "REPORT_REVIEW" ||
    raw === "SR_INITIATED" ||
    raw === "SR_ORDER_ASSIGNED" ||
    raw === "SR_COMPLETED_LAWFUL" ||
    raw === "SR_COMPLETED_UNLAWFUL" ||
    raw === "CHECK_COMPLETED_NO_VIOLATION"
  ) {
    return raw
  }
  return "OTHER"
}

function getServiceStageLabel(stage: string) {
  if (stage === "REPORT_REVIEW") return "Розгляд рапорту/доповідної"
  if (stage === "SR_INITIATED") return "Ініційовано СР"
  if (stage === "SR_ORDER_ASSIGNED") return "Призначено СР (наказ)"
  if (stage === "SR_COMPLETED_LAWFUL") return "СР завершено: дії правомірні"
  if (stage === "SR_COMPLETED_UNLAWFUL") return "СР завершено: дії неправомірні"
  if (stage === "CHECK_COMPLETED_NO_VIOLATION") return "Перевірку завершено: порушень не виявлено"
  return "Інше"
}

function getDecisionTypeLabel(decisionType: ServicePenaltyDecisionType) {
  if (decisionType === "ARTICLE_13") return "ст. 13 Дисциплінарного статуту НПУ"
  if (decisionType === "ARTICLE_19_PART_11") return "ч. 11 ст. 19 Дисциплінарного статуту НПУ"
  return "ч. 13 ст. 19 Дисциплінарного статуту НПУ"
}

function resolvePenaltyDecisionType(
  decisionRaw: string,
  penaltyType: string,
  penaltyByArticle13: boolean | null | undefined
): ServicePenaltyDecisionType {
  if (decisionRaw === "ARTICLE_19_PART_11") return "ARTICLE_19_PART_11"
  if (decisionRaw === "ARTICLE_19_PART_13") return "ARTICLE_19_PART_13"
  if (decisionRaw === "ARTICLE_13") return "ARTICLE_13"
  if (penaltyByArticle13 === true) return "ARTICLE_13"
  if (penaltyByArticle13 === false) {
    return penaltyType.includes("обмеж")
      ? "ARTICLE_19_PART_13"
      : "ARTICLE_19_PART_11"
  }
  if (penaltyType.includes("обмеж")) return "ARTICLE_19_PART_13"
  if (penaltyType.includes("попереджено про необхідність")) return "ARTICLE_19_PART_11"
  return "ARTICLE_13"
}

function parseServicePenaltyItems(
  raw: unknown,
  fallback: {
    officerId?: string | null
    penaltyType?: string | null
    penaltyOther?: string | null
    penaltyByArticle13?: boolean | null
  }
): ServicePenaltyItem[] {
  let parsedRaw: unknown = raw
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      parsedRaw = JSON.parse(raw)
    } catch {
      parsedRaw = null
    }
  }

  if (Array.isArray(parsedRaw)) {
    const parsedItems = parsedRaw
      .map((item: any) => {
        const officerId = String(item?.officerId || "").trim()
        const penaltyTypeRaw = String(item?.penaltyType || "").trim()
        const penaltyTypeLower = penaltyTypeRaw.toLowerCase()
        const decisionRaw = String(item?.decisionType || "").trim().toUpperCase()
        const penaltyOtherRaw = typeof item?.penaltyOther === "string" ? item.penaltyOther.trim() : ""
        const decisionType = resolvePenaltyDecisionType(decisionRaw, penaltyTypeLower, fallback.penaltyByArticle13)
        return {
          officerId,
          decisionType,
          penaltyType: penaltyTypeRaw || null,
          penaltyOther: penaltyOtherRaw || null,
        }
      })
      .filter((item) => item.officerId.length > 0)

    if (parsedItems.length > 0) return parsedItems
  }

  const fallbackOfficerId = String(fallback.officerId || "").trim()
  const fallbackPenaltyTypeRaw = String(fallback.penaltyType || "").trim()
  if (!fallbackOfficerId || !fallbackPenaltyTypeRaw) return []

  const fallbackPenaltyTypeLower = fallbackPenaltyTypeRaw.toLowerCase()
  return [
    {
      officerId: fallbackOfficerId,
      decisionType: resolvePenaltyDecisionType("", fallbackPenaltyTypeLower, fallback.penaltyByArticle13),
      penaltyType: fallbackPenaltyTypeRaw,
      penaltyOther: String(fallback.penaltyOther || "").trim() || null,
    },
  ]
}

function getPenaltyLabel(item: ServicePenaltyItem) {
  if (item.decisionType === "ARTICLE_19_PART_11") {
    return "Попереджено про необхідність дотримання службової дисципліни"
  }
  if (item.decisionType === "ARTICLE_19_PART_13") {
    return "Обмеженося раніше застосованим дисциплінарним стягненням"
  }
  const type = String(item.penaltyType || "").trim()
  if (!type) return "—"
  if (type.toLowerCase() === "інший варіант") {
    return String(item.penaltyOther || "").trim() || type
  }
  return type
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

  const [responses, unifiedRecords, allOfficers, responseOfficerLinks, officerEvaluations] = await Promise.all([
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
        id: true,
        eoNumber: true,
        eoDate: true,
        createdAt: true,
        recordType: true,
        status: true,
        investigationStage: true,
        investigationViolation: true,
        investigationFinalResult: true,
        investigationPenaltyType: true,
        investigationPenaltyOther: true,
        investigationPenaltyItems: true,
        investigationPenaltyOfficerId: true,
        investigationConclusionApprovedAt: true,
        investigationPenaltyByArticle13: true,
        investigationPenaltyOrderNumber: true,
        investigationPenaltyOrderDate: true,
        assignedUserId: true,
        assignedUser: {
          select: { firstName: true, lastName: true },
        },
        officers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            badgeNumber: true,
          },
        },
      },
    }),
    prisma.officer.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        badgeNumber: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.response.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: {
        officerId: true,
        taggedOfficers: {
          select: { id: true },
        },
      },
    }),
    prisma.officerEvaluation.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { officerId: true },
    }),
  ])

  const records = unifiedRecords as UnifiedRecordRow[]
  const officers = allOfficers as OfficerRow[]
  const responseLinks = responseOfficerLinks as ResponseOfficerLinkRow[]
  const evaluations = officerEvaluations as OfficerEvaluationRow[]

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
    SERVICE_INVESTIGATION: 0,
    OTHER: 0,
  }

  const statusMap: Record<string, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    REVIEW: 0,
    PROCESSED: 0,
    OTHER: 0,
  }

  const serviceStageMap: Record<string, number> = {
    REPORT_REVIEW: 0,
    SR_INITIATED: 0,
    SR_ORDER_ASSIGNED: 0,
    SR_COMPLETED_LAWFUL: 0,
    SR_COMPLETED_UNLAWFUL: 0,
    CHECK_COMPLETED_NO_VIOLATION: 0,
    OTHER: 0,
  }

  let totalInProgressBusiness = 0
  let totalPendingBusiness = 0

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
      serviceInvestigation: number
    }
  > = {}

  const serviceExecutorMap: Record<string, ServiceExecutorRow> = {}

  const penaltyRows: PenaltyReportRow[] = []

  const staffMap: Record<
    string,
    {
      id: string
      name: string
      badgeNumber: string
      complaints: number
      detentions: number
      eo: number
      zvern: number
      application: number
      detention: number
      feedback: number
      evaluations: number
      total: number
    }
  > = {}

  const officerDirectory = new Map<string, { name: string; badgeNumber: string }>()

  for (const officer of officers) {
    officerDirectory.set(officer.id, {
      name: `${officer.lastName || ""} ${officer.firstName || ""}`.trim(),
      badgeNumber: officer.badgeNumber || "",
    })
    staffMap[officer.id] = {
      id: officer.id,
      name: `${officer.lastName} ${officer.firstName}`.trim(),
      badgeNumber: officer.badgeNumber,
      complaints: 0,
      detentions: 0,
      eo: 0,
      zvern: 0,
      application: 0,
      detention: 0,
      feedback: 0,
      evaluations: 0,
      total: 0,
    }
  }

  for (const row of records) {
    const type = normalizeRecordType(row.recordType, row.eoNumber)
    const status = row.status && ["PENDING", "IN_PROGRESS", "REVIEW", "PROCESSED"].includes(row.status) ? row.status : "OTHER"
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
        serviceInvestigation: 0,
      }
    }

    if (!serviceExecutorMap[executorId]) {
      const firstName = row.assignedUser?.firstName || ""
      const lastName = row.assignedUser?.lastName || ""
      serviceExecutorMap[executorId] = {
        id: executorId,
        name: executorId === "unassigned" ? "Не призначено" : `${lastName} ${firstName}`.trim(),
        total: 0,
        review: 0,
        initiated: 0,
        orderAssigned: 0,
        completedLawful: 0,
        completedUnlawful: 0,
        noViolation: 0,
      }
    }

    executorMap[executorId].assigned += 1
    const isDone = status === "PROCESSED"
    const isAssigned = executorId !== "unassigned"
    const isInProgressBusiness =
      status === "IN_PROGRESS" ||
      status === "REVIEW" ||
      (status === "PENDING" && isAssigned)
    const isPendingBusiness = status === "PENDING" && !isAssigned

    if (isDone) executorMap[executorId].processed += 1
    if (isInProgressBusiness) executorMap[executorId].inProgress += 1
    if (isPendingBusiness) executorMap[executorId].pending += 1

    if (isInProgressBusiness) totalInProgressBusiness += 1
    if (isPendingBusiness) totalPendingBusiness += 1

    if (type === "EO") executorMap[executorId].eo += 1
    if (type === "ZVERN") executorMap[executorId].zvern += 1
    if (type === "APPLICATION") executorMap[executorId].application += 1
    if (type === "DETENTION_PROTOCOL") executorMap[executorId].detention += 1
    if (type === "SERVICE_INVESTIGATION") executorMap[executorId].serviceInvestigation += 1

    if (type === "SERVICE_INVESTIGATION") {
      const stage = normalizeServiceStage(row.investigationStage)
      serviceStageMap[stage] = (serviceStageMap[stage] || 0) + 1

      serviceExecutorMap[executorId].total += 1
      if (stage === "REPORT_REVIEW") serviceExecutorMap[executorId].review += 1
      if (stage === "SR_INITIATED") serviceExecutorMap[executorId].initiated += 1
      if (stage === "SR_ORDER_ASSIGNED") serviceExecutorMap[executorId].orderAssigned += 1
      if (stage === "SR_COMPLETED_LAWFUL") serviceExecutorMap[executorId].completedLawful += 1
      if (stage === "SR_COMPLETED_UNLAWFUL") serviceExecutorMap[executorId].completedUnlawful += 1
      if (stage === "CHECK_COMPLETED_NO_VIOLATION") serviceExecutorMap[executorId].noViolation += 1

      const resolvedPenalties = parseServicePenaltyItems(row.investigationPenaltyItems, {
        officerId: row.investigationPenaltyOfficerId,
        penaltyType: row.investigationPenaltyType,
        penaltyOther: row.investigationPenaltyOther,
        penaltyByArticle13: row.investigationPenaltyByArticle13,
      })

      for (const item of resolvedPenalties) {
        const officerInfo = officerDirectory.get(item.officerId)
        penaltyRows.push({
          recordId: row.id,
          eoNumber: row.eoNumber,
          eoDate: row.eoDate,
          violation: String(row.investigationViolation || "").trim() || "—",
          officerId: item.officerId,
          officerName: officerInfo?.name || item.officerId,
          officerBadge: officerInfo?.badgeNumber || "",
          decisionType: item.decisionType,
          decisionLabel: getDecisionTypeLabel(item.decisionType),
          penaltyLabel: getPenaltyLabel(item),
          conclusionApprovedAt: row.investigationConclusionApprovedAt,
          penaltyOrderNumber: row.investigationPenaltyOrderNumber,
          penaltyOrderDate: row.investigationPenaltyOrderDate,
          executorName: serviceExecutorMap[executorId].name,
        })
      }
    }

    for (const officer of row.officers || []) {
      if (!staffMap[officer.id]) {
        staffMap[officer.id] = {
          id: officer.id,
          name: `${officer.lastName || ""} ${officer.firstName || ""}`.trim() || `#${officer.badgeNumber}`,
          badgeNumber: officer.badgeNumber || "",
          complaints: 0,
          detentions: 0,
          eo: 0,
          zvern: 0,
          application: 0,
          detention: 0,
          feedback: 0,
          evaluations: 0,
          total: 0,
        }
      }

      staffMap[officer.id].total += 1
      if (type === "EO") {
        staffMap[officer.id].eo += 1
        staffMap[officer.id].complaints += 1
      }
      if (type === "ZVERN") {
        staffMap[officer.id].zvern += 1
        staffMap[officer.id].complaints += 1
      }
      if (type === "APPLICATION") {
        staffMap[officer.id].application += 1
        staffMap[officer.id].detentions += 1
      }
      if (type === "DETENTION_PROTOCOL") {
        staffMap[officer.id].detention += 1
        staffMap[officer.id].detentions += 1
      }
    }
  }

  for (const row of responseLinks) {
    const linkedOfficerIds = new Set<string>()
    if (row.officerId) linkedOfficerIds.add(row.officerId)
    for (const tagged of row.taggedOfficers || []) {
      if (tagged?.id) linkedOfficerIds.add(tagged.id)
    }

    for (const officerId of linkedOfficerIds) {
      if (!staffMap[officerId]) {
        staffMap[officerId] = {
          id: officerId,
          name: `ID ${officerId}`,
          badgeNumber: "",
          complaints: 0,
          detentions: 0,
          eo: 0,
          zvern: 0,
          application: 0,
          detention: 0,
          feedback: 0,
          evaluations: 0,
          total: 0,
        }
      }
      staffMap[officerId].feedback += 1
    }
  }

  for (const row of evaluations) {
    const officerId = row.officerId
    if (!staffMap[officerId]) {
      staffMap[officerId] = {
        id: officerId,
        name: `ID ${officerId}`,
        badgeNumber: "",
        complaints: 0,
        detentions: 0,
        eo: 0,
        zvern: 0,
        application: 0,
        detention: 0,
        feedback: 0,
        evaluations: 0,
        total: 0,
      }
    }
    staffMap[officerId].evaluations += 1
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
  const serviceStageOrder = [
    "REPORT_REVIEW",
    "SR_INITIATED",
    "SR_ORDER_ASSIGNED",
    "SR_COMPLETED_LAWFUL",
    "SR_COMPLETED_UNLAWFUL",
    "CHECK_COMPLETED_NO_VIOLATION",
    "OTHER",
  ]
  const serviceStageData = serviceStageOrder.map((key) => ({
    key,
    name: getServiceStageLabel(key),
    value: serviceStageMap[key] || 0,
  }))
  const serviceExecutorData = Object.values(serviceExecutorMap)
    .filter((row) => row.total > 0)
    .sort((a, b) => {
      const byTotal = b.total - a.total
      if (byTotal !== 0) return byTotal
      return a.name.localeCompare(b.name, "uk")
    })

  const serviceOverview = {
    total: typeMap.SERVICE_INVESTIGATION || 0,
    review: serviceStageMap.REPORT_REVIEW || 0,
    initiated: serviceStageMap.SR_INITIATED || 0,
    orderAssigned: serviceStageMap.SR_ORDER_ASSIGNED || 0,
    completedLawful: serviceStageMap.SR_COMPLETED_LAWFUL || 0,
    completedUnlawful: serviceStageMap.SR_COMPLETED_UNLAWFUL || 0,
    noViolation: serviceStageMap.CHECK_COMPLETED_NO_VIOLATION || 0,
  }

  const penalties = [...penaltyRows].sort((a, b) => {
    const byDate = new Date(b.eoDate).getTime() - new Date(a.eoDate).getTime()
    if (byDate !== 0) return byDate
    return b.eoNumber.localeCompare(a.eoNumber, "uk")
  })

  const penaltiesSummary = {
    totalPenalties: penalties.length,
    recordsWithPenalties: new Set(penalties.map((item) => item.recordId)).size,
    officersAffected: new Set(penalties.map((item) => item.officerId)).size,
    article13: penalties.filter((item) => item.decisionType === "ARTICLE_13").length,
    article19Part11: penalties.filter((item) => item.decisionType === "ARTICLE_19_PART_11").length,
    article19Part13: penalties.filter((item) => item.decisionType === "ARTICLE_19_PART_13").length,
  }
  const penaltyReportRows = penalties.map((row) => ({
    ...row,
    eoDate: new Date(row.eoDate).toISOString(),
    conclusionApprovedAt: row.conclusionApprovedAt ? new Date(row.conclusionApprovedAt).toISOString() : null,
    penaltyOrderDate: row.penaltyOrderDate ? new Date(row.penaltyOrderDate).toISOString() : null,
  }))

  const staffData = Object.values(staffMap)
    .map((row) => ({
      ...row,
      total: row.complaints + row.detentions + row.feedback + row.evaluations,
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => {
      const byActivity = b.total - a.total
      if (byActivity !== 0) return byActivity
      return a.name.localeCompare(b.name, "uk")
    })

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
          totalInProgress: totalInProgressBusiness,
          totalPending: totalPendingBusiness,
        }}
        trendData={trendData}
        typeData={typeData}
        statusData={statusData}
        executorData={executorData}
        staffData={staffData}
        service={{
          overview: serviceOverview,
          stageData: serviceStageData,
          executorData: serviceExecutorData,
        }}
        penalties={{
          summary: penaltiesSummary,
          rows: penaltyReportRows,
        }}
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
