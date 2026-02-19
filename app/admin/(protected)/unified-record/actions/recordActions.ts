'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import * as XLSX from 'xlsx'
import { z } from "zod"
import { sendUnifiedAssignmentEmail, sendUnifiedRecordReminderEmail } from "@/lib/mail"
import { normalizeEoNumber, normalizePersonName } from "@/lib/normalization"
import { createAdminNotification } from "@/lib/admin-notification-service"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")
const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_TERM_DAYS = 15

const UnifiedRecordSchema = z.object({
    id: z.string().optional(),
    eoNumber: z.string().min(1, "Номер обов'язковий"),
    eoDate: z.date(),
    district: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    applicant: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    recordType: z.enum(["EO", "ZVERN", "APPLICATION", "DETENTION_PROTOCOL", "SERVICE_INVESTIGATION"]).default("EO"),
    officerName: z.string().optional().nullable(),
    assignedUserId: z.string().optional().nullable(),
    status: z.string().optional().default("PENDING"),
    deadline: z.date().optional().nullable(),
    processedAt: z.date().optional().nullable(),
    extensionStatus: z.string().optional().nullable(),
    extensionReason: z.string().optional().nullable(),
    extensionDeadline: z.date().optional().nullable(),
    resolution: z.string().optional().nullable(),
    resolutionDate: z.date().optional().nullable(),
    officerIds: z.array(z.string()).default([]),
    concernsBpp: z.boolean().default(true),
    investigationDocType: z.string().optional().nullable(),
    investigationTargetType: z.string().optional().nullable(),
    investigationTargetText: z.string().optional().nullable(),
    investigationViolation: z.string().optional().nullable(),
    investigationStage: z.string().optional().nullable(),
    investigationReviewResult: z.string().optional().nullable(),
    investigationReviewAt: z.date().optional().nullable(),
    investigationInitiatedAt: z.date().optional().nullable(),
    investigationOrderNumber: z.string().optional().nullable(),
    investigationOrderDate: z.date().optional().nullable(),
    investigationOrderAssignedAt: z.date().optional().nullable(),
    investigationFinalResult: z.string().optional().nullable(),
    investigationCompletedAt: z.date().optional().nullable(),
    investigationPenaltyType: z.string().optional().nullable(),
    investigationPenaltyOther: z.string().optional().nullable(),
    investigationPenaltyOfficerId: z.string().optional().nullable(),
    investigationPenaltyItems: z.string().optional().nullable(),
    investigationConclusionApprovedAt: z.date().optional().nullable(),
    investigationPenaltyByArticle13: z.boolean().optional().nullable(),
    investigationPenaltyOrderNumber: z.string().optional().nullable(),
    investigationPenaltyOrderDate: z.date().optional().nullable(),
})

