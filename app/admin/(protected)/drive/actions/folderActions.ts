'use server'

import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function createFolder(name: string, parentId?: string) {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { username: session.user.email as string }
    })
    if (!user) throw new Error("User not found")

    try {
        const folder = await prisma.folder.create({
            data: {
                name,
                parentId,
                createdById: user.id
            }
        })
        revalidatePath('/admin/drive')
        return folder
    } catch (error) {
        console.error("Error creating folder:", error)
        throw new Error("Не вдалося створити папку")
    }
}

export async function renameFolder(id: string, newName: string) {
    await checkPermission("permManageDrive", true)

    try {
        const folder = await prisma.folder.update({
            where: { id },
            data: { name: newName }
        })
        revalidatePath('/admin/drive')
        return folder
    } catch (error) {
        console.error("Error renaming folder:", error)
        throw new Error("Не вдалося перейменувати папку")
    }
}

export async function deleteFolder(id: string) {
    await checkPermission("permManageDrive", true)

    try {
        await prisma.folder.delete({
            where: { id }
        })
        revalidatePath('/admin/drive')
        return { success: true }
    } catch (error) {
        console.error("Error deleting folder:", error)
        throw new Error("Не вдалося видалити папку")
    }
}

export async function getFolders(parentId?: string) {
    try {
        const folders = await prisma.folder.findMany({
            where: { parentId: parentId || null },
            include: {
                createdBy: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return folders
    } catch (error) {
        console.error("Error fetching folders:", error)
        throw new Error("Не вдалося завантажити папки")
    }
}

export async function getFolderBreadcrumbs(id: string) {
    try {
        const breadcrumbs = []
        let currentFolder = await prisma.folder.findUnique({
            where: { id },
            select: { id: true, name: true, parentId: true }
        })

        while (currentFolder) {
            breadcrumbs.unshift({ id: currentFolder.id, name: currentFolder.name })
            if (currentFolder.parentId) {
                currentFolder = await prisma.folder.findUnique({
                    where: { id: currentFolder.parentId },
                    select: { id: true, name: true, parentId: true }
                })
            } else {
                currentFolder = null
            }
        }
        return breadcrumbs
    } catch (error) {
        console.error("Error fetching breadcrumbs:", error)
        return []
    }
}
