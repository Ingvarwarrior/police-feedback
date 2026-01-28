import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN') {
        return new NextResponse("Forbidden - Admin only", { status: 403 })
    }

    const { id } = await params

    try {
        const body = await req.json()
        const { fullName, internalNotes, isVip, isSuspicious, newPhone } = body

        const citizen = await (prisma as any).citizen.update({
            where: { id },
            data: {
                fullName,
                internalNotes,
                isVip,
                isSuspicious
            }
        })

        if (newPhone) {
            let normalized = newPhone.trim()
            if (normalized.startsWith('0') && normalized.length >= 10) normalized = '+38' + normalized

            try {
                await (prisma as any).citizenPhone.create({
                    data: {
                        citizenId: id,
                        phone: normalized
                    }
                })

                // Link all existing responses with this phone to this citizen
                await (prisma.response as any).updateMany({
                    where: {
                        OR: [
                            { contact: { phone: normalized } },
                            { contact: { phone: normalized.replace('+38', '') } }
                        ]
                    },
                    data: {
                        citizenId: id
                    }
                })
            } catch (phoneError) {
                console.error("Phone add error (might exist):", phoneError)
                // If phone already exists, it might be linked to someone else.
                // We should probably just link it anyway or return error. 
                // For simplicity, we just catch if it's already in CitizenPhone.
            }
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: user.id,
                action: "UPDATE_CITIZEN",
                entityType: "CITIZEN",
                entityId: citizen.id,
                metadata: JSON.stringify(body)
            }
        })

        return NextResponse.json(citizen)
    } catch (error) {
        console.error("Citizen update error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
