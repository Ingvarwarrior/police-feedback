import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { responseId, resolutionNotes, incidentCategory } = await req.json()

        if (!responseId) {
            return new NextResponse("Response ID required", { status: 400 })
        }

        // Fetch response to check assignment
        const currentResponse = await prisma.response.findUnique({
            where: { id: responseId }
        }) as any

        if (!currentResponse) {
            return new NextResponse("Response not found", { status: 404 })
        }

        // Only Admin or Assigned User can resolve
        const user = session.user as any
        if (user.role !== 'ADMIN' && currentResponse.assignedToId !== user.id) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const response = await prisma.response.update({
            where: { id: responseId },
            data: {
                resolutionNotes,
                incidentCategory,
                resolutionDate: new Date(),
                status: "RESOLVED"
            }
        })

        // Audit Log
        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "RESOLVE_REPORT",
                    entityType: "RESPONSE",
                    entityId: responseId,
                    metadata: JSON.stringify({ resolutionNotes, incidentCategory })
                }
            })
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error("Resolution error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
