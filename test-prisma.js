const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Testing complex findMany on Citizen...')
        const citizens = await prisma.citizen.findMany({
            include: {
                _count: {
                    select: { responses: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        })
        console.log('Success! Found:', citizens.length)

        console.log('Testing complex findUnique on Citizen...')
        // Try to find one if exists, otherwise try a random ID to check query structure
        const one = await prisma.citizen.findFirst()
        if (one) {
            const citizen = await prisma.citizen.findUnique({
                where: { id: one.id },
                include: {
                    phones: true,
                    responses: {
                        include: {
                            geoPoint: true,
                            _count: {
                                select: { attachments: true }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            })
            console.log('Success! Found detail for:', citizen.id)
        } else {
            console.log('No citizens to test findUnique, but findMany worked.')
        }
    } catch (e) {
        console.error('CRASH DETECTED:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
