'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function changePassword(currentPassword: string, newPassword: string) {
    const session = await auth()
    if (!session?.user?.email) {
        throw new Error("Unauthorized")
    }

    const user = await prisma.user.findUnique({
        where: { username: session.user.email as string }
    })

    if (!user) {
        throw new Error("User not found")
    }

    // Verify current password (Plaintext for now as per auth.ts)
    if (user.passwordHash !== currentPassword) {
        throw new Error("Невірний поточний пароль")
    }

    // Update password
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPassword }
    })

    revalidatePath('/')
}
