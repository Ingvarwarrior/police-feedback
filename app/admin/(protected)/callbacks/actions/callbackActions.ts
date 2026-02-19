'use server'

import { auth } from "@/auth"
import { normalizeEoNumber, normalizePersonName, normalizePhoneNumber } from "@/lib/normalization"
import { prisma } from "@/lib/prisma"
import { refreshOfficerStats } from "@/lib/officer-stats"
import { createAdminNotification } from "@/lib/admin-notification-service"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const callbackSchema = z.object({
  callDate: z.coerce.date(),
  eoNumber: z.string().trim().min(1, "Вкажіть № ЄО"),
  applicantName: z.string().trim().min(1, "Вкажіть ПІБ заявника"),
  applicantPhone: z.string().trim().min(1, "Вкажіть номер телефону"),
  officerIds: z.array(z.string()).min(1, "Оберіть хоча б одного поліцейського"),
  checkResult: z.enum(["CONFIRMED", "NOT_CONFIRMED"]).optional(),
  qPoliteness: z.number().int().min(1).max(5).optional(),
  qProfessionalism: z.number().int().min(1).max(5).optional(),
  qLawfulness: z.number().int().min(1).max(5).optional(),
  qResponseSpeed: z.number().int().min(1).max(5).optional(),
  qHelpfulness: z.number().int().min(1).max(5).optional(),
  qOverall: z.number().int().min(1).max(5).optional(),
  surveyNotes: z.string().optional().nullable(),
})

const callbackDuplicateCheckSchema = z.object({
  eoNumber: z.string().trim().min(1),
  callDate: z.coerce.date(),
})

const DEFAULT_LOW_CALLBACK_RATING_THRESHOLD = 2
const rawLowRatingThreshold = Number.parseInt(process.env.CALLBACK_LOW_RATING_THRESHOLD || "", 10)
const LOW_CALLBACK_RATING_THRESHOLD = Number.isFinite(rawLowRatingThreshold)
  ? Math.min(Math.max(rawLowRatingThreshold, 1), 5)
  : DEFAULT_LOW_CALLBACK_RATING_THRESHOLD

function getYearRange(date: Date) {
  const year = date.getFullYear()
  return {
    year,
    from: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
    to: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)),
  }
}

function hasAnyAnswer(data: z.infer<typeof callbackSchema>) {
  return Boolean(
    data.checkResult ||
    data.qPoliteness ||
      data.qProfessionalism ||
      data.qLawfulness ||
      data.qResponseSpeed ||
      data.qHelpfulness ||
      data.qOverall ||
      (data.surveyNotes && data.surveyNotes.trim())
  )
}

async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.email) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({
    where: { username: session.user.email },
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      username: true,
      permViewReports: true,
      permAssignReports: true,
      permChangeStatus: true,
    },
  })

  if (!user) throw new Error("User not found")
  return user
}

