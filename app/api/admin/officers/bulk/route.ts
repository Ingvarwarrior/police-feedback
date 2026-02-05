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
            errors: [] as any[]
        }

        for (const officer of officers) {
            try {
                if (!officer.badgeNumber || !officer.firstName || !officer.lastName) {
                    results.errors.push({
                        badge: officer.badgeNumber || 'unknown',
                        error: "Missing required fields (Badge, First Name, Last Name)"
                    })
                    continue
                }

                const existing = await prisma.officer.findUnique({
                    where: { badgeNumber: officer.badgeNumber }
                })

                if (existing) {
                    // Update existing officer
                    await prisma.officer.update({
                        where: { id: existing.id },
                        data: {
                            firstName: officer.firstName,
                            lastName: officer.lastName,
                            middleName: officer.middleName || existing.middleName,
                            rank: officer.rank || existing.rank,
                            department: officer.department || existing.department,
                            phone: officer.phone || existing.phone,
                            birthDate: officer.birthDate ? new Date(officer.birthDate) : existing.birthDate,
                            imageUrl: officer.imageUrl || existing.imageUrl,
                        }
                    })
                    results.updated++
                    continue
                }

                await prisma.officer.create({
                    data: {
                        badgeNumber: officer.badgeNumber,
                        firstName: officer.firstName,
                        lastName: officer.lastName,
                        middleName: officer.middleName || null,
                        rank: officer.rank || null,
                        department: officer.department || null,
                        phone: officer.phone || null,
                        birthDate: officer.birthDate ? new Date(officer.birthDate) : null,
                        imageUrl: officer.imageUrl || null,
                        status: "ACTIVE",
                        hireDate: new Date()
                    }
                })
                results.created++

            } catch (err) {
                console.error("Error creating officer:", officer, err)
                results.errors.push({
                    badge: officer.badgeNumber,
                    error: "Database error"
                })
            }
        }

        if (results.created > 0 && session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "BULK_IMPORT_OFFICERS",
                    entityType: "OFFICER",
                    entityId: "BULK",
                    metadata: JSON.stringify({ count: results.created, errors: results.errors.length })
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
