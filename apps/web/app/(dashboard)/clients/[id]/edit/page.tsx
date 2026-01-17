'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
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
}

export default function ClientEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { call } = useApi()
  const clientId = params.id as string

  const isStaff = (user?.roles || []).some((role) => role === 'ADMIN' || role === 'STAFF')

  const [formData, setFormData] = useState<Partial<ClientProfile>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Fetch client profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['client-profile', clientId],
    queryFn: async () => {
      return await call(`/api/v1/client-profiles/${clientId}`)
    },
    enabled: isStaff,
  })

  const client = profileData?.data

  // Fetch custom field definitions
  const { data: fieldsData } = useQuery({
    queryKey: ['client-field-definitions', user?.orgId],
    queryFn: async () => {
      return await call(`/api/v1/orgs/${user?.orgId}/client-fields`)
    },
    enabled: isStaff && !!user?.orgId,
  })

  const customFieldDefinitions = fieldsData?.data || []

  useEffect(() => {
    if (client) {
      setFormData(client)
    }
  }, [client])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value,
      },
    }))
  }

  const handleSave = async () => {
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      alert('First name and last name are required')
      return
    }

    setIsSaving(true)
    try {
      await call(`/api/v1/client-profiles/${clientId}`, {
        method: 'PUT',
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          address: formData.address,
          emergencyContact: formData.emergencyContact,
          medicalHistory: formData.medicalHistory,
          notes: formData.notes,
          status: formData.status,
          customFields: formData.customFields,
        },
      })
      alert('Client profile saved successfully!')
      router.push(`/clients/${clientId}`)
    } catch (error) {
      console.error('Failed to save client:', error)
      alert('Failed to save client profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isStaff) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Access Denied</p>
        <p className="text-sm text-red-700 mt-2">Only staff members can edit client profiles.</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Client</h1>
          <p className="mt-2 text-gray-600">{formData.clientEmail}</p>
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition-colors"
        >
          ← Cancel
        </Link>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
        className="bg-white rounded-lg border border-gray-200 p-6 space-y-6"
      >
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName || ''}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName || ''}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.clientEmail || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth?.split('T')[0] || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status || 'active'}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Contact Information */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact
              </label>
              <input
                type="text"
                name="emergencyContact"
                value={formData.emergencyContact || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Health Information */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical History
              </label>
              <textarea
                name="medicalHistory"
                value={formData.medicalHistory || ''}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter any relevant medical history..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add any additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        {customFieldDefinitions.length > 0 && (
          <>
            <hr className="border-gray-200" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Fields</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customFieldDefinitions.map((field: any) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {field.fieldName}
                      {field.required && <span className="text-red-600"> *</span>}
                    </label>
                    {field.fieldType === 'text' && (
                      <input
                        type="text"
                        value={formData.customFields?.[field.fieldName] || ''}
                        onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                    {field.fieldType === 'number' && (
                      <input
                        type="number"
                        value={formData.customFields?.[field.fieldName] || ''}
                        onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                    {field.fieldType === 'date' && (
                      <input
                        type="date"
                        value={formData.customFields?.[field.fieldName]?.split('T')[0] || ''}
                        onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                    {field.fieldType === 'select' && (
                      <select
                        value={formData.customFields?.[field.fieldName] || ''}
                        onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select an option</option>
                        {field.options?.map((option: string) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                    {field.fieldType === 'checkbox' && (
                      <input
                        type="checkbox"
                        checked={formData.customFields?.[field.fieldName] || false}
                        onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.checked)}
                        className="h-4 w-4 border-gray-300 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                    {field.fieldType === 'textarea' && (
                      <textarea
                        value={formData.customFields?.[field.fieldName] || ''}
                        onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/clients/${clientId}`}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
