const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin'
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@police.gov.ua'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin_password_123'

    // Check if user exists
    const existing = await prisma.user.findUnique({
        where: { username: adminUsername }
    })

    if (existing) {
        console.log('Admin user already exists')
        return
    }

    await prisma.user.create({
        data: {
            username: adminUsername,
            email: adminEmail,
            passwordHash: adminPassword, // In prod, use bcrypt!
            role: 'ADMIN',
            active: true,
            firstName: 'Admin',
            lastName: 'User',
            badgeNumber: '00000',
        }
    })

    console.log(`Admin user ${adminEmail} created successfully`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
