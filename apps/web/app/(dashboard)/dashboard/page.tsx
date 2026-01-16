'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name: string
  roles: string[]
  orgId: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check if user is authenticated
    const accessToken = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')

    if (!accessToken || !userStr) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userStr))
  }, [router])

  const handleLogout = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken')
      if (accessToken) {
        await fetch(`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  if (!user) {
    return (
      <div className="container mt-12">
        <p>Loading...</p>
      </div>
    )
  }

  const isAdmin = user.roles.includes('ADMIN')

  return (
    <div className="container mt-12">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-primary-600">Dashboard</h1>
          <p className="mt-2 text-neutral-600">
            Welcome back, {user.name || user.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/profile"
            className="bg-primary-100 hover:bg-primary-200 text-primary-700 font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Profile Card */}
        <Link
          href="/profile"
          className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition cursor-pointer border border-neutral-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-neutral-900">Profile</h3>
            <span className="text-2xl">👤</span>
          </div>
          <p className="text-neutral-600">View and manage your account information</p>
          <div className="mt-4 text-primary-600 font-medium flex items-center">
            View Profile →
          </div>
        </Link>

        {/* Organizations Card (Admin Only) */}
        {isAdmin && (
          <Link
            href="/orgs"
            className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition cursor-pointer border border-neutral-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-neutral-900">Organizations</h3>
              <span className="text-2xl">🏢</span>
            </div>
            <p className="text-neutral-600">Manage all organizations and their sites</p>
            <div className="mt-4 text-primary-600 font-medium flex items-center">
              View Organizations →
            </div>
          </Link>
        )}

        {/* My Organization Card */}
        <Link
          href={`/orgs/${user.orgId}`}
          className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition cursor-pointer border border-neutral-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-neutral-900">My Organization</h3>
            <span className="text-2xl">🏪</span>
          </div>
          <p className="text-neutral-600">View your organization and manage sites</p>
          <div className="mt-4 text-primary-600 font-medium flex items-center">
            View Organization →
          </div>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-sm font-medium text-neutral-500 mb-2">
            Upcoming Appointments
          </h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-sm font-medium text-neutral-500 mb-2">
            Active Clients
          </h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-sm font-medium text-neutral-500 mb-2">
            Pending Tasks
          </h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">
          Coming Soon
        </h2>
        <ul className="space-y-2 text-neutral-600">
          <li className="flex items-center">
            <span className="text-primary-600 mr-2">✓</span>
            Client scheduling and appointments
          </li>
          <li className="flex items-center">
            <span className="text-primary-600 mr-2">✓</span>
            Volunteer management and shift scheduling
          </li>
          <li className="flex items-center">
            <span className="text-primary-600 mr-2">✓</span>
            SMS reminders via Twilio
          </li>
          <li className="flex items-center">
            <span className="text-primary-600 mr-2">✓</span>
            Offline-first data synchronization
          </li>
          <li className="flex items-center">
            <span className="text-primary-600 mr-2">✓</span>
            Multi-site support and resource management
          </li>
        </ul>
      </div>
    </div>
  )
}
