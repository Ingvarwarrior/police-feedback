'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { checkPermission } from "@/lib/permissions"
import { auth } from "@/auth"

export async function updateReportStatus(id: string, status: string) {
    await checkPermission('permChangeStatus')

    // Check ownership
    const session = await auth()
    const isAdmin = (session?.user as any)?.role === 'ADMIN'

    if (!isAdmin) {
        const report = await prisma.response.findUnique({ where: { id }, select: { assignedToId: true } })
        if (report?.assignedToId !== session?.user?.id) {
            throw new Error("You can only process reports assigned to you")
        }
    }

    await prisma.response.update({
        where: { id },
        data: { status }
    })

    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: "UPDATE_REPORT_STATUS",
                entityType: "RESPONSE",
                entityId: id,
                metadata: JSON.stringify({ status })
            }
        })
    }

    revalidatePath(`/admin/reports/${id}`)
    revalidatePath('/admin/reports')
    revalidatePath('/admin/dashboard')
}

export async function updateInternalNotes(id: string, notes: string) {
    await checkPermission('permEditNotes')

    // Check ownership
    const session = await auth()
    const isAdmin = (session?.user as any)?.role === 'ADMIN'

    if (!isAdmin) {
        const report = await prisma.response.findUnique({ where: { id }, select: { assignedToId: true } })
        if (report?.assignedToId !== session?.user?.id) {
            throw new Error("You can only edit notes on reports assigned to you")
        }
    }

    await prisma.response.update({
        where: { id },
        data: { internalNotes: notes }
    })

    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: "UPDATE_REPORT_NOTES",
                entityType: "RESPONSE",
                entityId: id
            }
        })
    }

    revalidatePath(`/admin/reports/${id}`)
}

export async function deleteReport(id: string) {
    await checkPermission('permDeleteReports' as any)

    const session = await auth()

    // Manual cascade delete because schema doesn't have onDelete: Cascade
    await prisma.$transaction([
        prisma.contact.deleteMany({ where: { responseId: id } }),
        prisma.geoPoint.deleteMany({ where: { responseId: id } }),
        prisma.attachment.deleteMany({ where: { responseId: id } }),
        prisma.response.delete({ where: { id } })
    ])

    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: "DELETE_REPORT",
                entityType: "RESPONSE",
                entityId: id
            }
        })
    }

    revalidatePath('/admin/reports')
    revalidatePath('/admin/dashboard')
}

export async function bulkUpdateReports(ids: string[], data: { status?: string, assignedToId?: string | null }) {
    await checkPermission('permBulkActionReports' as any)
    if (data.status) await checkPermission('permChangeStatus' as any)
    if (data.assignedToId) await checkPermission('permAssignReports' as any)

    const session = await auth()

    await prisma.response.updateMany({
        where: { id: { in: ids } },
        data
    })

    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: "BULK_UPDATE_REPORTS",
                entityType: "RESPONSE",
                entityId: "BULK",
                metadata: JSON.stringify({ count: ids.length, updates: data, ids })
            }
        })
    }

    revalidatePath('/admin/reports')
    revalidatePath('/admin/dashboard')
}

export async function bulkDeleteReports(ids: string[]) {
    await checkPermission('permBulkActionReports' as any)
    await checkPermission('permDeleteReports' as any)

    const session = await auth()

    // Delete each report with cascade cleanup
    for (const id of ids) {
        await prisma.$transaction([
            prisma.contact.deleteMany({ where: { responseId: id } }),
            prisma.geoPoint.deleteMany({ where: { responseId: id } }),
            prisma.attachment.deleteMany({ where: { responseId: id } }),
            prisma.response.delete({ where: { id } })
        ])
    }

    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'BULK_DELETE_REPORTS',
                entityType: 'RESPONSE',
                entityId: 'BULK',
                metadata: JSON.stringify({ count: ids.length, ids })
            }
        })
    }

    revalidatePath('/admin/reports')
    revalidatePath('/admin/dashboard')
}
