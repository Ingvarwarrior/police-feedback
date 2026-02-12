import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from 'bcryptjs'
import { decryptSecret, isTwoFactorEnabledGlobally, verifyTotpCode } from "@/lib/two-factor"

export const { handlers, auth, signIn, signOut } = NextAuth({
    trustHost: true,
    session: {
        strategy: "jwt",
        // Effectively disables short session expiry for active users.
        maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
        updateAge: 0,
    },
    cookies: {
        sessionToken: {
                name: `next-auth.session-token`,
                options: {
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/",
                    secure: process.env.NODE_ENV === "production",
                },
            },
        },
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null
                const user = await prisma.user.findUnique({
                    where: { username: credentials.username as string },
                })
                if (!user || !user.active) return null

                const isPasswordValid = await bcrypt.compare(credentials.password as string, user.passwordHash)
                if (isPasswordValid) {
                    const totpCode = ((credentials as any).otp as string | undefined)?.trim() || ""
                    let twoFactorValidated = true
                    const userAny = user as any

                    if (isTwoFactorEnabledGlobally() && userAny.twoFactorEnabled) {
                        twoFactorValidated = false
                        if (!totpCode || !userAny.twoFactorSecretEncrypted) {
                            return null
                        }

                        let secret = ""
                        try {
                            secret = decryptSecret(userAny.twoFactorSecretEncrypted)
                        } catch {
                            return null
                        }

                        if (!verifyTotpCode(secret, totpCode)) {
                            return null
                        }
                        twoFactorValidated = true
                    }

                    // Log the login action
                    await prisma.auditLog.create({
                        data: {
                            actorUserId: user.id,
                            action: 'LOGIN',
                            entityType: 'USER',
                            entityId: user.id,
                            metadata: JSON.stringify({ username: user.username, timestamp: new Date().toISOString() })
                        }
                    })

                    const permissionPayload = Object.fromEntries(
                        Object.entries(user as Record<string, unknown>).filter(([key]) => key.startsWith("perm"))
                    )

                    return {
                        id: user.id,
                        email: user.username as string, // Using username as the unique identifier for session
                        name: user.role,
                        ...permissionPayload,
                        isTwoFactorVerified: twoFactorValidated,
                    }
                }
                return null
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            // When user logs in
            if (user) {
                token.id = user.id
                token.role = user.name
                token.id = user.id
                token.role = user.name

                // Map all permissions from user object to token
                const u = user as any;
                Object.keys(u).forEach((key) => {
                    if (key.startsWith("perm")) {
                        token[key] = u[key]
                    }
                })
            }

            // High security & Real-time Permissions: 
            // Check if user is still active and refresh permissions from DB on every request/token refresh.
            // This ensures permissions take effect immediately without logout/login.
            if (token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string }
                })

                if (!dbUser || !dbUser.active) {
                    // Force invalidation by returning null
                    return null as any
                }

                // Hot-reload role and all permissions from database
                token.role = dbUser.role

                const dbUserAny = dbUser as any
                Object.keys(dbUserAny).forEach(key => {
                    if (key.startsWith('perm')) {
                        token[key] = dbUserAny[key]
                    }
                })
            }

            return token
        },
        session({ session, token }) {
            if (session.user && token) {
                // Session population
                const u = session.user as any
                u.id = token.id;
                u.role = token.role;

                // Spread all permission fields from token to session user
                const permKeys = Object.keys(token).filter(k => k.startsWith('perm'));
                permKeys.forEach(k => u[k] = token[k]);
                u.isTwoFactorVerified = token.isTwoFactorVerified
            }
            return session
        },
    },
    pages: {
        signIn: "/admin/login",
    },
})
