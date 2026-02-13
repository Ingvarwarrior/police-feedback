import { prisma } from "./prisma"

/**
 * Recalculates and updates denormalized stats for an officer
 */
export async function refreshOfficerStats(officerId: string) {
    // 1. Internal Evaluations
    const evals = await prisma.officerEvaluation.findMany({
        where: { officerId },
        select: {
            scoreKnowledge: true,
            scoreTactics: true,
            scoreCommunication: true,
            scoreProfessionalism: true,
            scorePhysical: true
        }
    })

    // 2. Confirmed Citizen Feedback (Directly linked or Tagged)
    // Using 'as any' for responses to access 'isConfirmed' if client not updated
    const citizenFeedback = await (prisma.response as any).findMany({
        where: {
            OR: [
                { officerId },
                { taggedOfficers: { some: { id: officerId } } }
            ],
            isConfirmed: true,
            rateOverall: { gt: 0 }
        },
        select: {
            rateOverall: true
        }
    })

    const totalResponsesCount = await prisma.response.count({
        where: {
            OR: [
                { officerId },
                { taggedOfficers: { some: { id: officerId } } }
            ],
            // Should we count unrated reports in totalResponses? 
            // User said: "not rated means haven't been evaluated yet".
            // Let's count only rated ones for the main statistics.
            rateOverall: { gt: 0 }
        }
    })

    const callbackRatings = await (prisma as any).callback.findMany({
        where: {
            officers: { some: { id: officerId } },
            qOverall: { gt: 0 }
        },
        select: {
            qOverall: true
        }
    })

    let totalPoints = 0
    let totalCount = 0

    // Add Internal Evaluations to average
    evals.forEach(e => {
        const scores = [
            e.scoreKnowledge,
            e.scoreTactics,
            e.scoreCommunication,
            e.scoreProfessionalism,
            e.scorePhysical
        ].filter((s): s is number => typeof s === 'number' && s > 0)

        if (scores.length > 0) {
            totalPoints += scores.reduce((a, b) => a + b, 0) / scores.length
            totalCount++
        }
    })

    // Add Citizen Feedback to average
    citizenFeedback.forEach((f: any) => {
        if (f.rateOverall && f.rateOverall > 0) {
            totalPoints += f.rateOverall
            totalCount++
        }
    })

    callbackRatings.forEach((cb: any) => {
        if (cb.qOverall && cb.qOverall > 0) {
            totalPoints += cb.qOverall
            totalCount++
        }
    })

    const avgScore = totalCount > 0 ? (totalPoints / totalCount) : 0

    return await (prisma.officer as any).update({
        where: { id: officerId },
        data: {
            avgScore: Number(avgScore.toFixed(2)),
            totalEvaluations: evals.length,
            totalResponses: totalResponsesCount
        }
    })
}

/**
 * Utility to refresh ALL officers' stats (for initialization)
 */
export async function refreshAllOfficersStats() {
    const officers = await prisma.officer.findMany({ select: { id: true } })
    for (const officer of officers) {
        await refreshOfficerStats(officer.id)
    }
}
