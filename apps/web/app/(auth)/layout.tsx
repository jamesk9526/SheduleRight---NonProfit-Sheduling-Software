import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login - ScheduleRight',
  description: 'Sign in to your ScheduleRight account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
