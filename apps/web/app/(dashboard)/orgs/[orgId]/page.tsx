'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser, useOrganization, useSites, useCreateSite } from '@/lib/hooks/useData'
import { useSite } from '@/lib/hooks/useSite'
import type { Site } from '@/lib/hooks/useData'
import { useApi } from '@/lib/hooks/useApi'

interface PropertyType {
  _id: string
  propertyId: string
  label: string
  description?: string
  dataType: string
  required?: boolean
  defaultValue?: any
  validation?: {
    enumOptions?: string[]
  }
  visibility?: 'public' | 'staff' | 'admin'
  appliesTo: string[]
}

interface PropertyValue {
  _id: string
  propertyId: string
  value: any
}

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
  const { call } = useApi()
  const queryClient = useQueryClient()
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [savingCustom, setSavingCustom] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [customSaved, setCustomSaved] = useState(false)

  const { data: user } = useCurrentUser()
  const { data: org, isLoading: orgLoading, error: orgError } = useOrganization(orgId)
  const { data: sites, isLoading: sitesLoading, error: sitesError } = useSites(orgId)
  const { mutate: createSite, isPending: isCreatingSite } = useCreateSite(orgId)
  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')

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

  const isAdmin = (user?.roles || []).includes('ADMIN')
  const orgDisplayName = org?.name || 'Untitled Organization'

  const { data: propertyTypesData } = useQuery({
    queryKey: ['property-types'],
    queryFn: async () => await call('/api/v1/properties'),
    enabled: isStaff,
  })

  const { data: propertyValuesData } = useQuery({
    queryKey: ['org-properties', orgId],
    queryFn: async () => await call(`/api/v1/entities/org/${encodeURIComponent(orgId)}/properties`),
    enabled: isStaff && !!orgId,
  })

  const propertyTypes: PropertyType[] = useMemo(
    () => propertyTypesData?.data ?? [],
    [propertyTypesData?.data]
  )
  const propertyValues: PropertyValue[] = useMemo(
    () => propertyValuesData?.data ?? [],
    [propertyValuesData?.data]
  )
  const orgPropertyTypes = useMemo(
    () => propertyTypes.filter((type) => type.appliesTo.includes('org')),
    [propertyTypes]
  )

  useEffect(() => {
    const values: PropertyValue[] = propertyValues
    const initial: Record<string, any> = {}
    orgPropertyTypes.forEach((type) => {
      const match = values.find((value) => value.propertyId === type.propertyId)
      if (match) {
        initial[type.propertyId] = match.value
      } else if (type.defaultValue !== undefined) {
        initial[type.propertyId] = type.defaultValue
      }
    })
    setCustomValues(initial)
    setCustomSaved(false)
  }, [propertyValues, orgPropertyTypes])

  const handleSaveCustomFields = async () => {
    setSavingCustom(true)
    setCustomError(null)
    setCustomSaved(false)
    try {
      const values = orgPropertyTypes.map((type) => ({
        propertyId: type.propertyId,
        value: customValues[type.propertyId] ?? null,
      }))

      await call(`/api/v1/entities/org/${encodeURIComponent(orgId)}/properties`, {
        method: 'PUT',
        body: { values },
      })
      queryClient.invalidateQueries({ queryKey: ['org-properties', orgId] })
      setCustomSaved(true)
    } catch (err: any) {
      setCustomError(err?.message || 'Failed to save custom fields.')
    } finally {
      setSavingCustom(false)
    }
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

          <div className="bg-white rounded-lg shadow-md border border-neutral-200 p-6 mt-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Custom Fields</h2>
                <p className="text-sm text-neutral-500">Organization-level properties visible across sites and bookings.</p>
              </div>
              <button
                type="button"
                onClick={handleSaveCustomFields}
                disabled={savingCustom}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60"
              >
                {savingCustom ? 'Saving...' : 'Save Fields'}
              </button>
            </div>
            {customSaved && (
              <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Custom fields saved successfully.
              </div>
            )}
            {customError && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {customError}
              </div>
            )}
            {orgPropertyTypes.length === 0 ? (
              <p className="text-sm text-neutral-600">No custom fields configured for organizations yet.</p>
            ) : (
              <div className="space-y-3">
                {orgPropertyTypes.map((type) => {
                  const value = customValues[type.propertyId] ?? ''
                  const readOnly = type.visibility === 'admin' && !isAdmin
                  const requiredLabel = type.required ? ' *' : ''
                  if (type.dataType === 'boolean') {
                    return (
                      <div key={type.propertyId} className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          id={`org-field-${type.propertyId}`}
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.checked }))}
                          disabled={readOnly}
                        />
                        <label htmlFor={`org-field-${type.propertyId}`} className="text-sm text-neutral-700">
                          {type.label}{requiredLabel}
                          {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                        </label>
                      </div>
                    )
                  }

                  if (type.dataType === 'enum') {
                    return (
                      <div key={type.propertyId}>
                        <label htmlFor={`org-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                          {type.label}{requiredLabel}
                          {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                        </label>
                        <select
                          id={`org-field-${type.propertyId}`}
                          value={value}
                          onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.value }))}
                          className="w-full border border-neutral-300 rounded-md px-3 py-2"
                          disabled={readOnly}
                        >
                          <option value="">Select...</option>
                          {(type.validation?.enumOptions || []).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        {type.description && <p className="mt-1 text-xs text-neutral-500">{type.description}</p>}
                      </div>
                    )
                  }

                  if (type.dataType === 'multiEnum') {
                    const selected: string[] = Array.isArray(value) ? value : []
                    return (
                      <div key={type.propertyId}>
                        <label htmlFor={`org-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                          {type.label}{requiredLabel}
                          {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                        </label>
                        <select
                          id={`org-field-${type.propertyId}`}
                          multiple
                          value={selected}
                          onChange={(e) => {
                            const selections = Array.from(e.target.selectedOptions).map((option) => option.value)
                            setCustomValues((prev) => ({ ...prev, [type.propertyId]: selections }))
                          }}
                          className="w-full border border-neutral-300 rounded-md px-3 py-2"
                          disabled={readOnly}
                        >
                          {(type.validation?.enumOptions || []).map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-neutral-500">Hold Ctrl (Windows) or ⌘ (Mac) to select multiple.</p>
                        {type.description && <p className="mt-1 text-xs text-neutral-500">{type.description}</p>}
                      </div>
                    )
                  }

                  if (type.dataType === 'text') {
                    return (
                      <div key={type.propertyId}>
                        <label htmlFor={`org-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                          {type.label}{requiredLabel}
                          {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                        </label>
                        <textarea
                          id={`org-field-${type.propertyId}`}
                          value={value}
                          onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.value }))}
                          className="w-full border border-neutral-300 rounded-md px-3 py-2"
                          rows={3}
                          disabled={readOnly}
                        />
                        {type.description && <p className="mt-1 text-xs text-neutral-500">{type.description}</p>}
                      </div>
                    )
                  }

                  return (
                    <div key={type.propertyId}>
                      <label htmlFor={`org-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                        {type.label}{requiredLabel}
                        {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                      </label>
                      <input
                        id={`org-field-${type.propertyId}`}
                        type={type.dataType === 'date' ? 'date' : type.dataType === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.value }))}
                        className="w-full border border-neutral-300 rounded-md px-3 py-2"
                        disabled={readOnly}
                      />
                      {type.description && <p className="mt-1 text-xs text-neutral-500">{type.description}</p>}
                    </div>
                  )
                })}
              </div>
            )}
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
