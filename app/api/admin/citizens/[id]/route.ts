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
    const isAdmin = user.role === 'ADMIN'
    const canEditCitizen = isAdmin || !!user.permEditCitizens
    const canMarkCitizen = isAdmin || !!user.permMarkSuspicious

    const { id } = await params

    try {
        const body = await req.json()
        const { fullName, internalNotes, isVip, isSuspicious, newPhone } = body

        const wantsProfileEdit =
            fullName !== undefined ||
            internalNotes !== undefined ||
            (typeof newPhone === "string" && newPhone.trim().length > 0)
        const wantsSecurityMarks = isVip !== undefined || isSuspicious !== undefined

        if (wantsProfileEdit && !canEditCitizen) {
            return new NextResponse("Forbidden - Permission permEditCitizens required", { status: 403 })
        }
        if (wantsSecurityMarks && !canMarkCitizen) {
            return new NextResponse("Forbidden - Permission permMarkSuspicious required", { status: 403 })
        }
        if (!wantsProfileEdit && !wantsSecurityMarks) {
            return new NextResponse("No changes provided", { status: 400 })
        }

        const updateData: Record<string, unknown> = {}
        if (fullName !== undefined && canEditCitizen) updateData.fullName = fullName
        if (internalNotes !== undefined && canEditCitizen) updateData.internalNotes = internalNotes
        if (isVip !== undefined && canMarkCitizen) updateData.isVip = isVip
        if (isSuspicious !== undefined && canMarkCitizen) updateData.isSuspicious = isSuspicious

        const citizen = await (prisma as any).citizen.update({
            where: { id },
            data: updateData
        })

        if (canEditCitizen && newPhone) {
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
                metadata: JSON.stringify({
                    updatedFields: Object.keys(updateData),
                    phoneAdded: Boolean(canEditCitizen && newPhone),
                })
            }
        })

        return NextResponse.json(citizen)
    } catch (error) {
        console.error("Citizen update error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
