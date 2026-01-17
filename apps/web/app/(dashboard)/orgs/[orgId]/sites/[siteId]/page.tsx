'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSiteDetails } from '@/lib/hooks/useData'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'

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

export default function SiteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params?.orgId as string
  const siteId = params?.siteId as string
  const { user } = useAuth()
  const { call } = useApi()
  const queryClient = useQueryClient()
  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')
  const isAdmin = (user?.roles || []).includes('ADMIN')
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [savingCustom, setSavingCustom] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [customSaved, setCustomSaved] = useState(false)

  const { data: site, isLoading, error } = useSiteDetails(siteId)

  const { data: propertyTypesData } = useQuery({
    queryKey: ['property-types'],
    queryFn: async () => await call('/api/v1/properties'),
    enabled: isStaff,
  })

  const { data: propertyValuesData } = useQuery({
    queryKey: ['site-properties', siteId],
    queryFn: async () => await call(`/api/v1/entities/site/${encodeURIComponent(siteId)}/properties`),
    enabled: isStaff && !!siteId,
  })

  const propertyTypes: PropertyType[] = propertyTypesData?.data || []
  const sitePropertyTypes = useMemo(
    () => propertyTypes.filter((type) => type.appliesTo.includes('site')),
    [propertyTypes]
  )

  useEffect(() => {
    const values: PropertyValue[] = propertyValuesData?.data || []
    const initial: Record<string, any> = {}
    sitePropertyTypes.forEach((type) => {
      const match = values.find((value) => value.propertyId === type.propertyId)
      if (match) {
        initial[type.propertyId] = match.value
      } else if (type.defaultValue !== undefined) {
        initial[type.propertyId] = type.defaultValue
      }
    })
    setCustomValues(initial)
    setCustomSaved(false)
  }, [propertyValuesData, sitePropertyTypes])

  const handleSaveCustomFields = async () => {
    setSavingCustom(true)
    setCustomError(null)
    setCustomSaved(false)
    try {
      const values = sitePropertyTypes.map((type) => ({
        propertyId: type.propertyId,
        value: customValues[type.propertyId] ?? null,
      }))

      await call(`/api/v1/entities/site/${encodeURIComponent(siteId)}/properties`, {
        method: 'PUT',
        body: { values },
      })
      queryClient.invalidateQueries({ queryKey: ['site-properties', siteId] })
      setCustomSaved(true)
    } catch (err: any) {
      setCustomError(err?.message || 'Failed to save custom fields.')
    } finally {
      setSavingCustom(false)
    }
  }

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

      <div className="bg-white rounded-lg shadow-md border border-neutral-200 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Custom Fields</h2>
            <p className="text-sm text-neutral-500">Update site-specific metadata used across bookings and reporting.</p>
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
        {sitePropertyTypes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
            <p>No custom fields configured for sites yet.</p>
            <Link href="/properties" className="mt-2 inline-flex text-primary-600 hover:text-primary-700 font-medium">
              Create fields in the Field Library →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sitePropertyTypes.map((type) => {
              const value = customValues[type.propertyId] ?? ''
              const readOnly = type.visibility === 'admin' && !isAdmin
              const requiredLabel = type.required ? ' *' : ''
              if (type.dataType === 'boolean') {
                return (
                  <div key={type.propertyId} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      id={`site-field-${type.propertyId}`}
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.checked }))}
                      disabled={readOnly}
                    />
                    <label htmlFor={`site-field-${type.propertyId}`} className="text-sm text-neutral-700">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                    </label>
                  </div>
                )
              }

              if (type.dataType === 'enum') {
                return (
                  <div key={type.propertyId}>
                    <label htmlFor={`site-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                    </label>
                    <select
                      id={`site-field-${type.propertyId}`}
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
                    <label htmlFor={`site-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                    </label>
                    <select
                      id={`site-field-${type.propertyId}`}
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
                    <label htmlFor={`site-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                    </label>
                    <textarea
                      id={`site-field-${type.propertyId}`}
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
                  <label htmlFor={`site-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                    {type.label}{requiredLabel}
                    {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                  </label>
                  <input
                    id={`site-field-${type.propertyId}`}
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
  )
}
