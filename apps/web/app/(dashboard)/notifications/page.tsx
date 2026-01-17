'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'

interface NotificationPreferences {
  bookingConfirmation: boolean
  bookingReminder: boolean
  bookingCancellation: boolean
  bookingUpdate: boolean
  smsReminder: boolean
  emailReminder: boolean
  staffNotifications: boolean
}

export default function NotificationPreferencesPage() {
  const { user } = useAuth()
  const { call } = useApi()
  const queryClient = useQueryClient()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    bookingConfirmation: true,
    bookingReminder: true,
    bookingCancellation: true,
    bookingUpdate: true,
    smsReminder: true,
    emailReminder: false,
    staffNotifications: true,
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: preferencesData } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => await call('/api/v1/notifications/preferences'),
  })

  useEffect(() => {
    if (preferencesData) {
      setPreferences(preferencesData)
    }
  }, [preferencesData])

  const updateMutation = useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      return await call('/api/v1/notifications/preferences', {
        method: 'PUT',
        body: prefs,
      })
    },
    onSuccess: () => {
      setSaved(true)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to save preferences')
    },
  })

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = () => {
    updateMutation.mutate(preferences)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="mt-2 text-gray-600">Control which notifications you receive and how you receive them.</p>
      </div>

      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✅ Preferences saved successfully
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* Booking Notifications */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Notifications</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.bookingConfirmation}
                onChange={() => handleToggle('bookingConfirmation')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium text-gray-900">Booking Confirmation</p>
                <p className="text-sm text-gray-600">Get notified when a new booking is confirmed</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.bookingReminder}
                onChange={() => handleToggle('bookingReminder')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium text-gray-900">Booking Reminders</p>
                <p className="text-sm text-gray-600">Get reminders before your upcoming bookings</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.bookingCancellation}
                onChange={() => handleToggle('bookingCancellation')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium text-gray-900">Cancellation Notices</p>
                <p className="text-sm text-gray-600">Get notified when a booking is cancelled</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.bookingUpdate}
                onChange={() => handleToggle('bookingUpdate')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium text-gray-900">Booking Updates</p>
                <p className="text-sm text-gray-600">Get notified when booking details are updated</p>
              </div>
            </label>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="border-b border-gray-200 pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.smsReminder}
                onChange={() => handleToggle('smsReminder')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium text-gray-900">SMS Reminders</p>
                <p className="text-sm text-gray-600">Receive reminders via text message</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailReminder}
                onChange={() => handleToggle('emailReminder')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium text-gray-900">Email Reminders</p>
                <p className="text-sm text-gray-600">Receive reminders via email</p>
              </div>
            </label>
          </div>
        </div>

        {/* Staff Notifications (if staff/admin) */}
        {user?.roles?.includes('ADMIN') || user?.roles?.includes('STAFF') ? (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Notifications</h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.staffNotifications}
                onChange={() => handleToggle('staffNotifications')}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium text-gray-900">Administrative Updates</p>
                <p className="text-sm text-gray-600">Get notified about system updates and alerts</p>
              </div>
            </label>
          </div>
        ) : null}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 font-medium"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-2">💡 Tip</p>
        <p>
          You can always manage these preferences from your profile settings or when configuring reminder settings in
          the admin panel.
        </p>
      </div>
    </div>
  )
}
