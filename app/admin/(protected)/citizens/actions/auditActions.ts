'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function logDossierView(citizenId: string, citizenName: string) {
    const session = await auth()
    if (!session?.user?.id) return

    await prisma.auditLog.create({
        data: {
            actorUserId: session.user.id,
            action: 'VIEW_DOSSIER',
            entityType: 'CITIZEN',
            entityId: citizenId,
            metadata: JSON.stringify({ name: citizenName })
        }
    })
}

export async function getDossierAuditLogs(citizenId: string) {
    return await prisma.auditLog.findMany({
        where: {
            entityType: 'CITIZEN',
            entityId: citizenId,
            action: 'VIEW_DOSSIER'
        },
        include: {
            actorUser: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 20
    })
}
