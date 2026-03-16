'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { IdleTimer } from '@/components/admin/IdleTimer'
import { ChunkRecoveryGuard } from '@/components/admin/ChunkRecoveryGuard'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ChunkRecoveryGuard />
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
