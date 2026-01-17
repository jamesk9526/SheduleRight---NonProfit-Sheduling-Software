import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { DbAdapter } from '../db/adapter.js'

/**
 * Client Profile Schema - Enhanced client information
 */
export const ClientProfileSchema = z.object({
  clientEmail: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().date().optional(),
  phone: z.string().optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zipCode: z.string().max(10).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().optional(),
  medicalHistory: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  customFields: z.record(z.any()).optional(),
})

export type ClientProfile = z.infer<typeof ClientProfileSchema> & {
  id: string
  orgId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/**
 * Client Note Schema
 */
export const ClientNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  noteType: z.enum(['general', 'follow_up', 'medical', 'communication', 'appointment']).default('general'),
  tags: z.array(z.string()).optional(),
  isPrivate: z.boolean().default(false),
})

export type ClientNote = z.infer<typeof ClientNoteSchema> & {
  id: string
  clientId: string
  orgId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/**
 * Client File Schema
 */
export const ClientFileSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().max(50).optional(),
  fileSize: z.number().positive().optional(),
  mimeType: z.string().max(100),
  s3Key: z.string().optional(),
  localPath: z.string().optional(),
  category: z.string().max(50).optional(),
  description: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
})

export type ClientFile = z.infer<typeof ClientFileSchema> & {
  id: string
  clientId: string
  orgId: string
  uploadedBy: string
  uploadedAt: string
}

/**
 * Client Field Definition Schema - Custom fields per organization
 */
export const ClientFieldDefinitionSchema = z.object({
  fieldName: z.string().min(1).max(100),
  fieldLabel: z.string().min(1).max(255),
  fieldType: z.enum(['text', 'number', 'date', 'select', 'checkbox', 'textarea']).default('text'),
  fieldOptions: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().nonnegative(),
})

// Partial update schema for field definitions
export const ClientFieldUpdateSchema = z.object({
  fieldName: z.string().min(1).max(100).optional(),
  fieldLabel: z.string().min(1).max(255).optional(),
  fieldType: z.enum(['text', 'number', 'date', 'select', 'checkbox', 'textarea']).optional(),
  fieldOptions: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
})

export type ClientFieldDefinition = z.infer<typeof ClientFieldDefinitionSchema> & {
  id: string
  orgId: string
  createdAt: string
  updatedAt: string
}

/**
 * Client Profile Service
 */
