const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkBirthdays() {
    console.log('🎂 Checking for officer birthdays...')

    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    const formatDate = (d) => `${d.getMonth() + 1}-${d.getDate()}`
    const todayStr = formatDate(today)
    const tomorrowStr = formatDate(tomorrow)

    const officers = await prisma.officer.findMany({
        where: {
            status: 'ACTIVE',
            birthDate: { not: null }
        }
    })

    console.log(`📊 Checking ${officers.length} active officers.`)

    for (const officer of officers) {
        const bday = new Date(officer.birthDate)
        const bdayStr = formatDate(bday)

        if (bdayStr === todayStr) {
            console.log(`🎉 Birthday today: ${officer.lastName} ${officer.firstName}`)
            await prisma.adminNotification.create({
                data: {
                    type: 'BIRTHDAY',
                    priority: 'NORMAL',
                    title: `🥳 День народження сьогодні!`,
                    message: `Сьогодні святкує ${officer.rank || ''} ${officer.lastName} ${officer.firstName} (${officer.badgeNumber}). Поздоровляємо!`,
                    link: `/admin/officers/${officer.id}`
                }
            })
        } else if (bdayStr === tomorrowStr) {
            console.log(`🎈 Birthday tomorrow: ${officer.lastName} ${officer.firstName}`)
            await prisma.adminNotification.create({
                data: {
                    type: 'BIRTHDAY_EVE',
                    priority: 'LOW',
                    title: `🗓️ День народження завтра`,
                    message: `Завтра день народження у ${officer.lastName} ${officer.firstName}. Не забудьте привітати!`,
                    link: `/admin/officers/${officer.id}`
                }
            })
        }
    }

    console.log('✅ Birthday check completed.')
}

checkBirthdays()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
