import { prisma } from '../lib/prisma'

async function syncConfirmationStatus() {
    console.log('🔄 Синхронізація статусу підтвердження...')

    // 1. Знайти всі OfficerEvaluation типу CITIZEN_FEEDBACK
    const evaluations = await (prisma.officerEvaluation as any).findMany({
        where: {
            type: 'CITIZEN_FEEDBACK',
            sourceId: { not: null }
        },
        select: {
            id: true,
            sourceId: true,
            isConfirmed: true
        }
    })

    console.log(`📊 Знайдено ${evaluations.length} оцінок типу CITIZEN_FEEDBACK`)

    let updated = 0
    let errors = 0

    for (const evaluation of evaluations) {
        try {
            // Знайти пов'язаний Response
            const response = await (prisma.response as any).findUnique({
                where: { id: evaluation.sourceId },
                select: { isConfirmed: true, suspicious: true }
            })

            if (response && response.isConfirmed !== evaluation.isConfirmed) {
                await (prisma.officerEvaluation as any).update({
                    where: { id: evaluation.id },
                    data: { isConfirmed: response.isConfirmed }
                })
                updated++
                console.log(`✅ Оновлено оцінку ${evaluation.id}: isConfirmed = ${response.isConfirmed}`)
            }
        } catch (error) {
            errors++
            console.error(`❌ Помилка при оновленні ${evaluation.id}:`, error)
        }
    }

    console.log(`\n✨ Готово! Оновлено: ${updated}, Помилок: ${errors}`)

    // 2. Перерахувати статистику для всіх офіцерів
    console.log('\n🔄 Перерахунок статистики офіцерів...')
    const { refreshAllOfficersStats } = await import('../lib/officer-stats')
    await refreshAllOfficersStats()
    console.log('✅ Статистику перераховано!')
}

syncConfirmationStatus()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('💥 Критична помилка:', error)
        process.exit(1)
    })
