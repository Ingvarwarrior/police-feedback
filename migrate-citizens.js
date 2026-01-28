const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Starting Citizen Migration (Phone Only Mode)...')

    const responses = await prisma.response.findMany({
        where: {
            contact: {
                isNot: null
            }
        },
        include: {
            contact: true
        }
    })

    console.log(`📊 Found ${responses.length} reports with contact info to process.`)

    let linkedCount = 0

    for (const resp of responses) {
        const phone = resp.contact?.phone
        const ipHash = resp.ipHash

        if (!phone) continue

        // Find or create citizen
        let citizen = await prisma.citizen.findUnique({
            where: { phone }
        })

        if (!citizen) {
            citizen = await prisma.citizen.create({
                data: {
                    phone,
                    ipHash: ipHash || null,
                    fullName: resp.contact?.name || null
                }
            })
        }

        if (citizen) {
            await prisma.response.update({
                where: { id: resp.id },
                data: { citizenId: citizen.id }
            })
            linkedCount++
        }
    }

    console.log(`✅ Finished! Linked ${linkedCount} reports to Citizens.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
