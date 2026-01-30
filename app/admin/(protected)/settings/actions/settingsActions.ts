'use server'

import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

export async function getSettings() {
    try {
        let settings = await prisma.settings.findUnique({
            where: { id: "global" }
        })

        if (!settings) {
            settings = await prisma.settings.create({
                data: { id: "global" }
            })
        }

        return settings
    } catch (error: any) {
        console.error("Error fetching settings:", error)
        throw new Error(`Помилка БД: ${error.message || 'Невідома помилка'}`)
    }
}

export async function updateSettings(data: any) {
    await checkPermission("permManageSettings", true)

    try {
        const updated = await prisma.settings.update({
            where: { id: "global" },
            data: {
                unitName: data.unitName,
                unitAddress: data.unitAddress,
                emergencyPhone: data.emergencyPhone,
                criticalRatingThreshold: parseFloat(data.criticalRatingThreshold),
                piiRetentionDays: parseInt(data.piiRetentionDays),
                welcomeMessage: data.welcomeMessage,
                warningKeywords: data.warningKeywords,
            }
        })

        revalidatePath('/admin/settings')
        return updated
    } catch (error) {
        console.error("Error updating settings:", error)
        throw new Error("Не вдалося оновити налаштування")
    }
}
