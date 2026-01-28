'use server'

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function loginAction(formData: FormData) {
    try {
        const username = formData.get('username') as string
        const password = formData.get('password') as string

        await signIn('credentials', {
            username,
            password,
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
