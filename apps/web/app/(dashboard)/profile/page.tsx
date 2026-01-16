'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/lib/hooks/useData'
import type { User } from '@/lib/hooks/useData'

export default function ProfilePage() {
  const router = useRouter()
  const { data: user, isLoading, error } = useCurrentUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push('/login')
    }
  }, [mounted, isLoading, user, router])

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
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

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

  if (error) {
    return (
      <div className="container mt-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Profile</h2>
          <p className="text-red-700">{error instanceof Error ? error.message : 'Failed to load user profile'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!user) return null

  const displayName = user.name?.trim() || user.email || 'User'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="container mt-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary-600">Profile</h1>
          <p className="mt-2 text-neutral-600">View and manage your account</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-md border border-neutral-200 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-600">
                  {initial}
                </span>
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-semibold">{displayName}</h2>
                <p className="opacity-90">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-700 cursor-not-allowed"
              />
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-neutral-700 mb-2">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={user.name}
                disabled
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-700 cursor-not-allowed"
              />
            </div>

            {/* Roles */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {(user.roles || []).map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            {/* Organization ID */}
            <div>
              <label htmlFor="profile-org" className="block text-sm font-medium text-neutral-700 mb-2">
                Organization ID
              </label>
              <input
                id="profile-org"
                type="text"
                value={user.orgId}
                disabled
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-700 cursor-not-allowed font-mono text-sm"
              />
            </div>

            {/* Account Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Status
                </label>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-neutral-700 font-medium">
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Verified
                </label>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${user.verified ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  <span className="text-neutral-700 font-medium">
                    {user.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-neutral-200 pt-6">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Account Information</h3>
          <p className="text-blue-800 text-sm">
            For profile picture, name, or email changes, contact your organization administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
