import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { responseId, resolutionNotes, incidentCategory, taggedOfficerIds, isConfirmed } = await req.json()

        if (!responseId) {
            return new NextResponse("Response ID required", { status: 400 })
        }

        // Fetch response to check assignment
        const currentResponse = await prisma.response.findUnique({
            where: { id: responseId },
            include: { taggedOfficers: true }
        }) as any

        if (!currentResponse) {
            return new NextResponse("Response not found", { status: 404 })
        }

        // Only Admin or Assigned User can resolve
        const user = session.user as any
        if (user.role !== 'ADMIN' && currentResponse.assignedToId !== user.id) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const response = await (prisma.response as any).update({
            where: { id: responseId },
            data: {
                resolutionNotes,
                incidentCategory,
                isConfirmed: isConfirmed !== undefined ? isConfirmed : true,
                resolutionDate: new Date(),
                status: "RESOLVED",
                taggedOfficers: taggedOfficerIds ? {
                    set: taggedOfficerIds.map((id: string) => ({ id }))
                } : undefined
            } as any,
            include: { taggedOfficers: true }
        })

        // Sync confirmation to linked evaluations
        await prisma.officerEvaluation.updateMany({
            where: { sourceId: responseId },
            data: { isConfirmed: response.isConfirmed }
        })

        // Recalculate stats for all tagged officers
        const officerIdsToUpdate = new Set<string>()
        if (response.officerId) officerIdsToUpdate.add(response.officerId)
        response.taggedOfficers.forEach((o: any) => officerIdsToUpdate.add(o.id))

        // Also update previous officers if they were removed
        currentResponse.taggedOfficers.forEach((o: any) => officerIdsToUpdate.add(o.id))

        const { refreshOfficerStats } = await import("@/lib/officer-stats")
        for (const id of officerIdsToUpdate) {
            await refreshOfficerStats(id)
        }

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
