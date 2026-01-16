import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { DbAdapter } from '../db/adapter.js'

export const PropertyVisibilitySchema = z.enum(['public', 'staff', 'admin'])
export const PropertyDataTypeSchema = z.enum([
  'string',
  'text',
  'boolean',
  'date',
  'enum',
  'multiEnum',
  'number',
  'email',
  'phone',
])

export const PropertyTypeSchema = z.object({
  propertyId: z.string().min(2),
  label: z.string().min(1),
  description: z.string().optional(),
  dataType: PropertyDataTypeSchema,
  required: z.boolean().optional(),
  defaultValue: z.any().optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      enumOptions: z.array(z.string()).optional(),
      allowMultiple: z.boolean().optional(),
    })
    .optional(),
  ui: z
    .object({
      placeholder: z.string().optional(),
      section: z.string().optional(),
      order: z.number().optional(),
      display: z.string().optional(),
    })
    .optional(),
  visibility: PropertyVisibilitySchema.default('staff').optional(),
  appliesTo: z.array(z.string()).min(1),
  isGlobal: z.boolean().optional(),
})

export const PropertyValueSchema = z.object({
  propertyId: z.string().min(1),
  value: z.any(),
})

export type PropertyTypeInput = z.infer<typeof PropertyTypeSchema>
export type PropertyValueInput = z.infer<typeof PropertyValueSchema>

export type PropertyType = PropertyTypeInput & {
  _id: string
  type: 'property_type'
  orgId: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

export type PropertyValue = PropertyValueInput & {
  _id: string
  type: 'property_value'
  orgId: string
  entityType: string
  entityId: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export function createPropertyService(db: DbAdapter) {
  const validateValue = (type: PropertyType, value: any): string | null => {
    const { dataType, validation } = type
    const isEmpty = value === null || value === undefined || value === ''

    if (type.required && isEmpty) {
      return `${type.label} is required`
    }

    if (isEmpty) return null

    switch (dataType) {
      case 'boolean':
        return typeof value === 'boolean' ? null : 'Value must be boolean'
      case 'number':
        return Number.isFinite(Number(value)) ? null : 'Value must be a number'
      case 'date':
        return isNaN(Date.parse(String(value))) ? 'Value must be a valid date' : null
      case 'enum':
        if (validation?.enumOptions && !validation.enumOptions.includes(String(value))) {
          return 'Value must be one of the allowed options'
        }
        return null
      case 'multiEnum':
        if (!Array.isArray(value)) return 'Value must be a list of options'
        if (validation?.enumOptions) {
          const invalid = value.find((entry) => !validation.enumOptions?.includes(String(entry)))
          if (invalid) return 'One or more values are not allowed'
        }
        return null
      case 'email':
        return /\S+@\S+\.\S+/.test(String(value)) ? null : 'Value must be a valid email'
      case 'phone':
        return /^\+?[0-9\s().-]{7,}$/.test(String(value)) ? null : 'Value must be a valid phone number'
      case 'text':
      case 'string':
      default:
        return typeof value === 'string' ? null : 'Value must be text'
    }
  }

  return {
    validateValue,
    async listPropertyTypes(orgId: string): Promise<PropertyType[]> {
      const result = await db.find({
        selector: {
          type: 'property_type',
          orgId,
          status: 'active',
        },
        limit: 1000,
      })
      return result.docs as PropertyType[]
    },

    async getPropertyTypeByPropertyId(orgId: string, propertyId: string): Promise<PropertyType | null> {
      const result = await db.find({
        selector: {
          type: 'property_type',
          orgId,
          propertyId,
          status: 'active',
        },
        limit: 1,
      })
      return (result.docs[0] as PropertyType) || null
    },

    async createPropertyType(orgId: string, input: PropertyTypeInput): Promise<PropertyType> {
      const now = new Date().toISOString()
      const doc: PropertyType = {
        _id: `property_type:${randomUUID()}`,
        type: 'property_type',
        orgId,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        ...input,
      }

      await db.insert(doc)
      return doc
    },

    async updatePropertyType(orgId: string, id: string, input: Partial<PropertyTypeInput>): Promise<PropertyType> {
      const existing = (await db.get(id)) as PropertyType
      if (existing.type !== 'property_type' || existing.orgId !== orgId) {
        const error = new Error('Property type not found') as Error & { statusCode?: number }
        error.statusCode = 404
        throw error
      }

      const updated: PropertyType = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
      }

      await db.insert(updated)
      return updated
    },

    async archivePropertyType(orgId: string, id: string): Promise<PropertyType> {
      const existing = (await db.get(id)) as PropertyType
      if (existing.type !== 'property_type' || existing.orgId !== orgId) {
        const error = new Error('Property type not found') as Error & { statusCode?: number }
        error.statusCode = 404
        throw error
      }

      const updated: PropertyType = {
        ...existing,
        status: 'archived',
        updatedAt: new Date().toISOString(),
      }

      await db.insert(updated)
      return updated
    },

    async listPropertyValues(orgId: string, entityType: string, entityId: string): Promise<PropertyValue[]> {
      const result = await db.find({
        selector: {
          type: 'property_value',
          orgId,
          entityType,
          entityId,
          status: 'active',
        },
        limit: 1000,
      })
      return result.docs as PropertyValue[]
    },

    async upsertPropertyValues(
      orgId: string,
      entityType: string,
      entityId: string,
      values: PropertyValueInput[],
      userId?: string
    ): Promise<PropertyValue[]> {
      const updatedValues: PropertyValue[] = []
      for (const entry of values) {
        const result = await db.find({
          selector: {
            type: 'property_value',
            orgId,
            entityType,
            entityId,
            propertyId: entry.propertyId,
            status: 'active',
          },
          limit: 1,
        })

        const now = new Date().toISOString()
        if (result.docs.length > 0) {
          const existing = result.docs[0] as PropertyValue
          const updated: PropertyValue = {
            ...existing,
            value: entry.value,
            updatedAt: now,
            updatedBy: userId,
          }
          await db.insert(updated)
          updatedValues.push(updated)
        } else {
          const doc: PropertyValue = {
            _id: `property_value:${randomUUID()}`,
            type: 'property_value',
            orgId,
            entityType,
            entityId,
            propertyId: entry.propertyId,
            value: entry.value,
            status: 'active',
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
          }
          await db.insert(doc)
          updatedValues.push(doc)
        }
      }

      return updatedValues
    },

    async archivePropertyValue(
      orgId: string,
      entityType: string,
      entityId: string,
      propertyId: string
    ): Promise<PropertyValue | null> {
      const result = await db.find({
        selector: {
          type: 'property_value',
          orgId,
          entityType,
          entityId,
          propertyId,
          status: 'active',
        },
        limit: 1,
      })

      if (result.docs.length === 0) return null

      const existing = result.docs[0] as PropertyValue
      const updated: PropertyValue = {
        ...existing,
        status: 'archived',
        updatedAt: new Date().toISOString(),
      }

      await db.insert(updated)
      return updated
    },
  }
}