async function generateNextApplicationNumber() {
    const year = new Date().getFullYear()
    const prefix = `APP-${year}-`

    const existing = await prisma.unifiedRecord.findMany({
        where: {
            recordType: "APPLICATION",
            eoNumber: { startsWith: prefix }
        },
        select: { eoNumber: true }
    })

    let maxSeq = 0
    for (const item of existing) {
        const seqPart = item.eoNumber.slice(prefix.length)
        const seq = Number.parseInt(seqPart, 10)
        if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq
    }

    return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`
}

function calculateInclusiveDeadline(startDate: Date, termDays: number = DEFAULT_TERM_DAYS) {
    const safeDays = Number.isFinite(termDays) ? Math.max(1, Math.floor(termDays)) : DEFAULT_TERM_DAYS
    const offsetDays = safeDays - 1
    return new Date(startDate.getTime() + offsetDays * DAY_MS)
}

export async function processUnifiedRecordAction(id: string, resolution: string, officerIds?: string[], concernsBpp: boolean = true): Promise<{ success?: boolean, error?: string, status?: string }> {
    const session = await auth()
    if (!session?.user?.email) return { error: "Unauthorized" }

    console.log(`Processing unified record ${id}: resolution="${resolution}", officers=${officerIds}, concernsBpp=${concernsBpp}`)

    try {
        const currentRecord = await prisma.unifiedRecord.findUnique({
            where: { id },
            select: { recordType: true, status: true }
        })

        if (!currentRecord) {
            return { error: "Запис не знайдено" }
        }

        if (currentRecord.recordType === "SERVICE_INVESTIGATION") {
            return { error: "Для службових розслідувань використовуйте окремий workflow опрацювання" }
        }

        const nextStatus = currentRecord.status === "PROCESSED" ? "PROCESSED" : "APPROVAL"
        const nextProcessedAt = nextStatus === "PROCESSED" ? new Date() : null

        await prisma.unifiedRecord.update({
            where: { id },
            data: {
                resolution,
                resolutionDate: new Date(),
                status: nextStatus,
                processedAt: nextProcessedAt,
                concernsBpp,
                officers: officerIds && officerIds.length > 0 ? {
                    set: officerIds.map(oid => ({ id: oid }))
                } : { set: [] }
            }
        })

        revalidatePath('/admin/unified-record')
        return { success: true, status: nextStatus }
    } catch (error: any) {
        console.error("Error processing unified record:", error)
        return { error: error.message || "Failed to process record" }
    }
}

export async function approveUnifiedRecordAction(id: string): Promise<{ success?: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user?.email) return { error: "Unauthorized" }

    try {
        const user = await prisma.user.findUnique({
            where: { username: session.user.email },
            select: { role: true, permReturnUnifiedRecords: true }
        })

        if (user?.role !== "ADMIN" && !user?.permReturnUnifiedRecords) {
            return { error: "У вас немає прав для погодження списання" }
        }

        const record = await prisma.unifiedRecord.findUnique({
            where: { id },
            select: { id: true, status: true, recordType: true }
        })

        if (!record) return { error: "Запис не знайдено" }
        if (record.recordType === "SERVICE_INVESTIGATION") {
            return { error: "Службові розслідування мають окремий workflow опрацювання" }
        }
        if (record.status !== "APPROVAL") {
            return { error: "Запис не перебуває на погодженні" }
        }

        await prisma.unifiedRecord.update({
            where: { id },
            data: {
                status: "PROCESSED",
                processedAt: new Date(),
            }
        })

        revalidatePath('/admin/unified-record')
        return { success: true }
    } catch (error: any) {
        console.error("Error approving unified record:", error)
        return { error: error.message || "Не вдалося погодити списання" }
    }
}

const ServiceInvestigationProcessSchema = z.object({
    id: z.string().min(1),
    action: z.enum([
        "CLOSE_NO_VIOLATION",
        "INITIATE_SR",
        "SET_ORDER",
        "COMPLETE_LAWFUL",
        "COMPLETE_UNLAWFUL",
    ]),
    orderNumber: z.string().optional(),
    orderDate: z.string().optional(),
    penaltyType: z.string().optional(),
    penaltyOther: z.string().optional(),
    penaltyOfficerId: z.string().optional(),
    penalties: z.array(z.object({
        officerId: z.string().min(1),
        decisionType: z.enum(["ARTICLE_13", "ARTICLE_19_PART_11", "ARTICLE_19_PART_13"]),
        penaltyType: z.string().optional(),
        penaltyOther: z.string().optional(),
    })).optional(),
    officerIds: z.array(z.string()).optional(),
    conclusionApprovedDate: z.string().optional(),
    penaltyByArticle13: z.boolean().optional(),
    penaltyOrderNumber: z.string().optional(),
    penaltyOrderDate: z.string().optional(),
})

type ServiceDecisionType = "ARTICLE_13" | "ARTICLE_19_PART_11" | "ARTICLE_19_PART_13"

const PART_11_MEASURE = "попереджено про необхідність дотримання службової дисципліни"
const PART_13_MEASURE = "обмеженося раніше застосованим дисциплінарним стягненням"

const SERVICE_DECISION_TYPE_LABELS: Record<ServiceDecisionType, string> = {
    ARTICLE_13: "ст. 13 Дисциплінарного статуту НПУ",
    ARTICLE_19_PART_11: "ч. 11 ст. 19 Дисциплінарного статуту НПУ",
    ARTICLE_19_PART_13: "ч. 13 ст. 19 Дисциплінарного статуту НПУ",
}

type ServicePenaltyInput = {
    officerId: string
    decisionType?: ServiceDecisionType
    penaltyType?: string
    penaltyOther?: string
}

type ServicePenaltyNormalized = {
    officerId: string
    decisionType: ServiceDecisionType
    penaltyType: string | null
    penaltyOther: string | null
}

function inferLegacyDecisionType(penaltyType: string, penaltyByArticle13?: boolean): ServiceDecisionType {
    const normalized = String(penaltyType || "").toLowerCase()
    if (penaltyByArticle13 === false) {
        if (normalized.includes("обмеж")) return "ARTICLE_19_PART_13"
        return "ARTICLE_19_PART_11"
    }
    if (normalized.includes("обмеж")) return "ARTICLE_19_PART_13"
    if (normalized.includes("попереджено про необхідність")) return "ARTICLE_19_PART_11"
    return "ARTICLE_13"
}

function normalizePenaltyEntries(input: ServicePenaltyInput[]): ServicePenaltyNormalized[] {
    return input
        .map((entry) => {
            const officerId = String(entry.officerId || "").trim()
            const decisionType = (entry.decisionType || "ARTICLE_13") as ServiceDecisionType
            const penaltyType = String(entry.penaltyType || "").trim()
            const penaltyOther = typeof entry.penaltyOther === "string" ? entry.penaltyOther.trim() : ""
            const canonicalPenaltyType =
                decisionType === "ARTICLE_19_PART_11"
                    ? PART_11_MEASURE
                    : decisionType === "ARTICLE_19_PART_13"
                        ? PART_13_MEASURE
                        : penaltyType
            return {
                officerId,
                decisionType,
                penaltyType: canonicalPenaltyType || null,
                penaltyOther: decisionType === "ARTICLE_13" ? (penaltyOther || null) : null,
            }
        })
        .filter((entry) => entry.officerId.length > 0 && (entry.decisionType !== "ARTICLE_13" || !!entry.penaltyType))
}

export async function processServiceInvestigationAction(input: z.infer<typeof ServiceInvestigationProcessSchema>) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { id: true, role: true, permProcessUnifiedRecords: true }
    })

    const parsed = ServiceInvestigationProcessSchema.parse(input)

    const record = await prisma.unifiedRecord.findUnique({
        where: { id: parsed.id },
        include: {
            assignedUser: {
                select: { id: true, firstName: true, lastName: true, username: true }
            },
            officers: {
                select: { id: true, firstName: true, lastName: true, badgeNumber: true }
            }
        }
    })

    if (!record) throw new Error("Запис не знайдено")
    if (record.recordType !== "SERVICE_INVESTIGATION") throw new Error("Некоректний тип запису")
    if (user?.role !== "ADMIN" && !user?.permProcessUnifiedRecords && record.assignedUserId !== user?.id) {
        throw new Error("У вас немає прав для опрацювання службових розслідувань")
    }

    const now = new Date()
    let data: any = {}

    if (parsed.action === "CLOSE_NO_VIOLATION") {
        data = {
            status: "PROCESSED",
            processedAt: now,
            resolution: "Проведено перевірку - порушень службової дисципліни не виявлено",
            resolutionDate: now,
            investigationReviewResult: "NO_VIOLATION",
            investigationReviewAt: now,
            investigationStage: "CHECK_COMPLETED_NO_VIOLATION",
            investigationFinalResult: "LAWFUL",
            investigationCompletedAt: now,
            investigationPenaltyType: null,
            investigationPenaltyOther: null,
            investigationPenaltyOfficerId: null,
            investigationPenaltyItems: null,
            investigationConclusionApprovedAt: null,
            investigationPenaltyByArticle13: null,
            investigationPenaltyOrderNumber: null,
            investigationPenaltyOrderDate: null,
        }
    }

    if (parsed.action === "INITIATE_SR") {
        data = {
            status: "IN_PROGRESS",
            processedAt: null,
            resolution: "Ініційовано проведення службового розслідування",
            resolutionDate: now,
            investigationReviewResult: "INITIATED_SR",
            investigationReviewAt: now,
            investigationInitiatedAt: now,
            investigationStage: "SR_INITIATED",
            investigationFinalResult: null,
            investigationCompletedAt: null,
            investigationPenaltyType: null,
            investigationPenaltyOther: null,
            investigationPenaltyOfficerId: null,
            investigationPenaltyItems: null,
            investigationConclusionApprovedAt: null,
            investigationPenaltyByArticle13: null,
            investigationPenaltyOrderNumber: null,
            investigationPenaltyOrderDate: null,
        }
    }

    if (parsed.action === "SET_ORDER") {
        if (!parsed.orderNumber?.trim()) {
            throw new Error("Вкажіть номер наказу")
        }
        if (!parsed.orderDate) {
            throw new Error("Вкажіть дату наказу")
        }

        const orderDate = new Date(parsed.orderDate)
        if (Number.isNaN(orderDate.getTime())) {
            throw new Error("Некоректна дата наказу")
        }

        const deadline = calculateInclusiveDeadline(orderDate, DEFAULT_TERM_DAYS)
        const formattedOrderDate = orderDate.toLocaleDateString("uk-UA")

        data = {
            status: "IN_PROGRESS",
            processedAt: null,
            resolution: `Призначено СР. Наказ №${parsed.orderNumber.trim()} від ${formattedOrderDate}`,
            resolutionDate: now,
            investigationStage: "SR_ORDER_ASSIGNED",
            investigationOrderNumber: parsed.orderNumber.trim(),
            investigationOrderDate: orderDate,
            investigationOrderAssignedAt: now,
            deadline,
            investigationFinalResult: null,
            investigationCompletedAt: null,
            investigationPenaltyType: null,
            investigationPenaltyOther: null,
            investigationPenaltyOfficerId: null,
            investigationPenaltyItems: null,
            investigationConclusionApprovedAt: null,
            investigationPenaltyByArticle13: null,
            investigationPenaltyOrderNumber: null,
            investigationPenaltyOrderDate: null,
        }
    }

    if (parsed.action === "COMPLETE_LAWFUL") {
        data = {
            status: "PROCESSED",
            processedAt: now,
            resolution: "Проведено СР - дії правомірні",
            resolutionDate: now,
            investigationStage: "SR_COMPLETED_LAWFUL",
            investigationFinalResult: "LAWFUL",
            investigationCompletedAt: now,
            investigationPenaltyType: null,
            investigationPenaltyOther: null,
            investigationPenaltyOfficerId: null,
            investigationPenaltyItems: null,
            investigationConclusionApprovedAt: null,
            investigationPenaltyByArticle13: null,
            investigationPenaltyOrderNumber: null,
            investigationPenaltyOrderDate: null,
        }
    }

    if (parsed.action === "COMPLETE_UNLAWFUL") {
        const penaltiesInputFromUi = Array.isArray(parsed.penalties) ? parsed.penalties : []
        const fallbackPenaltyInput = parsed.penaltyOfficerId?.trim() && parsed.penaltyType?.trim()
            ? [{
                officerId: parsed.penaltyOfficerId.trim(),
                decisionType: inferLegacyDecisionType(parsed.penaltyType.trim(), parsed.penaltyByArticle13),
                penaltyType: parsed.penaltyType.trim(),
                penaltyOther: parsed.penaltyOther?.trim(),
            }]
            : []

        const normalizedPenalties = normalizePenaltyEntries(
            penaltiesInputFromUi.length > 0 ? penaltiesInputFromUi : fallbackPenaltyInput
        )

        if (!normalizedPenalties.length) {
            throw new Error("Оберіть стягнення для поліцейських")
        }

        const duplicateOfficer = normalizedPenalties.find((entry, idx, arr) =>
            arr.findIndex((test) => test.officerId === entry.officerId) !== idx
        )
        if (duplicateOfficer) {
            throw new Error("Кожен поліцейський має бути вказаний лише один раз")
        }

        const selectedOfficerIds = Array.from(
            new Set((parsed.officerIds || []).map((id) => String(id || "").trim()).filter(Boolean))
        )
        if (selectedOfficerIds.length > 0) {
            const missingFromPenalties = selectedOfficerIds.filter(
                (officerId) => !normalizedPenalties.some((entry) => entry.officerId === officerId)
            )
            if (missingFromPenalties.length > 0) {
                throw new Error("Оберіть стягнення для кожного зазначеного поліцейського")
            }
        }

        for (const penalty of normalizedPenalties) {
            if (penalty.decisionType !== "ARTICLE_13") continue
            const penaltyType = String(penalty.penaltyType || "").toLowerCase()
            if (!penaltyType) {
                throw new Error("Для стягнення за ст. 13 оберіть вид стягнення")
            }
            if (penaltyType === "інший варіант" && !penalty.penaltyOther) {
                throw new Error("Для варіанту \"інший\" вкажіть текст стягнення")
            }
        }

        if (!parsed.conclusionApprovedDate) {
            throw new Error("Вкажіть дату затвердження висновку СР")
        }
        const conclusionApprovedAt = new Date(parsed.conclusionApprovedDate)
        if (Number.isNaN(conclusionApprovedAt.getTime())) {
            throw new Error("Некоректна дата затвердження висновку СР")
        }

        const penaltyByArticle13 = normalizedPenalties.some((entry) => entry.decisionType === "ARTICLE_13")
        let penaltyOrderDate: Date | null = null
        let penaltyOrderNumber: string | null = null

        if (penaltyByArticle13) {
            if (!parsed.penaltyOrderNumber?.trim()) {
                throw new Error("Вкажіть № наказу на стягнення")
            }
            if (!parsed.penaltyOrderDate) {
                throw new Error("Вкажіть дату наказу на стягнення")
            }
            penaltyOrderDate = new Date(parsed.penaltyOrderDate)
            if (Number.isNaN(penaltyOrderDate.getTime())) {
                throw new Error("Некоректна дата наказу на стягнення")
            }
            penaltyOrderNumber = parsed.penaltyOrderNumber.trim()
        }

        const penaltyOfficerIds = Array.from(new Set(normalizedPenalties.map((entry) => entry.officerId)))
        const officers = await prisma.officer.findMany({
            where: { id: { in: penaltyOfficerIds } },
            select: { id: true, firstName: true, lastName: true, badgeNumber: true }
        })

        if (officers.length !== penaltyOfficerIds.length) {
            throw new Error("Не вдалося знайти одного або кількох поліцейських для стягнення")
        }

        const officersMap = new Map(officers.map((officer) => [officer.id, officer]))
        const sanctionsByOfficer = normalizedPenalties.map((entry) => {
            const officer = officersMap.get(entry.officerId)!
            const sanction = entry.decisionType === "ARTICLE_13"
                ? (String(entry.penaltyType || "").toLowerCase() === "інший варіант"
                    ? (entry.penaltyOther || "інший варіант")
                    : String(entry.penaltyType || ""))
                : entry.decisionType === "ARTICLE_19_PART_11"
                    ? PART_11_MEASURE
                    : PART_13_MEASURE
            const officerFullName = `${officer.lastName || ""} ${officer.firstName || ""}`.trim()
            const officerLabel = officer.badgeNumber ? `${officerFullName} (#${officer.badgeNumber})` : officerFullName
            return `${officerLabel} — ${sanction} (${SERVICE_DECISION_TYPE_LABELS[entry.decisionType]})`
        })

        const formattedConclusionDate = conclusionApprovedAt.toLocaleDateString("uk-UA")
        const resolutionChunks: string[] = [
            "Проведено СР - дії неправомірні.",
            `Висновок СР затверджено ${formattedConclusionDate}.`,
            `За результатами СР: ${sanctionsByOfficer.join("; ")}.`,
        ]

        if (penaltyByArticle13 && penaltyOrderDate && penaltyOrderNumber) {
            const formattedPenaltyOrderDate = penaltyOrderDate.toLocaleDateString("uk-UA")
            resolutionChunks.push(`За ст. 13 Дисциплінарного статуту НПУ видано наказ про стягнення №${penaltyOrderNumber} від ${formattedPenaltyOrderDate}.`)
        } else {
            resolutionChunks.push("Заходи дисциплінарного впливу застосовано без наказу про стягнення за ст. 13 (лише ч.11/ч.13 ст.19).")
        }

        const shouldConnectOfficerIds = penaltyOfficerIds.filter(
            (officerId) => !record.officers.some((item) => item.id === officerId)
        )
        const firstPenalty = normalizedPenalties[0]
        const firstPenaltyValue = firstPenalty.decisionType === "ARTICLE_13"
            ? (String(firstPenalty.penaltyType || "").toLowerCase() === "інший варіант"
                ? (firstPenalty.penaltyOther || "інший варіант")
                : String(firstPenalty.penaltyType || ""))
            : firstPenalty.decisionType === "ARTICLE_19_PART_11"
                ? PART_11_MEASURE
                : PART_13_MEASURE
        data = {
            status: "PROCESSED",
            processedAt: now,
            resolution: resolutionChunks.join(" "),
            resolutionDate: now,
            investigationStage: "SR_COMPLETED_UNLAWFUL",
            investigationFinalResult: "UNLAWFUL",
            investigationCompletedAt: now,
            investigationPenaltyType: firstPenaltyValue || null,
            investigationPenaltyOther:
                firstPenalty.decisionType === "ARTICLE_13" && String(firstPenalty.penaltyType || "").toLowerCase() === "інший варіант"
                    ? firstPenalty.penaltyOther
                    : null,
            investigationPenaltyOfficerId: firstPenalty.officerId,
            investigationPenaltyItems: JSON.stringify(normalizedPenalties),
            investigationConclusionApprovedAt: conclusionApprovedAt,
            investigationPenaltyByArticle13: penaltyByArticle13,
            investigationPenaltyOrderNumber: penaltyByArticle13 ? penaltyOrderNumber : null,
            investigationPenaltyOrderDate: penaltyByArticle13 ? penaltyOrderDate : null,
            ...(shouldConnectOfficerIds.length > 0 ? {
                officers: { connect: shouldConnectOfficerIds.map((id) => ({ id })) }
            } : {}),
        }
    }

    await prisma.unifiedRecord.update({
        where: { id: parsed.id },
        data,
    })

    const updatedRecord = await prisma.unifiedRecord.findUnique({
        where: { id: parsed.id },
        include: {
            assignedUser: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                }
            },
            officers: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    badgeNumber: true,
                }
            }
        }
    })

    revalidatePath('/admin/unified-record')
    return { success: true, record: updatedRecord }
}

