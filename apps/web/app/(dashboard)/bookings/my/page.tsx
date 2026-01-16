'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'

interface Booking {
  id: string
  slotId: string
  siteId: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  createdAt: string
}

export default function MyBookingsPage() {
  const { user } = useAuth()
  const api = useApi()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Fetch user's bookings
  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'me'],
    queryFn: async () => {
      const response = await api.get('/api/v1/bookings/me')
      return response.data || []
    },
    enabled: !!user,
  })

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings
    if (statusFilter === 'upcoming')
      return bookings.filter((b: Booking) => b.status === 'confirmed' || b.status === 'pending')
    if (statusFilter === 'past')
      return bookings.filter((b: Booking) => b.status === 'completed' || b.status === 'no-show')
    return bookings.filter((b: Booking) => b.status === statusFilter)
  }, [bookings, statusFilter])

  const handleCancelBooking = async () => {
    if (!selectedBooking) return
    setCancelLoading(true)

    try {
      const response = await api.put(`/bookings/${selectedBooking.id}/cancel`, {
        reason: cancelReason,
      })

      if (response.ok) {
        setShowCancelDialog(false)
        setCancelReason('')
        setSelectedBooking(null)
        refetch()
      }
    } catch (err) {
      console.error('Failed to cancel booking')
    } finally {
      setCancelLoading(false)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-2 text-gray-600">View and manage your appointments</p>
        </div>
        <Link href="/bookings" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back
        </Link>
      </div>

      {/* Status Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFilter === filter.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600 font-medium">No bookings found</p>
          <p className="text-sm text-gray-500 mt-2">
            {statusFilter === 'all'
              ? "You don't have any bookings yet. Start by browsing available slots."
              : `You don't have any ${statusFilter} bookings.`}
          </p>
          <Link
            href="/bookings/browse"
            className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Browse Availability
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking: Booking) => (
            <div key={booking.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{booking.clientName}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📧 {booking.clientEmail}</p>
                    {booking.clientPhone && <p>📱 {booking.clientPhone}</p>}
                    <p>📅 {new Date(booking.createdAt).toLocaleDateString()}</p>
                  </div>
                  {booking.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                      <p className="font-medium text-gray-900 mb-1">Notes:</p>
                      <p>{booking.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium text-sm"
                  >
                    View
                  </Link>
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => {
                        setSelectedBooking(booking)
                        setShowCancelDialog(true)
                      }}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Dialog */}
      {showCancelDialog && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cancel Booking</h2>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                Are you sure you want to cancel this booking for <strong>{selectedBooking.clientName}</strong>?
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason for cancellation</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Tell us why you're cancelling..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelDialog(false)
                  setCancelReason('')
                  setSelectedBooking(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition font-medium"
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
