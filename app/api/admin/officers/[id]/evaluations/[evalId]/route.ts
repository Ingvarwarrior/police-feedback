import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(
    req: Request,
    props: { params: Promise<{ id: string; evalId: string }> }
) {
    const params = await props.params;
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN') {
        return new NextResponse("Forbidden - Admin only", { status: 403 })
    }

    try {
        const evaluation = await prisma.officerEvaluation.delete({
            where: {
                id: params.evalId
            }
        })

        // Audit log
        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "DELETE_EVALUATION",
                    entityType: "EVALUATION",
                    entityId: evaluation.id,
                    metadata: JSON.stringify({ type: evaluation.type, officerId: params.id })
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting evaluation:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
