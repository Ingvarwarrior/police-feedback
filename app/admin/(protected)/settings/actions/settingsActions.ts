'use server'

import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { getCriticalRatingThreshold, getGlobalSettings } from "@/lib/system-settings"
import { runPiiRetentionCleanup } from "@/lib/pii-retention"

export async function getSettings() {
    try {
        return getGlobalSettings()
    } catch (error) {
        console.error("Error fetching settings:", error)
        throw new Error("Не вдалося завантажити налаштування")
    }
}

export async function updateSettings(data: any) {
    await checkPermission("permManageSettings", true)

    const criticalRatingThreshold = getCriticalRatingThreshold(Number(data.criticalRatingThreshold))
    const piiRetentionDays = Math.max(1, Math.min(3650, Number.parseInt(String(data.piiRetentionDays ?? "30"), 10) || 30))

    try {
        const payload = {
            unitName: String(data.unitName || "").trim() || "Патрульна поліція Хмільницького району",
            unitAddress: String(data.unitAddress || "").trim(),
            emergencyPhone: String(data.emergencyPhone || "").trim() || "102",
            criticalRatingThreshold,
            piiRetentionDays,
            welcomeMessage: String(data.welcomeMessage || "").trim() || "Вітаємо в системі відгуків про роботу патрульної поліції.",
            warningKeywords: String(data.warningKeywords || "").trim() || "корупція, хабар, насилля, катування",
            sendAssignmentEmails: !!data.sendAssignmentEmails,
        }

        const updated = await prisma.settings.upsert({
            where: { id: "global" },
            update: payload,
            create: {
                id: "global",
                ...payload
            }
        })

        revalidatePath('/admin/settings')
        return updated
    } catch (error) {
        console.error("Error updating settings:", error)
        throw new Error("Не вдалося оновити налаштування")
    }
}

export async function runPiiCleanupNow() {
    await checkPermission("permManageSettings", true)

    try {
        const result = await runPiiRetentionCleanup()

        revalidatePath("/admin/reports")
        revalidatePath("/admin/settings")

        return result
    } catch (error) {
        console.error("Error running PII cleanup:", error)
        throw new Error("Не вдалося виконати очищення персональних даних")
    }
}
