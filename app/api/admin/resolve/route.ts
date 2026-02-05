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


        // ------------------------------------------------------------------
        // 1. Manage Officer Evaluations (Attestation Journal)
        // ------------------------------------------------------------------
        const shouldHaveEvaluation = (isConfirmed !== undefined ? isConfirmed : currentResponse.isConfirmed) === true

        // Calculate all involved officers (Current primary + Current tagged + Previous tagged + Previous primary)
        // We need to update evaluations for CURRENT targets
        // And refresh stats for ALL involved (current + previous)

        const currentTargetIds = new Set<string>()
        if (response.officerId) currentTargetIds.add(response.officerId)
        response.taggedOfficers.forEach((o: any) => currentTargetIds.add(o.id))

        if (shouldHaveEvaluation) {
            // Ensure evaluation exists for each current target
            for (const officerId of currentTargetIds) {
                const existingEval = await prisma.officerEvaluation.findFirst({
                    where: { officerId, sourceId: responseId, type: 'CITIZEN_FEEDBACK' }
                })

                if (existingEval) {
                    await prisma.officerEvaluation.update({
                        where: { id: existingEval.id },
                        data: {
                            scoreCommunication: response.ratePoliteness,
                            scoreProfessionalism: response.rateProfessionalism,
                            notes: resolutionNotes || response.comment
                        }
                    })
                } else {
                    await prisma.officerEvaluation.create({
                        data: {
                            officerId,
                            type: 'CITIZEN_FEEDBACK',
                            sourceId: responseId,
                            scoreCommunication: response.ratePoliteness,
                            scoreProfessionalism: response.rateProfessionalism,
                            notes: response.comment
                        }
                    })
                }
            }

            // Cleanup evaluations for officers REMOVED from the case
            await prisma.officerEvaluation.deleteMany({
                where: {
                    sourceId: responseId,
                    type: 'CITIZEN_FEEDBACK',
                    officerId: { notIn: Array.from(currentTargetIds) }
                }
            })
        } else {
            // Case NOT confirmed: Remove ALL evaluations linked to this report
            await prisma.officerEvaluation.deleteMany({
                where: { sourceId: responseId, type: 'CITIZEN_FEEDBACK' }
            })
        }

        // ------------------------------------------------------------------
        // 2. Refresh Stats
        // ------------------------------------------------------------------
        // We must refresh stats for ANY officer touched by this report (past or present)
        const allInvolvedOfficerIds = new Set<string>()
        if (response.officerId) allInvolvedOfficerIds.add(response.officerId)
        if (currentResponse.officerId) allInvolvedOfficerIds.add(currentResponse.officerId)
        response.taggedOfficers.forEach((o: any) => allInvolvedOfficerIds.add(o.id))
        currentResponse.taggedOfficers.forEach((o: any) => allInvolvedOfficerIds.add(o.id))

        const { refreshOfficerStats } = await import("@/lib/officer-stats")
        for (const id of allInvolvedOfficerIds) {
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
