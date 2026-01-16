'use client'

import { useParams, useRouter } from 'next/navigation'
import { useSiteDetails } from '@/lib/hooks/useData'

export default function SiteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params?.orgId as string
  const siteId = params?.siteId as string

  const { data: site, isLoading, error } = useSiteDetails(siteId)

  if (isLoading) {
    return (
      <div className="container mt-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 rounded w-48"></div>
          <div className="h-4 bg-neutral-200 rounded w-full"></div>
          <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="container mt-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Site not found</h2>
          <p className="text-red-700">
            {error instanceof Error ? error.message : 'Unable to load site details.'}
          </p>
          <button
            onClick={() => router.push(`/orgs/${orgId}`)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Organization
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-12 space-y-6">
      <button
        onClick={() => router.push(`/orgs/${orgId}`)}
        className="text-primary-600 hover:text-primary-700 font-medium"
      >
        ← Back to Organization
      </button>

      <div className="bg-white rounded-lg shadow-md border border-neutral-200 p-6">
        <h1 className="text-3xl font-bold text-neutral-900">{site.name}</h1>
        <p className="text-neutral-600 mt-2">Site ID: {site._id}</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-neutral-700">Address</div>
            <div className="text-neutral-900">{site.address || 'Not provided'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-700">Phone</div>
            <div className="text-neutral-900">{site.phone || 'Not provided'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-700">Organization</div>
            <div className="text-neutral-900">{site.orgId}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-700">Created</div>
            <div className="text-neutral-900">{new Date(site.createdAt).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
