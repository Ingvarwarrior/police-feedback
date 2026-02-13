'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { refreshOfficerStats } from "@/lib/officer-stats"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const callbackSchema = z.object({
  callDate: z.coerce.date(),
  eoNumber: z.string().trim().min(1, "Вкажіть № ЄО"),
  applicantName: z.string().trim().min(1, "Вкажіть ПІБ заявника"),
  applicantPhone: z.string().trim().min(1, "Вкажіть номер телефону"),
  officerIds: z.array(z.string()).min(1, "Оберіть хоча б одного поліцейського"),
  qPoliteness: z.number().int().min(1).max(5).optional(),
  qProfessionalism: z.number().int().min(1).max(5).optional(),
  qLawfulness: z.number().int().min(1).max(5).optional(),
  qResponseSpeed: z.number().int().min(1).max(5).optional(),
  qHelpfulness: z.number().int().min(1).max(5).optional(),
  qOverall: z.number().int().min(1).max(5).optional(),
  surveyNotes: z.string().optional().nullable(),
})

function hasAnyAnswer(data: z.infer<typeof callbackSchema>) {
  return Boolean(
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

export async function getCallbacks() {
  const user = await getCurrentUser()

  if (user.role !== "ADMIN" && !user.permViewReports) {
    throw new Error("У вас немає прав для перегляду callback-карток")
  }

  const where = user.role === "ADMIN" ? {} : { OR: [{ createdById: user.id }, { assignedUserId: user.id }] }

  return (prisma as any).callback.findMany({
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
    orderBy: { callDate: "desc" },
    take: 500,
  })
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
  const uniqueOfficerIds = Array.from(new Set(parsed.officerIds))
  const operatorDisplayName =
    [user.lastName, user.firstName].filter(Boolean).join(" ").trim() || user.username
  const surveyNotesWithOperator = [parsed.surveyNotes?.trim(), `ПІБ співробітника, який проводив Callback: ${operatorDisplayName}`]
    .filter(Boolean)
    .join("\n\n")

  const created = await (prisma as any).callback.create({
    data: {
      callDate: parsed.callDate,
      eoNumber: parsed.eoNumber,
      applicantName: parsed.applicantName,
      applicantPhone: parsed.applicantPhone,
      createdById: user.id,
      assignedUserId: user.id,
      status: hasAnyAnswer(parsed) ? "COMPLETED" : "PENDING",
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
      metadata: JSON.stringify({ eoNumber: created.eoNumber }),
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

  revalidatePath("/admin/callbacks")
  revalidatePath("/admin/officers")
  return { success: true, id: created.id }
}
