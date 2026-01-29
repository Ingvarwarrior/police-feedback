'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { checkPermission } from "@/lib/permissions"
import bcrypt from 'bcryptjs'

type CreateUserInput = {
    username: string;
    email?: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    badgeNumber?: string;
    role: string;
    permViewReports: boolean;
    permManageUsers: boolean;
    permEditNotes: boolean;
    permChangeStatus: boolean;
    permExportData: boolean;
    permDeleteReports: boolean;
    permCreateOfficers: boolean;
    permEditOfficers: boolean;
    permDeleteOfficers: boolean;
    permEditCitizens: boolean;
    permDeleteCitizens: boolean;
    permViewAudit: boolean;
}

export async function createUser(data: CreateUserInput) {
    const session = await auth()
    const currentUser = session?.user as any

    if (currentUser?.role !== 'ADMIN' && !currentUser?.permManageUsers) {
        throw new Error('У вас немає прав для створення користувачів')
    }

    const { username, email, passwordHash, firstName, lastName, badgeNumber, role, ...permissions } = data

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
        where: { username }
    })

    if (existingUser) {
        throw new Error('Користувач з таким логіном вже існує')
    }

    const hashedPassword = await bcrypt.hash(passwordHash, 10)

    const user = await prisma.user.create({
        data: {
            username,
            email,
            passwordHash: hashedPassword,
            firstName,
            lastName,
            badgeNumber,
            role,
            ...permissions,
            active: true
        }
    })

    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: "CREATE_USER",
                entityType: "USER",
                entityId: user.id,
                metadata: JSON.stringify({ username: data.username, email: data.email, role: data.role })
            }
        })
    }

    revalidatePath('/admin/users')
}

export async function updateUser(id: string, data: {
    username?: string;
    email?: string;
    passwordHash?: string;
    firstName?: string;
    lastName?: string;
    badgeNumber?: string;
    role?: string;
    permViewReports?: boolean;
    permManageUsers?: boolean;
    permEditNotes?: boolean;
    permChangeStatus?: boolean;
    permExportData?: boolean;
    permDeleteReports?: boolean;
    permCreateOfficers?: boolean;
    permEditOfficers?: boolean;
    permDeleteOfficers?: boolean;
    permEditCitizens?: boolean;
    permDeleteCitizens?: boolean;
    permViewAudit?: boolean;
}) {
    await checkPermission('permManageUsers')

    const updateData: any = { ...data }
    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])

    // Hash password if provided
    if (updateData.passwordHash) {
        updateData.passwordHash = await bcrypt.hash(updateData.passwordHash, 10)
    }

    await prisma.user.update({
        where: { id },
        data: updateData
    })

    const session = await auth()
    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: "UPDATE_USER",
                entityType: "USER",
                entityId: id,
                metadata: JSON.stringify({ updatedFields: Object.keys(updateData) })
            }
        })
    }

    revalidatePath('/admin/users')
}

export async function toggleUserStatus(id: string, active: boolean) {
    await checkPermission('permManageUsers')

    await prisma.user.update({
        where: { id },
        data: { active }
    })

    const session = await auth()
    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: active ? "ACTIVATE_USER" : "DEACTIVATE_USER",
                entityType: "USER",
                entityId: id
            }
        })
    }

    revalidatePath('/admin/users')
}

export async function deleteUser(id: string) {
    await checkPermission('permManageUsers')

    const session = await auth()
    if (session?.user?.email) {
        const userToDelete = await prisma.user.findUnique({ where: { id } })
        if (userToDelete?.email === session.user.email) {
            throw new Error("Cannot delete yourself")
        }
    }

    await prisma.user.delete({
        where: { id }
    })

    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: "DELETE_USER",
                entityType: "USER",
                entityId: id
            }
        })
    }

    revalidatePath('/admin/users')
}

export async function resetUserPassword(id: string, newPasswordHash: string) {
    await checkPermission('permManageUsers')

    const hashedPassword = await bcrypt.hash(newPasswordHash, 10)

    await prisma.user.update({
        where: { id },
        data: { passwordHash: hashedPassword }
    })

    const session = await auth()
    if (session?.user?.id) {
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                action: "RESET_USER_PASSWORD",
                entityType: "USER",
                entityId: id
            }
        })
    }
}