export async function requestExtensionAction(id: string, reason: string) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    await prisma.unifiedRecord.update({
        where: { id },
        data: {
            extensionStatus: "PENDING",
            extensionReason: reason
        }
    })

    revalidatePath('/admin/unified-record')
    return { success: true }
}

export async function reviewExtensionAction(id: string, approved: boolean) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permManageExtensions: true }
    })
    if (user?.role !== 'ADMIN' && !user?.permManageExtensions) throw new Error("У вас немає прав для керування термінами")

    const record = await prisma.unifiedRecord.findUnique({
        where: { id },
        select: { deadline: true, eoNumber: true, assignedUserId: true }
    })

    if (!record) throw new Error("Record not found")

    const newDeadline = approved && record.deadline
        ? calculateInclusiveDeadline(record.deadline, DEFAULT_TERM_DAYS)
        : record.deadline

    await prisma.unifiedRecord.update({
        where: { id },
        data: {
            extensionStatus: approved ? "APPROVED" : "REJECTED",
            deadline: newDeadline
        }
    })

    if (record.assignedUserId) {
        await createAdminNotification({
            title: approved ? "Продовження строку погоджено" : "Продовження строку відхилено",
            message: `Ваш запит на продовження по ЄО №${record.eoNumber} було ${approved ? 'погоджено' : 'відхилено'}. Новий строк: ${newDeadline?.toLocaleDateString('uk-UA') || 'без змін'}.`,
            type: "SYSTEM",
            priority: approved ? "NORMAL" : "HIGH",
            userId: record.assignedUserId,
            link: `/admin/unified-record?search=${record.eoNumber}`,
        })
    }

    revalidatePath('/admin/unified-record')
    return { success: true }
}

