import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'SheduleRight By James Knox',
  description: 'Offline-first scheduling for non-profit pregnancy care centers',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SheduleRight',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0284c7" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-neutral-50 text-neutral-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
