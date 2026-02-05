
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Scanning for invalid OfficerEvaluations (Unconfirmed source)...')

    // Find all evaluations of type CITIZEN_FEEDBACK where source report is NOT confirmed
    // Note: sourceId is a string, assumed to be Response ID for this type
    const evaluations = await prisma.officerEvaluation.findMany({
        where: {
            type: 'CITIZEN_FEEDBACK',
        },
        include: {
            officer: true
        }
    })

    let deletedCount = 0
    const impactedOfficerIds = new Set()

    for (const eva of evaluations) {
        if (!eva.sourceId) continue;

        // Check the source response
        const response = await prisma.response.findUnique({
            where: { id: eva.sourceId }
        })

        // If response doesn't exist OR is not confirmed
        // Note: response.isConfirmed defaults to true in schema, but issue is when it IS false
        if (!response || response.isConfirmed === false) {
            console.log(`❌ Invalid Evaluation Found: ID ${eva.id} for Officer ${eva.officer.lastName} (Source: ${eva.sourceId} - Confirmed: ${response?.isConfirmed})`)

            await prisma.officerEvaluation.delete({
                where: { id: eva.id }
            })

            deletedCount++
            impactedOfficerIds.add(eva.officerId)
        }
    }

    console.log(`✅ Deleted ${deletedCount} invalid evaluations.`)
    console.log(`🔄 Refreshing stats for ${impactedOfficerIds.size} officers...`)

    // We can't easily import refreshOfficerStats because of module format differences (ESM vs CJS in scripts)
    // So we reimplement the logic briefly or use a raw SQL update if needed.
    // Ideally we would import it. Let's try to do a basic recalculation here.

    for (const officerId of Array.from(impactedOfficerIds)) {
        await refreshStats(officerId)
    }

    console.log('🎉 Done!')
}

async function refreshStats(officerId) {
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

    // 2. Confirmed Citizen Feedback
    const citizenFeedback = await prisma.response.findMany({
        where: {
            OR: [
                { officerId },
                { taggedOfficers: { some: { id: officerId } } }
            ],
            isConfirmed: true,
            rateOverall: { gt: 0 }
        },
        select: { rateOverall: true }
    })

    const totalResponsesCount = await prisma.response.count({
        where: {
            OR: [
                { officerId },
                { taggedOfficers: { some: { id: officerId } } }
            ],
            rateOverall: { gt: 0 }
        }
    })

    let totalPoints = 0
    let totalCount = 0

    // Evals
    evals.forEach(e => {
        const scores = [e.scoreKnowledge, e.scoreTactics, e.scoreCommunication, e.scoreProfessionalism, e.scorePhysical]
            .filter(s => typeof s === 'number' && s > 0)

        if (scores.length > 0) {
            totalPoints += scores.reduce((a, b) => a + b, 0) / scores.length
            totalCount++
        }
    })

    // Feedback
    citizenFeedback.forEach(f => {
        if (f.rateOverall > 0) {
            totalPoints += f.rateOverall
            totalCount++
        }
    })

    const avgScore = totalCount > 0 ? (totalPoints / totalCount) : 0

    await prisma.officer.update({
        where: { id: officerId },
        data: {
            avgScore: Number(avgScore.toFixed(2)),
            totalEvaluations: evals.length, // Only internal evals count as "evaluations" usually? 
            // Wait, previous code counted `evals.length` which equals `prisma.officerEvaluation.count`.
            // So if I deleted some, this count goes down. Correct.
            totalResponses: totalResponsesCount
        }
    })
    console.log(`   Updated Officer ${officerId}: Score ${avgScore.toFixed(2)}`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
