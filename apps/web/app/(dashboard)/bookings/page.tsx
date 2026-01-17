'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'

export default function BookingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const api = useApi()

  // Fetch user's bookings summary
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', 'me'],
    queryFn: async () => {
      const response = await api.get('/api/v1/bookings/me')
      return response.data || []
    },
    enabled: !!user,
  })

  const upcomingCount = bookings?.filter((b: any) => b.status === 'confirmed' || b.status === 'pending').length || 0
  const completedCount = bookings?.filter((b: any) => b.status === 'completed').length || 0
  const cancelledCount = bookings?.filter((b: any) => b.status === 'cancelled').length || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-2 text-gray-600">Manage your appointments and schedule</p>
        </div>
        {user?.roles?.includes('STAFF') && (
          <Link
            href="/bookings/manage"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Manage All Bookings
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-sm font-medium text-blue-900">Upcoming</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{isLoading ? '-' : upcomingCount}</div>
          <p className="text-sm text-blue-700 mt-1">Pending or confirmed</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-sm font-medium text-green-900">Completed</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{isLoading ? '-' : completedCount}</div>
          <p className="text-sm text-green-700 mt-1">Finished appointments</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-sm font-medium text-red-900">Cancelled</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{isLoading ? '-' : cancelledCount}</div>
          <p className="text-sm text-red-700 mt-1">Cancelled bookings</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/bookings/browse"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition"
          >
            <div>
              <div className="font-medium text-gray-900">Browse Availability</div>
              <div className="text-sm text-gray-600">Find and book a slot</div>
            </div>
            <div className="text-indigo-600">→</div>
          </Link>

          <Link
            href="/bookings/new"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition"
          >
            <div>
              <div className="font-medium text-gray-900">Create Booking</div>
              <div className="text-sm text-gray-600">Schedule a new appointment</div>
            </div>
            <div className="text-green-600">+</div>
          </Link>

          <Link
            href="/bookings/my"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
          >
            <div>
              <div className="font-medium text-gray-900">My Bookings</div>
              <div className="text-sm text-gray-600">View all your appointments</div>
            </div>
            <div className="text-blue-600">→</div>
          </Link>

          {user?.roles?.includes('STAFF') && (
            <Link
              href="/bookings/manage"
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition"
            >
              <div>
                <div className="font-medium text-gray-900">Manage Bookings</div>
                <div className="text-sm text-gray-600">Review and manage all bookings</div>
              </div>
              <div className="text-purple-600">→</div>
            </Link>
          )}

          {user?.roles?.includes('STAFF') && (
            <Link
              href="/clients"
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition"
            >
          <Link
            href="/resources"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition"
          >
            <div>
              <div className="font-medium text-gray-900">Programs & Resources</div>
              <div className="text-sm text-gray-600">Access programs and resources</div>
            </div>
            <div className="text-teal-600">→</div>
          </Link>
              <div>
                <div className="font-medium text-gray-900">Client Management</div>
                <div className="text-sm text-gray-600">View client profiles and history</div>
              </div>
              <div className="text-amber-600">→</div>
            </Link>
          )}

          {user?.roles?.includes('STAFF') && (
            <Link
              href="/embed"
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-sky-400 hover:bg-sky-50 transition"
            >
              <div>
                <div className="font-medium text-gray-900">Embed Code Generator</div>
                <div className="text-sm text-gray-600">Create booking widgets for other sites</div>
              </div>
              <div className="text-sky-600">→</div>
            </Link>
          )}

          {user?.roles?.includes('STAFF') && (
            <Link
              href="/properties"
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition"
            >
              <div>
                <div className="font-medium text-gray-900">Field Library</div>
                <div className="text-sm text-gray-600">Manage custom properties</div>
              </div>
              <div className="text-emerald-600">→</div>
            </Link>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h2>
        <p className="text-gray-700 mb-3">
          Use the quick actions above to get started. Browse available time slots, create a new booking, or manage your existing appointments.
        </p>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• 📅 Check availability and filter by date, time, or service</li>
          <li>• ✏️ Book appointments with just a few clicks</li>
          <li>• 👁️ View all your bookings in one place</li>
          <li>• ✋ Cancel or reschedule as needed</li>
        </ul>
      </div>
    </div>
  )
}
