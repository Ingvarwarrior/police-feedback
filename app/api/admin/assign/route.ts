import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    // Check permissions
    const user = session.user as any
    if (user.role !== 'ADMIN' && !user.permChangeStatus) {
        return new NextResponse("Forbidden", { status: 403 })
    }

    try {
        const { responseId, assignedToId } = await req.json()

        if (!responseId) {
            return new NextResponse("Response ID required", { status: 400 })
        }

        const updateData: any = {
            assignedToId: assignedToId || null,
            status: assignedToId ? "ASSIGNED" : "NEW"
        }

        const response = await prisma.response.update({
            where: { id: responseId },
            data: updateData
        })

        // Audit Log
        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: assignedToId ? "ASSIGN_REPORT" : "UNASSIGN_REPORT",
                    entityType: "RESPONSE",
                    entityId: responseId,
                    metadata: JSON.stringify({ assignedToId })
                }
            })
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error("Assignment error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
