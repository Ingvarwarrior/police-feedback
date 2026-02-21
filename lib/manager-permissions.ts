import { prisma } from "@/lib/prisma"

type ManagerPermissionLike = {
  role?: string | null
  permReturnUnifiedRecords?: boolean | null
  permManager?: boolean | null
}

type ManagerNotificationRecipient = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
}

export function canActAsManager(user: ManagerPermissionLike | null | undefined) {
  if (!user) return false
  return user.role === "ADMIN" || !!user.permReturnUnifiedRecords || !!user.permManager
}

export async function getManagerUserIds(options?: { excludeUserIds?: string[] }) {
  const managers = await getManagerNotificationRecipients(options)
  return managers.map((user) => user.id)
}

export async function getManagerNotificationRecipients(
  options?: { excludeUserIds?: string[] },
): Promise<ManagerNotificationRecipient[]> {
  const excluded = new Set((options?.excludeUserIds || []).filter(Boolean))
  const managers = await prisma.user.findMany({
    where: {
      active: true,
      OR: [{ role: "ADMIN" }, { permManager: true }, { permReturnUnifiedRecords: true }],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  })

  return managers.filter((user) => !excluded.has(user.id))
}
