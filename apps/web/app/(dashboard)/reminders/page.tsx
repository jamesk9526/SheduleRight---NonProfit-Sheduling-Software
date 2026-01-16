'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCurrentUser, useReminderSettings, useUpdateReminderSettings } from '@/lib/hooks/useData'

interface TwilioStatus {
  twilioConfigured: boolean
  remindersEnabled: boolean
  phoneNumber: string | null
  message: string
  timestamp: string
}

export default function RemindersPage() {
  const router = useRouter()
  const { data: user, isLoading } = useCurrentUser()
  const { data: settings, isLoading: loadingSettings, isError } = useReminderSettings()
  const updateSettings = useUpdateReminderSettings()
  const [mounted, setMounted] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [leadTime, setLeadTime] = useState('24')
  const [template, setTemplate] = useState('Hello {{name}}, your appointment is scheduled for {{date}} at {{time}}.')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus | null>(null)
  const [loadingTwilio, setLoadingTwilio] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled)
      setLeadTime(String(settings.leadTimeHours))
      setTemplate(settings.template)
    }
  }, [settings])

  useEffect(() => {
    if (mounted && user) {
      fetchTwilioStatus()
    }
  }, [mounted, user])

  const fetchTwilioStatus = async () => {
    setLoadingTwilio(true)
    try {
      const response = await fetch('/api/v1/reminders/twilio-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setTwilioStatus(data)
      } else {
        console.error('Failed to fetch Twilio status:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching Twilio status:', error)
    } finally {
      setLoadingTwilio(false)
    }
  }

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push('/login')
    }
  }, [mounted, isLoading, user, router])

  if (!mounted) return null

  if (isLoading) {
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

  const saving = updateSettings.isPending

  const canManage = (user.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')

  const handleSave = async () => {
    setSaveError(null)
    try {
      await updateSettings.mutateAsync({
        enabled,
        leadTimeHours: Number(leadTime),
        template,
      })
    } catch (e: any) {
      setSaveError(e?.message || 'Failed to save settings')
    }
  }

  return (
    <div className="container mt-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-primary-600">SMS Reminders</h1>
          <p className="mt-2 text-neutral-600">Configure appointment reminders and message templates</p>
        </div>
        <button
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          disabled={!canManage || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Reminder Configuration</h2>
              <p className="text-sm text-neutral-600">Enable or disable automated SMS reminders.</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={!canManage || saving}
              />
              <span className={`w-11 h-6 rounded-full transition ${enabled ? 'bg-primary-600' : 'bg-neutral-300'} relative`}>
                <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition ${enabled ? 'translate-x-5' : ''}`} />
              </span>
            </label>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Reminder Lead Time (hours)</label>
              <select
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                disabled={!canManage || saving}
              >
                <option value="1">1 hour before</option>
                <option value="2">2 hours before</option>
                <option value="6">6 hours before</option>
                <option value="24">24 hours before</option>
                <option value="48">48 hours before</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">SMS Template</label>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={5}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                disabled={!canManage || saving}
              />
              <p className="text-xs text-neutral-500 mt-2">
                Use placeholders: {'{'}{'{'}name{'}'}{'}'}, {'{'}{'{'}date{'}'}{'}'}, {'{'}{'{'}time{'}'}{'}'}, {'{'}{'{'}location{'}'}{'}'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Twilio Status</h2>
          {isError && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Failed to load settings.</div>
          )}
          {saveError && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>
          )}
          
          {loadingTwilio ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-neutral-200 rounded w-32"></div>
              <div className="h-4 bg-neutral-200 rounded w-32"></div>
            </div>
          ) : twilioStatus ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-700">Connection</span>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${twilioStatus.twilioConfigured ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className={twilioStatus.twilioConfigured ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                    {twilioStatus.twilioConfigured ? 'Connected' : 'Not Configured'}
                  </span>
                </div>
              </div>
              {twilioStatus.twilioConfigured && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-700">Sender ID</span>
                    <span className="font-mono text-neutral-600">{twilioStatus.phoneNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-700">Status</span>
                    <span className={twilioStatus.remindersEnabled ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
                      {twilioStatus.remindersEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-sm text-neutral-600">
              <div className="flex items-center justify-between">
                <span>Connection</span>
                <span className="text-neutral-400">Unknown</span>
              </div>
            </div>
          )}
          
          <div className="mt-6 p-3 rounded-lg bg-neutral-50 text-xs text-neutral-600">
            {twilioStatus?.twilioConfigured
              ? 'Twilio is configured and ready to send SMS reminders.'
              : 'Configure Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) in the server .env to enable SMS delivery.'}
          </div>
        </div>
      </div>
    </div>
  )
}