export async function triggerUnifiedRecordRemindersAction() {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permManageUnifiedRecords: true, permManageSettings: true }
    })

    if (user?.role !== 'ADMIN' && !user?.permManageUnifiedRecords && !user?.permManageSettings) {
        throw new Error("У вас немає прав для запуску нагадувань")
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const theDayAfterTomorrow = new Date(tomorrow)
    theDayAfterTomorrow.setDate(tomorrow.getDate() + 1)

    const recordsToRemind = await prisma.unifiedRecord.findMany({
        where: {
            status: { notIn: ['PROCESSED', 'APPROVAL'] },
            assignedUserId: { not: null },
            deadline: {
                gte: today,
                lt: theDayAfterTomorrow
            }
        },
        include: {
            assignedUser: {
                select: { email: true, firstName: true, lastName: true }
            }
        }
    })

    const settings = await prisma.settings.findUnique({ where: { id: "global" } })
    if (settings?.sendAssignmentEmails === false) {
        return { success: true, sentCount: 0, total: recordsToRemind.length, disabled: true }
    }

    let sentCount = 0
    for (const record of recordsToRemind) {
        if (!record.assignedUser?.email || !record.deadline) continue

        const deadlineDate = new Date(record.deadline)
        deadlineDate.setHours(0, 0, 0, 0)
        const daysLeft = Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysLeft === 0 || daysLeft === 1) {
            const sent = await sendUnifiedRecordReminderEmail(record.assignedUser, record, daysLeft)
            if (sent) sentCount++
        }
    }

    return { success: true, sentCount, total: recordsToRemind.length, disabled: false }
}

