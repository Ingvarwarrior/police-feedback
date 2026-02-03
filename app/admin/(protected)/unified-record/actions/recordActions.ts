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
    assignedOfficerId: z.string().optional().nullable(),
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
            assignedOfficer: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    badgeNumber: true
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
    const workbook = XLSX.read(buffer)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet)

    let importedCount = 0
    let updatedCount = 0

    for (const row of data as any[]) {
        // Exact mapping based on user provided Excel format
        const eoNumber = row['№ ЄО'] || row['Номер ЄО'] || row['eoNumber']
        if (!eoNumber) continue

        const eoDateStr = row['дата, час повідомлення'] || row['Дата'] || row['Date']
        const eoDate = eoDateStr ? new Date(eoDateStr) : new Date()

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

export async function getOfficersForAssignment() {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    return await prisma.officer.findMany({
        where: { status: 'ACTIVE' },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            badgeNumber: true,
            rank: true
        },
        orderBy: { lastName: 'asc' }
    })
}
