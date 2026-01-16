'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCurrentUser, useVolunteers, useCreateVolunteer } from '@/lib/hooks/useData'

export default function VolunteersPage() {
  const router = useRouter()
  const { data: user, isLoading } = useCurrentUser()
  const { data: volunteers, isLoading: loadingVols, isError } = useVolunteers()
  const createVolunteer = useCreateVolunteer()
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [skills, setSkills] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const canManageVolunteers = (user.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')

  const handleSubmit = async () => {
    setError(null)
    try {
      await createVolunteer.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setForm({ name: '', email: '', phone: '' })
      setSkills('')
    } catch (e: any) {
      setError(e?.message || 'Failed to create volunteer')
    }
  }

  return (
    <div className="container mt-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-primary-600">Volunteers</h1>
          <p className="mt-2 text-neutral-600">Manage volunteer profiles, availability, and assignments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/volunteers/shifts')}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition font-medium"
          >
            View Shifts
          </button>
          <button
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
            disabled={!canManageVolunteers}
            title={canManageVolunteers ? 'Invite a volunteer' : 'Only staff and admins can invite volunteers'}
          >
            + Invite Volunteer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <p className="text-sm font-medium text-neutral-500">Active Volunteers</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">{volunteers?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <p className="text-sm font-medium text-neutral-500">Upcoming Shifts</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">0</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <p className="text-sm font-medium text-neutral-500">Pending Approvals</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">0</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Volunteers</h2>
            <p className="text-sm text-neutral-600">Invite and track volunteers for your org.</p>
          </div>
          <span className="text-sm text-neutral-500">{volunteers?.length ?? 0} total</span>
        </div>

        {isError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            Failed to load volunteers.
          </div>
        )}

        {!loadingVols && (volunteers?.length ?? 0) === 0 && (
          <div className="text-center py-10 text-neutral-600">No volunteers yet.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(volunteers || []).map((vol) => (
            <div key={vol._id} className="border border-neutral-200 rounded-lg p-4">
              <p className="text-base font-semibold text-neutral-900">{vol.name}</p>
              <p className="text-sm text-neutral-600">{vol.email}</p>
              {vol.phone ? <p className="text-sm text-neutral-500 mt-1">{vol.phone}</p> : null}
              {vol.skills && vol.skills.length > 0 ? (
                <p className="text-xs text-neutral-500 mt-2">Skills: {vol.skills.join(', ')}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">Invite Volunteer</h2>
        <p className="text-sm text-neutral-600 mb-4">Send a quick invite to capture contact details.</p>
        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input
            className="border border-neutral-200 rounded-lg px-3 py-2"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={!canManageVolunteers || createVolunteer.isPending}
          />
          <input
            className="border border-neutral-200 rounded-lg px-3 py-2"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={!canManageVolunteers || createVolunteer.isPending}
          />
          <input
            className="border border-neutral-200 rounded-lg px-3 py-2"
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            disabled={!canManageVolunteers || createVolunteer.isPending}
          />
        </div>
        <input
          className="border border-neutral-200 rounded-lg px-3 py-2 w-full mb-3"
          placeholder="Skills (comma separated)"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          disabled={!canManageVolunteers || createVolunteer.isPending}
        />
        <button
          className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          onClick={handleSubmit}
          disabled={!canManageVolunteers || createVolunteer.isPending}
        >
          {createVolunteer.isPending ? 'Inviting...' : 'Invite Volunteer'}
        </button>
      </div>
    </div>
  )
}
