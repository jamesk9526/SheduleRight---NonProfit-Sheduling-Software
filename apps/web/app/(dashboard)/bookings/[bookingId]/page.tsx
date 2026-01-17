'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

interface Booking {
  id: string
  slotId: string
  siteId: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  staffNotes?: string
  createdAt: string
  updatedAt: string
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

export default function BookingDetailsPage() {
  const params = useParams()
  const bookingId = params.bookingId as string
  const api = useApi()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')
  const isAdmin = (user?.roles || []).includes('ADMIN')
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [savingCustom, setSavingCustom] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/bookings/${bookingId}`)
      return response.data
    },
    enabled: !!bookingId,
  })

  const { data: propertyTypesData } = useQuery({
    queryKey: ['property-types'],
    queryFn: async () => await api.get('/api/v1/properties'),
    enabled: isStaff,
  })

  const { data: propertyValuesData } = useQuery({
    queryKey: ['appointment-properties', bookingId],
    queryFn: async () => await api.get(`/api/v1/entities/appointment/${encodeURIComponent(bookingId)}/properties`),
    enabled: isStaff && !!bookingId,
  })

  const propertyTypes: PropertyType[] = propertyTypesData?.data || []
  const appointmentPropertyTypes = useMemo(
    () => propertyTypes.filter((type) => type.appliesTo.includes('appointment')),
    [propertyTypes]
  )

  useEffect(() => {
    const values: PropertyValue[] = propertyValuesData?.data || []
    const initial: Record<string, any> = {}
    appointmentPropertyTypes.forEach((type) => {
      const match = values.find((value) => value.propertyId === type.propertyId)
      if (match) {
        initial[type.propertyId] = match.value
      } else if (type.defaultValue !== undefined) {
        initial[type.propertyId] = type.defaultValue
      }
    })
    setCustomValues(initial)
  }, [propertyValuesData, appointmentPropertyTypes])

  const handleSaveCustomFields = async () => {
    setSavingCustom(true)
    setCustomError(null)
    try {
      const values = appointmentPropertyTypes.map((type) => ({
        propertyId: type.propertyId,
        value: customValues[type.propertyId] ?? null,
      }))
      await api.call(`/api/v1/entities/appointment/${encodeURIComponent(bookingId)}/properties`, {
        method: 'PUT',
        body: { values },
      })
      queryClient.invalidateQueries({ queryKey: ['appointment-properties', bookingId] })
    } catch (err: any) {
      setCustomError(err?.message || 'Failed to save custom fields.')
    } finally {
      setSavingCustom(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'no-show':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Loading booking details...</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Booking Not Found</p>
        <p className="text-sm text-red-700 mt-2">The booking you're looking for doesn't exist.</p>
        <Link href="/bookings" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Bookings
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
          <p className="mt-2 text-gray-600">Booking ID: {booking.id}</p>
        </div>
        <Link href="/bookings" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back
        </Link>
      </div>

      {/* Status Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Booking Status</p>
            <span className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(booking.status)}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-600 mb-1">Created</p>
            <p className="text-gray-900 font-semibold">{new Date(booking.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Full Name</p>
            <p className="text-gray-900 font-semibold">{booking.clientName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
            <p className="text-gray-900 font-semibold">{booking.clientEmail}</p>
          </div>
          {booking.clientPhone && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Phone</p>
              <p className="text-gray-900 font-semibold">{booking.clientPhone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Slot ID</p>
            <p className="text-gray-900 font-semibold">{booking.slotId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Site ID</p>
            <p className="text-gray-900 font-semibold">{booking.siteId}</p>
          </div>
        </div>
      </div>

      {/* Appointment Custom Fields */}
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
        {appointmentPropertyTypes.length === 0 ? (
          <p className="text-sm text-gray-600">No custom fields configured for appointments yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointmentPropertyTypes.map((type) => {
              const value = customValues[type.propertyId] ?? ''
              const readOnly = type.visibility === 'admin' && !isAdmin
              if (type.dataType === 'boolean') {
                return (
                  <div key={type.propertyId} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      id={`appointment-field-${type.propertyId}`}
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => setCustomValues((prev) => ({ ...prev, [type.propertyId]: e.target.checked }))}
                      disabled={readOnly}
                    />
                    <label htmlFor={`appointment-field-${type.propertyId}`} className="text-sm text-gray-700">
                      {type.label}
                      {readOnly && <span className="ml-2 text-xs text-gray-400">(Admin only)</span>}
                    </label>
                  </div>
                )
              }

              if (type.dataType === 'enum') {
                return (
                  <div key={type.propertyId}>
                    <label htmlFor={`appointment-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">{type.label}</label>
                    <select
                      id={`appointment-field-${type.propertyId}`}
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
                    <label htmlFor={`appointment-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">{type.label}</label>
                    <select
                      id={`appointment-field-${type.propertyId}`}
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
                    <label htmlFor={`appointment-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">{type.label}</label>
                    <textarea
                      id={`appointment-field-${type.propertyId}`}
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
                  <label htmlFor={`appointment-field-${type.propertyId}`} className="block text-sm font-medium text-gray-700 mb-1">{type.label}</label>
                  <input
                    id={`appointment-field-${type.propertyId}`}
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

      {/* Notes */}
      {booking.notes && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
        </div>
      )}

      {/* Staff Notes */}
      {booking.staffNotes && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-purple-900 mb-4">Staff Notes</h2>
          <p className="text-purple-800 whitespace-pre-wrap">{booking.staffNotes}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-indigo-600 rounded-full mt-1.5"></div>
              <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Booking Created</p>
              <p className="text-sm text-gray-600">{new Date(booking.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {booking.status !== 'pending' && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-indigo-600 rounded-full mt-1.5"></div>
                <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Status Changed to {booking.status}</p>
                <p className="text-sm text-gray-600">{new Date(booking.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-indigo-600 rounded-full mt-1.5"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Last Updated</p>
              <p className="text-sm text-gray-600">{new Date(booking.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center flex-wrap">
        <Link
          href="/bookings/my"
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
        >
          Back to My Bookings
        </Link>
        <Link
          href={`/bookings/${bookingId}/messages`}
          className="px-6 py-3 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition font-medium"
        >
          View Messages
        </Link>
        {booking.status === 'pending' && (
          <Link
            href={`/bookings/${bookingId}/edit`}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Edit Booking
          </Link>
        )}
      </div>
    </div>
  )
}
