import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendUnifiedRecordReminderEmail } from '@/lib/mail'

export async function GET(request: Request) {
    // Basic security check (use an API key or internal header if possible)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)

        const theDayAfterTomorrow = new Date(tomorrow)
        theDayAfterTomorrow.setDate(tomorrow.getDate() + 1)

        // Find records with deadline today or tomorrow
        const recordsToRemind = await prisma.unifiedRecord.findMany({
            where: {
                status: { not: 'PROCESSED' },
                assignedUserId: { not: null },
                deadline: {
                    gte: today,
                    lt: theDayAfterTomorrow
                }
            },
            include: {
                assignedUser: true
            }
        })

        let sentCount = 0

        for (const record of recordsToRemind) {
            if (!record.assignedUser || !record.assignedUser.email) continue

            const deadlineDate = new Date(record.deadline!)
            deadlineDate.setHours(0, 0, 0, 0)

            const daysLeft = Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            if (daysLeft === 0 || daysLeft === 1) {
                await sendUnifiedRecordReminderEmail(record.assignedUser, record, daysLeft)
                sentCount++
            }
        }

        return NextResponse.json({ success: true, sentCount })
    } catch (error) {
        console.error('[CRON] Error sending reminders:', error)
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
    }
}
