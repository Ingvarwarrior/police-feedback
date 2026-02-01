import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { refreshAllOfficersStats } from "@/lib/officer-stats"

// GET /api/admin/officers - List all officers
export async function GET(req: Request) {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || ''
        const rank = searchParams.get('rank') || ''

        // Optional: Manual recalibration trigger for admins
        if (searchParams.get('recalibrate') === 'true') {
            const user = session.user as any
            if (user.role === 'ADMIN') {
                await refreshAllOfficersStats()
            }
        }

        const where: any = {}

        if (search) {
            where.OR = [
                { badgeNumber: { contains: search } },
                { firstName: { contains: search } },
                { lastName: { contains: search } }
            ]
        }

        if (status) {
            where.status = status
        }

        if (rank) {
            where.rank = rank
        }

        // Use denormalized fields for performance
        const officers = await prisma.officer.findMany({
            where,
            orderBy: { lastName: 'asc' }
        })

        // Normalize image URL to use /api/uploads/
        const officersWithImages = officers.map(officer => {
            const imageUrl = officer.imageUrl?.startsWith('/uploads/')
                ? officer.imageUrl.replace('/uploads/', '/api/uploads/')
                : officer.imageUrl

            return {
                ...officer,
                imageUrl
            }
        })

        return NextResponse.json(officersWithImages)
    } catch (error) {
        console.error("Error fetching officers:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// POST /api/admin/officers - Create new officer
export async function POST(req: Request) {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (!user.permCreateOfficers) {
        return new NextResponse("Forbidden: Insufficient permissions", { status: 403 })
    }


    try {
        const body = await req.json()
        const { badgeNumber, firstName, lastName, middleName, rank, department, hireDate, birthDate, phone, email, driversLicense, imageUrl } = body


        if (!badgeNumber || !firstName || !lastName) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        const officer = await (prisma.officer as any).create({
            data: {
                badgeNumber,
                firstName,
                lastName,
                middleName: middleName || null,
                rank: rank || null,
                department: department || null,
                phone: phone || null,
                email: email || null,
                driversLicense: driversLicense || null,
                imageUrl: imageUrl || null,
                hireDate: hireDate ? new Date(hireDate) : null,
                birthDate: birthDate ? new Date(birthDate) : null,
                status: "ACTIVE",
                // Initial stats
                avgScore: 0,
                totalEvaluations: 0,
                totalResponses: 0
            }
        })

        // Audit log
        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "CREATE_OFFICER",
                    entityType: "OFFICER",
                    entityId: officer.id,
                    metadata: JSON.stringify({ badgeNumber, name: `${lastName} ${firstName}` })
                }
            })
        }

        return NextResponse.json(officer)
    } catch (error: any) {
        console.error("Error creating officer:", error)
        if (error.code === 'P2002') {
            return new NextResponse("Officer with this badge number already exists", { status: 409 })
        }
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
