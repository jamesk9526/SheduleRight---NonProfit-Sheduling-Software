'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCurrentUser, useShifts, useCreateShift } from '@/lib/hooks/useData'

export default function VolunteerShiftsPage() {
  const router = useRouter()
  const { data: user, isLoading } = useCurrentUser()
  const { data: shifts, isLoading: loadingShifts, isError } = useShifts()
  const createShift = useCreateShift()
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({
    title: '',
    start: '',
    end: '',
    location: '',
    capacity: 1,
  })
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

  const canManageShifts = (user.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')

  const handleCreateShift = async () => {
    setError(null)
    try {
      await createShift.mutateAsync({
        title: form.title.trim(),
        start: form.start,
        end: form.end,
        location: form.location.trim() || undefined,
        capacity: Number(form.capacity) || 1,
      })
      setForm({ title: '', start: '', end: '', location: '', capacity: 1 })
    } catch (e: any) {
      setError(e?.message || 'Failed to create shift')
    }
  }

  return (
    <div className="container mt-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <button
            onClick={() => router.push('/volunteers')}
            className="text-primary-600 hover:text-primary-700 font-medium mb-4 flex items-center"
          >
            ← Back to Volunteers
          </button>
          <h1 className="text-4xl font-bold text-primary-600">Shift Scheduling</h1>
          <p className="mt-2 text-neutral-600">Plan and assign volunteer shifts across sites</p>
        </div>
        <button
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          disabled={!canManageShifts}
          onClick={() => document.getElementById('create-shift')?.scrollIntoView({ behavior: 'smooth' })}
        >
          + Create Shift
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Shifts</h2>
          {isError && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Failed to load shifts.</div>
          )}
          {!loadingShifts && (shifts?.length ?? 0) === 0 ? (
            <div className="h-40 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center text-neutral-500">
              No shifts scheduled yet.
            </div>
          ) : (
            <div className="space-y-4">
              {(shifts || []).map((shift) => (
                <div key={shift._id} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900">{shift.title}</p>
                      <p className="text-sm text-neutral-600">
                        {new Date(shift.start).toLocaleString()} → {new Date(shift.end).toLocaleString()}
                      </p>
                      {shift.location ? <p className="text-xs text-neutral-500 mt-1">{shift.location}</p> : null}
                    </div>
                    <div className="text-sm text-neutral-600">
                      Capacity {shift.capacity} · Assigned {shift.assignedVolunteerIds?.length || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div id="create-shift" className="bg-white border border-neutral-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Create Shift</h2>
          {error && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="space-y-3">
            <input
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              disabled={!canManageShifts || createShift.isPending}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="datetime-local"
                className="border border-neutral-200 rounded-lg px-3 py-2"
                value={form.start}
                onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                disabled={!canManageShifts || createShift.isPending}
              />
              <input
                type="datetime-local"
                className="border border-neutral-200 rounded-lg px-3 py-2"
                value={form.end}
                onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                disabled={!canManageShifts || createShift.isPending}
              />
            </div>
            <input
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              placeholder="Location (optional)"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              disabled={!canManageShifts || createShift.isPending}
            />
            <input
              type="number"
              min={1}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
              disabled={!canManageShifts || createShift.isPending}
            />
            <button
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
              disabled={!canManageShifts || createShift.isPending}
              onClick={handleCreateShift}
            >
              {createShift.isPending ? 'Creating...' : 'Create Shift'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
