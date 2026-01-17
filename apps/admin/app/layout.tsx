import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'scheduleright Admin',
  description: 'Admin dashboard for scheduleright scheduling software',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
