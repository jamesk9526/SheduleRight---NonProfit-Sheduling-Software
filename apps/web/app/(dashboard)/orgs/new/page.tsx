'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCurrentUser, useCreateOrganization } from '@/lib/hooks/useData'

export default function NewOrgPage() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const { mutate: createOrg, isPending: isCreating } = useCreateOrganization()

  const [formData, setFormData] = useState({
    name: '',
    timezone: 'US/Eastern',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    createOrg(
      {
        name: formData.name,
        timezone: formData.timezone,
      },
      {
        onSuccess: () => {
          router.push('/orgs')
        },
        onError: (error) => {
          console.error('Failed to create organization:', error)
          alert('Failed to create organization. Please try again.')
        },
      }
    )
  }

  // Only admins can create organizations
  if (user && !(user.roles || []).includes('ADMIN')) {
    return (
      <div className="container mt-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-yellow-800 font-semibold mb-2">Access Denied</h2>
          <p className="text-yellow-700">Only administrators can create organizations.</p>
          <button
            onClick={() => router.push('/orgs')}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Back to Organizations
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-12">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/orgs')}
          className="text-primary-600 hover:text-primary-700 font-medium mb-6 flex items-center"
        >
          ← Back to Organizations
        </button>

        <div className="bg-white rounded-lg shadow-md border border-neutral-200 p-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">Create New Organization</h1>
          <p className="text-neutral-600 mb-8">
            Set up a new nonprofit organization in the system
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Name */}
            <div>
              <label htmlFor="org-name" className="block text-sm font-semibold text-neutral-700 mb-2">
                Organization Name *
              </label>
              <input
                id="org-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Community Center, Food Bank, Shelter"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900"
                required
              />
              <p className="mt-1 text-sm text-neutral-500">
                The official name of your nonprofit organization
              </p>
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="org-timezone" className="block text-sm font-semibold text-neutral-700 mb-2">
                Default Timezone
              </label>
              <select
                id="org-timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900"
              >
                <option value="US/Eastern">Eastern Time (ET)</option>
                <option value="US/Central">Central Time (CT)</option>
                <option value="US/Mountain">Mountain Time (MT)</option>
                <option value="US/Pacific">Pacific Time (PT)</option>
                <option value="UTC">UTC</option>
              </select>
              <p className="mt-1 text-sm text-neutral-500">
                Used for scheduling and reporting
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Create your organization</li>
                <li>✓ Add sites (locations) to your organization</li>
                <li>✓ Invite team members</li>
                <li>✓ Set up availability and booking</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-4 border-t border-neutral-200 pt-6">
              <button
                type="button"
                onClick={() => router.push('/orgs')}
                className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !formData.name.trim()}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium disabled:bg-neutral-400 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
