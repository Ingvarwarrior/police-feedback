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
    applicant: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    officerName: z.string().optional().nullable(),
    assignedUserId: z.string().optional().nullable(),
    resolution: z.string().optional().nullable(),
    resolutionDate: z.date().optional().nullable(),
})

export async function getUnifiedRecords(params?: {
    search?: string
    category?: string
    from?: string
    to?: string
}) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const where: any = {}

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

export async function importUnifiedRecordsFromExcel(formData: FormData) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const file = formData.get('file') as File
    if (!file) throw new Error("No file provided")

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { cellDates: true, cellNF: true, cellText: true })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' })

    let importedCount = 0
    let updatedCount = 0

    for (const row of data as any[]) {
        // Exact mapping based on user provided Excel format
        const eoNumber = row['№ ЄО'] || row['Номер ЄО'] || row['eoNumber']
        if (!eoNumber) continue

        const eoDateStr = row['дата, час повідомлення'] || row['Дата'] || row['Date']
        let eoDate = new Date()

        if (eoDateStr) {
            // Try to parse Ukrainian format DD.MM.YYYY
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

        // Final check for 1970 or Invalid Date
        if (isNaN(eoDate.getTime()) || eoDate.getFullYear() < 1980) {
            eoDate = new Date()
        }

        const record = {
            eoNumber: String(eoNumber),
            eoDate,
            district: row['Район'] || null,
            address: row['Адреса'] || row['local_address'] || null, // Assuming address might be implicit or in separate col sometimes
            description: row['подія'] || row['Зміст'] || null,
            applicant: row['заявник'] || row['Applicant'] || null,
            category: row['Категорія'] || null,
            officerName: row['Рапорт- ПІБ хто склав'] || row['Офіцер'] || null,
            resolution: row['Рішення'] || row['Resolution'] || null,
            resolutionDate: row['Дата рішення'] ? new Date(row['Дата рішення']) : null,
            sourceFile: file.name
        }

        try {
            await prisma.unifiedRecord.upsert({
                where: { eoNumber: record.eoNumber },
                update: record,
                create: record
            })
            importedCount++
        } catch (e) {
            console.error(`Error importing EO ${eoNumber}:`, e)
        }
    }

    revalidatePath('/admin/unified-record')
    return { success: true, count: importedCount }
}

export async function upsertUnifiedRecordAction(data: any) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const validated = UnifiedRecordSchema.parse(data)

    if (validated.id) {
        const record = await prisma.unifiedRecord.update({
            where: { id: validated.id },
            data: {
                ...validated,
                updatedAt: new Date()
            }
        })
        revalidatePath('/admin/unified-record')
        return { success: true, record }
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

    revalidatePath('/admin/unified-record')
    return { success: true }
}
