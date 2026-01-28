import { auth } from "@/auth"

export async function checkPermission(permission?: keyof import("@prisma/client").User) {
    const session = await auth()
    const user = session?.user as any

    if (!user) {
        throw new Error("Unauthorized")
    }

    // Admins have all permissions by default
    if (user.role === 'ADMIN') {
        return true
    }

    if (permission && !user[permission as string]) {
        throw new Error("Missing required permission: " + (permission as string))
    }

    return true
}
