import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type SearchResult = {
  id: string
  type: "unified-record" | "callback" | "officer" | "report"
  title: string
  subtitle: string
  href: string
  status?: string
}

type CallbackSearchRow = {
  id: string
  callDate: Date
  eoNumber: string
  applicantName: string
  applicantPhone: string
  status: string
  officers: Array<{
    firstName: string | null
    lastName: string | null
    badgeNumber: string
  }>
}

function safeText(value: string | null | undefined, fallback = "Не вказано") {
  const text = (value || "").trim()
  return text.length > 0 ? text : fallback
}

function shortDate(value: Date | string | null | undefined) {
  if (!value) return "Дата не вказана"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Дата не вказана"
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({
    where: { username: session.user.email },
    select: {
      id: true,
      role: true,
      permViewReports: true,
      permViewUnifiedRecords: true,
      permViewOfficerStats: true,
      permCreateOfficers: true,
      permEditOfficers: true,
    },
  })

  if (!currentUser) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const canViewReports = currentUser.role === "ADMIN" || currentUser.permViewReports
  const canViewUnified = currentUser.role === "ADMIN" || currentUser.permViewUnifiedRecords
  const canViewOfficers =
    currentUser.role === "ADMIN" ||
    currentUser.permViewOfficerStats ||
    currentUser.permCreateOfficers ||
    currentUser.permEditOfficers

  const [unifiedRecords, officers, reports, callbacksRaw] = await Promise.all([
    canViewUnified
      ? prisma.unifiedRecord.findMany({
          where: {
            OR: [
              { eoNumber: { contains: q } },
              { applicant: { contains: q } },
              { description: { contains: q } },
              { officerName: { contains: q } },
            ],
          },
          orderBy: { eoDate: "desc" },
          take: 8,
          select: {
            id: true,
            eoNumber: true,
            eoDate: true,
            applicant: true,
            recordType: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    canViewOfficers
      ? prisma.officer.findMany({
          where: {
            OR: [
              { lastName: { contains: q } },
              { firstName: { contains: q } },
              { badgeNumber: { contains: q } },
            ],
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          take: 8,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            badgeNumber: true,
            rank: true,
            department: true,
          },
        })
      : Promise.resolve([]),
    canViewReports
      ? prisma.response.findMany({
          where: {
            OR: [
              { patrolRef: { contains: q } },
              { districtOrCity: { contains: q } },
              { officerName: { contains: q } },
              { badgeNumber: { contains: q } },
              { comment: { contains: q } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            createdAt: true,
            districtOrCity: true,
            patrolRef: true,
            officerName: true,
            badgeNumber: true,
            status: true,
            rateOverall: true,
          },
        })
      : Promise.resolve([]),
    canViewReports
      ? prisma.callback.findMany({
          where: {
            OR: [
              { eoNumber: { contains: q } },
              { applicantName: { contains: q } },
              { applicantPhone: { contains: q } },
              {
                officers: {
                  some: {
                    OR: [
                      { firstName: { contains: q } },
                      { lastName: { contains: q } },
                      { badgeNumber: { contains: q } },
                    ],
                  },
                },
              },
            ],
          },
          orderBy: { callDate: "desc" },
          take: 8,
          select: {
            id: true,
            callDate: true,
            eoNumber: true,
            applicantName: true,
            applicantPhone: true,
            status: true,
            officers: {
              select: {
                firstName: true,
                lastName: true,
                badgeNumber: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ])

  const safeUnifiedRecords = unifiedRecords as Array<{
    id: string
    eoNumber: string
    eoDate: Date
    applicant: string | null
    recordType: string
    status: string
  }>

  const safeOfficers = officers as Array<{
    id: string
    firstName: string | null
    lastName: string | null
    badgeNumber: string
    rank: string | null
    department: string | null
  }>

  const safeReports = reports as Array<{
    id: string
    createdAt: Date
    districtOrCity: string | null
    patrolRef: string | null
    officerName: string | null
    badgeNumber: string | null
    status: string
    rateOverall: number | null
  }>

  const safeCallbacksRaw = callbacksRaw as CallbackSearchRow[]

  const callbackMatches: SearchResult[] = safeCallbacksRaw.map((row: CallbackSearchRow): SearchResult => ({
      id: row.id,
      type: "callback",
      title: `Callback до ЄО №${row.eoNumber}`,
      subtitle: `${safeText(row.applicantName)} · ${shortDate(row.callDate)}`,
      href: `/admin/callbacks?callbackId=${row.id}`,
      status: row.status,
    }))

  const recordResults: SearchResult[] = safeUnifiedRecords.map((row): SearchResult => ({
    id: row.id,
    type: "unified-record",
    title: `${row.recordType === "DETENTION_PROTOCOL" ? "Протокол" : "Запис"} №${row.eoNumber}`,
    subtitle: `${safeText(row.applicant)} · ${shortDate(row.eoDate)}`,
    href: `/admin/unified-record?recordId=${row.id}`,
    status: row.status,
  }))

  const officerResults: SearchResult[] = safeOfficers.map((row): SearchResult => ({
    id: row.id,
    type: "officer",
    title: `${safeText(row.lastName, "")} ${safeText(row.firstName, "")}`.trim() || `Жетон ${row.badgeNumber}`,
    subtitle: `Жетон ${row.badgeNumber}${row.rank ? ` · ${row.rank}` : ""}${row.department ? ` · ${row.department}` : ""}`,
    href: `/admin/officers/${row.id}`,
  }))

  const reportResults: SearchResult[] = safeReports.map((row): SearchResult => ({
    id: row.id,
    type: "report",
    title: `${safeText(row.districtOrCity)}${row.patrolRef ? ` · ${row.patrolRef}` : ""}`,
    subtitle: `${shortDate(row.createdAt)}${row.officerName ? ` · ${row.officerName}` : ""}${row.badgeNumber ? ` (${row.badgeNumber})` : ""}`,
    href: `/admin/reports/${row.id}`,
    status: row.status,
  }))

  const results = [...recordResults, ...callbackMatches, ...officerResults, ...reportResults].slice(0, 24)
  return NextResponse.json({ results })
}
