import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
    trustHost: true,
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

                    return {
                        id: user.id,
                        email: user.username as string, // Using username as the unique identifier for session
                        name: user.role,
                        permViewReports: user.permViewReports,
                        permManageUsers: user.permManageUsers,
                        permEditNotes: user.permEditNotes,
                        permChangeStatus: user.permChangeStatus,
                        permExportData: user.permExportData,
                    }
                }
                return null
            },
        }),
    ],
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.name
                token.permViewReports = (user as any).permViewReports
                token.permManageUsers = (user as any).permManageUsers
                token.permEditNotes = (user as any).permEditNotes
                token.permChangeStatus = (user as any).permChangeStatus
                token.permExportData = (user as any).permExportData
            }
            return token
        },
        session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).permViewReports = token.permViewReports;
                (session.user as any).permManageUsers = token.permManageUsers;
                (session.user as any).permEditNotes = token.permEditNotes;
                (session.user as any).permChangeStatus = token.permChangeStatus;
                (session.user as any).permExportData = token.permExportData;
            }
            return session
        },
    },
    pages: {
        signIn: "/admin/login",
    },
})
