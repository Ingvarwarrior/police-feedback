import { signOut } from "@/auth"
import { clearAdminSessionGuardCookie } from "@/lib/admin-session-guard"

export async function POST() {
    await signOut({ redirect: false })
    await clearAdminSessionGuardCookie()
    return Response.json({ ok: true })
}
