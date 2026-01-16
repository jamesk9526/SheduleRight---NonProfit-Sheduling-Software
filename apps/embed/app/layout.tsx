import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SheduleRight Widget',
  description: 'Embeddable schedule widget for SheduleRight',
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
