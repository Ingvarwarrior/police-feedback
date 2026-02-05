
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const excelOfficers = JSON.parse(fs.readFileSync('extracted_staffing.json', 'utf-8'));
        const dbOfficers = await prisma.officer.findMany();

        const dbBadges = new Set(dbOfficers.map(o => o.badgeNumber));
        const missingInDb = excelOfficers.filter((o: any) => !dbBadges.has(o.badge));

        console.log('### ЗВІТ ПРО ПОРІВНЯННЯ БАЗ (Excel vs DB) ###\n');
        console.log(`Офіцерів в Excel: ${excelOfficers.length}`);
        console.log(`Офіцерів в БД (Telegram): ${dbOfficers.length}`);
        console.log(`Офіцерів, які є в Excel, але ВІДСУТНІ в БД: ${missingInDb.length}\n`);

        if (missingInDb.length > 0) {
            console.log('--- Приклади відсутніх в системі офіцерів ---');
            missingInDb.forEach((o: any) => console.log(`- ${o.fullName} (${o.badge}) [${o.sheet}]`));
        }

        // Check for rank/phone discrepancies for matching badges
        console.log('\n--- Розбіжності в існуючих записах ---');
        let discrepancies = 0;
        excelOfficers.forEach((eo: any) => {
            const dbo = dbOfficers.find(o => o.badgeNumber === eo.badge);
            if (dbo) {
                let diffs = [];
                // Compare phone (normalized)
                const dboPhone = (dbo.phone || '').replace(/\s+/g, '');
                if (eo.phone && eo.phone !== dboPhone) {
                    diffs.push(`Телефон: DB=${dbo.phone} Excel=${eo.phone}`);
                }

                if (diffs.length > 0) {
                    discrepancies++;
                    console.log(`⚠️ ${eo.fullName} (${eo.badge}):`);
                    diffs.forEach(d => console.log(`   ${d}`));
                }
            }
        });
        if (discrepancies === 0) console.log('Розбіжностей в телефонах/званнях не знайдено. ✅');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
