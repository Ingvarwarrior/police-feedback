import type { Metadata } from 'next'
import './globals.css'

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
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
