const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()
const DAY_MS = 24 * 60 * 60 * 1000
const TERM_DAYS = 15

function calculateInclusiveDeadline(startDate, termDays = TERM_DAYS) {
    const safeDays = Number.isFinite(termDays) ? Math.max(1, Math.floor(termDays)) : TERM_DAYS
    const offsetDays = safeDays - 1
    return new Date(startDate.getTime() + offsetDays * DAY_MS)
}

function sameMoment(a, b) {
    if (!a && !b) return true
    if (!a || !b) return false
    return a.getTime() === b.getTime()
}

async function main() {
    console.log("Recalculating SERVICE_INVESTIGATION deadlines (inclusive day counting)...")

    const tableInfo = await prisma.$queryRawUnsafe("PRAGMA table_info('UnifiedRecord')")
    const columns = new Set((tableInfo || []).map((row) => String(row.name || "")))
    const hasInvestigationOrderDate = columns.has("investigationOrderDate")

    if (!columns.has("deadline")) {
        throw new Error("Column 'deadline' is missing. Backfill cannot run.")
    }

    const select = {
        id: true,
        eoNumber: true,
        eoDate: true,
        deadline: true,
    }
    if (hasInvestigationOrderDate) {
        select.investigationOrderDate = true
    }

    const records = await prisma.unifiedRecord.findMany({
        where: { recordType: "SERVICE_INVESTIGATION" },
        select,
    })

    let updated = 0
    let skipped = 0

    for (const record of records) {
        const baseDate = (hasInvestigationOrderDate ? record.investigationOrderDate : null) || record.eoDate || null
        if (!baseDate) {
            skipped++
            continue
        }

        const expectedDeadline = calculateInclusiveDeadline(baseDate, TERM_DAYS)
        if (sameMoment(record.deadline, expectedDeadline)) continue

        await prisma.unifiedRecord.update({
            where: { id: record.id },
            data: { deadline: expectedDeadline },
        })

        updated++
        console.log(
            `Updated ${record.eoNumber}: ${record.deadline ? record.deadline.toISOString().slice(0, 10) : "null"} -> ${expectedDeadline.toISOString().slice(0, 10)}`
        )
    }

    console.log(`Done. Updated: ${updated}, skipped (no base date): ${skipped}, total: ${records.length}`)
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
