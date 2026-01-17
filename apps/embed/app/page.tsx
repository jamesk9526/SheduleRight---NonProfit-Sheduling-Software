'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type SiteInfo = {
  id: string
  name: string
  address?: string
  timezone?: string
}

type Slot = {
  id: string
  _id: string
  title?: string
  startTime: string
  endTime: string
  capacity: number
  currentBookings: number
}

export default function Home() {
  const searchParams = useSearchParams()
  const siteIdParam = searchParams.get('siteId') || ''
  const embedToken = searchParams.get('token') || ''
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [site, setSite] = useState<SiteInfo | null>(null)
  const [resolvedSiteId, setResolvedSiteId] = useState(siteIdParam)
  const [buttonLabel, setButtonLabel] = useState('Confirm Booking')
  const [themeColor, setThemeColor] = useState<string | null>(null)
  const [locale, setLocale] = useState<string | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [defaultService, setDefaultService] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const apiBase = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3001`
    : 'http://localhost:3001'

  useEffect(() => {
    if (!embedToken) {
      setResolvedSiteId(siteIdParam)
      return
    }

    fetch(`${apiBase}/api/public/embed/${embedToken}`)
      .then((res) => res.json())
      .then((data) => {
        const config = data?.data
        if (config?.siteId) {
          setResolvedSiteId(config.siteId)
        }
        if (config?.buttonLabel) {
          setButtonLabel(config.buttonLabel)
        }
        if (config?.themeColor) {
          setThemeColor(config.themeColor)
        }
        if (config?.locale) {
          setLocale(config.locale)
        }
        if (config?.timezone) {
          setTimezone(config.timezone)
        }
        if (config?.defaultService) {
          setDefaultService(config.defaultService)
        }
      })
      .catch(() => {
        setResolvedSiteId(siteIdParam)
      })
  }, [apiBase, embedToken, siteIdParam])

  useEffect(() => {
    if (!resolvedSiteId) return

    const tokenQuery = embedToken ? `?token=${encodeURIComponent(embedToken)}` : ''
    fetch(`${apiBase}/api/public/sites/${resolvedSiteId}/info${tokenQuery}`)
      .then((res) => res.json())
      .then((data) => setSite(data.data))
      .catch(() => setSite(null))
  }, [apiBase, resolvedSiteId, embedToken])

  useEffect(() => {
    if (!resolvedSiteId || !selectedDate) return

    setLoading(true)
    const tokenQuery = embedToken ? `&token=${encodeURIComponent(embedToken)}` : ''
    fetch(`${apiBase}/api/public/sites/${resolvedSiteId}/availability?date=${selectedDate}${tokenQuery}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.data || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [apiBase, resolvedSiteId, selectedDate, embedToken])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedSlot) return

    setLoading(true)
    setStatus(null)

    try {
      const response = await fetch(`${apiBase}/api/public/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: resolvedSiteId,
          slotId: selectedSlot.id || selectedSlot._id,
          clientName,
          clientEmail,
          clientPhone,
          notes,
          token: embedToken || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Booking failed')
      }

      setStatus('Booking confirmed!')
      setSelectedSlot(null)
      setClientName('')
      setClientEmail('')
      setClientPhone('')
      setNotes('')
    } catch (error) {
      setStatus('Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!resolvedSiteId) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">scheduleright Embed Widget</h1>
        <p className="mt-2 text-gray-600">Missing siteId or token query parameter.</p>
      </main>
    )
  }

  const filteredSlots = useMemo(() => {
    if (!defaultService) return slots
    const term = defaultService.toLowerCase()
    return slots.filter((slot) => (slot.title || '').toLowerCase().includes(term))
  }, [slots, defaultService])

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{site?.name || 'Schedule an Appointment'}</h1>
        {site?.address && <p className="text-sm text-gray-600 mt-1">{site.address}</p>}
        {(defaultService || timezone || locale) && (
          <p className="text-xs text-gray-500 mt-1">
            {defaultService ? `Service: ${defaultService}` : null}
            {defaultService && (timezone || locale) ? ' • ' : null}
            {timezone ? `Timezone: ${timezone}` : null}
            {timezone && locale ? ' • ' : null}
            {locale ? `Locale: ${locale}` : null}
          </p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label htmlFor="embed-date" className="block text-sm font-medium text-gray-700 mb-2">
          Select Date
        </label>
        <input
          id="embed-date"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h2 className="text-lg font-semibold">Available Slots</h2>
        {loading && <p className="text-gray-500">Loading...</p>}
        {!loading && filteredSlots.length === 0 && <p className="text-gray-500">No available slots.</p>}
        <div className="grid gap-3">
          {filteredSlots.map((slot) => (
            <button
              key={slot._id}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`border rounded-lg p-3 text-left transition ${
                selectedSlot?._id === slot._id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="font-medium text-gray-900">{slot.title || 'Availability Slot'}</div>
              <div className="text-sm text-gray-600">{slot.startTime} - {slot.endTime}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">Book Selected Slot</h2>
          <label htmlFor="embed-name" className="sr-only">Full name</label>
          <input
            id="embed-name"
            placeholder="Full name"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
          <label htmlFor="embed-email" className="sr-only">Email</label>
          <input
            id="embed-email"
            placeholder="Email"
            type="email"
            value={clientEmail}
            onChange={(event) => setClientEmail(event.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
          <label htmlFor="embed-phone" className="sr-only">Phone</label>
          <input
            id="embed-phone"
            placeholder="Phone (optional)"
            value={clientPhone}
            onChange={(event) => setClientPhone(event.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
          <label htmlFor="embed-notes" className="sr-only">Notes</label>
          <textarea
            id="embed-notes"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            rows={3}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white rounded-md px-4 py-2 disabled:opacity-60 embed-submit"
          >
            {loading ? 'Submitting...' : buttonLabel}
          </button>
        </form>
      )}

      {status && (
        <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
          {status}
        </div>
      )}

      <style jsx>{`
        .embed-submit {
          background-color: ${themeColor || '#4f46e5'};
        }
        .embed-submit:hover {
          filter: brightness(0.95);
        }
      `}</style>
    </main>
  )
}
