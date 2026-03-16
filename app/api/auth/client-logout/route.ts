import { NextResponse } from "next/server"

const AUTH_COOKIE_NAMES = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.callback-url",
    "authjs.callback-url",
    "next-auth.csrf-token",
    "authjs.csrf-token",
]

function buildLogoutResponse() {
    const response = NextResponse.json({ ok: true })

    for (const cookieName of AUTH_COOKIE_NAMES) {
        response.cookies.set({
            name: cookieName,
            value: "",
            httpOnly: cookieName.includes("session-token") || cookieName.includes("csrf-token"),
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            expires: new Date(0),
        })
    }

    response.headers.set("Cache-Control", "no-store")
    return response
}

export async function POST() {
    return buildLogoutResponse()
}
