const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Starting Cleanup of Anonymous Citizens...')

    // 1. Identify citizens without phone numbers
    const anonymousCitizens = await prisma.citizen.findMany({
        where: {
            phone: null
        },
        select: {
            id: true
        }
    })

    console.log(`📊 Found ${anonymousCitizens.length} anonymous dossiers to remove.`)

    if (anonymousCitizens.length === 0) {
        console.log('✅ No anonymous dossiers found. Nothing to clean.')
        return
    }

    const idsToDelete = anonymousCitizens.map(c => c.id)

    // 2. Unlink reports first (set citizenId to null)
    const updateResult = await prisma.response.updateMany({
        where: {
            citizenId: {
                in: idsToDelete
            }
        },
        data: {
            citizenId: null
        }
    })

    console.log(`🔗 Unlinked ${updateResult.count} reports from anonymous dossiers.`)

    // 3. Delete the dossiers
    const deleteResult = await prisma.citizen.deleteMany({
        where: {
            id: {
                in: idsToDelete
            }
        }
    })

    console.log(`🗑️ Successfully deleted ${deleteResult.count} anonymous dossiers.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
