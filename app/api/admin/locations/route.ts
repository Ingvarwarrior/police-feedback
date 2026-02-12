import { NextResponse } from "next/server"

export async function GET() {
    // Geolocation tracking for inspectors is disabled by policy.
    return NextResponse.json([])
}
