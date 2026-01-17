'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'

interface ClientProfile {
  id: string
  clientEmail: string
  firstName: string
  lastName: string
  phone?: string
  dateOfBirth?: string
  address?: string
  emergencyContact?: string
  medicalHistory?: string
  notes?: string
  status: 'active' | 'inactive' | 'archived'
  customFields?: Record<string, any>
  createdAt: string
  updatedAt: string
  createdBy?: string
}

interface ClientNote {
  id: string
  clientId: string
  type: 'general' | 'follow_up' | 'medical' | 'communication' | 'appointment'
  content: string
  tags?: string[]
  isPrivate?: boolean
  createdAt: string
  createdBy?: string
}

interface ClientFile {
  id: string
  clientId: string
  fileName: string
  fileType: string
  fileSize: number
  category?: string
  storagePath: string
  mimeType: string
  uploadedAt: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { call } = useApi()
  const clientId = params.id as string

  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')

  // Fetch client profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['client-profile', clientId],
    queryFn: async () => {
      return await call(`/api/v1/client-profiles/${clientId}`)
    },
    enabled: isStaff,
  })

  const client: ClientProfile = profileData?.data

  // Fetch client notes
  const { data: notesData } = useQuery({
    queryKey: ['client-notes', clientId],
    queryFn: async () => {
      return await call(`/api/v1/client-profiles/${clientId}/notes`)
    },
    enabled: isStaff && !!clientId,
  })

  const notes: ClientNote[] = notesData?.data || []

  // Fetch client files
  const { data: filesData } = useQuery({
    queryKey: ['client-files', clientId],
    queryFn: async () => {
      return await call(`/api/v1/client-profiles/${clientId}/files`)
    },
    enabled: isStaff && !!clientId,
  })

  const files: ClientFile[] = filesData?.data || []

  const [activeTab, setActiveTab] = useState<'profile' | 'notes' | 'files'>('profile')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteType, setNewNoteType] = useState<'general' | 'follow_up' | 'medical' | 'communication' | 'appointment'>('general')
  const [isAddingNote, setIsAddingNote] = useState(false)

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return

    try {
      await call(`/api/v1/client-profiles/${clientId}/notes`, {
        method: 'POST',
        body: {
          type: newNoteType,
          content: newNoteContent,
          isPrivate: false,
        },
      })
      setNewNoteContent('')
      setNewNoteType('general')
      // Refetch notes
    } catch (error) {
      console.error('Failed to add note:', error)
    } finally {
      setIsAddingNote(false)
    }
  }

  if (!isStaff) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Access Denied</p>
        <p className="text-sm text-red-700 mt-2">Only staff members can view client profiles.</p>
        <Link href="/dashboard" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  if (profileLoading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-600">Loading client profile...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Client Not Found</p>
        <p className="text-sm text-red-700 mt-2">The client profile you're looking for does not exist.</p>
        <Link href="/clients" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Clients
        </Link>
      </div>
    )
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

  const NoteTypeBadge = ({ type }: { type: string }) => {
    const colors: Record<string, string> = {
      general: 'bg-blue-100 text-blue-800',
      follow_up: 'bg-purple-100 text-purple-800',
      medical: 'bg-red-100 text-red-800',
      communication: 'bg-green-100 text-green-800',
      appointment: 'bg-orange-100 text-orange-800',
    }
    const label = type.replace(/_/g, ' ').toUpperCase()
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colors[type] || colors.general}`}>
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {client.firstName} {client.lastName}
            </h1>
            <StatusBadge status={client.status} />
          </div>
          <p className="text-gray-600">{client.clientEmail}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/clients/${clientId}/edit`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Edit Profile
          </Link>
          <Link
            href="/clients"
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {(['profile', 'notes', 'files'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'profile' && '📋 Profile'}
              {tab === 'notes' && `💬 Notes (${notes.length})`}
              {tab === 'files' && `📁 Files (${files.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{client.clientEmail}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <p className="text-gray-900">{client.phone || '—'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <p className="text-gray-900">
                {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <StatusBadge status={client.status} />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Address & Emergency Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <p className="text-gray-900">{client.address || '—'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
              <p className="text-gray-900">{client.emergencyContact || '—'}</p>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Medical History */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
            <p className="text-gray-900 whitespace-pre-wrap">{client.medicalHistory || '—'}</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <p className="text-gray-900 whitespace-pre-wrap">{client.notes || '—'}</p>
          </div>

          {/* Custom Fields */}
          {client.customFields && Object.keys(client.customFields).length > 0 && (
            <>
              <hr className="border-gray-200" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(client.customFields).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <p className="text-gray-900">{String(value) || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <hr className="border-gray-200" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <label className="block text-gray-600 mb-1">Created</label>
              <p className="text-gray-900">{new Date(client.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">Last Updated</label>
              <p className="text-gray-900">{new Date(client.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add Note Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Note</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note Type</label>
                <select
                  value={newNoteType}
                  onChange={(e) => setNewNoteType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="general">General</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="medical">Medical</option>
                  <option value="communication">Communication</option>
                  <option value="appointment">Appointment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Enter your note here..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setNewNoteContent('')
                    setNewNoteType('general')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNoteContent.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isAddingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>

          {/* Notes List */}
          {notes.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No notes yet</p>
              <p className="text-gray-500 text-sm mt-2">Add a note to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <NoteTypeBadge type={note.type} />
                      <span className="text-sm text-gray-500">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {note.isPrivate && <span className="text-xs text-red-600 font-medium">🔒 Private</span>}
                  </div>
                  <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {note.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* Upload Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              📁 File upload feature coming soon. You can currently view existing files.
            </p>
          </div>

          {/* Files List */}
          {files.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No files yet</p>
              <p className="text-gray-500 text-sm mt-2">Upload files to store client documents.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {files.map((file) => (
                <div key={file.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{file.fileName}</h4>
                      {file.category && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mt-1">
                          {file.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Type: {file.mimeType}</p>
                    <p>Size: {(file.fileSize / 1024).toFixed(2)} KB</p>
                    <p>Uploaded: {new Date(file.uploadedAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