async function applyLowRatingRiskSignal(params: {
  eoNumber: string
  qOverall?: number | null
  callbackId: string
  actorUserId: string
}) {
  const { eoNumber, qOverall, callbackId, actorUserId } = params
  if (!qOverall || qOverall > LOW_CALLBACK_RATING_THRESHOLD) return

  const linkedRecord = await prisma.unifiedRecord.findFirst({
    where: {
      eoNumber,
      recordType: { in: ["EO", "ZVERN"] },
    },
    select: {
      id: true,
      eoNumber: true,
      status: true,
      assignedUserId: true,
    },
  })

  if (!linkedRecord) return

  const movedToReview = linkedRecord.status !== "REVIEW"
  if (movedToReview) {
    await prisma.unifiedRecord.update({
      where: { id: linkedRecord.id },
      data: {
        status: "REVIEW",
        processedAt: null,
        resolutionDate: null,
      },
    })
  }

  const userTargets = new Set<string>()
  if (linkedRecord.assignedUserId) userTargets.add(linkedRecord.assignedUserId)
  userTargets.add(actorUserId)

  const notificationMessage = movedToReview
    ? `По ЄО №${linkedRecord.eoNumber} отримано низьку callback-оцінку ${qOverall}/5. Запис переведено у статус "На перевірці".`
    : `По ЄО №${linkedRecord.eoNumber} отримано низьку callback-оцінку ${qOverall}/5. Запис уже перебуває у статусі "На перевірці".`

  if (userTargets.size === 0) {
    await createAdminNotification({
      title: "Низька callback-оцінка",
      message: notificationMessage,
      type: "ALERT",
      priority: "HIGH",
      link: `/admin/unified-record?search=${encodeURIComponent(linkedRecord.eoNumber)}`,
    })
  } else {
    await createAdminNotification({
      userIds: Array.from(userTargets),
      title: "Низька callback-оцінка",
      message: notificationMessage,
      type: "ALERT",
      priority: "HIGH",
      link: `/admin/unified-record?search=${encodeURIComponent(linkedRecord.eoNumber)}`,
    })
  }

  await prisma.auditLog.create({
    data: {
      actorUserId,
      action: "CALLBACK_LOW_RATING_SIGNAL",
      entityType: "UNIFIED_RECORD",
      entityId: linkedRecord.id,
      metadata: JSON.stringify({
        callbackId,
        eoNumber: linkedRecord.eoNumber,
        qOverall,
        movedToReview,
      }),
    },
  })
}

export async function getCallbacks() {
  const user = await getCurrentUser()

  if (user.role !== "ADMIN" && !user.permViewReports) {
    throw new Error("У вас немає прав для перегляду callback-карток")
  }

  const where = user.role === "ADMIN" ? {} : { OR: [{ createdById: user.id }, { assignedUserId: user.id }] }

  const callbacks = await (prisma as any).callback.findMany({
    where,
    include: {
      officers: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          badgeNumber: true,
          rank: true,
          department: true,
        },
      },
      assignedUser: {
        select: { id: true, firstName: true, lastName: true, username: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, username: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  })

  return callbacks
    .map((cb: any, index: number) => ({ ...cb, callbackNumber: index + 1 }))
    .sort((a: any, b: any) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime())
}

export async function getCallbackReferenceData() {
  const user = await getCurrentUser()

  if (user.role !== "ADMIN" && !user.permViewReports) {
    throw new Error("У вас немає прав для перегляду callback-карток")
  }

  const officers = await prisma.officer.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      badgeNumber: true,
      rank: true,
      department: true,
    },
  })

  return { officers }
}

