'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { createAdminNotification } from "@/lib/admin-notification-service"

export async function getNotifications() {
    const session = await auth()
    if (!session?.user) return []

    const userId = (session.user as any).id

    let notifications: any[] = []
    try {
        // Fetch notifications that:
        // 1. Are either global (userId: null) or targeted to this user
        // 2. Have NOT been read by this specific user (no record in NotificationRead)
        notifications = await prisma.adminNotification.findMany({
            where: {
                OR: [
                    { userId: userId },
                    { userId: null }
                ],
                readBy: {
                    none: {
                        userId: userId || 'none-exist-id'
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        })
    } catch (dbError: any) {
        console.error('Notification fetch error:', dbError)
        return [{
            id: 'diag-db-error-' + Date.now(),
            type: 'SYSTEM',
            priority: 'URGENT',
            title: '❌ Помилка БД (Таблиця відсутня?)',
            message: `Потрібно виконати "npx prisma db push" на сервері. Помилка: ${dbError.message.slice(0, 50)}...`,
            createdAt: new Date(),
            link: null,
            read: false
        }]
    }

    // Prepare results
    let results = [...notifications]

    // Add a diagnostic warning only if ID is missing (old session)
    if (!userId) {
        results.unshift({
            id: 'diag-warn-session-' + Date.now(),
            type: 'SYSTEM',
            priority: 'HIGH',
            title: '⚠️ Потрібно перевхід',
            message: `Система виявила застарілу сесію. Будь ласка, Вийдіть та Зайдіть знову.`,
            createdAt: new Date(),
            link: null,
            read: false
        })
    }

    if (results.length === 0 && userId) {
        return [] // Safe empty return if user is valid but no notifications
    }

    return results
}

export async function markAsRead(notificationId: string) {
    const session = await auth()
    if (!session?.user?.id) return

    const userId = (session.user as any).id

    // Check if already read to avoid unique constraint error
    const exists = await prisma.notificationRead.findUnique({
        where: {
            notificationId_userId: {
                notificationId,
                userId
            }
        }
    })

    if (!exists) {
        await prisma.notificationRead.create({
            data: {
                notificationId,
                userId
            }
        })
    }

    revalidatePath('/admin')
}

export async function markAllAsRead() {
    const session = await auth()
    if (!session?.user?.id) return

    const userId = (session.user as any).id

    // Find all unread notifications for this user
    const unread = await prisma.adminNotification.findMany({
        where: {
            OR: [
                { userId: userId },
                { userId: null }
            ],
            readBy: {
                none: {
                    userId: userId
                }
            }
        }
    })

    // Create read records for all
    for (const n of unread) {
        await prisma.notificationRead.upsert({
            where: {
                notificationId_userId: {
                    notificationId: n.id,
                    userId
                }
            },
            update: {},
            create: {
                notificationId: n.id,
                userId
            }
        })
    }

    revalidatePath('/admin')
}

export async function checkStaleReports() {
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const staleReports = await prisma.response.findMany({
        where: {
            status: 'NEW',
            createdAt: { lt: oneDayAgo }
        },
        take: 5
    })

    for (const report of staleReports) {
        const exists = await prisma.adminNotification.findFirst({
            where: {
                type: 'STALE_REPORT',
                link: `/admin/reports/${report.id}`,
                read: false
            }
        })

        if (!exists) {
            await createAdminNotification({
                type: 'STALE_REPORT',
                priority: 'HIGH',
                title: '⏳ Планшет пропущено (24г+)',
                message: `Звіт ${report.patrolRef || report.id.slice(0, 8)} очікує призначення більше доби.`,
                link: `/admin/reports/${report.id}`,
            })
        }
    }
}
