import { prisma } from "@/lib/prisma"
import { sendWebPushNotification } from "@/lib/push-notifications"

type CreateAdminNotificationInput = {
  type: string
  priority?: string
  title: string
  message: string
  link?: string | null
  userId?: string | null
  userIds?: string[]
}

function normalizeUserIds(input: { userId?: string | null; userIds?: string[] }) {
  const ids = [
    ...(input.userIds || []),
    ...(input.userId ? [input.userId] : []),
  ].filter(Boolean) as string[]

  return Array.from(new Set(ids))
}

export async function createAdminNotification(input: CreateAdminNotificationInput) {
  const { userIds: userIdsFromInput, userId, ...rest } = input
  const targetUserIds = normalizeUserIds({ userIds: userIdsFromInput, userId })

  if (targetUserIds.length > 0) {
    await prisma.$transaction(
      targetUserIds.map((targetUserId) =>
        prisma.adminNotification.create({
          data: {
            ...rest,
            priority: rest.priority || "NORMAL",
            userId: targetUserId,
          },
        })
      )
    )
  } else {
    await prisma.adminNotification.create({
      data: {
        ...rest,
        priority: rest.priority || "NORMAL",
        userId: null,
      },
    })
  }

  try {
    await sendWebPushNotification({
      title: rest.title,
      body: rest.message,
      url: rest.link || "/admin",
      tag: rest.type,
      userIds: targetUserIds.length > 0 ? targetUserIds : undefined,
    })
  } catch (error) {
    console.error("Failed to send web push notification", error)
  }
}
