import { NextResponse } from "next/server"

export async function POST(req: Request) {
    // Geolocation tracking for inspectors is disabled by policy.
    return NextResponse.json(
        { success: false, message: "Inspector geolocation tracking is disabled" },
        { status: 410 }
    )
}
