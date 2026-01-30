import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { username: session.user.email as string }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File
        const category = formData.get("category") as string || "Інше"

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const fileId = uuidv4()
        const extension = file.name.split('.').pop()
        const fileName = `${fileId}.${extension}`
        const storagePath = join("public/uploads/drive", fileName)
        const publicUrl = `/uploads/drive/${fileName}`

        await writeFile(storagePath, buffer)

        const sharedFile = await prisma.sharedFile.create({
            data: {
                name: file.name,
                type: file.type || "application/octet-stream",
                size: file.size,
                url: publicUrl,
                category,
                uploadedById: user.id
            }
        })

        return NextResponse.json(sharedFile)
    } catch (error: any) {
        console.error("Upload error:", error)
        return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 })
    }
}
