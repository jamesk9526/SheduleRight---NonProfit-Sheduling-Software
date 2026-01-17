'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

const ENTITY_TYPES = [
  { id: 'program', label: 'Program' },
  { id: 'resource', label: 'Resource' },
]

export default function ProgramsResourcesPage() {
  const { user } = useAuth()
  const { call } = useApi()
  const queryClient = useQueryClient()
  const [entityType, setEntityType] = useState('program')
  const [entityId, setEntityId] = useState('')
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [savingCustom, setSavingCustom] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [customSaved, setCustomSaved] = useState(false)

  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')
  const isAdmin = (user?.roles || []).includes('ADMIN')

  const { data: propertyTypesData } = useQuery({
    queryKey: ['property-types'],
    queryFn: async () => await call('/api/v1/properties'),
    enabled: isStaff,
  })

  const propertyTypes: PropertyType[] = propertyTypesData?.data || []
  const applicableTypes = useMemo(
    () => propertyTypes.filter((type) => type.appliesTo.includes(entityType)),
    [propertyTypes, entityType]
  )

  const { data: propertyValuesData } = useQuery({
    queryKey: ['entity-properties', entityType, entityId],
    queryFn: async () => await call(`/api/v1/entities/${entityType}/${encodeURIComponent(entityId)}/properties`),
    enabled: isStaff && !!entityId,
  })

  useEffect(() => {
    const values: PropertyValue[] = propertyValuesData?.data || []
    const initial: Record<string, any> = {}
    applicableTypes.forEach((type) => {
      const match = values.find((value) => value.propertyId === type.propertyId)
      if (match) {
        initial[type.propertyId] = match.value
      } else if (type.defaultValue !== undefined) {
        initial[type.propertyId] = type.defaultValue
      }
    })
    setCustomValues(initial)
    setCustomSaved(false)
  }, [propertyValuesData, applicableTypes])

  const handleSaveCustomFields = async () => {
    if (!entityId) return
    setSavingCustom(true)
    setCustomError(null)
    setCustomSaved(false)
    try {
      const values = applicableTypes.map((type) => ({
        propertyId: type.propertyId,
        value: customValues[type.propertyId] ?? null,
      }))

      await call(`/api/v1/entities/${entityType}/${encodeURIComponent(entityId)}/properties`, {
        method: 'PUT',
        body: { values },
      })
      queryClient.invalidateQueries({ queryKey: ['entity-properties', entityType, entityId] })
      setCustomSaved(true)
    } catch (err: any) {
      setCustomError(err?.message || 'Failed to save custom fields.')
    } finally {
      setSavingCustom(false)
    }
  }

  if (!isStaff) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Access Denied</p>
        <p className="text-sm text-red-700 mt-2">Only staff members can manage program/resource fields.</p>
        <Link href="/dashboard" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programs & Resources</h1>
          <p className="mt-2 text-gray-600">Attach custom fields to programs or resources using the shared field library.</p>
          <p className="mt-1 text-sm text-gray-500">Tip: Pick the entity, enter its ID/name, and save your fields.</p>
        </div>
        <Link href="/bookings" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Bookings
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="entity-type" className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              id="entity-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {ENTITY_TYPES.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="entity-id" className="block text-sm font-medium text-gray-700 mb-1">Entity ID / Name</label>
            <input
              id="entity-id"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Program name or Resource ID"
            />
            <p className="mt-1 text-xs text-gray-500">Use the exact ID or label you track for this entity.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
            <p className="text-sm text-gray-500">Store program/resource metadata for reporting and embed logic.</p>
          </div>
          <button
            type="button"
            onClick={handleSaveCustomFields}
            disabled={savingCustom || !entityId}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
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

        {applicableTypes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            <p>No custom fields configured for this entity type yet.</p>
            <Link href="/properties" className="mt-2 inline-flex text-indigo-600 hover:text-indigo-700 font-medium">
              Create fields in the Field Library →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applicableTypes.map((type) => {
              const value = customValues[type.propertyId] ?? ''
              const readOnly = type.visibility === 'admin' && !isAdmin
              const requiredLabel = type.required ? ' *' : ''
              if (type.dataType === 'boolean') {
                return (
                  <div key={type.propertyId} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      id={`entity-field-${type.propertyId}`}
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.checked }))}
                      disabled={readOnly}
                    />
                    <label htmlFor={`entity-field-${type.propertyId}`} className="text-sm text-gray-700">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-gray-400">(Admin only)</span>}
                    </label>
                  </div>
                )
              }

              if (type.dataType === 'enum') {
                return (
                  <div key={type.propertyId}>
                    <label htmlFor={`entity-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-gray-400">(Admin only)</span>}
                    </label>
                    <select
                      id={`entity-field-${type.propertyId}`}
                      value={value}
                      onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      disabled={readOnly}
                    >
                      <option value="">Select...</option>
                      {(type.validation?.enumOptions || []).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {type.description && <p className="mt-1 text-xs text-gray-500">{type.description}</p>}
                  </div>
                )
              }

              if (type.dataType === 'multiEnum') {
                const selected: string[] = Array.isArray(value) ? value : []
                return (
                  <div key={type.propertyId}>
                    <label htmlFor={`entity-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-gray-400">(Admin only)</span>}
                    </label>
                    <select
                      id={`entity-field-${type.propertyId}`}
                      multiple
                      value={selected}
                      onChange={(e) => {
                        const selections = Array.from(e.target.selectedOptions).map((option) => option.value)
                        setCustomValues((prev) => ({ ...prev, [type.propertyId]: selections }))
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      disabled={readOnly}
                    >
                      {(type.validation?.enumOptions || []).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Hold Ctrl (Windows) or ⌘ (Mac) to select multiple.</p>
                    {type.description && <p className="mt-1 text-xs text-gray-500">{type.description}</p>}
                  </div>
                )
              }

              if (type.dataType === 'text') {
                return (
                  <div key={type.propertyId}>
                    <label htmlFor={`entity-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-gray-400">(Admin only)</span>}
                    </label>
                    <textarea
                      id={`entity-field-${type.propertyId}`}
                      value={value}
                      onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      disabled={readOnly}
                    />
                    {type.description && <p className="mt-1 text-xs text-gray-500">{type.description}</p>}
                  </div>
                )
              }

              return (
                <div key={type.propertyId}>
                  <label htmlFor={`entity-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">
                    {type.label}{requiredLabel}
                    {readOnly && <span className="ml-2 text-xs text-gray-400">(Admin only)</span>}
                  </label>
                  <input
                    id={`entity-field-${type.propertyId}`}
                    type={type.dataType === 'date' ? 'date' : type.dataType === 'number' ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    disabled={readOnly}
                  />
                  {type.description && <p className="mt-1 text-xs text-gray-500">{type.description}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
