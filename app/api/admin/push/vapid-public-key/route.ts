import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getWebPushPublicKey, isWebPushConfigured } from "@/lib/push-notifications"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ configured: false, publicKey: null })
  }

  return NextResponse.json({ configured: true, publicKey: getWebPushPublicKey() })
}
