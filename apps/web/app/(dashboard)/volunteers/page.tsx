'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser, useVolunteers, useCreateVolunteer } from '@/lib/hooks/useData'
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

export default function VolunteersPage() {
  const router = useRouter()
  const { data: user, isLoading } = useCurrentUser()
  const { call } = useApi()
  const queryClient = useQueryClient()
  const { data: volunteers, isLoading: loadingVols, isError } = useVolunteers()
  const createVolunteer = useCreateVolunteer()
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [skills, setSkills] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('')
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [savingCustom, setSavingCustom] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [customSaved, setCustomSaved] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push('/login')
    }
  }, [mounted, isLoading, user, router])

  if (!mounted) return null

  if (isLoading) {
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

  if (!user) return null

  const canManageVolunteers = (user.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')
  const isAdmin = (user.roles || []).includes('ADMIN')

  const { data: propertyTypesData } = useQuery({
    queryKey: ['property-types'],
    queryFn: async () => await call('/api/v1/properties'),
    enabled: canManageVolunteers,
  })

  const propertyTypes: PropertyType[] = propertyTypesData?.data || []
  const volunteerPropertyTypes = useMemo(
    () => propertyTypes.filter((type) => type.appliesTo.includes('volunteer')),
    [propertyTypes]
  )

  const { data: volunteerPropertyValues } = useQuery({
    queryKey: ['volunteer-properties', selectedVolunteerId],
    queryFn: async () => await call(`/api/v1/entities/volunteer/${encodeURIComponent(selectedVolunteerId)}/properties`),
    enabled: canManageVolunteers && !!selectedVolunteerId,
  })

  useEffect(() => {
    const values: PropertyValue[] = volunteerPropertyValues?.data || []
    const initial: Record<string, any> = {}
    volunteerPropertyTypes.forEach((type) => {
      const match = values.find((value) => value.propertyId === type.propertyId)
      if (match) {
        initial[type.propertyId] = match.value
      } else if (type.defaultValue !== undefined) {
        initial[type.propertyId] = type.defaultValue
      }
    })
    setCustomValues(initial)
    setCustomSaved(false)
  }, [volunteerPropertyValues, volunteerPropertyTypes])

  const handleSaveCustomFields = async () => {
    if (!selectedVolunteerId) return
    setSavingCustom(true)
    setCustomError(null)
    setCustomSaved(false)
    try {
      const values = volunteerPropertyTypes.map((type) => ({
        propertyId: type.propertyId,
        value: customValues[type.propertyId] ?? null,
      }))

      await call(`/api/v1/entities/volunteer/${encodeURIComponent(selectedVolunteerId)}/properties`, {
        method: 'PUT',
        body: { values },
      })
      queryClient.invalidateQueries({ queryKey: ['volunteer-properties', selectedVolunteerId] })
      setCustomSaved(true)
    } catch (e: any) {
      setCustomError(e?.message || 'Failed to save custom fields')
    } finally {
      setSavingCustom(false)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    try {
      await createVolunteer.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setForm({ name: '', email: '', phone: '' })
      setSkills('')
    } catch (e: any) {
      setError(e?.message || 'Failed to create volunteer')
    }
  }

  return (
    <div className="container mt-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-primary-600">Volunteers</h1>
          <p className="mt-2 text-neutral-600">Manage volunteer profiles, availability, and assignments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/volunteers/shifts')}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition font-medium"
          >
            View Shifts
          </button>
          <button
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
            disabled={!canManageVolunteers}
            title={canManageVolunteers ? 'Invite a volunteer' : 'Only staff and admins can invite volunteers'}
          >
            + Invite Volunteer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <p className="text-sm font-medium text-neutral-500">Active Volunteers</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">{volunteers?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <p className="text-sm font-medium text-neutral-500">Upcoming Shifts</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">0</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <p className="text-sm font-medium text-neutral-500">Pending Approvals</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">0</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Volunteers</h2>
            <p className="text-sm text-neutral-600">Invite and track volunteers for your org.</p>
          </div>
          <span className="text-sm text-neutral-500">{volunteers?.length ?? 0} total</span>
        </div>

        {isError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            Failed to load volunteers.
          </div>
        )}

        {!loadingVols && (volunteers?.length ?? 0) === 0 && (
          <div className="text-center py-10 text-neutral-600">No volunteers yet.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(volunteers || []).map((vol) => (
            <div key={vol._id} className="border border-neutral-200 rounded-lg p-4">
              <p className="text-base font-semibold text-neutral-900">{vol.name}</p>
              <p className="text-sm text-neutral-600">{vol.email}</p>
              {vol.phone ? <p className="text-sm text-neutral-500 mt-1">{vol.phone}</p> : null}
              {vol.skills && vol.skills.length > 0 ? (
                <p className="text-xs text-neutral-500 mt-2">Skills: {vol.skills.join(', ')}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Invite Volunteer</h2>
        <p className="text-sm text-neutral-600 mb-4">Send a quick invite to capture contact details.</p>
        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label htmlFor="volunteer-name" className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
            <input
              id="volunteer-name"
              className="border border-neutral-200 rounded-lg px-3 py-2 w-full"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!canManageVolunteers || createVolunteer.isPending}
            />
          </div>
          <div>
            <label htmlFor="volunteer-email" className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input
              id="volunteer-email"
              className="border border-neutral-200 rounded-lg px-3 py-2 w-full"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={!canManageVolunteers || createVolunteer.isPending}
            />
          </div>
          <div>
            <label htmlFor="volunteer-phone" className="block text-sm font-medium text-neutral-700 mb-1">Phone (optional)</label>
            <input
              id="volunteer-phone"
              className="border border-neutral-200 rounded-lg px-3 py-2 w-full"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              disabled={!canManageVolunteers || createVolunteer.isPending}
            />
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor="volunteer-skills" className="block text-sm font-medium text-neutral-700 mb-1">Skills (comma separated)</label>
          <input
            id="volunteer-skills"
            className="border border-neutral-200 rounded-lg px-3 py-2 w-full"
            placeholder="Skills (comma separated)"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            disabled={!canManageVolunteers || createVolunteer.isPending}
          />
        </div>
        <button
          className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          onClick={handleSubmit}
          disabled={!canManageVolunteers || createVolunteer.isPending}
        >
          {createVolunteer.isPending ? 'Inviting...' : 'Invite Volunteer'}
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 mt-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Volunteer Custom Fields</h2>
            <p className="text-sm text-neutral-500">Store volunteer-specific preferences and qualifications.</p>
          </div>
          <button
            type="button"
            onClick={handleSaveCustomFields}
            disabled={savingCustom || !selectedVolunteerId}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60"
          >
            {savingCustom ? 'Saving...' : 'Save Fields'}
          </button>
        </div>
        <div className="mb-4">
          <label htmlFor="volunteer-select" className="block text-sm font-medium text-neutral-700 mb-1">Select Volunteer</label>
          <select
            id="volunteer-select"
            value={selectedVolunteerId}
            onChange={(e) => setSelectedVolunteerId(e.target.value)}
            className="w-full border border-neutral-200 rounded-md px-3 py-2"
          >
            <option value="">Choose a volunteer...</option>
            {(volunteers || []).map((vol) => (
              <option key={vol._id} value={vol._id}>{vol.name}</option>
            ))}
          </select>
        </div>
        {customSaved && (
          <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Custom fields saved successfully.</div>
        )}
        {customError && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{customError}</div>
        )}
        {volunteerPropertyTypes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
            <p>No custom fields configured for volunteers yet.</p>
            <a href="/properties" className="mt-2 inline-flex text-primary-600 hover:text-primary-700 font-medium">Create fields in the Field Library →</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {volunteerPropertyTypes.map((type) => {
              const value = customValues[type.propertyId] ?? ''
              const readOnly = type.visibility === 'admin' && !isAdmin
              const requiredLabel = type.required ? ' *' : ''
              if (type.dataType === 'boolean') {
                return (
                  <div key={type.propertyId} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      id={`volunteer-field-${type.propertyId}`}
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.checked }))}
                      disabled={readOnly}
                    />
                    <label htmlFor={`volunteer-field-${type.propertyId}`} className="text-sm text-neutral-700">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                    </label>
                  </div>
                )
              }

              if (type.dataType === 'enum') {
                return (
                  <div key={type.propertyId}>
                    <label htmlFor={`volunteer-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                    </label>
                    <select
                      id={`volunteer-field-${type.propertyId}`}
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
                const selected = Array.isArray(value) ? value : []
                return (
                  <div key={type.propertyId}>
                    <label htmlFor={`volunteer-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                    </label>
                    <select
                      id={`volunteer-field-${type.propertyId}`}
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
                    <label htmlFor={`volunteer-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                      {type.label}{requiredLabel}
                      {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                    </label>
                    <textarea
                      id={`volunteer-field-${type.propertyId}`}
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
                  <label htmlFor={`volunteer-field-${type.propertyId}`} className="block text-sm font-medium text-neutral-700 mb-1">
                    {type.label}{requiredLabel}
                    {readOnly && <span className="ml-2 text-xs text-neutral-400">(Admin only)</span>}
                  </label>
                  <input
                    id={`volunteer-field-${type.propertyId}`}
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
