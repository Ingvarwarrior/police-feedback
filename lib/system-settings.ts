import { prisma } from "@/lib/prisma"

const DEFAULT_WARNING_KEYWORDS = "корупція, хабар, насилля, катування"

export async function getGlobalSettings() {
    return prisma.settings.upsert({
        where: { id: "global" },
        update: {},
        create: {
            id: "global",
            warningKeywords: DEFAULT_WARNING_KEYWORDS,
            sendAssignmentEmails: true,
        }
    })
}

export function getCriticalRatingThreshold(value: number | null | undefined): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return 2.5
    }

    return Math.min(5, Math.max(1, value))
}

export function parseWarningKeywords(raw: string | null | undefined): string[] {
    const source = raw && raw.trim().length > 0 ? raw : DEFAULT_WARNING_KEYWORDS

    return source
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
}