export async function getUnifiedRecords(params?: {
    search?: string
    category?: string
    recordType?: string
    from?: string
    to?: string
}) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const currentUser = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { id: true, role: true, permReturnUnifiedRecords: true }
    })

    if (!currentUser) throw new Error("User not found")

    const where: any = {
        recordType: { in: ["EO", "ZVERN", "APPLICATION", "DETENTION_PROTOCOL", "SERVICE_INVESTIGATION"] }
    }

    // If not Admin, restrict to assigned records
    if (currentUser.role !== 'ADMIN' && !currentUser.permReturnUnifiedRecords) {
        where.assignedUserId = currentUser.id
    }

    if (params?.search) {
        where.OR = [
            { eoNumber: { contains: params.search } },
            { description: { contains: params.search } },
            { address: { contains: params.search } },
            { applicant: { contains: params.search } },
        ]
    }

    if (params?.category && params.category !== 'ALL') {
        where.category = params.category
    }

    if (params?.recordType && params.recordType !== 'ALL') {
        where.recordType = params.recordType
    }

    if (params?.from || params?.to) {
        where.eoDate = {}
        if (params.from) where.eoDate.gte = new Date(params.from)
        if (params.to) where.eoDate.lte = new Date(params.to)
    }

    return await prisma.unifiedRecord.findMany({
        where,
        include: {
            assignedUser: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true
                }
            },
            officers: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    badgeNumber: true
                }
            }
        },
        orderBy: { eoDate: 'desc' },
        take: 500 // Increased limit for visibility
    })
}

function findValue(row: any, patterns: string[]) {
    const keys = Object.keys(row)
    for (const pattern of patterns) {
        // Direct match
        if (row[pattern] !== undefined) return row[pattern]

        // Match with trimming and case-insensitive
        const lowerPattern = pattern.toLowerCase().trim()
        const foundKey = keys.find(k => k.toLowerCase().trim() === lowerPattern)
        if (foundKey) return row[foundKey]

        // Partial match for common variations
        const partialKey = keys.find(k => k.toLowerCase().includes(lowerPattern))
        if (partialKey) return row[partialKey]
    }
    return null
}

