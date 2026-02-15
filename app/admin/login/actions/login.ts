'use server'

import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { isTwoFactorEnabledGlobally } from "@/lib/two-factor"
import { normalizeUsername } from "@/lib/normalization"

export async function loginAction(formData: FormData) {
    try {
        const username = normalizeUsername(formData.get('username') as string) || ""
        const password = (formData.get('password') as string || "").trim()
        const otp = (formData.get('otp') as string || "").trim()

        if (!username || !password) {
            return { error: 'Вкажіть логін і пароль' }
        }

        if (isTwoFactorEnabledGlobally() && !otp) {
            const user = await prisma.user.findUnique({
                where: { username }
            })

            const userAny = user as any
            if (userAny?.active && userAny?.twoFactorEnabled) {
                const isPasswordValid = await bcrypt.compare(password, userAny.passwordHash)
                if (isPasswordValid) {
                    return { requiresTwoFactor: true }
                }
            }
        }

        await signIn('credentials', {
            username,
            password,
            otp,
            redirectTo: '/admin/dashboard',
        })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return { error: 'Невірний логін або пароль' }
                default:
                    return { error: 'Помилка авторизації' }
            }
        }
        throw error // Rethrow redirect errors
    }
}
