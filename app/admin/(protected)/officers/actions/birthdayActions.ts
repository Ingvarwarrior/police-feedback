'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function getOfficersWithBirthdays() {
    const session = await auth()
    if (!session) return { today: [], tomorrow: [] }

    const today = new Date()

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const kyivFormatter = new Intl.DateTimeFormat("uk-UA", {
        timeZone: "Europe/Kyiv",
        day: "2-digit",
        month: "2-digit",
    })

    const getMonthDayKey = (date: Date) => {
        const parts = kyivFormatter.formatToParts(date)
        const day = parts.find((p) => p.type === "day")?.value || ""
        const month = parts.find((p) => p.type === "month")?.value || ""
        return `${month}-${day}`
    }

    const todayKey = getMonthDayKey(today)
    const tomorrowKey = getMonthDayKey(tomorrow)

    const officers = await prisma.officer.findMany({
        where: {
            birthDate: {
                not: null
            }
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            badgeNumber: true,
            birthDate: true,
            imageUrl: true,
            rank: true,
            department: true,
            status: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    })

    const result = {
        today: [] as typeof officers,
        tomorrow: [] as typeof officers
    }

    officers.forEach(officer => {
        if (!officer.birthDate) return

        const status = String(officer.status || "ACTIVE").trim().toUpperCase()
        if (status === "INACTIVE" || status === "DISMISSED" || status === "ARCHIVED") return

        const birthDate = new Date(officer.birthDate)
        if (Number.isNaN(birthDate.getTime())) return

        const birthdayKey = getMonthDayKey(birthDate)

        if (birthdayKey === todayKey) {
            result.today.push(officer)
        } else if (birthdayKey === tomorrowKey) {
            result.tomorrow.push(officer)
        }
    })

    return result
}
