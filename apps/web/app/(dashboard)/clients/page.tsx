'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'

interface ClientSummary {
  email: string
  name: string
  phone?: string
  totalBookings: number
  lastBookingAt?: string
  upcomingCount: number
  completedCount: number
  cancelledCount: number
}

export default function ClientsPage() {
  const { user } = useAuth()
  const { call } = useApi()
  const [search, setSearch] = useState('')

  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      return await call('/api/v1/clients')
    },
    enabled: isStaff,
  })

  const clients: ClientSummary[] = data?.data || []

  const filteredClients = useMemo(() => {
    if (!search) return clients
    const term = search.toLowerCase()
    return clients.filter((client) => {
      return (
        client.name?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.phone?.toLowerCase().includes(term)
      )
    })
  }, [clients, search])

  if (!isStaff) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Access Denied</p>
        <p className="text-sm text-red-700 mt-2">Only staff members can manage clients.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="mt-2 text-gray-600">Manage client profiles and booking history.</p>
        </div>
        <Link href="/bookings" className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Bookings
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label htmlFor="client-search" className="block text-sm font-medium text-gray-700 mb-2">
          Search clients
        </label>
        <input
          id="client-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading clients...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-red-600">Failed to load clients.</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-gray-600">No clients found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Client</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Bookings</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Booking</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.email} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{client.name || 'Unnamed Client'}</div>
                      <div className="text-sm text-gray-500">{client.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {client.phone || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>Total: {client.totalBookings}</div>
                      <div className="text-xs text-gray-500">
                        Upcoming {client.upcomingCount} · Completed {client.completedCount} · Cancelled {client.cancelledCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {client.lastBookingAt ? new Date(client.lastBookingAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/clients/${encodeURIComponent(client.email)}`}
                        className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded text-sm hover:bg-indigo-100 transition"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
