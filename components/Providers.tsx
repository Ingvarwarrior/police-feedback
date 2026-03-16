'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { IdleTimer } from '@/components/admin/IdleTimer'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <IdleTimer />
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </SessionProvider>
    )
}
