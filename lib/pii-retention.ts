import { prisma } from "@/lib/prisma"
import { getGlobalSettings } from "@/lib/system-settings"

export async function runPiiRetentionCleanup() {
    const settings = await getGlobalSettings()
    const retentionDays = Math.max(1, settings.piiRetentionDays)
    const cutoffDate = new Date()
    cutoffDate.setHours(0, 0, 0, 0)
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await prisma.contact.updateMany({
        where: {
            response: {
                createdAt: { lt: cutoffDate }
            },
            OR: [
                { phone: { not: "[ANONYMIZED]" } },
                { name: { not: null } }
            ]
        },
        data: {
            name: null,
            phone: "[ANONYMIZED]"
        }
    })

    return {
        updatedContacts: result.count,
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
    }
}

