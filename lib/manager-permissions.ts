import { prisma } from "@/lib/prisma"

type ManagerPermissionLike = {
  role?: string | null
  permReturnUnifiedRecords?: boolean | null
  permManager?: boolean | null
}

export function canActAsManager(user: ManagerPermissionLike | null | undefined) {
  if (!user) return false
  return user.role === "ADMIN" || !!user.permReturnUnifiedRecords || !!user.permManager
}

export async function getManagerUserIds(options?: { excludeUserIds?: string[] }) {
  const excluded = new Set((options?.excludeUserIds || []).filter(Boolean))
  const managers = await prisma.user.findMany({
    where: {
      active: true,
      OR: [
        { role: "ADMIN" },
        { permManager: true },
        { permReturnUnifiedRecords: true },
      ],
    },
    select: { id: true },
  })

  return managers.map((user) => user.id).filter((id) => !excluded.has(id))
}
