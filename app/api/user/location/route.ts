import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const { lat, lon } = await req.json()

        if (typeof lat !== 'number' || typeof lon !== 'number') {
            return new NextResponse("Invalid coordinates", { status: 400 })
        }

        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                lastLat: lat,
                lastLon: lon,
                lastLocationAt: new Date()
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Location update failed", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