export function createClientProfileService(dbAdapter: DbAdapter) {
  return {
    /**
     * Create a new client profile
     */
    async createProfile(
      orgId: string,
      userId: string,
      input: z.infer<typeof ClientProfileSchema>
    ): Promise<ClientProfile> {
      const parsed = ClientProfileSchema.parse(input)
      const now = new Date().toISOString()
      const id = `client-profile:${randomUUID()}`

      const profile: ClientProfile = {
        id,
        orgId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        ...parsed,
      }

      await dbAdapter.insert(profile)
      return profile
    },

    /**
     * Get client profile by ID
     */
    async getProfile(id: string, orgId: string): Promise<ClientProfile | null> {
      try {
        const result = await dbAdapter.find({
          selector: { _id: id, orgId },
          limit: 1,
        })
        return (result.docs[0] as ClientProfile) || null
      } catch (error) {
        return null
      }
    },

    /**
     * Get client profile by email
     */
    async getProfileByEmail(clientEmail: string, orgId: string): Promise<ClientProfile | null> {
      try {
        const result = await dbAdapter.find({
          selector: { clientEmail, orgId },
          limit: 1,
        })
        return (result.docs[0] as ClientProfile) || null
      } catch (error) {
        return null
      }
    },

    /**
     * List all client profiles for organization
     */
    async listProfiles(orgId: string, status?: string, limit: number = 100): Promise<ClientProfile[]> {
      try {
        const selector = status ? { orgId, status } : { orgId }
        const result = await dbAdapter.find({
          selector,
          limit,
        })
        return result.docs as ClientProfile[]
      } catch (error) {
        return []
      }
    },

    /**
     * Update client profile
     */
    async updateProfile(
      id: string,
      orgId: string,
      input: Partial<z.infer<typeof ClientProfileSchema>>
    ): Promise<ClientProfile> {
      const existing = await this.getProfile(id, orgId)
      if (!existing) {
        throw new Error('Client profile not found')
      }

      const parsed = ClientProfileSchema.partial().parse(input)
      const updated: ClientProfile = {
        ...existing,
        ...parsed,
        updatedAt: new Date().toISOString(),
      }

      await dbAdapter.insert(updated)
      return updated
    },

    /**
     * Add note to client profile
     */
    async addNote(
      clientId: string,
      orgId: string,
      userId: string,
      input: z.infer<typeof ClientNoteSchema>
    ): Promise<ClientNote> {
      const parsed = ClientNoteSchema.parse(input)
      const now = new Date().toISOString()
      const id = `client-note:${randomUUID()}`

      const note: ClientNote = {
        id,
        clientId,
        orgId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        ...parsed,
      }

      await dbAdapter.insert(note)
      return note
    },

    /**
     * Get notes for client
     */
    async getNotes(clientId: string, orgId: string, limit: number = 50): Promise<ClientNote[]> {
      try {
        const result = await dbAdapter.find({
          selector: { clientId, orgId },
          limit,
          sort: [{ createdAt: 'desc' }],
        })
        return result.docs as ClientNote[]
      } catch (error) {
        return []
      }
    },

    /**
     * Update note
     */
    async updateNote(
      noteId: string,
      orgId: string,
      input: Partial<z.infer<typeof ClientNoteSchema>>
    ): Promise<ClientNote> {
      try {
        const result = await dbAdapter.find({
          selector: { _id: noteId, orgId },
          limit: 1,
        })

        if (result.docs.length === 0) {
          throw new Error('Note not found')
        }

        const existing = result.docs[0] as ClientNote
        const parsed = ClientNoteSchema.partial().parse(input)
        const updated: ClientNote = {
          ...existing,
          ...parsed,
          updatedAt: new Date().toISOString(),
        }

        await dbAdapter.insert(updated)
        return updated
      } catch (error) {
        throw new Error('Failed to update note')
      }
    },

    /**
     * Delete note (soft delete - mark as deleted)
     */
    async deleteNote(noteId: string, orgId: string): Promise<void> {
      try {
        const result = await dbAdapter.find({
          selector: { _id: noteId, orgId },
          limit: 1,
        })

        if (result.docs.length > 0) {
          const existing = result.docs[0] as ClientNote
          const updated = {
            ...existing,
            _deleted: true,
            updatedAt: new Date().toISOString(),
          }
          await dbAdapter.insert(updated)
        }
      } catch (error) {
        throw new Error('Failed to delete note')
      }
    },

    /**
     * Record file attachment
     */
    async addFile(
      clientId: string,
      orgId: string,
      userId: string,
      input: z.infer<typeof ClientFileSchema>
    ): Promise<ClientFile> {
      const parsed = ClientFileSchema.parse(input)
      const now = new Date().toISOString()
      const id = `client-file:${randomUUID()}`

      const file: ClientFile = {
        id,
        clientId,
        orgId,
        uploadedBy: userId,
        uploadedAt: now,
        ...parsed,
      }

      await dbAdapter.insert(file)
      return file
    },

    /**
     * Get files for client
     */
    async getFiles(clientId: string, orgId: string, category?: string, limit: number = 100): Promise<ClientFile[]> {
      try {
        const selector = category ? { clientId, orgId, category } : { clientId, orgId }
        const result = await dbAdapter.find({
          selector,
          limit,
          sort: [{ uploadedAt: 'desc' }],
        })
        return result.docs as ClientFile[]
      } catch (error) {
        return []
      }
    },

    /**
     * Delete file (soft delete - mark as deleted)
     */
    async deleteFile(fileId: string, orgId: string): Promise<void> {
      try {
        const result = await dbAdapter.find({
          selector: { _id: fileId, orgId },
          limit: 1,
        })

        if (result.docs.length > 0) {
          const existing = result.docs[0] as ClientFile
          const updated = {
            ...existing,
            _deleted: true,
          }
          await dbAdapter.insert(updated)
        }
      } catch (error) {
        throw new Error('Failed to delete file')
      }
    },

    /**
     * Define custom field for organization
     */
    async defineField(
      orgId: string,
      input: z.infer<typeof ClientFieldDefinitionSchema>
    ): Promise<ClientFieldDefinition> {
      const parsed = ClientFieldDefinitionSchema.parse(input)
      const now = new Date().toISOString()
      const id = `client-field:${randomUUID()}`

      const fieldDef: ClientFieldDefinition = {
        id,
        orgId,
        createdAt: now,
        updatedAt: now,
        ...parsed,
      }

      await dbAdapter.insert(fieldDef)
      return fieldDef
    },

    /**
     * Get custom field definitions for organization
     */
    async getFieldDefinitions(orgId: string): Promise<ClientFieldDefinition[]> {
      try {
        const result = await dbAdapter.find({
          selector: { orgId },
          limit: 100,
          sort: [{ displayOrder: 'asc' }],
        })
        return result.docs as ClientFieldDefinition[]
      } catch (error) {
        return []
      }
    },

    /**
     * Update a custom field definition
     */
    async updateFieldDefinition(
      orgId: string,
      fieldId: string,
      updates: z.infer<typeof ClientFieldUpdateSchema>
    ): Promise<ClientFieldDefinition | null> {
      const parsed = ClientFieldUpdateSchema.parse(updates)
      try {
        const result = await dbAdapter.find({ selector: { id: fieldId, orgId }, limit: 1 })
        if (result.docs.length === 0) return null

        const existing = result.docs[0] as ClientFieldDefinition
        const now = new Date().toISOString()
        const updated: ClientFieldDefinition = {
          ...existing,
          ...parsed,
          updatedAt: now,
        }
        await dbAdapter.insert(updated)
        return updated
      } catch (error) {
        return null
      }
    },
  }
}
