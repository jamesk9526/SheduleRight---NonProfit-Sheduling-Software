'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCurrentUser, useOrganizations } from '@/lib/hooks/useData'

export default function OrganizationsPage() {
  const router = useRouter()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const { data: orgs, isLoading: orgsLoading, error } = useOrganizations()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !userLoading && !user) {
      router.push('/login')
    }
  }, [mounted, userLoading, user, router])

  // Only admins can view all organizations
  if (user && !(user.roles || []).includes('ADMIN')) {
    return (
      <div className="container mt-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-yellow-800 font-semibold mb-2">Access Denied</h2>
          <p className="text-yellow-700">Only administrators can view all organizations.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!mounted) return null

  return (
    <div className="container mt-12">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-primary-600">Organizations</h1>
          <p className="mt-2 text-neutral-600">Manage all organizations in the system</p>
        </div>
        <button
          onClick={() => router.push('/orgs/new')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
        >
          + New Organization
        </button>
      </div>

      {/* Loading State */}
      {orgsLoading && (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-neutral-200 rounded-lg"></div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Organizations</h2>
          <p className="text-red-700">
            {error instanceof Error ? error.message : 'Failed to load organizations'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!orgsLoading && (!orgs || orgs.length === 0) && (
        <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Organizations</h3>
          <p className="text-neutral-600 mb-6">Create your first organization to get started</p>
          <button
            onClick={() => router.push('/orgs/new')}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            Create Organization
          </button>
        </div>
      )}

      {/* Organizations Grid */}
      {!orgsLoading && orgs && orgs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgs.map((org) => (
            <div
              key={org._id}
              className="bg-white rounded-lg shadow-md border border-neutral-200 hover:shadow-lg transition cursor-pointer"
              onClick={() => router.push(`/orgs/${org._id}`)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="text-primary-600 font-bold">
                      {(org.name || 'Org').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                    {org._id}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  {org.name || 'Untitled Organization'}
                </h3>

                {org.settings?.timezone && (
                  <p className="text-sm text-neutral-600 mb-4">
                    🕐 {org.settings.timezone}
                  </p>
                )}

                <div className="text-xs text-neutral-500 space-y-1">
                  <p>Created: {new Date(org.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(org.updatedAt).toLocaleDateString()}</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/orgs/${org._id}`)
                  }}
                  className="mt-4 w-full px-4 py-2 bg-primary-50 text-primary-600 rounded hover:bg-primary-100 transition font-medium text-sm"
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
