'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from 'bcryptjs'
import {
    buildOtpAuthUrl,
    decryptSecret,
    encryptSecret,
    generateTwoFactorSecret,
    isTwoFactorEnabledGlobally,
    verifyTotpCode
} from "@/lib/two-factor"

export async function changePassword(currentPassword: string, newPassword: string) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    })

    if (!user) {
        throw new Error("User not found")
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isPasswordValid) {
        throw new Error("Невірний поточний пароль")
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword }
    })

    revalidatePath('/')
}

export async function startTwoFactorSetup() {
    if (!isTwoFactorEnabledGlobally()) {
        return { error: "2FA вимкнено в конфігурації системи" }
    }

    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
        return { error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    })

    if (!user) {
        return { error: "Користувача не знайдено" }
    }

    const userAny = user as any
    if (userAny.twoFactorEnabled) {
        return { error: "2FA вже увімкнено для цього користувача" }
    }

    const secret = generateTwoFactorSecret()
    const encryptedSecret = encryptSecret(secret)
    const otpauthUrl = buildOtpAuthUrl(userAny.username, secret)

    await prisma.user.update({
        where: { id: userAny.id },
        data: { twoFactorTempSecret: encryptedSecret } as any
    })

    return {
        secret,
        otpauthUrl,
    }
}

export async function confirmTwoFactorSetup(code: string) {
    if (!isTwoFactorEnabledGlobally()) {
        return { error: "2FA вимкнено в конфігурації системи" }
    }

    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const normalizedCode = code.trim()
    if (!/^\d{6}$/.test(normalizedCode)) {
        return { error: "Код має містити 6 цифр" }
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    })

    const userAny = user as any
    if (!userAny?.twoFactorTempSecret) {
        return { error: "Спочатку згенеруйте QR-код" }
    }

    const secret = decryptSecret(userAny.twoFactorTempSecret)
    const isValid = verifyTotpCode(secret, normalizedCode)

    if (!isValid) {
        return { error: "Невірний код підтвердження" }
    }

    await prisma.user.update({
        where: { id: userAny.id },
        data: {
            twoFactorEnabled: true,
            twoFactorSecretEncrypted: userAny.twoFactorTempSecret,
            twoFactorTempSecret: null,
            twoFactorEnabledAt: new Date(),
        } as any
    })

    revalidatePath('/admin/profile')
    return { success: true }
}

export async function disableTwoFactor(currentPassword: string) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    })

    if (!user) {
        return { error: "Користувача не знайдено" }
    }

    const userAny = user as any
    if (!userAny.twoFactorEnabled) {
        return { error: "2FA вже вимкнено" }
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, userAny.passwordHash)
    if (!isPasswordValid) {
        return { error: "Невірний пароль" }
    }

    await prisma.user.update({
        where: { id: userAny.id },
        data: {
            twoFactorEnabled: false,
            twoFactorSecretEncrypted: null,
            twoFactorTempSecret: null,
            twoFactorEnabledAt: null,
        } as any
    })

    revalidatePath('/admin/profile')
    return { success: true }
}
