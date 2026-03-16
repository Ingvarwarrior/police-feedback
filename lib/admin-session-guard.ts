import { cookies } from "next/headers"

export const ADMIN_SESSION_GUARD_COOKIE = "admin-session-guard"

function getCookieOptions() {
    return {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
    }
}

export async function setAdminSessionGuardCookie() {
    const cookieStore = await cookies()
    cookieStore.set(ADMIN_SESSION_GUARD_COOKIE, "1", getCookieOptions())
}

export async function clearAdminSessionGuardCookie() {
    const cookieStore = await cookies()
    cookieStore.set(ADMIN_SESSION_GUARD_COOKIE, "", {
        ...getCookieOptions(),
        expires: new Date(0),
    })
}

export async function hasAdminSessionGuardCookie() {
    const cookieStore = await cookies()
    return cookieStore.get(ADMIN_SESSION_GUARD_COOKIE)?.value === "1"
}
