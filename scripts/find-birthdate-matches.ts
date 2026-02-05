
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const officers = await prisma.officer.findMany({
        where: {
            birthDate: { not: null }
        },
        orderBy: {
            birthDate: 'asc'
        }
    });

    const groups = new Map();

    officers.forEach(o => {
        const dateStr = o.birthDate ? o.birthDate.toISOString().split('T')[0] : 'Unknown';
        if (!groups.has(dateStr)) {
            groups.set(dateStr, []);
        }
        groups.get(dateStr).push(o);
    });

    console.log("### СПИСОК ОФІЦЕРІВ З ОДНАКОВИМИ ДАТАМИ НАРОДЖЕННЯ ###\n");

    let found = false;
    groups.forEach((list, date) => {
        if (list.length > 1) {
            found = true;
            // Format date to DD.MM.YYYY
            const [y, m, d] = date.split('-');
            console.log(`📅 Дата: ${d}.${m}.${y} (${list.length} осіб):`);
            list.forEach(o => {
                console.log(`   - ${o.lastName} ${o.firstName} ${o.middleName || ''} (Жетон: ${o.badgeNumber})`);
            });
            console.log('');
        }
    });

    if (!found) {
        console.log("Офіцерів зі спільними датами народження не знайдено.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
