import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET /api/admin/officers - List all officers
export async function GET(req: Request) {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    // Allow all authenticated users (GET)


    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || ''
        const rank = searchParams.get('rank') || ''

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

        const officers = await prisma.officer.findMany({
            where,
            include: {
                _count: {
                    select: {
                        evaluations: true,
                        responses: true
                    }
                },
                evaluations: {
                    select: {
                        scoreKnowledge: true,
                        scoreTactics: true,
                        scoreCommunication: true,
                        scoreProfessionalism: true,
                        scorePhysical: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Calculate avg scores for each officer
        const officersWithStats = officers.map(officer => {
            const evals = officer.evaluations
            const avgScore = evals.length > 0
                ? evals.reduce((sum, e) => {
                    const scores = [
                        e.scoreKnowledge,
                        e.scoreTactics,
                        e.scoreCommunication,
                        e.scoreProfessionalism,
                        e.scorePhysical
                    ].filter((s): s is number => typeof s === 'number')

                    const total = scores.reduce((a, b) => a + b, 0)
                    const count = scores.length
                    return sum + (count > 0 ? total / count : 0)
                }, 0) / evals.length
                : 0

            // Normalize image URL to use /api/uploads/ if it uses the old /uploads/ path
            const imageUrl = officer.imageUrl?.startsWith('/uploads/')
                ? officer.imageUrl.replace('/uploads/', '/api/uploads/')
                : officer.imageUrl

            return {
                ...officer,
                imageUrl,
                avgScore: Number(avgScore.toFixed(2)),
                totalEvaluations: officer._count.evaluations,
                totalResponses: officer._count.responses
            }
        })

        return NextResponse.json(officersWithStats)
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
    // Allow all authenticated users (POST)


    try {
        const body = await req.json()
        const { badgeNumber, firstName, lastName, middleName, rank, department, hireDate, birthDate, phone, email, driversLicense, imageUrl } = body


        if (!badgeNumber || !firstName || !lastName) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        const officer = await prisma.officer.create({
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
                status: "ACTIVE"
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
