'use server'

import { prisma } from "@/lib/prisma"
import { checkPermission } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { unlink } from "fs/promises"
import { join } from "path"

export async function getFiles(folderId?: string, category?: string) {
    try {
        const files = await prisma.sharedFile.findMany({
            where: {
                folderId: folderId || null,
                category: category && category !== "Всі" ? category : undefined
            },
            include: {
                uploadedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return files
    } catch (error) {
        console.error("Error fetching files:", error)
        throw new Error("Не вдалося завантажити список файлів")
    }
}

export async function renameFile(id: string, newName: string) {
    await checkPermission("permManageDrive", true)

    try {
        const file = await prisma.sharedFile.update({
            where: { id },
            data: { name: newName }
        })
        revalidatePath('/admin/drive')
        return file
    } catch (error) {
        console.error("Error renaming file:", error)
        throw new Error("Не вдалося перейменувати файл")
    }
}

export async function deleteFile(id: string) {
    await checkPermission("permManageDrive", true)

    try {
        const file = await prisma.sharedFile.findUnique({ where: { id } })
        if (file) {
            const filePath = join(process.cwd(), "public", file.url)
            try {
                await unlink(filePath)
            } catch (e) {
                console.error("File not found on disk, but deleting from DB")
            }
            await prisma.sharedFile.delete({ where: { id } })
        }
        revalidatePath('/admin/drive')
        return { success: true }
    } catch (error) {
        console.error("Error deleting file:", error)
        throw new Error("Не вдалося видалити файл")
    }
}
