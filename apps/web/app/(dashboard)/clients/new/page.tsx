'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/lib/hooks/useApi'
import { useAuth } from '@/lib/hooks/useAuth'

type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea'

function InlineFieldEditor({ field, onSaved, orgId, call }: { field: any; onSaved: () => void; orgId: string; call: any }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editField, setEditField] = useState({
    fieldName: field.fieldName || field.fieldLabel || '',
    fieldType: (field.fieldType || 'text') as FieldType,
    required: !!field.required,
    options: Array.isArray(field.options) ? field.options : [],
  })
  const [optionInput, setOptionInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const addOption = () => {
    if (optionInput.trim()) {
      setEditField((prev) => ({ ...prev, options: [...prev.options, optionInput.trim()] }))
      setOptionInput('')
    }
  }
  const removeOption = (index: number) => {
    setEditField((prev) => ({ ...prev, options: prev.options.filter((_opt: string, i: number) => i !== index) }))
  }

  const save = async () => {
    setIsSaving(true)
    try {
      await call(`/api/v1/orgs/${orgId}/client-fields/${field.id}`, {
        method: 'PUT',
        body: {
          fieldName: editField.fieldName,
          fieldLabel: editField.fieldName,
          fieldType: editField.fieldType,
          fieldOptions: editField.fieldType === 'select' ? editField.options : undefined,
          isRequired: editField.required,
        },
      })
      setIsEditing(false)
      onSaved()
    } catch (e) {
      alert('Failed to save field. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <button type="button" onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-800 text-sm">
        ✎ Edit field
      </button>
    )
  }

  return (
    <div className="border border-gray-200 rounded-md p-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
          <input title="Field Name" type="text" value={editField.fieldName} onChange={(e) => setEditField((prev) => ({ ...prev, fieldName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Field Type *</label>
          <select title="Field Type" value={editField.fieldType} onChange={(e) => setEditField((prev) => ({ ...prev, fieldType: e.target.value as FieldType }))} className="w-full px-3 py-2 border border-gray-300 rounded">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Select / Dropdown</option>
            <option value="checkbox">Checkbox</option>
            <option value="textarea">Text Area</option>
          </select>
        </div>
      </div>
      {editField.fieldType === 'select' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
          <div className="flex gap-2">
            <input title="Option" type="text" value={optionInput} onChange={(e) => setOptionInput(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded" />
            <button type="button" onClick={addOption} className="px-3 py-2 bg-gray-200 rounded">Add</button>
          </div>
          {editField.options.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {editField.options.map((opt: string, idx: number) => (
                <span key={idx} className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">
                  {opt}
                  <button type="button" onClick={() => removeOption(idx)} className="font-bold">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center">
        <input type="checkbox" id={`required-${field.id}`} checked={editField.required} onChange={(e) => setEditField((prev) => ({ ...prev, required: e.target.checked }))} className="h-4 w-4 border-gray-300 rounded text-indigo-600" />
        <label htmlFor={`required-${field.id}`} className="ml-2 text-sm">Required field</label>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={isSaving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button>
        <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded">Cancel</button>
      </div>
    </div>
  )
}

export default function NewClientPage() {
  const router = useRouter()
  const { call } = useApi()
  const { user } = useAuth()
  const isAdmin = !!user?.roles?.includes('ADMIN')
  const isStaff = !!user?.roles?.includes('STAFF')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    clientEmail: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    medicalHistory: '',
    notes: '',
    status: 'active',
    customFields: {} as Record<string, any>,
  })

  const [showNewField, setShowNewField] = useState(false)
  const [newField, setNewField] = useState<{ fieldName: string; fieldType: FieldType; required: boolean; options: string[] }>({
    fieldName: '',
    fieldType: 'text',
    required: false,
    options: [],
  })
  const [optionInput, setOptionInput] = useState('')
  const [isCreatingField, setIsCreatingField] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const { data: fieldsData, refetch: refetchFields } = useQuery({
    queryKey: ['client-field-definitions', user?.orgId],
    queryFn: async () => await call(`/api/v1/orgs/${user?.orgId}/client-fields`),
    enabled: !!user?.orgId && (isStaff || isAdmin),
  })
  const rawFieldDefs = fieldsData?.data || []
  const customFieldDefinitions = rawFieldDefs.map((f: any) => ({
    id: f.id,
    fieldName: f.fieldName ?? f.fieldLabel,
    fieldLabel: f.fieldLabel ?? f.fieldName,
    fieldType: f.fieldType as FieldType,
    required: (f.isRequired ?? f.required) as boolean,
    options: (f.fieldOptions ?? f.options) as string[] | undefined,
  }))

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, [fieldName]: value },
    }))
  }

  const addNewFieldOption = () => {
    if (optionInput.trim()) {
      setNewField((prev) => ({ ...prev, options: [...prev.options, optionInput.trim()] }))
      setOptionInput('')
    }
  }
  const removeNewFieldOption = (idx: number) => {
    setNewField((prev) => ({ ...prev, options: prev.options.filter((_o, i) => i !== idx) }))
  }

  const handleCreateField = async () => {
    if (!newField.fieldName.trim()) {
      alert('Field name is required')
      return
    }
    if (newField.fieldType === 'select' && newField.options.length === 0) {
      alert('Please add at least one option for select fields')
      return
    }
    setIsCreatingField(true)
    try {
      await call(`/api/v1/orgs/${user?.orgId}/client-fields`, {
        method: 'POST',
        body: {
          fieldName: newField.fieldName,
          fieldLabel: newField.fieldName,
          fieldType: newField.fieldType,
          fieldOptions: newField.fieldType === 'select' ? newField.options : undefined,
          isRequired: newField.required,
          displayOrder: customFieldDefinitions.length,
        },
      })
      setNewField({ fieldName: '', fieldType: 'text', required: false, options: [] })
      setShowNewField(false)
      refetchFields()
    } catch (error) {
      console.error('Failed to create field:', error)
      alert('Failed to create field. Please try again.')
    } finally {
      setIsCreatingField(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.clientEmail.trim()) {
      alert('First name, last name, and email are required')
      return
    }

    setIsCreating(true)
    try {
      const response = await call('/api/v1/client-profiles', {
        method: 'POST',
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          clientEmail: formData.clientEmail,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth || undefined,
          address: formData.address,
          emergencyContact: formData.emergencyContact,
          medicalHistory: formData.medicalHistory,
          notes: formData.notes,
          status: formData.status,
          customFields: formData.customFields,
        },
      })

      if (response.data?.id) {
        router.push(`/clients/${response.data.id}`)
      }
    } catch (error) {
      console.error('Failed to create client:', error)
      alert('Failed to create client. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Client</h1>
        <Link href="/clients" className="text-indigo-600 hover:text-indigo-800">Back to Clients</Link>
      </div>

      <form onSubmit={handleCreate} className="space-y-8">
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
              <input title="First Name" type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
              <input title="Last Name" type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input title="Email" type="email" name="clientEmail" value={formData.clientEmail} onChange={handleInputChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input title="Phone" type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input title="Date of Birth" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select title="Status" name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input title="Address" type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
              <input title="Emergency Contact" type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Health Information */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
              <textarea name="medicalHistory" value={formData.medicalHistory} onChange={handleInputChange} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter any relevant medical history..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Add any additional notes..." />
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Custom Fields</h2>
            {isAdmin && (
              <button type="button" className="text-indigo-600 hover:text-indigo-800" onClick={() => setShowNewField((v) => !v)}>
                {showNewField ? 'Close' : 'Add Custom Field'}
              </button>
            )}
          </div>

          {isAdmin && showNewField && (
            <div className="border border-gray-200 rounded-md p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
                  <input title="Field Name" type="text" value={newField.fieldName} onChange={(e) => setNewField((prev) => ({ ...prev, fieldName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Type *</label>
                  <select title="Field Type" value={newField.fieldType} onChange={(e) => setNewField((prev) => ({ ...prev, fieldType: e.target.value as FieldType }))} className="w-full px-3 py-2 border border-gray-300 rounded">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="select">Select / Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="textarea">Text Area</option>
                  </select>
                </div>
              </div>
              {newField.fieldType === 'select' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                  <div className="flex gap-2">
                    <input title="Option" type="text" value={optionInput} onChange={(e) => setOptionInput(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded" />
                    <button type="button" onClick={addNewFieldOption} className="px-3 py-2 bg-gray-200 rounded">Add</button>
                  </div>
                  {newField.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newField.options.map((opt, idx) => (
                        <span key={idx} className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">
                          {opt}
                          <button type="button" onClick={() => removeNewFieldOption(idx)} className="font-bold">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center mt-3">
                <input type="checkbox" id="new-field-required" checked={newField.required} onChange={(e) => setNewField((prev) => ({ ...prev, required: e.target.checked }))} className="h-4 w-4 border-gray-300 rounded text-indigo-600" />
                <label htmlFor="new-field-required" className="ml-2 text-sm">Required field</label>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={handleCreateField} disabled={isCreatingField} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50">{isCreatingField ? 'Saving...' : 'Save Field'}</button>
                <button type="button" onClick={() => setShowNewField(false)} className="px-4 py-2 border border-gray-300 rounded">Cancel</button>
              </div>
            </div>
          )}

          {customFieldDefinitions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {customFieldDefinitions.map((field: any) => (
                <div key={field.id}>
                  {(() => {
                    const label = field.fieldLabel || field.fieldName || 'Field'
                    const nameKey = field.fieldName || (field.fieldLabel ? field.fieldLabel.replace(/\s+/g, '_').toLowerCase() : `field_${field.id}`)
                    return (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                          {label}
                    {field.required && <span className="text-red-600"> *</span>}
                        </label>
                        {isAdmin && (
                          <div className="mb-2">
                            <InlineFieldEditor field={field} onSaved={() => refetchFields()} orgId={user?.orgId as string} call={call} />
                          </div>
                        )}
                        {field.fieldType === 'text' && (
                          <input title={label} type="text" value={formData.customFields[nameKey] || ''} onChange={(e) => handleCustomFieldChange(nameKey, e.target.value)} required={field.required} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        )}
                        {field.fieldType === 'number' && (
                          <input title={label} type="number" value={formData.customFields[nameKey] || ''} onChange={(e) => handleCustomFieldChange(nameKey, e.target.value)} required={field.required} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        )}
                        {field.fieldType === 'date' && (
                          <input title={label} type="date" value={formData.customFields[nameKey] || ''} onChange={(e) => handleCustomFieldChange(nameKey, e.target.value)} required={field.required} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        )}
                        {field.fieldType === 'select' && (
                          <select title={label} value={formData.customFields[nameKey] || ''} onChange={(e) => handleCustomFieldChange(nameKey, e.target.value)} required={field.required} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">Select an option</option>
                            {field.options?.map((option: string) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                        {field.fieldType === 'checkbox' && (
                          <input aria-label={label} type="checkbox" checked={formData.customFields[nameKey] || false} onChange={(e) => handleCustomFieldChange(nameKey, e.target.checked)} className="h-4 w-4 border-gray-300 rounded text-indigo-600 focus:ring-indigo-500" />
                        )}
                        {field.fieldType === 'textarea' && (
                          <textarea title={label} value={formData.customFields[nameKey] || ''} onChange={(e) => handleCustomFieldChange(nameKey, e.target.value)} required={field.required} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        )}
                      </>
                    )
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <button type="submit" disabled={isCreating} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors">
            {isCreating ? 'Creating...' : 'Create Client'}
          </button>
          <Link href="/clients" className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

