import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET /api/admin/officers/[id] - Get officer details with stats
export async function GET(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    // Allow all authenticated users (GET)


    try {
        const officer = await (prisma.officer as any).findUnique({
            where: { id: params.id },
            include: {
                evaluations: {
                    include: {
                        evaluator: { select: { email: true } },
                        attachments: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                responses: {
                    select: {
                        id: true,
                        createdAt: true,
                        rateOverall: true,
                        comment: true,
                        isConfirmed: true
                    } as any,
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                _count: {
                    select: {
                        evaluations: true,
                        responses: true,
                        taggedInResponses: true
                    }
                },
                taggedInResponses: {
                    select: {
                        id: true,
                        createdAt: true,
                        rateOverall: true,
                        comment: true,
                        status: true,
                        isConfirmed: true
                    } as any,
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                unifiedRecords: {
                    select: {
                        id: true,
                        eoNumber: true,
                        eoDate: true,
                        resolution: true,
                        resolutionDate: true,
                        status: true
                    },
                    orderBy: {
                        resolutionDate: 'desc'
                    }
                }
            }
        })

        if (!officer) {
            return new NextResponse("Officer not found", { status: 404 })
        }

        // Calculate aggregate scores
        const evaluations = officer.evaluations
        const avgScores = {
            knowledge: 0,
            tactics: 0,
            communication: 0,
            professionalism: 0,
            physical: 0,
            overall: 0
        }

        if (evaluations.length > 0) {
            const counts = { knowledge: 0, tactics: 0, communication: 0, professionalism: 0, physical: 0 }
            evaluations.forEach((e: any) => {
                if (e.scoreKnowledge && e.scoreKnowledge > 0) { avgScores.knowledge += e.scoreKnowledge; counts.knowledge++ }
                if (e.scoreTactics && e.scoreTactics > 0) { avgScores.tactics += e.scoreTactics; counts.tactics++ }
                if (e.scoreCommunication && e.scoreCommunication > 0) { avgScores.communication += e.scoreCommunication; counts.communication++ }
                if (e.scoreProfessionalism && e.scoreProfessionalism > 0) { avgScores.professionalism += e.scoreProfessionalism; counts.professionalism++ }
                if (e.scorePhysical && e.scorePhysical > 0) { avgScores.physical += e.scorePhysical; counts.physical++ }
            })

            avgScores.knowledge = counts.knowledge > 0 ? Number((avgScores.knowledge / counts.knowledge).toFixed(2)) : 0
            avgScores.tactics = counts.tactics > 0 ? Number((avgScores.tactics / counts.tactics).toFixed(2)) : 0
            avgScores.communication = counts.communication > 0 ? Number((avgScores.communication / counts.communication).toFixed(2)) : 0
            avgScores.professionalism = counts.professionalism > 0 ? Number((avgScores.professionalism / counts.professionalism).toFixed(2)) : 0
            avgScores.physical = counts.physical > 0 ? Number((avgScores.physical / counts.physical).toFixed(2)) : 0

            const allScores = [avgScores.knowledge, avgScores.tactics, avgScores.communication, avgScores.professionalism, avgScores.physical].filter(s => s > 0)
            avgScores.overall = allScores.length > 0 ? Number((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)) : 0
        }

        // 1. Radar Chart Data
        const radarData = [
            { subject: 'Знання', A: avgScores.knowledge, fullMark: 5 },
            { subject: 'Тактика', A: avgScores.tactics, fullMark: 5 },
            { subject: 'Комунікація', A: avgScores.communication, fullMark: 5 },
            { subject: 'Професіоналізм', A: avgScores.professionalism, fullMark: 5 },
            { subject: 'Фіз. підготовка', A: avgScores.physical, fullMark: 5 },
        ]

        // 2. Trend Data (Last 6 months)
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const feedbackHistory = await (prisma.response as any).findMany({
            where: {
                OR: [
                    { officerId: params.id },
                    { taggedOfficers: { some: { id: params.id } } }
                ],
                createdAt: { gte: sixMonthsAgo },
                isConfirmed: true,
                rateOverall: { gt: 0 }
            },
            select: { createdAt: true, rateOverall: true },
            orderBy: { createdAt: 'asc' }
        })

        const trendMap = new Map()
        feedbackHistory.forEach((f: any) => {
            const month = f.createdAt.toISOString().slice(0, 7)
            if (!trendMap.has(month)) trendMap.set(month, { sum: 0, count: 0 })
            const entry = trendMap.get(month)
            entry.sum += f.rateOverall
            entry.count++
        })

        const trendData = Array.from(trendMap.entries()).map(([month, data]: any) => ({
            month,
            rating: Number((data.sum / data.count).toFixed(2))
        }))

        // 3. QR Code URL
        const surveyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/survey?officerId=${officer.id}&badge=${officer.badgeNumber}&name=${encodeURIComponent(officer.lastName + ' ' + officer.firstName)}`

        // Normalize image URL
        if (officer.imageUrl?.startsWith('/uploads/')) {
            officer.imageUrl = officer.imageUrl.replace('/uploads/', '/api/uploads/')
        }

        return NextResponse.json({
            officer,
            stats: {
                totalFeedback: officer._count.responses,
                totalEvaluations: officer._count.evaluations,
                avgScores,
                radarData,
                trendData,
                recentEvaluations: officer.evaluations.slice(0, 5),
                recentFeedback: officer.responses,
                taggedFeedback: ((officer as any).taggedInResponses || []).filter((tf: any) => !officer.responses.some((rf: any) => rf.id === tf.id)),
                unifiedRecords: (officer as any).unifiedRecords || [],
                qrUrl: surveyUrl
            }
        })
    } catch (error) {
        console.error("Error fetching officer:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// PATCH /api/admin/officers/[id] - Update officer
export async function PATCH(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN' && !user.permEditOfficers) {
        return new NextResponse("Forbidden - Permission permEditOfficers required", { status: 403 })
    }


    try {
        const body = await req.json()
        const { firstName, lastName, middleName, rank, department, hireDate, birthDate, status, phone, email, driversLicense, imageUrl, address, education, serviceHistory } = body

        const officer = await prisma.officer.update({
            where: { id: params.id },
            data: {
                firstName: firstName !== undefined ? firstName : undefined,
                lastName: lastName !== undefined ? lastName : undefined,
                middleName: middleName !== undefined ? middleName : undefined,
                rank: rank !== undefined ? rank : undefined,
                department: department !== undefined ? department : undefined,
                phone: phone !== undefined ? phone : undefined,
                email: email !== undefined ? email : undefined,
                driversLicense: driversLicense !== undefined ? driversLicense : undefined,
                imageUrl: imageUrl !== undefined ? imageUrl : undefined,
                hireDate: hireDate !== undefined ? (hireDate ? new Date(hireDate) : null) : undefined,
                birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
                address: address !== undefined ? address : undefined,
                education: education !== undefined ? education : undefined,
                serviceHistory: serviceHistory !== undefined ? serviceHistory : undefined,
                status: status !== undefined ? status : undefined
            }
        })

        // Audit log
        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "UPDATE_OFFICER",
                    entityType: "OFFICER",
                    entityId: officer.id,
                    metadata: JSON.stringify(body)
                }
            })
        }

        return NextResponse.json(officer)
    } catch (error) {
        console.error("Error updating officer:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

// DELETE /api/admin/officers/[id] - Hard delete officer and unlink feedback
export async function DELETE(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN' && !user.permDeleteOfficers) {
        return new NextResponse("Forbidden - Permission permDeleteOfficers required", { status: 403 })
    }

    try {
        // Unlink feedback first (set officerId to null)
        await prisma.response.updateMany({
            where: { officerId: params.id },
            data: { officerId: null }
        })

        // Hard delete officer (will cascade delete evaluations due to schema)
        const officer = await prisma.officer.delete({
            where: { id: params.id }
        })

        // Audit log
        if (session.user?.id) {
            await prisma.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    action: "DELETE_OFFICER_PERMANENT",
                    entityType: "OFFICER",
                    entityId: officer.id,
                    metadata: JSON.stringify({ badgeNumber: officer.badgeNumber })
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting officer:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
