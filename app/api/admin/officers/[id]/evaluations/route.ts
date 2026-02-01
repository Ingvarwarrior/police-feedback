import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { refreshOfficerStats } from "@/lib/officer-stats"

// GET /api/admin/officers/[id]/evaluations - List evaluations for an officer
export async function GET(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const evaluations = await prisma.officerEvaluation.findMany({
            where: { officerId: params.id },
            include: {
                evaluator: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(evaluations)
    } catch (error) {
        console.error("Error fetching evaluations:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// POST /api/admin/officers/[id]/evaluations - Create new evaluation
export async function POST(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any

    try {
        const body = await req.json()
        const {
            type,
            scoreKnowledge,
            scoreTactics,
            scoreCommunication,
            scoreProfessionalism,
            scorePhysical,
            strengths,
            weaknesses,
            recommendations,
            notes
        } = body

        if (!type) {
            return new NextResponse("Evaluation type is required", { status: 400 })
        }

        const evaluation = await prisma.officerEvaluation.create({
            data: {
                officerId: params.id,
                evaluatorId: user.id,
                type,
                scoreKnowledge: scoreKnowledge || null,
                scoreTactics: scoreTactics || null,
                scoreCommunication: scoreCommunication || null,
                scoreProfessionalism: scoreProfessionalism || null,
                scorePhysical: scorePhysical || null,
                strengths: strengths || null,
                weaknesses: weaknesses || null,
                recommendations: recommendations || null,
                notes: notes || null
            }
        })

        // Recalculate stats for the officer
        await refreshOfficerStats(params.id)

        // Audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: user.id,
                action: "CREATE_EVALUATION",
                entityType: "OFFICER_EVALUATION",
                entityId: evaluation.id,
                metadata: JSON.stringify({ officerId: params.id, type })
            }
        })

        return NextResponse.json(evaluation, { status: 201 })
    } catch (error) {
        console.error("Error creating evaluation:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
