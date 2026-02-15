import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = unsubscribeSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid unsubscribe payload" }, { status: 400 })
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint: parsed.data.endpoint,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
