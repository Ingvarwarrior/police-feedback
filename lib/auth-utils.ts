import { auth } from "@/auth"
import { redirect } from "next/navigation"

/**
 * Checks if the current user has a specific permission.
 * Works only in Server Components / Server Actions.
 */
export async function checkPermission(permissionName: string, redirectToDash: boolean = false) {
    const session = await auth()
    if (!session) {
        if (redirectToDash) redirect("/admin/login")
        return false
    }

    const user = session.user as any
    const hasPerm = user.role === 'ADMIN' || !!user[permissionName]

    if (!hasPerm && redirectToDash) {
        redirect("/admin/dashboard?error=forbidden")
    }

    return hasPerm
}

/**
 * Gets the current user with all permission fields from session.
 */
export async function getCurrentUser() {
    const session = await auth()
    return session?.user as any
}
