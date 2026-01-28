const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
    console.log('--- START NOTIFICATION TEST ---')
    try {
        const notif = await prisma.adminNotification.create({
            data: {
                type: 'NEW_REPORT',
                priority: 'NORMAL',
                title: '🧪 Тестове сповіщення',
                message: 'Перевірка створення сповіщення через скрипт',
                link: '/admin',
                userId: null
            }
        })
        console.log('Success! Created:', notif)
    } catch (e) {
        console.error('FAILED to create:', e)
    } finally {
        await prisma.$disconnect()
    }
}

test()
