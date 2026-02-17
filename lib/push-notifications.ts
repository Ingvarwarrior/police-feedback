import { prisma } from "@/lib/prisma"

type PushTarget = {
  title: string
  body: string
  url?: string | null
  tag?: string
}

const VAPID_PUBLIC_KEY =
  process.env.WEB_PUSH_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  ""
const VAPID_PRIVATE_KEY =
  process.env.WEB_PUSH_PRIVATE_KEY ||
  process.env.VAPID_PRIVATE_KEY ||
  ""
const VAPID_SUBJECT =
  process.env.WEB_PUSH_SUBJECT ||
  process.env.VAPID_SUBJECT ||
  "mailto:admin@police.gov.ua"

let vapidConfigured = false
let webPushModulePromise: Promise<any | null> | null = null

async function loadWebPushModule() {
  if (webPushModulePromise) return webPushModulePromise

  webPushModulePromise = (async () => {
    try {
      const moduleName = "web-push"
      const mod = await import(moduleName)
      return mod?.default || mod
    } catch (error) {
      console.error("web-push package is not available, push delivery is disabled", error)
      return null
    }
  })()

  return webPushModulePromise
}

async function ensureVapidConfigured() {
  if (!isWebPushConfigured()) return null
  const webpush = await loadWebPushModule()
  if (!webpush) return null
  if (vapidConfigured) return webpush
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  vapidConfigured = true
  return webpush
}

export function isWebPushConfigured() {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}

export function getWebPushPublicKey() {
  return VAPID_PUBLIC_KEY
}

export async function sendWebPushNotification(payload: PushTarget & { userIds?: string[] }) {
  if (!isWebPushConfigured()) return { sent: 0, failed: 0, skipped: true as const }

  const webpush = await ensureVapidConfigured()
  if (!webpush) return { sent: 0, failed: 0, skipped: true as const }

  const targetUserIds = Array.from(new Set((payload.userIds || []).filter(Boolean)))
  const where = targetUserIds.length > 0 ? { userId: { in: targetUserIds } } : {}

  const subscriptions = await prisma.pushSubscription.findMany({
    where,
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  })

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: false as const }
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/admin",
    tag: payload.tag || "admin-notification",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  })

  let sent = 0
  let failed = 0
  const invalidIds: string[] = []

  for (const item of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: item.endpoint,
          keys: {
            p256dh: item.p256dh,
            auth: item.auth,
          },
        },
        body,
        {
          TTL: 60,
          urgency: "high",
        }
      )
      sent += 1
    } catch (error: any) {
      failed += 1
      const statusCode = Number(error?.statusCode || 0)
      if (statusCode === 404 || statusCode === 410) {
        invalidIds.push(item.id)
      }
      console.error("Web push delivery failed", {
        endpoint: item.endpoint,
        statusCode,
        message: error?.message || "unknown error",
      })
    }
  }

  if (invalidIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: invalidIds } },
    })
  }

  return { sent, failed, skipped: false as const }
}
