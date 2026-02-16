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
    investigationOrderNumber: z.string().optional().nullable(),
    investigationOrderDate: z.date().optional().nullable(),
    investigationFinalResult: z.string().optional().nullable(),
    investigationPenaltyType: z.string().optional().nullable(),
    investigationPenaltyOther: z.string().optional().nullable(),
    investigationPenaltyOfficerId: z.string().optional().nullable(),
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

export async function processUnifiedRecordAction(id: string, resolution: string, officerIds?: string[], concernsBpp: boolean = true): Promise<{ success?: boolean, error?: string }> {
    const session = await auth()
    if (!session?.user?.email) return { error: "Unauthorized" }

    console.log(`Processing unified record ${id}: resolution="${resolution}", officers=${officerIds}, concernsBpp=${concernsBpp}`)

    try {
        const currentRecord = await prisma.unifiedRecord.findUnique({
            where: { id },
            select: { recordType: true }
        })

        if (!currentRecord) {
            return { error: "Запис не знайдено" }
        }

        if (currentRecord.recordType === "SERVICE_INVESTIGATION") {
            return { error: "Для службових розслідувань використовуйте окремий workflow опрацювання" }
        }

        await prisma.unifiedRecord.update({
            where: { id },
            data: {
                resolution,
                resolutionDate: new Date(),
                status: "PROCESSED",
                processedAt: new Date(),
                concernsBpp,
                officers: officerIds && officerIds.length > 0 ? {
                    set: officerIds.map(oid => ({ id: oid }))
                } : { set: [] }
            }
        })

        revalidatePath('/admin/unified-record')
        return { success: true }
    } catch (error: any) {
        console.error("Error processing unified record:", error)
        return { error: error.message || "Failed to process record" }
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
})

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
            investigationStage: "CHECK_COMPLETED_NO_VIOLATION",
            investigationFinalResult: "LAWFUL",
        }
    }

    if (parsed.action === "INITIATE_SR") {
        data = {
            status: "IN_PROGRESS",
            processedAt: null,
            resolution: "Ініційовано проведення службового розслідування",
            resolutionDate: now,
            investigationReviewResult: "INITIATED_SR",
            investigationStage: "SR_INITIATED",
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

        const deadline = new Date(orderDate.getTime() + 15 * 24 * 60 * 60 * 1000)
        const formattedOrderDate = orderDate.toLocaleDateString("uk-UA")

        data = {
            status: "IN_PROGRESS",
            processedAt: null,
            resolution: `Призначено СР. Наказ №${parsed.orderNumber.trim()} від ${formattedOrderDate}`,
            resolutionDate: now,
            investigationStage: "SR_ORDER_ASSIGNED",
            investigationOrderNumber: parsed.orderNumber.trim(),
            investigationOrderDate: orderDate,
            deadline,
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
        }
    }

    if (parsed.action === "COMPLETE_UNLAWFUL") {
        if (!parsed.penaltyType?.trim()) {
            throw new Error("Оберіть варіант стягнення")
        }
        if (parsed.penaltyType.trim().toLowerCase() === "інший варіант" && !parsed.penaltyOther?.trim()) {
            throw new Error("Вкажіть інший варіант стягнення")
        }
        if (!parsed.penaltyOfficerId?.trim()) {
            throw new Error("Оберіть поліцейського, щодо якого встановлено порушення")
        }

        const officer = await prisma.officer.findUnique({
            where: { id: parsed.penaltyOfficerId.trim() },
            select: { id: true, firstName: true, lastName: true, badgeNumber: true }
        })

        if (!officer) {
            throw new Error("Не вдалося знайти обраного поліцейського")
        }

        const sanction = parsed.penaltyType.trim().toLowerCase() === "інший варіант"
            ? parsed.penaltyOther!.trim()
            : parsed.penaltyType.trim()
        const officerFullName = `${officer.lastName} ${officer.firstName}`.trim()
        const officerLabel = officer.badgeNumber ? `${officerFullName} (#${officer.badgeNumber})` : officerFullName
        const shouldConnectOfficer = !record.officers.some((item) => item.id === officer.id)

        data = {
            status: "PROCESSED",
            processedAt: now,
            resolution: `Проведено СР - дії неправомірні. Поліцейський: ${officerLabel}. Стягнення: ${sanction}.`,
            resolutionDate: now,
            investigationStage: "SR_COMPLETED_UNLAWFUL",
            investigationFinalResult: "UNLAWFUL",
            investigationPenaltyType: parsed.penaltyType.trim(),
            investigationPenaltyOther: parsed.penaltyType.trim().toLowerCase() === "інший варіант" ? parsed.penaltyOther!.trim() : null,
            investigationPenaltyOfficerId: officer.id,
            ...(shouldConnectOfficer ? { officers: { connect: [{ id: officer.id }] } } : {}),
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
        ? new Date(record.deadline.getTime() + 15 * 24 * 60 * 60 * 1000)
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
            status: { not: 'PROCESSED' },
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
        select: { id: true, role: true }
    })

    if (!currentUser) throw new Error("User not found")

    const where: any = {
        recordType: { in: ["EO", "ZVERN", "APPLICATION", "DETENTION_PROTOCOL", "SERVICE_INVESTIGATION"] }
    }

    // If not Admin, restrict to assigned records
    if (currentUser.role !== 'ADMIN') {
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

    // Calculate deadline:
    // 1) for service investigation with order date -> 15 days from order date
    // 2) otherwise -> 15 days from record date
    const deadline = validated.deadline ||
        (validated.recordType === "SERVICE_INVESTIGATION" && validated.investigationOrderDate
            ? new Date(new Date(validated.investigationOrderDate).getTime() + 15 * 24 * 60 * 60 * 1000)
            : (validated.eoDate ? new Date(new Date(validated.eoDate).getTime() + 15 * 24 * 60 * 60 * 1000) : null))

    const record = await prisma.unifiedRecord.upsert({
        where: { eoNumber: validated.eoNumber },
        update: {
            ...recordData,
            deadline: deadline,
            updatedAt: new Date(),
            officers: {
                set: officerIds.map(id => ({ id }))
            }
        },
        create: {
            ...recordData,
            deadline: deadline,
            officers: officerIds.length > 0
                ? {
                    connect: officerIds.map(id => ({ id }))
                }
                : undefined
        }
    })

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
            status: "PROCESSED",
            processedAt: date
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
        select: { assignedUserId: true, eoNumber: true, recordType: true }
    })

    if (!record) throw new Error("Запис не знайдено")

    await prisma.unifiedRecord.update({
        where: { id },
        data: {
            status: "IN_PROGRESS",
            processedAt: null,
            resolutionDate: null,
            ...(record.recordType === "SERVICE_INVESTIGATION"
                ? {
                    investigationStage: "REPORT_REVIEW",
                    investigationReviewResult: null,
                    investigationFinalResult: null,
                    investigationOrderNumber: null,
                    investigationOrderDate: null,
                    investigationPenaltyType: null,
                    investigationPenaltyOther: null,
                    investigationPenaltyOfficerId: null,
                }
                : {}),
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
    return { success: true }
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
