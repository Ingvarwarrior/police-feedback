const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('--- Checking AdminNotification Table ---');
    try {
        const count = await prisma.adminNotification.count();
        console.log('Total notifications:', count);

        const latest = await prisma.adminNotification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log('Latest 5 notifications:');
        latest.forEach(n => {
            console.log(`[${n.createdAt.toISOString()}] ${n.type} | ${n.priority} | ${n.title} | Read: ${n.read}`);
        });

        const unread = await prisma.adminNotification.count({ where: { read: false } });
        console.log('Unread notifications:', unread);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
