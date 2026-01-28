const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const prisma = new PrismaClient()

async function check() {
    let log = "=== NOTIFICATION DIAGNOSTICS ===\n"
    try {
        const allNotifs = await prisma.adminNotification.findMany()
        log += `Found ${allNotifs.length} total notifications.\n`
        log += JSON.stringify(allNotifs, null, 2) + "\n"

        const countNew = await prisma.adminNotification.count({ where: { type: 'NEW_REPORT' } })
        log += `Total NEW_REPORT count: ${countNew}\n`
    } catch (e) {
        log += `ERROR: ${e.message}\n`
    } finally {
        fs.writeFileSync('/home/ingvar/.gemini/antigravity/scratch/police-feedback/diag_final.txt', log)
        await prisma.$disconnect()
    }
}

check()
