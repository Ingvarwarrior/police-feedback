'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

export default function PrintButton() {
    return (
        <Button
            onClick={() => window.print()}
            variant="outline"
            className="h-12 gap-2 rounded-2xl font-bold px-6 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
        >
            <Printer className="w-4 h-4" />
            <span>Друк звіту</span>
        </Button>
    )
}
