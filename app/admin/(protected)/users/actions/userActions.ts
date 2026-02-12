'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import bcrypt from 'bcryptjs'
import { PERMISSIONS_CONFIG, type PermissionId } from "@/lib/permissions-config"

type BaseUserInput = {
    username: string;
    email?: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    badgeNumber?: string;
    role: string;
}

type PermissionsPayload = Record<PermissionId, boolean>
type CreateUserInput = BaseUserInput & PermissionsPayload
type UpdateUserInput = Partial<Omit<BaseUserInput, "passwordHash">> & {
    passwordHash?: string;
} & Partial<PermissionsPayload>

const PERMISSION_IDS = PERMISSIONS_CONFIG.map((perm) => perm.id)

function extractPermissionData(data: Record<string, unknown>) {
    const permissions: Partial<PermissionsPayload> = {}
    PERMISSION_IDS.forEach((id) => {
        const value = data[id]
        if (typeof value === "boolean") {
            permissions[id] = value
        }
    })
    return permissions
}

export async function createUser(data: CreateUserInput) {
    const session = await auth()
    const currentUser = session?.user as any

    if (currentUser?.role !== 'ADMIN' && !currentUser?.permCreateUsers && !currentUser?.permManageUsers) {
        throw new Error('У вас немає прав для створення користувачів')
    }

    const { username, email, passwordHash, firstName, lastName, badgeNumber, role, ...rawPermissions } = data
    const permissions = extractPermissionData(rawPermissions as Record<string, unknown>)

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

export async function updateUser(id: string, data: UpdateUserInput) {
    const session = await auth()
    const currentUser = session?.user as any
    if (currentUser?.role !== 'ADMIN' && !currentUser?.permEditUsers && !currentUser?.permManageUsers) {
        throw new Error("У вас немає прав для редагування користувачів")
    }

    const { username, email, firstName, lastName, badgeNumber, role, passwordHash } = data
    const permissionData = extractPermissionData(data as Record<string, unknown>)

    const updateData: any = {
        ...permissionData,
        username,
        email,
        firstName,
        lastName,
        badgeNumber,
        role,
        passwordHash,
    }
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
    const session = await auth()
    const currentUser = session?.user as any
    if (currentUser?.role !== 'ADMIN' && !currentUser?.permEditUsers && !currentUser?.permManageUsers) {
        throw new Error("У вас немає прав для зміни статусу користувачів")
    }

    await prisma.user.update({
        where: { id },
        data: { active }
    })

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
    const session = await auth()
    const currentUser = session?.user as any
    if (currentUser?.role !== 'ADMIN' && !currentUser?.permDeleteUsers && !currentUser?.permManageUsers) {
        throw new Error("У вас немає прав для видалення користувачів")
    }

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
    const session = await auth()
    const currentUser = session?.user as any
    if (currentUser?.role !== 'ADMIN' && !currentUser?.permResetUserPasswords && !currentUser?.permManageUsers) {
        throw new Error("У вас немає прав для скидання паролів")
    }

    const hashedPassword = await bcrypt.hash(newPasswordHash, 10)

    await prisma.user.update({
        where: { id },
        data: { passwordHash: hashedPassword }
    })

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
