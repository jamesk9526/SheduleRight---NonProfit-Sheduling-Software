'use client'

import { useMemo, useState } from 'react'
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
    min?: number
    max?: number
    pattern?: string
    enumOptions?: string[]
    allowMultiple?: boolean
  }
  ui?: {
    placeholder?: string
    section?: string
    order?: number
    display?: string
  }
  visibility?: 'public' | 'staff' | 'admin'
  appliesTo: string[]
  status: string
}

const DATA_TYPES = ['string', 'text', 'boolean', 'date', 'enum', 'multiEnum', 'number', 'email', 'phone'] as const
const VISIBILITY = ['public', 'staff', 'admin'] as const
const ENTITY_TYPES = ['client', 'appointment', 'staff', 'volunteer', 'site', 'org', 'program', 'resource'] as const

export default function PropertyLibraryPage() {
  const { user } = useAuth()
  const api = useApi()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedEntity, setSelectedEntity] = useState('client')
  const [dragId, setDragId] = useState<string | null>(null)
  const [ordering, setOrdering] = useState(false)

  const [form, setForm] = useState({
    propertyId: '',
    label: '',
    description: '',
    dataType: 'string',
    required: false,
    defaultValue: '',
    enumOptions: '',
    order: '',
    visibility: 'staff',
    appliesTo: ['client'],
  })

  const [editForm, setEditForm] = useState({
    propertyId: '',
    label: '',
    description: '',
    dataType: 'string',
    required: false,
    defaultValue: '',
    enumOptions: '',
    order: '',
    visibility: 'staff',
    appliesTo: ['client'] as string[],
  })

  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')

  const { data } = useQuery({
    queryKey: ['property-types'],
    queryFn: async () => await api.get('/api/v1/properties'),
    enabled: isStaff,
  })

  const propertyTypes: PropertyType[] = data?.data || []

  const sortedTypes = useMemo(() => {
    return [...propertyTypes].sort((a, b) => {
      const orderA = a.ui?.order ?? 9999
      const orderB = b.ui?.order ?? 9999
      if (orderA !== orderB) return orderA - orderB
      return a.label.localeCompare(b.label)
    })
  }, [propertyTypes])

  const filteredTypes = useMemo(() => {
    return sortedTypes.filter((type) => type.appliesTo.includes(selectedEntity))
  }, [sortedTypes, selectedEntity])

  const renderPreview = (dataType: string, enumOptions: string[]) => {
    if (dataType === 'boolean') {
      return (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" disabled />
          Example boolean
        </label>
      )
    }
    if (dataType === 'enum') {
      return (
        <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" disabled title="Enum preview">
          <option>Choose...</option>
          {enumOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }
    if (dataType === 'multiEnum') {
      return (
        <select multiple className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" disabled title="Multi-select preview">
          {enumOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }
    if (dataType === 'text') {
      return <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={2} disabled placeholder="Text preview" />
    }
    if (dataType === 'date') {
      return <input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" disabled title="Date preview" />
    }
    if (dataType === 'number') {
      return <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" disabled placeholder="123" />
    }
    return <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" disabled placeholder="Text preview" />
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)

    try {
      await api.post('/api/v1/properties', {
        propertyId: form.propertyId.trim(),
        label: form.label.trim(),
        description: form.description.trim() || undefined,
        dataType: form.dataType,
        required: form.required,
        defaultValue: form.defaultValue || undefined,
        validation: form.enumOptions
          ? { enumOptions: form.enumOptions.split(',').map((opt) => opt.trim()).filter(Boolean) }
          : undefined,
        ui: form.order ? { order: Number(form.order) } : undefined,
        visibility: form.visibility,
        appliesTo: form.appliesTo,
      })
      setForm({
        propertyId: '',
        label: '',
        description: '',
        dataType: 'string',
        required: false,
        defaultValue: '',
        enumOptions: '',
        order: '',
        visibility: 'staff',
        appliesTo: ['client'],
      })
      queryClient.invalidateQueries({ queryKey: ['property-types'] })
    } catch (err: any) {
      setError(err?.message || 'Failed to create property.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (type: PropertyType) => {
    setEditId(type._id)
    setEditForm({
      propertyId: type.propertyId,
      label: type.label,
      description: type.description || '',
      dataType: type.dataType,
      required: !!type.required,
      defaultValue: type.defaultValue ? String(type.defaultValue) : '',
      enumOptions: type.validation?.enumOptions?.join(', ') || '',
      order: type.ui?.order ? String(type.ui.order) : '',
      visibility: type.visibility || 'staff',
      appliesTo: type.appliesTo || ['client'],
    })
  }

  const cancelEdit = () => {
    setEditId(null)
  }

  const saveEdit = async () => {
    if (!editId) return
    setError(null)
    setSaving(true)
    try {
      await api.put(`/api/v1/properties/${editId}`, {
        propertyId: editForm.propertyId.trim(),
        label: editForm.label.trim(),
        description: editForm.description.trim() || undefined,
        dataType: editForm.dataType,
        required: editForm.required,
        defaultValue: editForm.defaultValue || undefined,
        validation: editForm.enumOptions
          ? { enumOptions: editForm.enumOptions.split(',').map((opt) => opt.trim()).filter(Boolean) }
          : undefined,
        ui: editForm.order ? { order: Number(editForm.order) } : undefined,
        visibility: editForm.visibility,
        appliesTo: editForm.appliesTo,
      })
      queryClient.invalidateQueries({ queryKey: ['property-types'] })
      cancelEdit()
    } catch (err: any) {
      setError(err?.message || 'Failed to update property.')
    } finally {
      setSaving(false)
    }
  }

  const reorderTypes = async (items: PropertyType[]) => {
    setOrdering(true)
    try {
      await Promise.all(
        items.map((type, index) =>
          api.put(`/api/v1/properties/${type._id}`, {
            ui: {
              ...(type.ui || {}),
              order: index + 1,
            },
          })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['property-types'] })
    } catch (err: any) {
      setError(err?.message || 'Failed to update ordering.')
    } finally {
      setOrdering(false)
      setDragId(null)
    }
  }

  if (!isStaff) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Access Denied</p>
        <p className="text-sm text-red-700 mt-2">Only staff members can manage custom fields.</p>
        <Link href="/dashboard" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  const enumEnabled = form.dataType === 'enum' || form.dataType === 'multiEnum'
  const editEnumEnabled = editForm.dataType === 'enum' || editForm.dataType === 'multiEnum'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Field Library</h1>
          <p className="mt-2 text-gray-600">Define reusable custom properties for clients, sites, staff, and more.</p>
          <p className="mt-1 text-sm text-gray-500">Tip: Create the field here, then fill it on each entity detail page.</p>
        </div>
        <Link href="/bookings" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Bookings
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6" id="create-property">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Create Property</h2>
        <p className="text-sm text-gray-500 mb-4">Fields with an asterisk are required.</p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="property-id" className="block text-sm font-medium text-gray-700 mb-1">Property ID *</label>
            <input
              id="property-id"
              value={form.propertyId}
              onChange={(e) => setForm((prev) => ({ ...prev, propertyId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="preferred_contact_method"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Use snake_case. This becomes the stable key.</p>
          </div>
          <div>
            <label htmlFor="property-label" className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
            <input
              id="property-label"
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Preferred Contact Method"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="property-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              id="property-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Shown as helper text on the entry form"
            />
          </div>
          <div>
            <label htmlFor="property-data-type" className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
            <select
              id="property-data-type"
              value={form.dataType}
              onChange={(e) => setForm((prev) => ({ ...prev, dataType: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {DATA_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="property-visibility" className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <select
              id="property-visibility"
              value={form.visibility}
              onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {VISIBILITY.map((vis) => (
                <option key={vis} value={vis}>{vis}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="property-default" className="block text-sm font-medium text-gray-700 mb-1">Default Value</label>
            <input
              id="property-default"
              value={form.defaultValue}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultValue: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">Optional. Applied when no value is set.</p>
          </div>
          <div>
            <label htmlFor="property-enum" className="block text-sm font-medium text-gray-700 mb-1">Enum Options (comma)</label>
            <input
              id="property-enum"
              value={form.enumOptions}
              onChange={(e) => setForm((prev) => ({ ...prev, enumOptions: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Email, SMS, Phone"
              disabled={!enumEnabled}
            />
            <p className="mt-1 text-xs text-gray-500">Only used for enum and multiEnum data types.</p>
          </div>
          <div>
            <label htmlFor="property-order" className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <input
              id="property-order"
              type="number"
              value={form.order}
              onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
            <div className="flex flex-wrap gap-2">
              {ENTITY_TYPES.map((entity) => (
                <label key={entity} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.appliesTo.includes(entity)}
                    onChange={(e) => {
                      setForm((prev) => {
                        const next = e.target.checked
                          ? [...prev.appliesTo, entity]
                          : prev.appliesTo.filter((item) => item !== entity)
                        return { ...prev, appliesTo: next }
                      })
                    }}
                  />
                  {entity}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="property-required"
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm((prev) => ({ ...prev, required: e.target.checked }))}
            />
            <label htmlFor="property-required" className="text-sm text-gray-700">Required</label>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create Property'}
            </button>
          </div>
          <div className="md:col-span-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Preview</h3>
              {renderPreview(
                form.dataType,
                form.enumOptions.split(',').map((opt) => opt.trim()).filter(Boolean)
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Properties</h2>
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <label htmlFor="property-entity-filter" className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              id="property-entity-filter"
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {ENTITY_TYPES.map((entity) => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-500">
            Showing {filteredTypes.length} fields. Drag cards to reorder for {selectedEntity}. {ordering ? 'Saving order...' : ''}
          </div>
        </div>
        {filteredTypes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            <p>No properties defined for {selectedEntity}.</p>
            <Link href="#create-property" className="mt-2 inline-flex text-indigo-600 hover:text-indigo-700 font-medium">
              Create your first field →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTypes.map((type) => {
              const isEditing = editId === type._id
              return (
                <div
                  key={type._id}
                  className="border border-gray-200 rounded-lg p-4"
                  draggable
                  onDragStart={() => setDragId(type._id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!dragId || dragId === type._id) return
                    const current = [...filteredTypes]
                    const dragIndex = current.findIndex((item) => item._id === dragId)
                    const dropIndex = current.findIndex((item) => item._id === type._id)
                    if (dragIndex < 0 || dropIndex < 0) return
                    const [moved] = current.splice(dragIndex, 1)
                    current.splice(dropIndex, 0, moved)
                    reorderTypes(current)
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.propertyId} • {type.dataType} • {type.visibility}</div>
                      <div className="text-xs text-gray-500">Applies: {type.appliesTo.join(', ')}</div>
                    </div>
                    <div className="flex gap-3">
                      {!isEditing && (
                        <button
                          type="button"
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                          onClick={() => startEdit(type)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:text-red-700"
                        onClick={async () => {
                          await api.delete(`/api/v1/properties/${type._id}`)
                          queryClient.invalidateQueries({ queryKey: ['property-types'] })
                        }}
                      >
                        Archive
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`edit-property-id-${type._id}`} className="block text-xs font-medium text-gray-700 mb-1">Property ID</label>
                        <input
                          id={`edit-property-id-${type._id}`}
                          value={editForm.propertyId}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, propertyId: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-property-label-${type._id}`} className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                        <input
                          id={`edit-property-label-${type._id}`}
                          value={editForm.label}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, label: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor={`edit-property-description-${type._id}`} className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <input
                          id={`edit-property-description-${type._id}`}
                          value={editForm.description}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-property-data-${type._id}`} className="block text-xs font-medium text-gray-700 mb-1">Data Type</label>
                        <select
                          id={`edit-property-data-${type._id}`}
                          value={editForm.dataType}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, dataType: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          {DATA_TYPES.map((dataType) => (
                            <option key={dataType} value={dataType}>{dataType}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`edit-property-visibility-${type._id}`} className="block text-xs font-medium text-gray-700 mb-1">Visibility</label>
                        <select
                          id={`edit-property-visibility-${type._id}`}
                          value={editForm.visibility}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, visibility: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          {VISIBILITY.map((vis) => (
                            <option key={vis} value={vis}>{vis}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`edit-property-default-${type._id}`} className="block text-xs font-medium text-gray-700 mb-1">Default Value</label>
                        <input
                          id={`edit-property-default-${type._id}`}
                          value={editForm.defaultValue}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, defaultValue: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-property-enum-${type._id}`} className="block text-xs font-medium text-gray-700 mb-1">Enum Options</label>
                        <input
                          id={`edit-property-enum-${type._id}`}
                          value={editForm.enumOptions}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, enumOptions: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          disabled={!editEnumEnabled}
                        />
                        <p className="mt-1 text-xs text-gray-500">Used only for enum and multiEnum.</p>
                      </div>
                      <div>
                        <label htmlFor={`edit-property-order-${type._id}`} className="block text-xs font-medium text-gray-700 mb-1">Order</label>
                        <input
                          id={`edit-property-order-${type._id}`}
                          type="number"
                          value={editForm.order}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, order: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Applies To</label>
                        <div className="flex flex-wrap gap-2">
                          {ENTITY_TYPES.map((entity) => (
                            <label key={entity} className="flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={editForm.appliesTo.includes(entity)}
                                onChange={(e) => {
                                  setEditForm((prev) => {
                                    const next = e.target.checked
                                      ? [...prev.appliesTo, entity]
                                      : prev.appliesTo.filter((item) => item !== entity)
                                    return { ...prev, appliesTo: next }
                                  })
                                }}
                              />
                              {entity}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2">
                        <input
                          id={`edit-property-required-${type._id}`}
                          type="checkbox"
                          checked={editForm.required}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, required: e.target.checked }))}
                        />
                        <label htmlFor={`edit-property-required-${type._id}`} className="text-xs text-gray-700">Required</label>
                      </div>
                      <div className="md:col-span-2 flex gap-3">
                        <button
                          type="button"
                          className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                          onClick={saveEdit}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="md:col-span-2">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <h3 className="text-xs font-semibold text-gray-800 mb-2">Preview</h3>
                          {renderPreview(
                            editForm.dataType,
                            editForm.enumOptions.split(',').map((opt) => opt.trim()).filter(Boolean)
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
