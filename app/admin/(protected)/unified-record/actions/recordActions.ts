'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import * as XLSX from 'xlsx'
import { z } from "zod"

const UnifiedRecordSchema = z.object({
    id: z.string().optional(),
    eoNumber: z.string().min(1, "Номер ЄО обов'язковий"),
    eoDate: z.date(),
    district: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    content: z.string().optional().nullable(),
    applicant: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    recordType: z.string().default("EO"),
    officerName: z.string().optional().nullable(),
    assignedUserId: z.string().optional().nullable(),
    resolution: z.string().optional().nullable(),
    resolutionDate: z.date().optional().nullable(),
})

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

    const where: any = {}

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
            }
        },
        orderBy: { eoDate: 'desc' },
        take: 100 // Limit for performance
    })
}

function parseExcelRow(row: any, fileName: string) {
    const eoNumber = row['№ ЄО'] || row['Номер ЄО'] || row['eoNumber']
    if (!eoNumber) return null

    const eoDateStr = row['дата, час повідомлення'] || row['Дата'] || row['Date']
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
        eoNumber: String(eoNumber),
        eoDate,
        district: row['Район'] || null,
        address: row['Адреса'] || row['local_address'] || null,
        description: row['подія'] || row['Event'] || null,
        content: row['Зміст'] || row['Content'] || null,
        applicant: row['заявник'] || row['Applicant'] || null,
        category: row['Категорія'] || null,
        officerName: row['Рапорт- ПІБ хто склав'] || row['Офіцер'] || null,
        resolution: row['Рішення'] || row['Resolution'] || null,
        resolutionDate: row['Дата рішення'] ? new Date(row['Дата рішення']) : null,
        sourceFile: fileName
    }
}

export async function parseUnifiedRecordsAction(formData: FormData, recordType: string = "EO") {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

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
    if (!session) throw new Error("Unauthorized")

    let count = 0
    for (const record of records) {
        try {
            // Need to convert date strings back to Date objects if they came from client
            const formattedRecord = {
                ...record,
                eoDate: new Date(record.eoDate),
                resolutionDate: record.resolutionDate ? new Date(record.resolutionDate) : null
            }

            await prisma.unifiedRecord.upsert({
                where: { eoNumber: formattedRecord.eoNumber },
                update: formattedRecord,
                create: formattedRecord
            })
            count++
        } catch (e) {
            console.error(`Error saving EO ${record.eoNumber}:`, e)
        }
    }

    revalidatePath('/admin/unified-record')
    return { success: true, count }
}

export async function upsertUnifiedRecordAction(data: any) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const validated = UnifiedRecordSchema.parse(data)

    let oldRecord = null
    if (validated.id) {
        oldRecord = await prisma.unifiedRecord.findUnique({
            where: { id: validated.id },
            select: { assignedUserId: true }
        })
    }

    const record = await prisma.unifiedRecord.upsert({
        where: { eoNumber: validated.eoNumber },
        update: {
            ...validated,
            updatedAt: new Date()
        },
        create: {
            ...validated
        }
    })

    // Create notification only if assignment changed or is new
    if (validated.assignedUserId && (!oldRecord || oldRecord.assignedUserId !== validated.assignedUserId)) {
        await prisma.adminNotification.create({
            data: {
                title: "Нове призначення ЄО",
                message: `Вам призначено запис ЄО №${validated.eoNumber}`,
                type: "ASSIGNMENT",
                priority: "NORMAL",
                userId: validated.assignedUserId,
                link: `/admin/unified-record?search=${validated.eoNumber}`
            }
        })
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
    if (!session) throw new Error("Unauthorized")

    await prisma.unifiedRecord.delete({
        where: { id }
    })

    revalidatePath('/admin/unified-record')
    return { success: true }
}

export async function bulkDeleteUnifiedRecordsAction(ids: string[]) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    await prisma.unifiedRecord.deleteMany({
        where: { id: { in: ids } }
    })

    revalidatePath('/admin/unified-record')
    return { success: true }
}

export async function bulkAssignUnifiedRecordsAction(ids: string[], userId: string) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    await prisma.unifiedRecord.updateMany({
        where: { id: { in: ids } },
        data: { assignedUserId: userId }
    })

    // Create a single bulk notification
    await prisma.adminNotification.create({
        data: {
            title: "Масове призначення ЄО",
            message: `Вам призначено ${ids.length} нових записів ЄО`,
            type: "ASSIGNMENT",
            priority: "NORMAL",
            userId: userId,
            link: `/admin/unified-record`
        }
    })

    revalidatePath('/admin/unified-record')
    return { success: true }
}
export async function bulkUpdateResolutionAction(ids: string[], resolution: string, date: Date = new Date()) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    await prisma.unifiedRecord.updateMany({
        where: { id: { in: ids } },
        data: {
            resolution,
            resolutionDate: date
        }
    })

    revalidatePath('/admin/unified-record')
    return { success: true }
}
