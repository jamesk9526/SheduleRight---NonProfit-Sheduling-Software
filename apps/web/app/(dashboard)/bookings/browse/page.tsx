'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'
import { useState as useStateDialog } from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay } from 'date-fns'

interface AvailabilitySlot {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  recurrence: 'daily' | 'weekly' | 'monthly' | 'once'
  capacity: number
  currentBookings: number
  siteId: string
  orgId: string
  status: 'active' | 'inactive'
}

export default function BrowseAvailabilityPage() {
  const { user } = useAuth()
  const api = useApi()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)

  // Fetch all sites for current user's org
  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites', user?.orgId],
    queryFn: async () => {
      if (!user?.orgId) return []
      const response = await api.get(`/orgs/${user.orgId}/sites`)
      return response.data || []
    },
    enabled: !!user?.orgId,
  })

  // Use first site if available
  const siteId = selectedSite || sites[0]?.id

  // Fetch availability slots for selected site
  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', siteId],
    queryFn: async () => {
      if (!siteId) return []
      const response = await api.get(`/sites/${siteId}/availability`)
      return response.data || []
    },
    enabled: !!siteId,
  })

  // Filter slots by date and status
  const availableSlots = useMemo(() => {
    return slots.filter((slot: AvailabilitySlot) => {
      if (slot.status !== 'active') return false
      if (slot.currentBookings >= slot.capacity) return false
      // Basic date filtering - in real app would check recurrence pattern
      return true
    })
  }, [slots])

  const isLoading = sitesLoading || slotsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browse Availability</h1>
          <p className="mt-2 text-gray-600">Find and book available time slots</p>
        </div>
        <Link href="/dashboard/bookings" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Site Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location/Site</label>
            <select
              value={selectedSite || ''}
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

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Available Slots */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Slots {format(selectedDate, 'MMMM d, yyyy')}
        </h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading availability...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">No available slots found for the selected date and location.</p>
            <p className="text-sm text-yellow-700 mt-2">Try selecting a different date or location.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSlots.map((slot: AvailabilitySlot) => {
              const availableSpots = slot.capacity - slot.currentBookings
              return (
                <div
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-400 hover:shadow-md transition cursor-pointer"
                >
                  <h3 className="font-semibold text-gray-900">{slot.title}</h3>
                  {slot.description && (
                    <p className="text-sm text-gray-600 mt-1">{slot.description}</p>
                  )}
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-gray-700">
                      ⏰ {slot.startTime} - {slot.endTime}
                    </p>
                    <p className="text-sm text-gray-700">
                      👥 {availableSpots} spot{availableSpots !== 1 ? 's' : ''} available
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedSlot(slot)
                    }}
                    className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                  >
                    Book Now
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedSlot && (
        <SlotBookingModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSuccess={() => {
            setSelectedSlot(null)
            // Could refresh slots here
          }}
        />
      )}
    </div>
  )
}

interface SlotBookingModalProps {
  slot: AvailabilitySlot
  onClose: () => void
  onSuccess: () => void
}

function SlotBookingModal({ slot, onClose, onSuccess }: SlotBookingModalProps) {
  const api = useApi()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await api.post(`/sites/${slot.siteId}/bookings`, {
        slotId: slot.id,
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
        notes,
      })

      if (response.ok) {
        onSuccess()
      } else {
        setError(response.error?.message || 'Failed to create booking')
      }
    } catch (err) {
      setError('An error occurred while creating the booking')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900">Book Appointment</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Slot Info */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-indigo-900">{slot.title}</h3>
          <p className="text-sm text-indigo-800 mt-1">
            {slot.startTime} - {slot.endTime}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Any special requests or notes?"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition font-medium"
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
