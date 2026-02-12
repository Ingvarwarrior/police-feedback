import { auth } from "@/auth"
import type { PermissionId } from "@/lib/permissions-config"

export async function checkPermission(permission?: PermissionId) {
    const session = await auth()
    const user = session?.user as any

    if (!user) {
        throw new Error("Unauthorized")
    }

    // Admins have all permissions by default
    if (user.role === 'ADMIN') {
        return true
    }

    if (permission && !user[permission]) {
        throw new Error("Missing required permission: " + permission)
    }

    return true
}
