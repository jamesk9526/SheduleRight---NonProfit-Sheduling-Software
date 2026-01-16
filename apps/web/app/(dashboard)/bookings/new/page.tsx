'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'

interface Slot {
  id: string
  title: string
  startTime: string
  endTime: string
  capacity: number
  currentBookings: number
  siteId: string
}

export default function CreateBookingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const api = useApi()

  const [selectedSite, setSelectedSite] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: user?.email || '',
    clientPhone: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch sites
  const { data: sites = [] } = useQuery({
    queryKey: ['sites', user?.orgId],
    queryFn: async () => {
      if (!user?.orgId) return []
      const response = await api.get(`/orgs/${user.orgId}/sites`)
      return response.data || []
    },
    enabled: !!user?.orgId,
  })

  // Fetch availability for selected site
  const { data: slots = [] } = useQuery({
    queryKey: ['availability', selectedSite],
    queryFn: async () => {
      if (!selectedSite) return []
      const response = await api.get(`/sites/${selectedSite}/availability`)
      return response.data || []
    },
    enabled: !!selectedSite,
  })

  // Filter available slots
  const availableSlots = slots.filter(
    (slot: Slot) => slot.currentBookings < slot.capacity && slot.currentBookings !== undefined
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedSlot) {
      setError('Please select a time slot')
      return
    }

    if (!formData.clientName || !formData.clientEmail) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const response = await api.post(`/sites/${selectedSite}/bookings`, {
        slotId: selectedSlot,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        notes: formData.notes,
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard/bookings/my')
        }, 1500)
      } else {
        setError(response.error?.message || 'Failed to create booking')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Booking</h1>
          <p className="mt-2 text-gray-600">Schedule a new appointment</p>
        </div>
        <Link href="/dashboard/bookings" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back
        </Link>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 font-medium">✓ Booking created successfully!</p>
          <p className="text-sm text-green-700 mt-1">Redirecting to your bookings...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">⚠ {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Site */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Select Location</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site *</label>
            <select
              value={selectedSite}
              onChange={(e) => {
                setSelectedSite(e.target.value)
                setSelectedSlot('') // Reset slot when site changes
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Choose a location...</option>
              {sites.map((site: any) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Select Time Slot */}
        {selectedSite && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Select Time Slot</h2>
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p>No available slots for the selected location.</p>
                <p className="text-sm mt-2">Please select a different location or contact support.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableSlots.map((slot: Slot) => (
                  <label
                    key={slot.id}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedSlot === slot.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={slot.id}
                      checked={selectedSlot === slot.id}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">{slot.title}</div>
                      <div className="text-sm text-gray-600">
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {slot.capacity - slot.currentBookings} spots available
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Client Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Your Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <input
                type="email"
                name="clientEmail"
                value={formData.clientEmail}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="clientPhone"
                value={formData.clientPhone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Any special requests or additional information..."
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedSlot || !formData.clientName || !formData.clientEmail}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
          >
            {loading ? 'Creating Booking...' : 'Create Booking'}
          </button>
        </div>
      </form>
    </div>
  )
}
