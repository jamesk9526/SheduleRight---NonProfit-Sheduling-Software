'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'

interface CustomFieldDefinition {
  id: string
  fieldName: string
  fieldType: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea'
  required: boolean
  options?: string[]
  displayOrder: number
  createdAt: string
}

export default function ClientFieldsPage() {
  const { user } = useAuth()
  const { call } = useApi()

  const isAdmin = (user?.roles || []).includes('ADMIN')

  const [showNewField, setShowNewField] = useState(false)
  const [newField, setNewField] = useState({
    fieldName: '',
    fieldType: 'text' as const,
    required: false,
    options: [] as string[],
    displayOrder: 0,
  })
  const [optionInput, setOptionInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Fetch custom field definitions
  const { data: fieldsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['client-field-definitions', user?.orgId],
    queryFn: async () => {
      return await call(`/api/v1/orgs/${user?.orgId}/client-fields`)
    },
    enabled: isAdmin && !!user?.orgId,
  })

  const fields: CustomFieldDefinition[] = (fieldsData?.data || []).map((f: any) => ({
    id: f.id,
    fieldName: f.fieldName ?? f.fieldLabel,
    fieldType: f.fieldType,
    required: f.isRequired ?? f.required,
    options: f.fieldOptions ?? f.options,
    displayOrder: f.displayOrder ?? 0,
    createdAt: f.createdAt ?? '',
  }))

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setNewField((prev) => ({
        ...prev,
        options: [...prev.options, optionInput],
      }))
      setOptionInput('')
    }
  }

  const handleRemoveOption = (index: number) => {
    setNewField((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  const handleCreateField = async () => {
    if (!newField.fieldName.trim()) {
      alert('Field name is required')
      return
    }

    if ((newField.fieldType === 'select') && newField.options.length === 0) {
      alert('Please add at least one option for select fields')
      return
    }

    setIsCreating(true)
    try {
      await call(`/api/v1/orgs/${user?.orgId}/client-fields`, {
        method: 'POST',
        body: {
          fieldName: newField.fieldName,
          fieldLabel: newField.fieldName,
          fieldType: newField.fieldType,
          fieldOptions: newField.fieldType === 'select' ? newField.options : undefined,
          isRequired: newField.required,
          displayOrder: fields.length,
        },
      })
      alert('Custom field created successfully!')
      setNewField({
        fieldName: '',
        fieldType: 'text',
        required: false,
        options: [],
        displayOrder: 0,
      })
      setShowNewField(false)
      refetch()
    } catch (error) {
      console.error('Failed to create field:', error)
      alert('Failed to create field. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Access Denied</p>
        <p className="text-sm text-red-700 mt-2">Only administrators can manage custom fields.</p>
        <Link href="/dashboard" className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Client Fields</h1>
          <p className="mt-2 text-gray-600">Manage custom fields for client profiles</p>
        </div>
        <button
          onClick={() => setShowNewField(!showNewField)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
          {showNewField ? '✕ Cancel' : '+ New Field'}
        </button>
      </div>

      {/* New Field Form */}
      {showNewField && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Create New Custom Field</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Name *
              </label>
              <input
                type="text"
                value={newField.fieldName}
                onChange={(e) => setNewField((prev) => ({ ...prev, fieldName: e.target.value }))}
                placeholder="e.g., Insurance Provider"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Type *
              </label>
              <select
                value={newField.fieldType}
                onChange={(e) =>
                  setNewField((prev) => ({
                    ...prev,
                    fieldType: e.target.value as any,
                    options: e.target.value === 'select' ? prev.options : [],
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Select / Dropdown</option>
                <option value="checkbox">Checkbox</option>
                <option value="textarea">Text Area</option>
              </select>
            </div>
          </div>

          {/* Options for select fields */}
          {newField.fieldType === 'select' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options *
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Enter an option and press Add"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddOption()
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>

                {newField.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {newField.options.map((option, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full"
                      >
                        <span>{option}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="text-indigo-600 hover:text-indigo-900 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Required checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={newField.required}
              onChange={(e) => setNewField((prev) => ({ ...prev, required: e.target.checked }))}
              className="h-4 w-4 border-gray-300 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="required" className="ml-2 text-sm font-medium text-gray-700">
              Required field
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCreateField}
              disabled={isCreating}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Field'}
            </button>
            <button
              onClick={() => setShowNewField(false)}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fields List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <p className="text-gray-600">Loading custom fields...</p>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error loading custom fields. Please try again.
        </div>
      ) : fields.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 font-medium">No custom fields yet</p>
          <p className="text-gray-500 text-sm mt-2">Create your first custom field to add extra data fields to client profiles.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Field Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Required</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fields.map((field) => (
                  <tr key={field.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{field.fieldName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {field.fieldType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {field.required ? (
                        <span className="text-red-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {field.fieldType === 'select' && field.options && (
                        <div className="flex flex-wrap gap-1">
                          {field.options.map((option) => (
                            <span
                              key={option}
                              className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      )}
                      {field.fieldType !== 'select' && '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Custom Fields Guide</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Create custom fields to store additional information about clients</li>
          <li>Fields can be text, numbers, dates, dropdowns, checkboxes, or text areas</li>
          <li>Mark fields as required to enforce data entry</li>
          <li>All organization staff can view and fill custom fields</li>
          <li>Custom fields appear in the Create Client and Edit Client forms</li>
        </ul>
      </div>
    </div>
  )
}
