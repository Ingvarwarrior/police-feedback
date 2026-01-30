'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { checkPermission } from "@/lib/permissions"
import { auth } from "@/auth"

export async function deleteCitizen(id: string) {
    await checkPermission('permDeleteCitizens' as any)

    const session = await auth()

    // Manual cascade delete
    await prisma.$transaction([
        // Unlink responses
        prisma.response.updateMany({
            where: { citizenId: id },
            data: { citizenId: null }
        }),
        // Delete related phones
        (prisma as any).citizenPhone.deleteMany({
            where: { citizenId: id }
        }),
        // Delete the citizen record
        (prisma as any).citizen.delete({
            where: { id }
        })
    ])

    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: "DELETE_CITIZEN",
                entityType: "CITIZEN",
                entityId: id
            }
        })
    }

    revalidatePath('/admin/citizens')
}

export async function bulkDeleteCitizens(ids: string[]) {
    await checkPermission('permDeleteCitizens' as any)

    const session = await auth()

    // Delete each citizen with cascade cleanup
    for (const id of ids) {
        await prisma.$transaction([
            prisma.response.updateMany({
                where: { citizenId: id },
                data: { citizenId: null }
            }),
            (prisma as any).citizenPhone.deleteMany({
                where: { citizenId: id }
            }),
            (prisma as any).citizen.delete({
                where: { id }
            })
        ])
    }

    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: 'BULK_DELETE_CITIZENS',
                entityType: 'CITIZEN',
                entityId: 'BULK',
                metadata: JSON.stringify({ count: ids.length, ids })
            }
        })
    }

    revalidatePath('/admin/citizens')
}
