'use client'

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default function SignOutButton() {
    return (
        <Button
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 gap-3"
            onClick={async () => {
                try {
                    await fetch("/api/auth/client-logout", {
                        method: "POST",
                        credentials: "same-origin",
                    })
                } finally {
                    window.location.replace("/admin/login?logout=" + Date.now())
                }
            }}
        >
            <LogOut className="w-5 h-5" />
            Вийти
        </Button>
    )
}
