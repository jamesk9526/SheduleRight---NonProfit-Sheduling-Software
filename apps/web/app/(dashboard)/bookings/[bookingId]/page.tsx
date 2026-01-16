'use client'

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import Link from 'next/link'
import { useParams } from 'next/navigation'

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

export default function BookingDetailsPage() {
  const params = useParams()
  const bookingId = params.bookingId as string
  const api = useApi()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/bookings/${bookingId}`)
      return response.data
    },
    enabled: !!bookingId,
  })

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
