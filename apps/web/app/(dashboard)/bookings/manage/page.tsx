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
  staffNotes?: string
  createdAt: string
}

export default function ManageBookingsPage() {
  const { user } = useAuth()
  const api = useApi()
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    type: 'confirm' | 'complete' | 'no-show' | 'notes' | null
    booking: Booking | null
  }>({ type: null, booking: null })
  const [staffNotes, setStaffNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Check if user is staff
  if (!user?.roles?.includes('STAFF')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Access Denied</p>
        <p className="text-sm text-red-700 mt-2">Only staff members can manage bookings.</p>
        <Link href="/bookings" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Bookings
        </Link>
      </div>
    )
  }

  // Fetch all sites for org
  const { data: sites = [] } = useQuery({
    queryKey: ['sites', user?.orgId],
    queryFn: async () => {
      if (!user?.orgId) return []
      const response = await api.get(`/api/v1/orgs/${user.orgId}/sites`)
      return response.data || []
    },
    enabled: !!user?.orgId,
  })

  // Fetch bookings for selected site
  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'manage', selectedSite],
    queryFn: async () => {
      if (!selectedSite) return []
      const response = await api.get(`/api/v1/sites/${selectedSite}/bookings`)
      return response.data || []
    },
    enabled: !!selectedSite,
  })

  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    let filtered = bookings as Booking[]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === statusFilter)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.clientName.toLowerCase().includes(term) ||
          b.clientEmail.toLowerCase().includes(term) ||
          b.clientPhone?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [bookings, statusFilter, searchTerm])

  const handleAction = async (type: 'confirm' | 'complete' | 'no-show') => {
    if (!actionDialog.booking) return
    setActionLoading(true)

    try {
      const endpoint =
        type === 'confirm'
          ? `/api/v1/bookings/${actionDialog.booking.id}/confirm`
          : type === 'complete'
            ? `/api/v1/bookings/${actionDialog.booking.id}/complete`
            : `/api/v1/bookings/${actionDialog.booking.id}/no-show`

      await api.put(endpoint, {})

      setActionDialog({ type: null, booking: null })
      refetch()
    } catch (err) {
      console.error('Failed to perform action')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!actionDialog.booking) return
    setActionLoading(true)

    try {
      await api.put(`/api/v1/bookings/${actionDialog.booking.id}/notes`, {
        notes: staffNotes,
      })

      setActionDialog({ type: null, booking: null })
      setStaffNotes('')
      refetch()
    } catch (err) {
      console.error('Failed to save notes')
    } finally {
      setActionLoading(false)
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
          <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
          <p className="mt-2 text-gray-600">Review and manage all bookings</p>
        </div>
        <Link href="/bookings" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Site Selection */}
          <div>
            <label htmlFor="manage-site" className="block text-sm font-medium text-gray-700 mb-2">Site</label>
            <select
              id="manage-site"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select a site...</option>
              {sites.map((site: any) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label htmlFor="manage-search" className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              id="manage-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, email, or phone..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="manage-status" className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              id="manage-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No-Show</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p>No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Client</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.map((booking: Booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{booking.clientName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{booking.clientEmail}</div>
                      {booking.clientPhone && <div className="text-xs text-gray-500">{booking.clientPhone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded text-sm hover:bg-indigo-100 transition"
                        >
                          View
                        </Link>

                        {booking.status === 'pending' && (
                          <button
                            onClick={() => setActionDialog({ type: 'confirm', booking })}
                            className="px-3 py-1 bg-green-50 text-green-600 rounded text-sm hover:bg-green-100 transition"
                          >
                            Confirm
                          </button>
                        )}

                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => setActionDialog({ type: 'complete', booking })}
                            className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm hover:bg-blue-100 transition"
                          >
                            Complete
                          </button>
                        )}

                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <button
                            onClick={() => setActionDialog({ type: 'no-show', booking })}
                            className="px-3 py-1 bg-gray-50 text-gray-600 rounded text-sm hover:bg-gray-100 transition"
                          >
                            No-Show
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setActionDialog({ type: 'notes', booking })
                            setStaffNotes(booking.staffNotes || '')
                          }}
                          className="px-3 py-1 bg-purple-50 text-purple-600 rounded text-sm hover:bg-purple-100 transition"
                        >
                          Notes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      {actionDialog.type && actionDialog.booking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {actionDialog.type === 'notes' ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Staff Notes</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Add notes for <strong>{actionDialog.booking.clientName}</strong>
                </p>
                <textarea
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="Enter staff notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setActionDialog({ type: null, booking: null })}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
                  >
                    {actionLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {actionDialog.type === 'confirm'
                    ? 'Confirm Booking'
                    : actionDialog.type === 'complete'
                      ? 'Complete Booking'
                      : 'Mark as No-Show'}
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  {actionDialog.type === 'confirm'
                    ? `Are you sure you want to confirm the booking for ${actionDialog.booking.clientName}?`
                    : actionDialog.type === 'complete'
                      ? `Are you sure this appointment with ${actionDialog.booking.clientName} is complete?`
                      : `Mark ${actionDialog.booking.clientName}'s booking as a no-show?`}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActionDialog({ type: null, booking: null })}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction(actionDialog.type as 'confirm' | 'complete' | 'no-show')}
                    disabled={actionLoading}
                    className={`flex-1 px-4 py-2 text-white rounded-lg disabled:bg-gray-400 transition ${
                      actionDialog.type === 'no-show' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {actionLoading ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
