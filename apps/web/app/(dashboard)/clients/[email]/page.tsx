'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect, useMemo, useState } from 'react'

interface ClientSummary {
  email: string
  name: string
  phone?: string
  totalBookings: number
  lastBookingAt?: string
  upcomingCount: number
  completedCount: number
  cancelledCount: number
}

interface Booking {
  id: string
  siteId: string
  slotId: string
  startTime: string
  endTime: string
  status: string
  notes?: string
  createdAt: string
}

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

export default function ClientDetailPage() {
  const { email } = useParams() as { email: string }
  const { user } = useAuth()
  const { call } = useApi()
  const queryClient = useQueryClient()
  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')
  const isAdmin = (user?.roles || []).includes('ADMIN')
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [savingCustom, setSavingCustom] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['client', email],
    queryFn: async () => {
      return await call(`/api/v1/clients/${encodeURIComponent(email)}`)
    },
    enabled: isStaff && !!email,
  })

  const client: ClientSummary | undefined = data?.client
  const bookings: Booking[] = data?.bookings || []

  const { data: propertyTypesData } = useQuery({
    queryKey: ['property-types'],
    queryFn: async () => await call('/api/v1/properties'),
    enabled: isStaff,
  })

  const { data: propertyValuesData } = useQuery({
    queryKey: ['client-properties', email],
    queryFn: async () => await call(`/api/v1/entities/client/${encodeURIComponent(email)}/properties`),
    enabled: isStaff && !!email,
  })

  const propertyTypes: PropertyType[] = propertyTypesData?.data || []
  const clientPropertyTypes = useMemo(
    () => propertyTypes.filter((type) => type.appliesTo.includes('client')),
    [propertyTypes]
  )

  useEffect(() => {
    const values: PropertyValue[] = propertyValuesData?.data || []
    const initial: Record<string, any> = {}
    clientPropertyTypes.forEach((type) => {
      const match = values.find((value) => value.propertyId === type.propertyId)
      if (match) {
        initial[type.propertyId] = match.value
      } else if (type.defaultValue !== undefined) {
        initial[type.propertyId] = type.defaultValue
      }
    })
    setCustomValues(initial)
  }, [propertyValuesData, clientPropertyTypes])

  const handleSaveCustomFields = async () => {
    setSavingCustom(true)
    setCustomError(null)
    try {
      const values = clientPropertyTypes.map((type) => ({
        propertyId: type.propertyId,
        value: customValues[type.propertyId] ?? null,
      }))

      await call(`/api/v1/entities/client/${encodeURIComponent(email)}/properties`, {
        method: 'PUT',
        body: { values },
      })
      queryClient.invalidateQueries({ queryKey: ['client-properties', email] })
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
        <p className="text-sm text-red-700 mt-2">Only staff members can manage clients.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Client Detail</h1>
          <p className="mt-2 text-gray-600">View booking history and engagement.</p>
        </div>
        <Link href="/clients" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Clients
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading client...</p>
        </div>
      ) : isError || !client ? (
        <div className="text-center py-12 text-red-600">Failed to load client detail.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900">Client</h2>
              <p className="mt-2 text-gray-700 font-medium">{client.name || 'Unnamed Client'}</p>
              <p className="text-sm text-gray-500">{client.email}</p>
              <p className="text-sm text-gray-500 mt-1">{client.phone || 'No phone on record'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900">Booking Stats</h2>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <div>Total Bookings: {client.totalBookings}</div>
                <div>Upcoming: {client.upcomingCount}</div>
                <div>Completed: {client.completedCount}</div>
                <div>Cancelled: {client.cancelledCount}</div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900">Last Booking</h2>
              <p className="mt-2 text-sm text-gray-600">
                {client.lastBookingAt ? new Date(client.lastBookingAt).toLocaleString() : 'No bookings yet'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Booking History</h2>
            </div>
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-gray-600">No bookings found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Start</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">End</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-700">{booking.status}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(booking.startTime).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(booking.endTime).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {booking.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Custom Fields</h2>
              <button
                type="button"
                onClick={handleSaveCustomFields}
                disabled={savingCustom}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingCustom ? 'Saving...' : 'Save Fields'}
              </button>
            </div>
            {customError && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {customError}
              </div>
            )}
            {clientPropertyTypes.length === 0 ? (
              <p className="text-sm text-gray-600">No custom fields configured for clients yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientPropertyTypes.map((type) => {
                  const value = customValues[type.propertyId] ?? ''
                  const readOnly = type.visibility === 'admin' && !isAdmin
                  if (type.dataType === 'boolean') {
                    return (
                      <div key={type.propertyId} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          id={`client-field-${type.propertyId}`}
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.checked }))}
                          disabled={readOnly}
                        />
                        <label htmlFor={`client-field-${type.propertyId}`} className="text-sm text-gray-700">
                          {type.label}
                          {readOnly && <span className="ml-2 text-xs text-gray-400">(Admin only)</span>}
                        </label>
                      </div>
                    )
                  }

                  if (type.dataType === 'enum') {
                    return (
                      <div key={type.propertyId}>
                        <label htmlFor={`client-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">{type.label}</label>
                        <select
                          id={`client-field-${type.propertyId}`}
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
                      </div>
                    )
                  }

                  if (type.dataType === 'multiEnum') {
                    const selected: string[] = Array.isArray(value) ? value : []
                    return (
                      <div key={type.propertyId}>
                        <label htmlFor={`client-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">{type.label}</label>
                        <select
                          id={`client-field-${type.propertyId}`}
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
                      </div>
                    )
                  }

                  if (type.dataType === 'text') {
                    return (
                      <div key={type.propertyId}>
                        <label htmlFor={`client-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">{type.label}</label>
                        <textarea
                          id={`client-field-${type.propertyId}`}
                          value={value}
                          onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          rows={3}
                          disabled={readOnly}
                        />
                      </div>
                    )
                  }

                  return (
                    <div key={type.propertyId}>
                      <label htmlFor={`client-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">{type.label}</label>
                      <input
                        id={`client-field-${type.propertyId}`}
                        type={type.dataType === 'date' ? 'date' : type.dataType === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        disabled={readOnly}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
