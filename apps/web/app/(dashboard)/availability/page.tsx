'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSite } from '@/lib/hooks/useSite'
import { useAvailabilitySlots, useCreateAvailability } from '@/lib/hooks/useData'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'

export default function AvailabilityPage() {
  const router = useRouter()
  const { user, isLoading: userLoading } = useAuth()
  const { currentSiteId } = useSite()
  const [mounted, setMounted] = useState(false)
  
  // Form states
  const [showNewSlotForm, setShowNewSlotForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [capacity, setCapacity] = useState('5')
  const [slotTitle, setSlotTitle] = useState('')
  const [slotNotes, setSlotNotes] = useState('')

  const { data: slots, isLoading: slotsLoading } = useAvailabilitySlots(currentSiteId)
  const { mutate: createSlot, isPending: isCreating } = useCreateAvailability(currentSiteId)
  const { call } = useApi()

  // Get site name
  const { data: currentSite } = useQuery({
    queryKey: ['site', currentSiteId],
    queryFn: async () => {
      if (!currentSiteId) return null
      const response = await call(`/api/v1/sites/${currentSiteId}`)
      return response
    },
    enabled: !!currentSiteId,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !userLoading && !user) {
      router.push('/login')
    }
  }, [mounted, userLoading, user, router])

  useEffect(() => {
    if (mounted && !currentSiteId) {
      router.push('/orgs')
    }
  }, [mounted, currentSiteId, router])

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !startTime || !endTime) return

    const startDateTime = new Date(`${selectedDate}T${startTime}:00`)
    const endDateTime = new Date(`${selectedDate}T${endTime}:00`)

    if (endDateTime <= startDateTime) {
      alert('End time must be after start time')
      return
    }

    createSlot(
      {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        capacity: parseInt(capacity),
        title: slotTitle || `Availability Slot`,
        notes: slotNotes,
      },
      {
        onSuccess: () => {
          setSelectedDate(new Date().toISOString().split('T')[0])
          setStartTime('09:00')
          setEndTime('10:00')
          setCapacity('5')
          setSlotTitle('')
          setSlotNotes('')
          setShowNewSlotForm(false)
        },
      }
    )
  }

  if (!mounted) return null

  if (userLoading || slotsLoading) {
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

  if (!currentSiteId) {
    return (
      <div className="container mt-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-yellow-800 font-semibold mb-2">No Site Selected</h2>
          <p className="text-yellow-700 mb-4">Please select a site from your organization to manage availability.</p>
          <button
            onClick={() => router.push('/orgs')}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Go to Organizations
          </button>
        </div>
      </div>
    )
  }

  const canManage = (user.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')
  const siteName = currentSite?.name || 'Your Site'

  return (
    <div className="container mt-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-600 mb-2">
          📅 Availability Slots
        </h1>
        <p className="text-neutral-600">
          Manage time slots for {siteName}
        </p>
      </div>

      {/* Create New Slot Button */}
      {canManage && (
        <div className="mb-8">
          <button
            onClick={() => setShowNewSlotForm(!showNewSlotForm)}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              showNewSlotForm
                ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {showNewSlotForm ? '✕ Cancel' : '+ Create Availability Slot'}
          </button>
        </div>
      )}

      {/* New Slot Form */}
      {showNewSlotForm && canManage && (
        <div className="bg-white rounded-lg shadow-md border border-neutral-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">
            Create New Availability Slot
          </h2>
          <form onSubmit={handleCreateSlot} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Slot Title
                </label>
                <input
                  type="text"
                  value={slotTitle}
                  onChange={(e) => setSlotTitle(e.target.value)}
                  placeholder="e.g., Morning Session, Afternoon"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Capacity (Number of Slots) *
                </label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  min="1"
                  max="100"
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Notes
              </label>
              <textarea
                value={slotNotes}
                onChange={(e) => setSlotNotes(e.target.value)}
                placeholder="Any additional notes about this time slot..."
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={isCreating}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:bg-neutral-400"
              >
                {isCreating ? 'Creating...' : 'Create Slot'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewSlotForm(false)}
                className="px-6 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Slots List */}
      <div className="space-y-4">
        {!slots || slots.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-neutral-200 p-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Availability Slots</h3>
            <p className="text-neutral-600 mb-4">
              Create your first availability slot to allow clients to book time with you
            </p>
            {canManage && (
              <button
                onClick={() => setShowNewSlotForm(true)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Create First Slot
              </button>
            )}
          </div>
        ) : (
          slots.map((slot: any) => {
            const startDate = new Date(slot.startTime)
            const endDate = new Date(slot.endTime)
            const dateStr = startDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            const timeStr = `${startDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })} - ${endDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}`

            return (
              <div
                key={slot._id}
                className="bg-white rounded-lg shadow-md border border-neutral-200 p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {slot.title || 'Availability Slot'}
                    </h3>
                    <p className="text-primary-600 font-medium">{dateStr}</p>
                  </div>
                  <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                    {slot._id}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Time</p>
                    <p className="text-sm font-medium text-neutral-900">{timeStr}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Capacity</p>
                    <p className="text-sm font-medium text-neutral-900">{slot.capacity} slots</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Booked</p>
                    <p className="text-sm font-medium text-neutral-900">{slot.currentBookings || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Available</p>
                    <p className={`text-sm font-medium ${
                      (slot.capacity - (slot.currentBookings || 0)) > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {Math.max(0, slot.capacity - (slot.currentBookings || 0))}
                    </p>
                  </div>
                </div>

                {slot.notes && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-neutral-500 uppercase mb-1">Notes</p>
                    <p className="text-sm text-neutral-600">{slot.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {canManage && (
                    <>
                      <button className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition">
                        Edit
                      </button>
                      <button className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
