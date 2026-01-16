'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCurrentUser, useOrganization, useSites, useCreateSite } from '@/lib/hooks/useData'
import { useSite } from '@/lib/hooks/useSite'
import type { Site } from '@/lib/hooks/useData'

export default function OrgDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { setSiteId } = useSite()
  const orgId = params?.orgId as string
  const [showNewSiteForm, setShowNewSiteForm] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const [newSiteAddress, setNewSiteAddress] = useState('')
  const [newSitePhone, setNewSitePhone] = useState('')
  const [mounted, setMounted] = useState(false)

  const { data: user } = useCurrentUser()
  const { data: org, isLoading: orgLoading, error: orgError } = useOrganization(orgId)
  const { data: sites, isLoading: sitesLoading, error: sitesError } = useSites(orgId)
  const { mutate: createSite, isPending: isCreatingSite } = useCreateSite(orgId)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !orgLoading && !org) {
      router.push('/orgs')
    }
  }, [mounted, orgLoading, org, router])

  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSiteName.trim()) return

    createSite(
      {
        name: newSiteName,
        address: newSiteAddress,
        phone: newSitePhone,
      },
      {
        onSuccess: () => {
          setNewSiteName('')
          setNewSiteAddress('')
          setNewSitePhone('')
          setShowNewSiteForm(false)
        },
      }
    )
  }

  const handleSelectSite = (siteId: string) => {
    setSiteId(siteId)
    router.push(`/orgs/${orgId}/sites/${siteId}`)
  }

  if (!mounted) return null

  if (orgLoading) {
    return (
      <div className="container mt-12">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-neutral-200 rounded w-full"></div>
            <div className="h-4 bg-neutral-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    )
  }

  if (orgError || !org) {
    return (
      <div className="container mt-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-700">
            {orgError instanceof Error ? orgError.message : 'Organization not found'}
          </p>
          <button
            onClick={() => router.push('/orgs')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Organizations
          </button>
        </div>
      </div>
    )
  }

  const isAdmin = (user?.roles || []).includes('ADMIN')
  const orgDisplayName = org.name || 'Untitled Organization'

  return (
    <div className="container mt-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/orgs')}
          className="text-primary-600 hover:text-primary-700 font-medium mb-4 flex items-center"
        >
          ← Back to Organizations
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-primary-600">{orgDisplayName}</h1>
            <p className="mt-2 text-neutral-600">ID: {org._id}</p>
          </div>
          <button
            onClick={() => router.push(`/orgs/${orgId}/settings`)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            ⚙️ Branding Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Organization Info</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Organization Name
                </label>
                <p className="text-neutral-900 font-medium">{orgDisplayName}</p>
              </div>

              {org.settings?.timezone && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Timezone
                  </label>
                  <p className="text-neutral-900">🕐 {org.settings.timezone}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Tenant ID
                </label>
                <p className="text-neutral-900 font-mono text-sm break-all">{org.tenantId}</p>
              </div>

              <div className="border-t border-neutral-200 pt-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Created
                </label>
                <p className="text-neutral-600 text-sm">
                  {new Date(org.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Last Updated
                </label>
                <p className="text-neutral-600 text-sm">
                  {new Date(org.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sites List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-neutral-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-neutral-900">Sites</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowNewSiteForm(!showNewSiteForm)}
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition font-medium text-sm"
                >
                  {showNewSiteForm ? '✕ Cancel' : '+ New Site'}
                </button>
              )}
            </div>

            {/* New Site Form */}
            {showNewSiteForm && isAdmin && (
              <form onSubmit={handleCreateSite} className="border-b border-neutral-200 bg-neutral-50 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Site Name *
                  </label>
                  <input
                    type="text"
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    placeholder="Enter site name"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newSiteAddress}
                    onChange={(e) => setNewSiteAddress(e.target.value)}
                    placeholder="Enter address"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newSitePhone}
                    onChange={(e) => setNewSitePhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingSite || !newSiteName.trim()}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium disabled:bg-neutral-400 disabled:cursor-not-allowed"
                >
                  {isCreatingSite ? 'Creating...' : 'Create Site'}
                </button>
              </form>
            )}

            {/* Sites Content */}
            <div className="p-6">
              {sitesLoading && (
                <div className="animate-pulse space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-neutral-200 rounded-lg"></div>
                  ))}
                </div>
              )}

              {sitesError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">
                    {sitesError instanceof Error ? sitesError.message : 'Failed to load sites'}
                  </p>
                </div>
              )}

              {!sitesLoading && (!sites || sites.length === 0) && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📍</div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Sites</h3>
                  <p className="text-neutral-600">
                    {isAdmin ? 'Create your first site above' : 'No sites available'}
                  </p>
                </div>
              )}

              {!sitesLoading && sites && sites.length > 0 && (
                <div className="space-y-4">
                  {sites.map((site: Site) => (
                    <div
                      key={site._id}
                      onClick={() => handleSelectSite(site._id)}
                      className="border border-neutral-200 rounded-lg p-4 hover:bg-primary-50 hover:border-primary-300 transition cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-neutral-900">
                          {site.name}
                        </h3>
                        <span className="text-xs font-medium text-neutral-500">
                          {site._id}
                        </span>
                      </div>

                      {site.address && (
                        <p className="text-sm text-neutral-600 mb-2">
                          📍 {site.address}
                        </p>
                      )}

                      {site.phone && (
                        <p className="text-sm text-neutral-600 mb-2">
                          📞 {site.phone}
                        </p>
                      )}

                      <div className="text-xs text-neutral-500">
                        Created: {new Date(site.createdAt).toLocaleDateString()}
                      </div>

                      <div className="mt-3 text-primary-600 font-medium flex items-center">
                        View Site →
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