function parseExcelRow(row: any, fileName: string) {
    // Debug log for first row to see what keys we have
    if (process.env.NODE_ENV === 'development') {
        console.log('Parsing row keys:', Object.keys(row))
    }

    const eoNumberVal = findValue(row, ['№ ЄО', 'Номер ЄО', 'eoNumber', '№', 'Номер', '№ звернення'])
    if (!eoNumberVal) return null
    const eoNumber = normalizeEoNumber(String(eoNumberVal)) || String(eoNumberVal).trim()

    const eoDateStr = findValue(row, ['дата, час повідомлення', 'Дата', 'Date', 'дата'])
    let eoDate = new Date()

    if (eoDateStr) {
        const parts = String(eoDateStr).split(/[./-]/)
        if (parts.length >= 3) {
            const day = parseInt(parts[0])
            const month = parseInt(parts[1]) - 1
            const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2])
            const trialDate = new Date(year, month, day)
            if (!isNaN(trialDate.getTime())) {
                eoDate = trialDate
            } else {
                eoDate = new Date(eoDateStr)
            }
        } else {
            eoDate = new Date(eoDateStr)
        }
    }

    if (isNaN(eoDate.getTime()) || eoDate.getFullYear() < 1980) {
        eoDate = new Date()
    }

    return {
        eoNumber,
        eoDate,
        district: findValue(row, ['Район']) || null,
        address: findValue(row, ['Адреса', 'local_address']) || null,
        description: findValue(row, ['подія', 'Event', 'Зміст', 'Content', 'Зміст звернення']) || null,
        applicant: normalizePersonName(findValue(row, ['заявник', 'Applicant', 'ПІБ'])) || null,
        category: findValue(row, ['Категорія']) || null,
        officerName: normalizePersonName(findValue(row, ['Рапорт- ПІБ хто склав', 'Офіцер', 'Виконавець'])) || null,
        resolution: findValue(row, ['Рішення', 'Resolution']) || null,
        resolutionDate: findValue(row, ['Дата рішення']) ? new Date(findValue(row, ['Дата рішення'])) : null,
        sourceFile: fileName
    }
}

export async function parseUnifiedRecordsAction(formData: FormData, recordType: string = "EO") {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permManageUnifiedRecords: true, permImportUnifiedRecords: true }
    })
    if (user?.role !== 'ADMIN' && !user?.permImportUnifiedRecords && !user?.permManageUnifiedRecords) throw new Error("У вас немає прав для імпорту записів ЄО")

    const file = formData.get('file') as File
    if (!file) throw new Error("No file provided")

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { cellDates: true, cellNF: true, cellText: true })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' })

    const parsed = (data as any[])
        .map(row => {
            const parsedRow = parseExcelRow(row, file.name)
            if (parsedRow) {
                return { ...parsedRow, recordType }
            }
            return null
        })
        .filter(Boolean)

    return { success: true, records: parsed }
}

export async function saveUnifiedRecordsAction(records: any[]) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permManageUnifiedRecords: true, permImportUnifiedRecords: true }
    })
    if (user?.role !== 'ADMIN' && !user?.permImportUnifiedRecords && !user?.permManageUnifiedRecords) throw new Error("У вас немає прав для збереження записів ЄО")

    let createdCount = 0
    let updatedCount = 0

    for (const record of records) {
        try {
            // Need to convert date strings back to Date objects if they came from client
            const formattedRecord = {
                ...record,
                eoNumber: normalizeEoNumber(record.eoNumber) || String(record.eoNumber || "").trim(),
                applicant: normalizePersonName(record.applicant) || null,
                officerName: normalizePersonName(record.officerName) || null,
                eoDate: new Date(record.eoDate),
                resolutionDate: record.resolutionDate ? new Date(record.resolutionDate) : null
            }

            const existing = await prisma.unifiedRecord.findUnique({
                where: { eoNumber: formattedRecord.eoNumber },
                select: { id: true }
            })

            if (existing) {
                await prisma.unifiedRecord.update({
                    where: { eoNumber: formattedRecord.eoNumber },
                    data: formattedRecord
                })
                updatedCount++
            } else {
                await prisma.unifiedRecord.create({
                    data: formattedRecord
                })
                createdCount++
            }
        } catch (e) {
            console.error(`Error saving EO ${record.eoNumber}:`, e)
        }
    }

    revalidatePath('/admin/unified-record')
    return { success: true, count: createdCount + updatedCount, createdCount, updatedCount }
}

