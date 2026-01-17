'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useApi } from '@/lib/hooks/useApi'

interface CheckResult {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
  statusCode?: number
  durationMs?: number
  endpoint?: string
}

const API_BASE_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001'

export default function ApiHealthPage() {
  const { user, isAuthenticated } = useAuth()
  const { call } = useApi()

  const isAdmin = !!user?.roles?.includes('ADMIN')

  const [health, setHealth] = useState<CheckResult>({ status: 'idle', message: '' })
  const [authCheck, setAuthCheck] = useState<CheckResult>({ status: 'idle', message: '' })
  const [orgsCheck, setOrgsCheck] = useState<CheckResult>({ status: 'idle', message: '' })
  const [rawAuthCheck, setRawAuthCheck] = useState<CheckResult>({ status: 'idle', message: '' })
  const [clientFieldsCheck, setClientFieldsCheck] = useState<CheckResult>({ status: 'idle', message: '' })
  const [brandingCheck, setBrandingCheck] = useState<CheckResult>({ status: 'idle', message: '' })
  const [sitesCheck, setSitesCheck] = useState<CheckResult>({ status: 'idle', message: '' })
  const [volunteersCheck, setVolunteersCheck] = useState<CheckResult>({ status: 'idle', message: '' })
  const [bookingsCheck, setBookingsCheck] = useState<CheckResult>({ status: 'idle', message: '' })
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [clockSkew, setClockSkew] = useState<string>('')
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [cookieInfo, setCookieInfo] = useState<string>('')

  const tokenPresent = useMemo(() => !!localStorage.getItem('accessToken'), [])

  const withTiming = async (fn: () => Promise<Response>): Promise<{ res: Response; durationMs: number }> => {
    const started = performance.now()
    const res = await fn()
    const durationMs = Math.round(performance.now() - started)
    return { res, durationMs }
  }

  const runHealth = async () => {
    setHealth({ status: 'loading', message: 'Pinging /health...' })
    try {
      const { res, durationMs } = await withTiming(() => fetch(`${API_BASE_URL}/health`))
      const data = await res.json()
      setHealth({ status: 'success', message: JSON.stringify(data, null, 2), statusCode: res.status, durationMs, endpoint: '/health' })
      if (data?.timestamp) {
        const serverTs = Date.parse(data.timestamp)
        if (!Number.isNaN(serverTs)) {
          const diffMs = serverTs - Date.now()
          const secs = Math.round(diffMs / 1000)
          setClockSkew(`${secs > 0 ? '+' : ''}${secs} sec (server - browser)`)
        }
      }
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error) {
      setHealth({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error', endpoint: '/health' })
    }
  }

  const runAuthCheck = async () => {
    setAuthCheck({ status: 'loading', message: 'Calling /api/v1/auth/me...' })
    try {
      const started = performance.now()
      const data = await call('/api/v1/auth/me')
      setAuthCheck({ status: 'success', message: JSON.stringify(data, null, 2), statusCode: 200, durationMs: Math.round(performance.now() - started), endpoint: '/api/v1/auth/me' })
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error: any) {
      setAuthCheck({ status: 'error', message: error?.message || 'Unknown error', endpoint: '/api/v1/auth/me' })
    }
  }

  const runRawAuthCheck = async () => {
    setRawAuthCheck({ status: 'loading', message: 'Calling /api/v1/auth/me (raw fetch)...' })
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setRawAuthCheck({ status: 'error', message: 'No access token found in localStorage', endpoint: '/api/v1/auth/me' })
      return
    }
    try {
      const { res, durationMs } = await withTiming(() => fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      }))
      const text = await res.text()
      let parsed: any
      try { parsed = JSON.parse(text) } catch { parsed = text }
      const message = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
      setRawAuthCheck({ status: res.ok ? 'success' : 'error', message, statusCode: res.status, durationMs, endpoint: '/api/v1/auth/me' })
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error: any) {
      setRawAuthCheck({ status: 'error', message: error?.message || 'Unknown error', endpoint: '/api/v1/auth/me' })
    }
  }

  const runOrgsCheck = async () => {
    setOrgsCheck({ status: 'loading', message: 'Listing orgs for this user...' })
    try {
      const started = performance.now()
      const data = await call('/api/v1/orgs')
      setOrgsCheck({ status: 'success', message: JSON.stringify(data, null, 2), statusCode: 200, durationMs: Math.round(performance.now() - started), endpoint: '/api/v1/orgs' })
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error: any) {
      setOrgsCheck({ status: 'error', message: error?.message || 'Unknown error', endpoint: '/api/v1/orgs' })
    }
  }

  const runClientFields = async () => {
    if (!user?.orgId) {
      setClientFieldsCheck({ status: 'error', message: 'No orgId on user; cannot fetch client fields', endpoint: '/api/v1/orgs/:orgId/client-fields' })
      return
    }
    setClientFieldsCheck({ status: 'loading', message: 'Fetching client field definitions...' })
    try {
      const started = performance.now()
      const data = await call(`/api/v1/orgs/${user.orgId}/client-fields`)
      setClientFieldsCheck({ status: 'success', message: JSON.stringify(data, null, 2), statusCode: 200, durationMs: Math.round(performance.now() - started), endpoint: `/api/v1/orgs/${user.orgId}/client-fields` })
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error: any) {
      setClientFieldsCheck({ status: 'error', message: error?.message || 'Unknown error', endpoint: `/api/v1/orgs/${user.orgId}/client-fields` })
    }
  }

  const runBrandingCheck = async () => {
    const orgId = user?.orgId || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || ''
    if (!orgId) {
      setBrandingCheck({ status: 'error', message: 'No orgId available to fetch branding', endpoint: '/api/public/orgs/:orgId/branding' })
      return
    }
    setBrandingCheck({ status: 'loading', message: `Fetching branding for ${orgId}...` })
    try {
      const { res, durationMs } = await withTiming(() => fetch(`${API_BASE_URL}/api/public/orgs/${orgId}/branding`))
      const text = await res.text()
      let parsed: any
      try { parsed = JSON.parse(text) } catch { parsed = text }
      const message = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
      setBrandingCheck({ status: res.ok ? 'success' : 'error', message, statusCode: res.status, durationMs, endpoint: `/api/public/orgs/${orgId}/branding` })
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error: any) {
      setBrandingCheck({ status: 'error', message: error?.message || 'Unknown error', endpoint: '/api/public/orgs/:orgId/branding' })
    }
  }

  const runSites = async () => {
    setSitesCheck({ status: 'loading', message: 'Fetching sites...' })
    try {
      const started = performance.now()
      const data = await call('/api/v1/sites')
      setSitesCheck({ status: 'success', message: JSON.stringify(data, null, 2), statusCode: 200, durationMs: Math.round(performance.now() - started), endpoint: '/api/v1/sites' })
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error: any) {
      setSitesCheck({ status: 'error', message: error?.message || 'Unknown error', endpoint: '/api/v1/sites' })
    }
  }

  const runVolunteers = async () => {
    setVolunteersCheck({ status: 'loading', message: 'Fetching volunteers...' })
    try {
      const started = performance.now()
      const data = await call('/api/v1/volunteers')
      setVolunteersCheck({ status: 'success', message: JSON.stringify(data, null, 2), statusCode: 200, durationMs: Math.round(performance.now() - started), endpoint: '/api/v1/volunteers' })
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error: any) {
      setVolunteersCheck({ status: 'error', message: error?.message || 'Unknown error', endpoint: '/api/v1/volunteers' })
    }
  }

  const runBookings = async () => {
    if (!user?.orgId) {
      setBookingsCheck({ status: 'error', message: 'No orgId on user', endpoint: '/api/v1/orgs/:orgId/bookings' })
      return
    }
    setBookingsCheck({ status: 'loading', message: 'Fetching bookings...' })
    try {
      const started = performance.now()
      const data = await call(`/api/v1/orgs/${user.orgId}/bookings?limit=5`)
      setBookingsCheck({ status: 'success', message: JSON.stringify(data, null, 2), statusCode: 200, durationMs: Math.round(performance.now() - started), endpoint: `/api/v1/orgs/${user.orgId}/bookings` })
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (error: any) {
      setBookingsCheck({ status: 'error', message: error?.message || 'Unknown error', endpoint: `/api/v1/orgs/${user.orgId}/bookings` })
    }
  }

  const refreshToken = async () => {
    try {
      const { res, durationMs } = await withTiming(() => fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }))
      const data = await res.json()
      if (res.ok) {
        localStorage.setItem('accessToken', data.accessToken)
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
        alert('✅ Token refreshed successfully')
        window.location.reload()
      } else {
        alert(`❌ Refresh failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`❌ Refresh error: ${error instanceof Error ? error.message : 'Network error'}`)
    }
  }

  useEffect(() => {
    runHealth()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          setTokenInfo(payload)
        }
      } catch (e) {
        setTokenInfo({ error: 'Failed to decode token' })
      }
    }
    setCookieInfo(document.cookie || 'No cookies found')
  }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Health & Debug</h1>
          <p className="text-sm text-gray-600 mt-1">Quick checks for API availability and auth.</p>
        </div>
        <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 text-sm">Back to Dashboard</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Environment</h2>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>API Base URL:</span>
              <span className="font-mono text-gray-900">{API_BASE_URL}</span>
            </div>
            <div className="flex justify-between">
              <span>Access Token Present:</span>
              <span className="font-semibold">{tokenPresent ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Authenticated:</span>
              <span className="font-semibold">{isAuthenticated ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Admin Role:</span>
              <span className="font-semibold">{isAdmin ? 'Yes' : 'No'}</span>
            </div>
            {clockSkew && (
              <div className="flex justify-between">
                <span>Clock Skew:</span>
                <span className="font-mono">{clockSkew}</span>
              </div>
            )}
            {lastUpdated && (
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-mono">{lastUpdated}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <button type="button" onClick={runHealth} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">Ping /health</button>
          <button type="button" onClick={runAuthCheck} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Check Auth (whoami)</button>
          <button type="button" onClick={runOrgsCheck} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded">List Orgs</button>
          <button type="button" onClick={runRawAuthCheck} className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded">Auth (raw fetch)</button>
          <button type="button" onClick={runClientFields} className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded">Client Fields</button>
          <button type="button" onClick={runBrandingCheck} className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded">Branding (public)</button>
          <button type="button" onClick={runSites} className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded">Sites</button>
          <button type="button" onClick={runVolunteers} className="w-full px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded">Volunteers</button>
          <button type="button" onClick={runBookings} className="w-full px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white rounded">Bookings (5)</button>
          <button type="button" onClick={refreshToken} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold">🔄 Refresh Token</button>
          <p className="text-xs text-gray-500">Auth and org checks require a valid access token (login first).</p>
        </div>
      </div>

      {/* Token & Cookie Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-white shadow-sm space-y-2">
          <h3 className="font-semibold text-gray-900">Token Info (decoded from localStorage)</h3>
          {tokenInfo ? (
            <pre className="text-xs whitespace-pre-wrap break-words bg-gray-50 p-2 rounded border border-gray-200 max-h-64 overflow-auto">{JSON.stringify(tokenInfo, null, 2)}</pre>
          ) : (
            <p className="text-xs text-gray-500">No token or failed to decode</p>
          )}
        </div>
        <div className="border rounded-lg p-4 bg-white shadow-sm space-y-2">
          <h3 className="font-semibold text-gray-900">Cookies (from browser)</h3>
          <pre className="text-xs whitespace-pre-wrap break-words bg-gray-50 p-2 rounded border border-gray-200 max-h-64 overflow-auto">{cookieInfo}</pre>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ResultCard title="API Health" result={health} />
        <ResultCard title="Auth Check (hook)" result={authCheck} />
        <ResultCard title="Auth Check (raw)" result={rawAuthCheck} />
        <ResultCard title="Orgs" result={orgsCheck} />
        <ResultCard title="Client Fields" result={clientFieldsCheck} />
        <ResultCard title="Branding" result={brandingCheck} />
        <ResultCard title="Sites" result={sitesCheck} />
        <ResultCard title="Volunteers" result={volunteersCheck} />
        <ResultCard title="Bookings" result={bookingsCheck} />
      </div>
    </div>
  )
}

function ResultCard({ title, result }: { title: string; result: CheckResult }) {
  const statusColor =
    result.status === 'success' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' :
    result.status === 'error' ? 'text-red-700 border-red-200 bg-red-50' :
    result.status === 'loading' ? 'text-blue-700 border-blue-200 bg-blue-50' :
    'text-gray-700 border-gray-200 bg-white'

  return (
    <div className={`border rounded-lg p-4 shadow-sm ${statusColor}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-xs uppercase tracking-wide text-gray-600">{result.status}</span>
      </div>
      <div className="text-xs text-gray-700 mb-2 space-y-1">
        {result.endpoint && <div><span className="font-semibold">Endpoint:</span> {result.endpoint}</div>}
        {typeof result.statusCode === 'number' && <div><span className="font-semibold">Status:</span> {result.statusCode}</div>}
        {typeof result.durationMs === 'number' && <div><span className="font-semibold">Duration:</span> {result.durationMs} ms</div>}
      </div>
      <pre className="text-xs whitespace-pre-wrap break-words text-gray-900 bg-white/60 rounded p-2 border border-gray-200">{result.message || '—'}</pre>
    </div>
  )
}
