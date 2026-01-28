import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { firstName, lastName, badgeNumber } = body

        // Update user profile
        await prisma.user.update({
            where: { username: session.user.email as string },
            data: {
                firstName: firstName || null,
                lastName: lastName || null,
                badgeNumber: badgeNumber || null
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
}