export async function createCallback(input: z.input<typeof callbackSchema>) {
  const user = await getCurrentUser()

  if (user.role !== "ADMIN" && !user.permAssignReports && !user.permChangeStatus) {
    throw new Error("У вас немає прав для створення callback-карток")
  }

  const parsed = callbackSchema.parse(input)
  const normalizedEoNumber = normalizeEoNumber(parsed.eoNumber) || parsed.eoNumber.trim()
  const normalizedApplicantName = normalizePersonName(parsed.applicantName) || parsed.applicantName.trim()
  const normalizedApplicantPhone = normalizePhoneNumber(parsed.applicantPhone) || parsed.applicantPhone.trim()
  const uniqueOfficerIds = Array.from(new Set(parsed.officerIds))
  const { year, from, to } = getYearRange(parsed.callDate)
  const duplicateCount = await (prisma as any).callback.count({
    where: {
      eoNumber: normalizedEoNumber,
      callDate: {
        gte: from,
        lt: to,
      },
    },
  })

  if (duplicateCount > 0) {
    throw new Error(`Callback по № ЄО ${normalizedEoNumber} у ${year} році вже здійснювався`)
  }

  const operatorDisplayName =
    [user.lastName, user.firstName].filter(Boolean).join(" ").trim() || user.username
  const surveyNotesWithOperator = [parsed.surveyNotes?.trim(), `ПІБ співробітника, який проводив Callback: ${operatorDisplayName}`]
    .filter(Boolean)
    .join("\n\n")

  const created = await (prisma as any).callback.create({
    data: {
      callDate: parsed.callDate,
      eoNumber: normalizedEoNumber,
      applicantName: normalizedApplicantName,
      applicantPhone: normalizedApplicantPhone,
      createdById: user.id,
      assignedUserId: user.id,
      status: hasAnyAnswer(parsed) ? "COMPLETED" : "PENDING",
      checkResult: parsed.checkResult || "UNSET",
      qPoliteness: parsed.qPoliteness,
      qProfessionalism: parsed.qProfessionalism,
      qLawfulness: parsed.qLawfulness,
      qResponseSpeed: parsed.qResponseSpeed,
      qHelpfulness: parsed.qHelpfulness,
      qOverall: parsed.qOverall,
      surveyNotes: surveyNotesWithOperator || null,
      officers: {
        connect: uniqueOfficerIds.map((id) => ({ id })),
      },
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "CREATE_CALLBACK",
      entityType: "CALLBACK",
      entityId: created.id,
      metadata: JSON.stringify({
        eoNumber: created.eoNumber,
        qOverall: parsed.qOverall || null,
        checkResult: parsed.checkResult || "UNSET",
      }),
    },
  })

  for (const officerId of uniqueOfficerIds) {
    try {
      await refreshOfficerStats(officerId)
    } catch (error) {
      // Callback is already saved; stats recalculation should not break user flow.
      console.error("Failed to refresh officer stats from callback", { officerId, error })
    }
  }

  await applyLowRatingRiskSignal({
    eoNumber: normalizedEoNumber,
    qOverall: parsed.qOverall,
    callbackId: created.id,
    actorUserId: user.id,
  })

  revalidatePath("/admin/callbacks")
  revalidatePath("/admin/unified-record")
  revalidatePath("/admin/analytics")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/officers")
  return { success: true, id: created.id }
}

export async function checkCallbackDuplicateByEo(input: z.input<typeof callbackDuplicateCheckSchema>) {
  const user = await getCurrentUser()

  if (user.role !== "ADMIN" && !user.permAssignReports && !user.permChangeStatus && !user.permViewReports) {
    throw new Error("У вас немає прав для перевірки callback-карток")
  }

  const parsed = callbackDuplicateCheckSchema.parse(input)
  const eoNumber = normalizeEoNumber(parsed.eoNumber) || parsed.eoNumber.trim()
  const { year, from, to } = getYearRange(parsed.callDate)

  const duplicates = await (prisma as any).callback.findMany({
    where: {
      eoNumber,
      callDate: {
        gte: from,
        lt: to,
      },
    },
    select: {
      id: true,
      callDate: true,
      applicantName: true,
    },
    orderBy: { callDate: "desc" },
    take: 5,
  })

  return {
    exists: duplicates.length > 0,
    count: duplicates.length,
    year,
    examples: duplicates,
  }
}

export async function deleteCallback(callbackId: string) {
  const user = await getCurrentUser()

  if (user.role !== "ADMIN") {
    throw new Error("Лише адміністратор може видаляти callback-картки")
  }

  const callback = await (prisma as any).callback.findUnique({
    where: { id: callbackId },
    select: {
      id: true,
      eoNumber: true,
      officers: { select: { id: true } },
    },
  })

  if (!callback) {
    throw new Error("Callback-картку не знайдено")
  }

  await (prisma as any).callback.delete({
    where: { id: callbackId },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "DELETE_CALLBACK",
      entityType: "CALLBACK",
      entityId: callback.id,
      metadata: JSON.stringify({ eoNumber: callback.eoNumber }),
    },
  })

  for (const officer of callback.officers || []) {
    try {
      await refreshOfficerStats(officer.id)
    } catch (error) {
      console.error("Failed to refresh officer stats after callback deletion", {
        callbackId,
        officerId: officer.id,
        error,
      })
    }
  }

  revalidatePath("/admin/callbacks")
  revalidatePath("/admin/officers")
  return { success: true }
}
