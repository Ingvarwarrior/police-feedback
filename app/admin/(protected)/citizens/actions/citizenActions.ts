'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function deleteCitizen(id: string) {
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

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
    const session = await auth()
    if (!session || (session.user as any).role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

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
