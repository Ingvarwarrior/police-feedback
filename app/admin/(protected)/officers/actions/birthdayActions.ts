'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function getOfficersWithBirthdays() {
    const session = await auth()
    if (!session) return { today: [], tomorrow: [] }

    // Get current date
    const today = new Date()
    const currentMonth = today.getMonth() + 1 // 0-11 -> 1-12
    const currentDay = today.getDate()

    // Get tomorrow's date
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const tomorrowMonth = tomorrow.getMonth() + 1
    const tomorrowDay = tomorrow.getDate()

    // Fetch active officers
    // Note: SQLite doesn't have great date functions in Prisma raw query easily across environments,
    // so fetching active officers and filtering in JS is safer for this scale.
    const officers = await prisma.officer.findMany({
        where: {
            status: 'ACTIVE',
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
            department: true
        }
    })

    const result = {
        today: [] as typeof officers,
        tomorrow: [] as typeof officers
    }

    officers.forEach(officer => {
        if (!officer.birthDate) return
        const d = new Date(officer.birthDate)
        const m = d.getMonth() + 1
        const day = d.getDate()

        if (m === currentMonth && day === currentDay) {
            result.today.push(officer)
        } else if (m === tomorrowMonth && day === tomorrowDay) {
            result.tomorrow.push(officer)
        }
    })

    return result
}
