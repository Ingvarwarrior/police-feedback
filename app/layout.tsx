import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['cyrillic', 'latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Опитування громадян | Поліція',
  description: 'Опитування про якість роботи БПП',
  manifest: '/manifest.json', // manifest.ts handles this as /manifest.json in Next.js
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Police Admin',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
        {children}
      </body>
    </html>
  )
}
