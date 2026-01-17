'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'

interface ClientProfile {
  id: string
  clientEmail: string
  firstName: string
  lastName: string
  phone?: string
  status: 'active' | 'inactive' | 'archived'
  createdAt: string
  updatedAt: string
}

type SortBy = 'name' | 'email' | 'created' | 'status'
type SortOrder = 'asc' | 'desc'

export default function ClientListPage() {
  const { user } = useAuth()
  const { call } = useApi()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('active')

  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['client-profiles'],
    queryFn: async () => {
      return await call(`/api/v1/client-profiles?status=${statusFilter === 'all' ? '' : statusFilter}`)
    },
    enabled: isStaff,
  })

  const clients: ClientProfile[] = data?.data || []

  const filteredClients = useMemo(() => {
    let filtered = clients

    // Apply search filter
    if (search) {
      const term = search.toLowerCase()
      filtered = filtered.filter((client) => {
        const fullName = `${client.firstName} ${client.lastName}`.toLowerCase()
        return (
          fullName.includes(term) ||
          client.clientEmail?.toLowerCase().includes(term) ||
          client.phone?.toLowerCase().includes(term)
        )
      })
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = `${a.firstName} ${a.lastName}`
      let bVal: any = `${b.firstName} ${b.lastName}`

      if (sortBy === 'email') {
        aVal = a.clientEmail
        bVal = b.clientEmail
      } else if (sortBy === 'created') {
        aVal = new Date(a.createdAt).getTime()
        bVal = new Date(b.createdAt).getTime()
      } else if (sortBy === 'status') {
        aVal = a.status
        bVal = b.status
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [clients, search, sortBy, sortOrder])

  const handleExport = () => {
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Created'],
      ...filteredClients.map((c) => [
        c.firstName,
        c.lastName,
        c.clientEmail,
        c.phone || '',
        c.status,
        new Date(c.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/\"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortBy }) => {
    if (sortBy !== field) return <span className="text-gray-400 text-xs">⇅</span>
    return <span className="text-sm">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors[status] || colors.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

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
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Profiles</h1>
          <p className="mt-2 text-gray-600">Manage client information, notes, files, and interactions.</p>
        </div>
        <Link
          href="/clients/new"
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
          + New Client
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        {/* Search Bar */}
        <div>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Status and Action Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['all', 'active', 'inactive', 'archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="text-sm text-gray-600">
        Showing {filteredClients.length} of {clients.length} clients
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <p className="text-gray-600">Loading clients...</p>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error loading clients. Please try again.
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 font-medium">No clients found</p>
          <p className="text-gray-500 text-sm mt-2">Create a new client to get started.</p>
          <Link
            href="/clients/new"
            className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Create Client →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => toggleSort('name')}
                      className="text-sm font-semibold text-gray-900 hover:text-indigo-600 flex items-center gap-2"
                    >
                      Name <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => toggleSort('email')}
                      className="text-sm font-semibold text-gray-900 hover:text-indigo-600 flex items-center gap-2"
                    >
                      Email <SortIcon field="email" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => toggleSort('status')}
                      className="text-sm font-semibold text-gray-900 hover:text-indigo-600 flex items-center gap-2"
                    >
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => toggleSort('created')}
                      className="text-sm font-semibold text-gray-900 hover:text-indigo-600 flex items-center gap-2"
                    >
                      Created <SortIcon field="created" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {client.firstName} {client.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{client.clientEmail}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{client.phone || '—'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        View Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
