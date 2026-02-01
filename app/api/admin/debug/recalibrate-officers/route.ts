import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { refreshAllOfficersStats } from "@/lib/officer-stats"

export async function GET() {
    const session = await auth()
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const user = session.user as any
    if (user.role !== 'ADMIN') return new NextResponse("Forbidden", { status: 403 })

    try {
        await refreshAllOfficersStats()
        return NextResponse.json({ success: true, message: "All officers stats recalibrated" })
    } catch (error: any) {
        console.error("Recalibration error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
