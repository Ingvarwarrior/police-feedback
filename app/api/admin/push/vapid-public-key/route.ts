import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getWebPushPublicKey, isWebPushConfigured } from "@/lib/push-notifications"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "WEB_PUSH keys are not configured on server" },
      { status: 503 }
    )
  }

  return NextResponse.json({ publicKey: getWebPushPublicKey() })
}