export async function upsertUnifiedRecordAction(data: any) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { id: true, role: true, permManageUnifiedRecords: true }
    })
    if (!user) throw new Error("User not found")

    // Only admins or users with permManageUnifiedRecords can create or edit basic record details
    if (user.role !== 'ADMIN' && !user.permManageUnifiedRecords) throw new Error("У вас немає прав для створення чи редагування записів ЄО")

    const payload = { ...data }
    const isApplication = payload.recordType === "APPLICATION"
    const isServiceInvestigation = payload.recordType === "SERVICE_INVESTIGATION"
    const isCreate = !payload.id

    if (isApplication && isCreate) {
        payload.eoNumber = await generateNextApplicationNumber()
    }

    if (isApplication && !isCreate && (!payload.eoNumber || !String(payload.eoNumber).trim()) && payload.id) {
        const existingById = await prisma.unifiedRecord.findUnique({
            where: { id: payload.id },
            select: { eoNumber: true }
        })
        payload.eoNumber = existingById?.eoNumber || await generateNextApplicationNumber()
    }

    payload.eoNumber = normalizeEoNumber(payload.eoNumber) || String(payload.eoNumber || "").trim()
    payload.applicant = isServiceInvestigation
        ? (typeof payload.applicant === "string" ? payload.applicant.trim() || null : null)
        : (normalizePersonName(payload.applicant) || null)
    payload.officerName = normalizePersonName(payload.officerName) || null

    if (isServiceInvestigation) {
        payload.category = payload.category || "Службові розслідування"
        payload.investigationStage = payload.investigationStage || "REPORT_REVIEW"
        payload.investigationViolation = payload.investigationViolation || payload.description || null
    }

    const validated = UnifiedRecordSchema.parse(payload)
    const { officerIds, ...recordData } = validated

    let oldRecord = null
    if (validated.id) {
        oldRecord = await prisma.unifiedRecord.findUnique({
            where: { id: validated.id },
            select: { assignedUserId: true }
        })
    }

    // Calculate deadline (inclusive counting):
    // day of record/order is day 1, so 15 days => +14 calendar days
    // 1) for service investigation with order date
    // 2) otherwise from record date
    const deadline = validated.deadline ||
        (validated.recordType === "SERVICE_INVESTIGATION" && validated.investigationOrderDate
            ? calculateInclusiveDeadline(new Date(validated.investigationOrderDate), DEFAULT_TERM_DAYS)
            : (validated.eoDate ? calculateInclusiveDeadline(new Date(validated.eoDate), DEFAULT_TERM_DAYS) : null))

    let record
    if (validated.id) {
        record = await prisma.unifiedRecord.update({
            where: { id: validated.id },
            data: {
                ...recordData,
                deadline: deadline,
                updatedAt: new Date(),
                officers: {
                    set: officerIds.map(id => ({ id }))
                }
            }
        })
    } else {
        const duplicate = await prisma.unifiedRecord.findUnique({
            where: { eoNumber: validated.eoNumber },
            select: { id: true, recordType: true, eoNumber: true }
        })
        if (duplicate) {
            throw new Error(`Запис з номером ${duplicate.eoNumber} вже існує. Створення дубля заблоковано.`)
        }

        record = await prisma.unifiedRecord.create({
            data: {
                ...recordData,
                deadline: deadline,
                officers: officerIds.length > 0
                    ? {
                        connect: officerIds.map(id => ({ id }))
                    }
                    : undefined
            }
        })
    }

    // Create notification only if assignment changed or is new
    if (validated.assignedUserId && (!oldRecord || oldRecord.assignedUserId !== validated.assignedUserId)) {
        await createAdminNotification({
            title: "Нове призначення ЄО",
            message: `Вам призначено запис ЄО №${validated.eoNumber}`,
            type: "ASSIGNMENT",
            priority: "NORMAL",
            userId: validated.assignedUserId,
            link: `/admin/unified-record?search=${validated.eoNumber}`,
        })

        // Send Email Notification (if enabled)
        const settings = await prisma.settings.findUnique({ where: { id: "global" } })
        if (settings?.sendAssignmentEmails !== false) {
            const assignee = await prisma.user.findUnique({
                where: { id: validated.assignedUserId },
                select: { email: true, firstName: true, lastName: true }
            })
            if (assignee?.email) {
                await sendUnifiedAssignmentEmail(assignee, record)
            }
        }
    }

    revalidatePath('/admin/unified-record')
    return { success: true, record }
}

export async function getUsersForAssignment() {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    return await prisma.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
        },
        orderBy: { lastName: 'asc' }
    })
}

export async function deleteUnifiedRecordAction(id: string) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permDeleteUnifiedRecords: true }
    })
    if (user?.role !== 'ADMIN' && !user?.permDeleteUnifiedRecords) throw new Error("У вас немає прав для видалення записів ЄО")

    await prisma.unifiedRecord.delete({
        where: { id }
    })

    revalidatePath('/admin/unified-record')
    return { success: true }
}

export async function bulkDeleteUnifiedRecordsAction(ids: string[]) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permDeleteUnifiedRecords: true }
    })
    if (user?.role !== 'ADMIN' && !user?.permDeleteUnifiedRecords) throw new Error("У вас немає прав для видалення записів ЄО")

    await prisma.unifiedRecord.deleteMany({
        where: { id: { in: ids } }
    })

    revalidatePath('/admin/unified-record')
    return { success: true }
}

export async function bulkAssignUnifiedRecordsAction(ids: string[], userId: string) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permAssignUnifiedRecords: true }
    })
    if (user?.role !== 'ADMIN' && !user?.permAssignUnifiedRecords) throw new Error("У вас немає прав для призначення записів ЄО")

    await prisma.unifiedRecord.updateMany({
        where: { id: { in: ids } },
        data: {
            assignedUserId: userId
        }
    })

    // Create a single bulk notification
    await createAdminNotification({
        title: "Масове призначення ЄО",
        message: `Вам призначено ${ids.length} нових записів ЄО`,
        type: "ASSIGNMENT",
        priority: "NORMAL",
        userId: userId,
        link: `/admin/unified-record`,
    })

    // Send individual emails for bulk assignment (if enabled)
    const settings = await prisma.settings.findUnique({ where: { id: "global" } })
    if (settings?.sendAssignmentEmails !== false) {
        const assignee = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true, lastName: true }
        })

        if (assignee?.email) {
            const records = await prisma.unifiedRecord.findMany({
                where: { id: { in: ids } }
            })
            for (const record of records) {
                await sendUnifiedAssignmentEmail(assignee, record)
            }
        }
    }

    revalidatePath('/admin/unified-record')
    return { success: true }
}
export async function bulkUpdateResolutionAction(ids: string[], resolution: string, date: Date = new Date()) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permProcessUnifiedRecords: true }
    })
    if (user?.role !== 'ADMIN' && !user?.permProcessUnifiedRecords) throw new Error("У вас немає прав для масового опрацювання")

    await prisma.unifiedRecord.updateMany({
        where: { id: { in: ids } },
        data: {
            resolution,
            resolutionDate: date,
            status: "APPROVAL",
            processedAt: null
        }
    })

    revalidatePath('/admin/unified-record')
    return { success: true }
}

