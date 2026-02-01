import { prisma } from "./prisma"

/**
 * Recalculates and updates denormalized stats for an officer
 */
export async function refreshOfficerStats(officerId: string) {
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

    const totalResponses = await prisma.response.count({
        where: { officerId }
    })

    let avgScore = 0
    if (evals.length > 0) {
        avgScore = evals.reduce((sum, e) => {
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
    }

    // Using 'as any' to avoid lint errors from potentially stale Prisma types in the environment
    return await (prisma.officer as any).update({
        where: { id: officerId },
        data: {
            avgScore: Number(avgScore.toFixed(2)),
            totalEvaluations: evals.length,
            totalResponses
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
