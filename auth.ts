import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
    trustHost: true,
    session: {
        strategy: "jwt",
        maxAge: 1200, // 20 minutes in seconds
        updateAge: 0, // Ensure the session is updated on every interaction
    },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_VERSION === "production",
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
                        // Reports
                        permViewReports: user.permViewReports,
                        permAssignReports: user.permAssignReports,
                        permViewSensitiveData: user.permViewSensitiveData,
                        permBulkActionReports: user.permBulkActionReports,
                        // Administrative
                        permManageUsers: user.permManageUsers,
                        permEditNotes: user.permEditNotes,
                        permChangeStatus: user.permChangeStatus,
                        permExportData: user.permExportData,
                        permDeleteReports: user.permDeleteReports,
                        // Officers
                        permCreateOfficers: user.permCreateOfficers,
                        permEditOfficers: user.permEditOfficers,
                        permDeleteOfficers: user.permDeleteOfficers,
                        permViewOfficerStats: user.permViewOfficerStats,
                        permCreateEvaluations: user.permCreateEvaluations,
                        permManageOfficerStatus: user.permManageOfficerStatus,
                        // Unified Records
                        permManageUnifiedRecords: user.permManageUnifiedRecords,
                        permViewUnifiedRecords: user.permViewUnifiedRecords,
                        permProcessUnifiedRecords: user.permProcessUnifiedRecords,
                        permAssignUnifiedRecords: user.permAssignUnifiedRecords,
                        permManageExtensions: user.permManageExtensions,
                        // Citizens
                        permEditCitizens: user.permEditCitizens,
                        permDeleteCitizens: user.permDeleteCitizens,
                        permMarkSuspicious: user.permMarkSuspicious,
                        // System
                        permViewAnalytics: user.permViewAnalytics,
                        permViewMap: user.permViewMap,
                        permViewAudit: user.permViewAudit,
                        permManageSettings: user.permManageSettings,
                        permManageMailAlerts: user.permManageMailAlerts,
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
                token.permViewReports = u.permViewReports;
                token.permAssignReports = u.permAssignReports;
                token.permViewSensitiveData = u.permViewSensitiveData;
                token.permBulkActionReports = u.permBulkActionReports;
                token.permManageUsers = u.permManageUsers;
                token.permEditNotes = u.permEditNotes;
                token.permChangeStatus = u.permChangeStatus;
                token.permExportData = u.permExportData;
                token.permDeleteReports = u.permDeleteReports;
                token.permCreateOfficers = u.permCreateOfficers;
                token.permEditOfficers = u.permEditOfficers;
                token.permDeleteOfficers = u.permDeleteOfficers;
                token.permViewOfficerStats = u.permViewOfficerStats;
                token.permCreateEvaluations = u.permCreateEvaluations;
                token.permManageOfficerStatus = u.permManageOfficerStatus;
                token.permEditCitizens = u.permEditCitizens;
                token.permDeleteCitizens = u.permDeleteCitizens;
                token.permMarkSuspicious = u.permMarkSuspicious;
                token.permViewAudit = u.permViewAudit;
                token.permManageSettings = u.permManageSettings;
                token.permManageMailAlerts = u.permManageMailAlerts;
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
            }
            return session
        },
    },
    pages: {
        signIn: "/admin/login",
    },
})
