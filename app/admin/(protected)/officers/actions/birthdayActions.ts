'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function getOfficersWithBirthdays() {
    const session = await auth()
    if (!session) return []

    // Get current date
    const today = new Date()
    const currentMonth = today.getMonth() + 1 // 0-11 -> 1-12
    const currentDay = today.getDate()

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

    // Filter for today's birthday
    const birthdayOfficers = officers.filter(officer => {
        if (!officer.birthDate) return false
        const d = new Date(officer.birthDate)
        return d.getMonth() + 1 === currentMonth && d.getDate() === currentDay
    })

    return birthdayOfficers
}
