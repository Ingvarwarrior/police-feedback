import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN' && !user.permCreateOfficers) {
        return new NextResponse("Forbidden - Permission permCreateOfficers required", { status: 403 })
    }

    try {
        const body = await req.json()
        const { officers } = body

        if (!Array.isArray(officers) || officers.length === 0) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const results = {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [] as any[]
        }

        const normalizeText = (value: unknown): string | null => {
            if (typeof value !== "string") return null
            const trimmed = value.trim()
            return trimmed.length ? trimmed : null
        }

        const parseDateInput = (value: unknown): Date | null => {
            if (value === null || value === undefined || value === "") return null
            const parsed = new Date(String(value))
            return Number.isNaN(parsed.getTime()) ? null : parsed
        }

        for (const officer of officers) {
            try {
                if (!officer.badgeNumber) {
                    results.errors.push({
                        badge: officer.badgeNumber || 'unknown',
                        error: "Missing required field (Badge)"
                    })
                    continue
                }

                const existing = await prisma.officer.findUnique({
                    where: { badgeNumber: officer.badgeNumber }
                })

                if (existing) {
                    const firstName = normalizeText(officer.firstName)
                    const lastName = normalizeText(officer.lastName)
                    const middleName = normalizeText(officer.middleName)
                    const rank = normalizeText(officer.rank)
                    const department = normalizeText(officer.department)
                    const phone = normalizeText(officer.phone)
                    const address = normalizeText(officer.address)
                    const education = normalizeText(officer.education)
                    const serviceHistory = normalizeText(officer.serviceHistory)
                    const imageUrl = normalizeText(officer.imageUrl)
                    const birthDate = parseDateInput(officer.birthDate)
                    const hireDate = parseDateInput(officer.hireDate)

                    const updateData: any = {}
                    if (firstName) updateData.firstName = firstName
                    if (lastName) updateData.lastName = lastName
                    if (middleName) updateData.middleName = middleName
                    if (rank) updateData.rank = rank
                    if (department) updateData.department = department
                    if (phone) updateData.phone = phone
                    if (address) updateData.address = address
                    if (education) updateData.education = education
                    if (serviceHistory) updateData.serviceHistory = serviceHistory
                    if (imageUrl) updateData.imageUrl = imageUrl
                    if (birthDate) updateData.birthDate = birthDate
                    if (hireDate) updateData.hireDate = hireDate

                    if (Object.keys(updateData).length === 0) {
                        results.skipped++
                        continue
                    }

                    // Update existing officer
                    await prisma.officer.update({
                        where: { id: existing.id },
                        data: updateData
                    })
                    results.updated++
                    continue
                }

                // Update-only mode: do not create new officer cards from CSV import
                results.skipped++
                results.errors.push({
                    badge: officer.badgeNumber,
                    error: "Officer not found by badge (update-only mode)"
                })

            } catch (err) {
                console.error("Error creating officer:", officer, err)
                results.errors.push({
                    badge: officer.badgeNumber,
                    error: "Database error"
                })
            }
        }

        if (results.updated > 0 && session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "BULK_IMPORT_OFFICERS",
                    entityType: "OFFICER",
                    entityId: "BULK",
                    metadata: JSON.stringify({
                        updateOnly: true,
                        updated: results.updated,
                        skipped: results.skipped,
                        errors: results.errors.length
                    })
                }
            })
        }

        return NextResponse.json(results)

    } catch (error) {
        console.error("Bulk import error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// DELETE /api/admin/officers/bulk - Bulk delete officers
export async function DELETE(req: Request) {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN' && !user.permDeleteOfficers) {
        return new NextResponse("Forbidden - Permission permDeleteOfficers required", { status: 403 })
    }

    try {
        const body = await req.json()
        const { ids } = body

        if (!Array.isArray(ids) || ids.length === 0) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        // 1. Unlink feedback
        await prisma.response.updateMany({
            where: { officerId: { in: ids } },
            data: { officerId: null }
        })

        // 2. Delete evaluations (cascade should handle this via officer delete, but explicit safety check doesn't hurt)
        // With Cascade on delete in schema, this is handled automatically when deleting officers

        // 3. Delete officers
        const result = await prisma.officer.deleteMany({
            where: { id: { in: ids } }
        })

        // Audit log
        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "BULK_DELETE_OFFICERS",
                    entityType: "OFFICER",
                    entityId: "BULK",
                    metadata: JSON.stringify({ count: result.count, ids })
                }
            })
        }

        return NextResponse.json({ success: true, count: result.count })
    } catch (error) {
        console.error("Bulk delete error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
