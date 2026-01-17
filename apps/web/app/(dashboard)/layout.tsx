'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSites } from '@/lib/hooks/useData'
import { useSite } from '@/lib/hooks/useSite'
import { useHelpShortcut } from '@/lib/hooks/useHelpShortcut'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { currentSiteId, setSiteId, clearSiteId } = useSite()
  const { data: sites = [] } = useSites(user?.orgId || null)
  
  // Enable help keyboard shortcuts
  useHelpShortcut()

  useEffect(() => {
    if (!currentSiteId && sites.length > 0) {
      setSiteId(sites[0]._id)
    }
  }, [currentSiteId, setSiteId, sites])

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xl font-semibold text-neutral-900">
              scheduleright
            </Link>
            <span className="text-sm text-neutral-500">Dashboard</span>
            <Link
              href="/help"
              className="ml-2 p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition"
              title="Help Center (? or Ctrl+K)"
            >
              <span className="text-xl">❓</span>
            </Link>
          </div>

          {user && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label htmlFor="dashboard-site-select" className="text-sm text-neutral-600">
                Active Site
              </label>
              <select
                id="dashboard-site-select"
                value={currentSiteId || ''}
                onChange={(event) => {
                  const value = event.target.value
                  if (value) {
                    setSiteId(value)
                  } else {
                    clearSiteId()
                  }
                }}
                aria-label="Active site"
                className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select a site...</option>
                {sites.map((site: any) => (
                  <option key={site._id} value={site._id}>
                    {site.name}
                  </option>
                ))}
              </select>
              {!sites.length && (
                <Link href="/orgs" className="text-sm text-indigo-600 hover:text-indigo-700">
                  Create a site
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
