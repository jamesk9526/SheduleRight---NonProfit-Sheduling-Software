'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSites } from '@/lib/hooks/useData'

interface EmbedConfig {
  _id: string
  name: string
  siteId: string
  token: string
  themeColor?: string
  buttonLabel?: string
  allowDomains?: string[]
  locale?: string
  timezone?: string
  defaultService?: string
  status: string
  createdAt: string
}

interface EmbedAuditLog {
  _id: string
  action: string
  userId: string
  timestamp: string
  details?: Record<string, any>
}

export default function EmbedGeneratorPage() {
  const { user } = useAuth()
  const api = useApi()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [siteId, setSiteId] = useState('')
  const [themeColor, setThemeColor] = useState('#4f46e5')
  const [buttonLabel, setButtonLabel] = useState('Confirm Booking')
  const [allowDomains, setAllowDomains] = useState('')
  const [locale, setLocale] = useState('en-US')
  const [timezone, setTimezone] = useState('')
  const [defaultService, setDefaultService] = useState('')
  const [embedBaseUrl, setEmbedBaseUrl] = useState('https://embed.yourdomain.com')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editConfigId, setEditConfigId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSiteId, setEditSiteId] = useState('')
  const [editThemeColor, setEditThemeColor] = useState('#4f46e5')
  const [editButtonLabel, setEditButtonLabel] = useState('Confirm Booking')
  const [editAllowDomains, setEditAllowDomains] = useState('')
  const [editLocale, setEditLocale] = useState('en-US')
  const [editTimezone, setEditTimezone] = useState('')
  const [editDefaultService, setEditDefaultService] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')
  const { data: sites = [] } = useSites(user?.orgId || null)

  const { data } = useQuery({
    queryKey: ['embed-configs'],
    queryFn: async () => await api.get('/api/v1/embed-configs'),
    enabled: isStaff,
  })

  const configs: EmbedConfig[] = data?.data || []

  const siteLookup = useMemo(() => {
    const map = new Map<string, string>()
    sites.forEach((site) => map.set(site._id, site.name))
    return map
  }, [sites])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!siteId || !name.trim()) {
      setError('Name and site are required.')
      return
    }

    setSaving(true)
    try {
      await api.post('/api/v1/embed-configs', {
        name: name.trim(),
        siteId,
        themeColor,
        buttonLabel,
        allowDomains: allowDomains
          .split(',')
          .map((domain) => domain.trim())
          .filter(Boolean),
        locale: locale || undefined,
        timezone: timezone || undefined,
        defaultService: defaultService || undefined,
      })
      setName('')
      setSiteId('')
      setThemeColor('#4f46e5')
      setButtonLabel('Confirm Booking')
      setAllowDomains('')
      setLocale('en-US')
      setTimezone('')
      setDefaultService('')
      queryClient.invalidateQueries({ queryKey: ['embed-configs'] })
    } catch (err: any) {
      setError(err?.message || 'Failed to create embed configuration.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (config: EmbedConfig) => {
    setEditConfigId(config._id)
    setEditName(config.name)
    setEditSiteId(config.siteId)
    setEditThemeColor(config.themeColor || '#4f46e5')
    setEditButtonLabel(config.buttonLabel || 'Confirm Booking')
    setEditAllowDomains((config.allowDomains || []).join(', '))
    setEditLocale(config.locale || 'en-US')
    setEditTimezone(config.timezone || '')
    setEditDefaultService(config.defaultService || '')
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditConfigId(null)
    setEditName('')
    setEditSiteId('')
    setEditThemeColor('#4f46e5')
    setEditButtonLabel('Confirm Booking')
    setEditAllowDomains('')
    setEditLocale('en-US')
    setEditTimezone('')
    setEditDefaultService('')
    setEditError(null)
  }

  const saveEdit = async () => {
    if (!editConfigId) return
    setEditSaving(true)
    setEditError(null)

    try {
      await api.put(`/api/v1/embed-configs/${editConfigId}`, {
        name: editName.trim(),
        siteId: editSiteId,
        themeColor: editThemeColor,
        buttonLabel: editButtonLabel,
        allowDomains: editAllowDomains
          .split(',')
          .map((domain) => domain.trim())
          .filter(Boolean),
        locale: editLocale || undefined,
        timezone: editTimezone || undefined,
        defaultService: editDefaultService || undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['embed-configs'] })
      cancelEdit()
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update embed configuration.')
    } finally {
      setEditSaving(false)
    }
  }

  if (!isStaff) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Access Denied</p>
        <p className="text-sm text-red-700 mt-2">Only staff members can generate embed codes.</p>
        <Link href="/dashboard" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Embed Code Generator</h1>
          <p className="mt-2 text-gray-600">Create booking widgets for your website or partner pages.</p>
        </div>
        <Link href="/bookings" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Bookings
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Embed</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="embed-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="embed-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Homepage Booking Widget"
              required
            />
          </div>
          <div>
            <label htmlFor="embed-site" className="block text-sm font-medium text-gray-700 mb-1">
              Site
            </label>
            <select
              id="embed-site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="">Select a site...</option>
              {sites.map((site) => (
                <option key={site._id} value={site._id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="embed-button" className="block text-sm font-medium text-gray-700 mb-1">
              Button Label
            </label>
            <input
              id="embed-button"
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="embed-service" className="block text-sm font-medium text-gray-700 mb-1">
              Default Service (slot title filter)
            </label>
            <input
              id="embed-service"
              value={defaultService}
              onChange={(e) => setDefaultService(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Food Pantry"
            />
          </div>
          <div>
            <label htmlFor="embed-color" className="block text-sm font-medium text-gray-700 mb-1">
              Theme Color
            </label>
            <input
              id="embed-color"
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="h-10 w-full border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="embed-locale" className="block text-sm font-medium text-gray-700 mb-1">
              Locale
            </label>
            <input
              id="embed-locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="en-US"
            />
          </div>
          <div>
            <label htmlFor="embed-timezone" className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <input
              id="embed-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="America/Chicago"
            />
          </div>
          <div>
            <label htmlFor="embed-base" className="block text-sm font-medium text-gray-700 mb-1">
              Embed App URL
            </label>
            <input
              id="embed-base"
              value={embedBaseUrl}
              onChange={(e) => setEmbedBaseUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="https://embed.yourdomain.com"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="embed-domains" className="block text-sm font-medium text-gray-700 mb-1">
              Allowed Domains (comma-separated)
            </label>
            <input
              id="embed-domains"
              value={allowDomains}
              onChange={(e) => setAllowDomains(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="example.org, partner.org"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank to allow any domain.</p>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Generate Embed'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Embeds</h2>
        {configs.length === 0 ? (
          <p className="text-gray-600">No embeds created yet.</p>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => {
              const snippet = `<iframe src=\"${embedBaseUrl}?token=${config.token}\" style=\"width:100%;min-height:680px;border:0;\" title=\"${config.name}\"></iframe>`
              const isEditing = editConfigId === config._id
              const { data: auditData } = useQuery({
                queryKey: ['embed-config-audit', config._id],
                queryFn: async () => await api.get(`/api/v1/embed-configs/${config._id}/audit`),
                enabled: isStaff,
              })
              const auditLogs: EmbedAuditLog[] = auditData?.data || []
              return (
                <div key={config._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-medium text-gray-900">{config.name}</div>
                      <div className="text-sm text-gray-600">Site: {siteLookup.get(config.siteId) || config.siteId}</div>
                    </div>
                    <div className="text-xs text-gray-500">Token: {config.token}</div>
                  </div>
                  {config.allowDomains && config.allowDomains.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">Allowed: {config.allowDomains.join(', ')}</div>
                  )}
                  <div className="mt-3">
                    <label htmlFor={`embed-code-${config._id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Embed Code
                    </label>
                    <textarea
                      id={`embed-code-${config._id}`}
                      readOnly
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
                      rows={3}
                      value={snippet}
                    />
                    <button
                      type="button"
                      className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                      onClick={async () => {
                        await navigator.clipboard.writeText(snippet)
                      }}
                    >
                      Copy embed code
                    </button>
                  </div>
                  {isEditing && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">Edit Embed</h3>
                      {editError && (
                        <div className="text-xs text-red-600">{editError}</div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label htmlFor={`edit-name-${config._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            id={`edit-name-${config._id}`}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor={`edit-site-${config._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Site
                          </label>
                          <select
                            id={`edit-site-${config._id}`}
                            value={editSiteId}
                            onChange={(e) => setEditSiteId(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="">Select a site...</option>
                            {sites.map((site) => (
                              <option key={site._id} value={site._id}>
                                {site.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`edit-button-${config._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Button Label
                          </label>
                          <input
                            id={`edit-button-${config._id}`}
                            value={editButtonLabel}
                            onChange={(e) => setEditButtonLabel(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor={`edit-service-${config._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Default Service
                          </label>
                          <input
                            id={`edit-service-${config._id}`}
                            value={editDefaultService}
                            onChange={(e) => setEditDefaultService(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor={`edit-color-${config._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Theme Color
                          </label>
                          <input
                            id={`edit-color-${config._id}`}
                            type="color"
                            value={editThemeColor}
                            onChange={(e) => setEditThemeColor(e.target.value)}
                            className="h-10 w-full border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor={`edit-locale-${config._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Locale
                          </label>
                          <input
                            id={`edit-locale-${config._id}`}
                            value={editLocale}
                            onChange={(e) => setEditLocale(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor={`edit-timezone-${config._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Timezone
                          </label>
                          <input
                            id={`edit-timezone-${config._id}`}
                            value={editTimezone}
                            onChange={(e) => setEditTimezone(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label htmlFor={`edit-domains-${config._id}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Allowed Domains
                          </label>
                          <input
                            id={`edit-domains-${config._id}`}
                            value={editAllowDomains}
                            onChange={(e) => setEditAllowDomains(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder="example.org, partner.org"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={editSaving}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {editSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    {!isEditing && (
                      <button
                        type="button"
                        className="text-sm text-indigo-600 hover:text-indigo-700 mr-4"
                        onClick={() => startEdit(config)}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:text-red-700"
                      onClick={async () => {
                        await api.delete(`/api/v1/embed-configs/${config._id}`)
                        queryClient.invalidateQueries({ queryKey: ['embed-configs'] })
                      }}
                    >
                      Archive
                    </button>
                  </div>

                  {auditLogs.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-3">
                      <h3 className="text-xs font-semibold text-gray-700">Recent Audit</h3>
                      <ul className="mt-2 space-y-1 text-xs text-gray-600">
                        {auditLogs.slice(0, 5).map((log) => (
                          <li key={log._id}>
                            <span className="font-medium">{log.action}</span> · {new Date(log.timestamp).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
