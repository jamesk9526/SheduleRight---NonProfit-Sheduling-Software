'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  tenantId: string
  settings: {
    timezone: string
    businessHours?: string
    requireVerification?: boolean
  }
  branding?: {
    logoUrl?: string
    primaryColor?: string
    secondaryColor?: string
    customDomain?: string
  }
  createdAt: string
  updatedAt: string
}

export default function OrgSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.orgId as string
  const api = useApi()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    logoUrl: '',
    primaryColor: '#4F46E5',
    secondaryColor: '#10B981',
    customDomain: '',
  })

  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Fetch organization
  const { data: org, isLoading } = useQuery({
    queryKey: ['org', orgId],
    queryFn: async () => {
      const response = await api.get(`/orgs/${orgId}`)
      const orgData = response.data as Organization
      
      // Pre-fill form with existing branding
      if (orgData.branding) {
        setFormData({
          logoUrl: orgData.branding.logoUrl || '',
          primaryColor: orgData.branding.primaryColor || '#4F46E5',
          secondaryColor: orgData.branding.secondaryColor || '#10B981',
          customDomain: orgData.branding.customDomain || '',
        })
      }
      
      return orgData
    },
    enabled: !!orgId,
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.put(`/orgs/${orgId}`, {
        branding: {
          logoUrl: data.logoUrl || undefined,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          customDomain: data.customDomain || undefined,
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId] })
      setSuccess(true)
      setError('')
      setTimeout(() => setSuccess(false), 3000)
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update branding')
      setSuccess(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    updateMutation.mutate(formData)
  }

  const handleColorChange = (field: 'primaryColor' | 'secondaryColor', value: string) => {
    // Ensure hex format
    let color = value
    if (!color.startsWith('#')) {
      color = '#' + color
    }
    setFormData({ ...formData, [field]: color.toUpperCase() })
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Loading organization settings...</p>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Organization Not Found</p>
        <Link href="/orgs" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Organizations
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Branding</h1>
          <p className="mt-2 text-gray-600">{org.name}</p>
        </div>
        <Link
          href={`/orgs/${orgId}`}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Back to Organization
        </Link>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✓ Branding updated successfully!</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">✗ {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            {/* Logo URL */}
            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <input
                type="url"
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter a public URL to your organization's logo image
              </p>
            </div>

            {/* Primary Color */}
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  id="primaryColor"
                  value={formData.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="h-12 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  pattern="^#[0-9A-F]{6}$"
                  placeholder="#4F46E5"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Main brand color (hex format, e.g., #4F46E5)
              </p>
            </div>

            {/* Secondary Color */}
            <div>
              <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  id="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="h-12 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  pattern="^#[0-9A-F]{6}$"
                  placeholder="#10B981"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Accent brand color (hex format, e.g., #10B981)
              </p>
            </div>

            {/* Custom Domain */}
            <div>
              <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Domain (Optional)
              </label>
              <input
                type="text"
                id="customDomain"
                value={formData.customDomain}
                onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                placeholder="booking.yourorganization.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Custom domain for your booking page (requires DNS configuration)
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Branding'}
              </button>
              <Link
                href={`/orgs/${orgId}`}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
            
            {/* Logo Preview */}
            {formData.logoUrl && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Logo</p>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <img
                    src={formData.logoUrl}
                    alt="Logo preview"
                    className="max-w-full h-16 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Color Swatches */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Primary Color</p>
                <div
                  className="h-16 rounded-lg border border-gray-300 flex items-center justify-center text-white font-semibold shadow-sm preview-primary"
                >
                  {formData.primaryColor}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Secondary Color</p>
                <div
                  className="h-16 rounded-lg border border-gray-300 flex items-center justify-center text-white font-semibold shadow-sm preview-secondary"
                >
                  {formData.secondaryColor}
                </div>
              </div>

              {/* Sample Button */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Button Preview</p>
                <button
                  type="button"
                  className="w-full py-3 rounded-lg text-white font-medium shadow-sm preview-primary-button"
                >
                  Book Appointment
                </button>
              </div>
            </div>

            <style jsx>{`
              .preview-primary {
                background-color: ${formData.primaryColor};
              }
              .preview-secondary {
                background-color: ${formData.secondaryColor};
              }
              .preview-primary-button {
                background-color: ${formData.primaryColor};
              }
            `}</style>

            {/* Custom Domain Preview */}
            {formData.customDomain && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Custom URL</p>
                <p className="text-sm text-indigo-600 font-mono break-all">
                  https://{formData.customDomain}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