export async function returnForRevisionAction(id: string, comment: string) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permReturnUnifiedRecords: true }
    })
    if (user?.role !== 'ADMIN' && !user?.permReturnUnifiedRecords) throw new Error("У вас немає прав повертати записи на доопрацювання")

    const record = await prisma.unifiedRecord.findUnique({
        where: { id },
        select: {
            assignedUserId: true,
            eoNumber: true,
            recordType: true,
            investigationStage: true,
        }
    })

    if (!record) throw new Error("Запис не знайдено")

    const currentServiceStage = String(record.investigationStage || "REPORT_REVIEW")
    const previousServiceStage =
        currentServiceStage === "SR_COMPLETED_UNLAWFUL" || currentServiceStage === "SR_COMPLETED_LAWFUL"
            ? "SR_ORDER_ASSIGNED"
            : currentServiceStage === "CHECK_COMPLETED_NO_VIOLATION"
                ? "REPORT_REVIEW"
                : currentServiceStage === "SR_ORDER_ASSIGNED"
                    ? "SR_INITIATED"
                    : "REPORT_REVIEW"

    await prisma.unifiedRecord.update({
        where: { id },
        data: {
            status: "IN_PROGRESS",
            processedAt: null,
            resolutionDate: null,
            ...(record.recordType === "SERVICE_INVESTIGATION"
                ? {
                    investigationStage: previousServiceStage,
                    ...(previousServiceStage === "REPORT_REVIEW"
                        ? {
                            investigationReviewResult: null,
                            investigationReviewAt: null,
                            investigationInitiatedAt: null,
                            investigationOrderNumber: null,
                            investigationOrderDate: null,
                            investigationOrderAssignedAt: null,
                        }
                        : {}),
                    ...(previousServiceStage === "SR_INITIATED"
                        ? {
                            investigationOrderNumber: null,
                            investigationOrderDate: null,
                            investigationOrderAssignedAt: null,
                        }
                        : {}),
                    investigationFinalResult: null,
                    investigationCompletedAt: null,
                    investigationPenaltyType: null,
                    investigationPenaltyOther: null,
                    investigationPenaltyOfficerId: null,
                    investigationPenaltyItems: null,
                    investigationConclusionApprovedAt: null,
                    investigationPenaltyByArticle13: null,
                    investigationPenaltyOrderNumber: null,
                    investigationPenaltyOrderDate: null,
                }
                : {}),
        }
    })

    const updatedRecord = await prisma.unifiedRecord.findUnique({
        where: { id },
        include: {
            assignedUser: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                }
            },
            officers: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    badgeNumber: true,
                }
            }
        }
    })

    if (record.assignedUserId) {
        const recordTypeLabel =
            record.recordType === "EO"
                ? "ЄО"
                : record.recordType === "ZVERN"
                    ? "Звернення"
                    : record.recordType === "APPLICATION"
                        ? "Застосування сили/спецзасобів"
                        : record.recordType === "DETENTION_PROTOCOL"
                            ? "Протокол затримання"
                            : record.recordType === "SERVICE_INVESTIGATION"
                                ? "Службове розслідування"
                                : "Документ"
        const recordNumber = record.eoNumber || "без номера"

        await createAdminNotification({
            title: "Запис повернуто на доопрацювання",
            message: `Адмін повернув ${recordTypeLabel} №${recordNumber} на доопрацювання. Коментар: ${comment}`,
            type: "ALERT",
            priority: "HIGH",
            userId: record.assignedUserId,
            link: `/admin/unified-record?search=${recordNumber}`,
        })
    }

    revalidatePath('/admin/unified-record')
    return { success: true, record: updatedRecord }
}

export async function analyzeRecordImageAction(formData: FormData) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email },
        select: { role: true, permUseAiExtraction: true }
    })
    if (user?.role !== 'ADMIN' && !user?.permUseAiExtraction) throw new Error("У вас немає прав для AI-розбору документів")

    const file = formData.get('file') as File
    if (!file) throw new Error("No file provided")

    // Check for API key
    if (!process.env.GOOGLE_AI_API_KEY) {
        console.error("GOOGLE_AI_API_KEY is not set")
        // Return mock data for development if key is missing
        if (process.env.NODE_ENV === 'development') {
            return {
                success: true,
                data: {
                    eoNumber: "12345 (Mock)",
                    description: "Тестовий опис події з фото",
                    address: "м. Хмільник, вул. Тестова 1",
                    applicant: "Іванов І.І."
                }
            }
        }
        throw new Error("AI Service not configured")
    }

    try {
        const buffer = await file.arrayBuffer()
        const base64Image = Buffer.from(buffer).toString('base64')

        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" })

        const prompt = `Проаналізуй це фото документа (рапорт або заява до поліції).
    Витягни наступні дані у форматі JSON:
    - eoNumber: номер ЄО (або реєстраційний номер)
    - description: короткий зміст події/заяви
    - address: адреса події або заявника
    - applicant: ПІБ заявника
    - officerName: ПІБ поліцейського (хто склав рапорт)
    - date: дата події/документа (у форматі YYYY-MM-DD)

    Якщо якихось даних немає, поверни null або порожній рядок.
    Відповідай ТІЛЬКИ валідним JSON без markdown.`

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: file.type
                }
            }
        ])

        const response = await result.response
        const text = response.text()

        let data
        try {
            // Clean markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
            data = JSON.parse(jsonStr)
        } catch (e) {
            console.error("Failed to parse AI response:", text)
            throw new Error("AI Response parsing failed")
        }

        return { success: true, data }
    } catch (error: any) {
        console.error("AI Analysis error:", error)
        return { success: false, error: error.message || "Failed to analyze image" }
    }
}
