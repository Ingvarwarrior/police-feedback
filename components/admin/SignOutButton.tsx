'use client'

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

export default function SignOutButton() {
    return (
        <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 gap-3"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
        >
            <LogOut className="w-5 h-5" />
            Вийти
        </Button>
    )
}
