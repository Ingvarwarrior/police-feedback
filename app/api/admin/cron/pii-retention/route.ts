import { NextResponse } from "next/server"
import { runPiiRetentionCleanup } from "@/lib/pii-retention"

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const result = await runPiiRetentionCleanup()
        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        console.error("[CRON] Error during PII cleanup:", error)
        return NextResponse.json(
            { success: false, error: "PII cleanup failed" },
            { status: 500 }
        )
    }
}

