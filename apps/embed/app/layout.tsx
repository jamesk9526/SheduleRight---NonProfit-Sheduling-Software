import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'scheduleright Widget',
  description: 'Embeddable schedule widget for scheduleright',
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
