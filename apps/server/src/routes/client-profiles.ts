import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { createClientProfileService } from '../services/client-profile.service.js'
import {
  ClientProfileSchema,
  ClientNoteSchema,
  ClientFileSchema,
  ClientFieldDefinitionSchema,
  ClientFieldUpdateSchema,
} from '../services/client-profile.service.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

/**
 * Client Profile Management Routes
 * Endpoints for managing detailed client information, files, notes, and custom fields
 */
export async function registerClientProfileRoutes(
  fastify: FastifyInstance,
  clientProfileService: ReturnType<typeof createClientProfileService>
) {
  /**
   * POST /api/v1/client-profiles
   * Create new client profile
   * RBAC: ADMIN, STAFF
   */
  fastify.post(
    '/api/v1/client-profiles',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const orgId = request.user?.orgId
        const userId = request.user?.userId

        if (!orgId || !userId) {
          return reply.status(400).send({
            error: 'Missing organization or user context',
            code: 'CONTEXT_MISSING',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const input = ClientProfileSchema.parse(request.body)
        const profile = await clientProfileService.createProfile(orgId, userId, input)

        return reply.status(201).send(profile)
      } catch (error) {
        const message = error instanceof z.ZodError ? error.errors[0].message : 'Failed to create client profile'
        return reply.status(400).send({
          error: message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/client-profiles/:id
   * Get client profile by ID
   * RBAC: ADMIN, STAFF
   */
  fastify.get(
    '/api/v1/client-profiles/:id',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string }
        const orgId = request.user?.orgId

        if (!orgId) {
          return reply.status(400).send({
            error: 'Missing organization context',
            code: 'ORG_CONTEXT_MISSING',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const profile = await clientProfileService.getProfile(id, orgId)

        if (!profile) {
          return reply.status(404).send({
            error: 'Client profile not found',
            code: 'PROFILE_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send(profile)
      } catch (error) {
        console.error('Get profile error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve client profile',
          code: 'PROFILE_FETCH_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/client-profiles
   * List client profiles for organization
   * RBAC: ADMIN, STAFF
   */
  fastify.get(
    '/api/v1/client-profiles',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const orgId = request.user?.orgId
        const { status } = request.query as { status?: string }

        if (!orgId) {
          return reply.status(400).send({
            error: 'Missing organization context',
            code: 'ORG_CONTEXT_MISSING',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const profiles = await clientProfileService.listProfiles(orgId, status)

        return reply.status(200).send({
          data: profiles,
          total: profiles.length,
        })
      } catch (error) {
        console.error('List profiles error:', error)
        return reply.status(500).send({
          error: 'Failed to list client profiles',
          code: 'PROFILE_LIST_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * PUT /api/v1/client-profiles/:id
   * Update client profile
   * RBAC: ADMIN, STAFF
   */
  fastify.put(
    '/api/v1/client-profiles/:id',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string }
        const orgId = request.user?.orgId

        if (!orgId) {
          return reply.status(400).send({
            error: 'Missing organization context',
            code: 'ORG_CONTEXT_MISSING',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const input = ClientProfileSchema.partial().parse(request.body)
        const profile = await clientProfileService.updateProfile(id, orgId, input)

        return reply.status(200).send(profile)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update client profile'
        const status = message.includes('not found') ? 404 : 400
        return reply.status(status).send({
          error: message,
          code: status === 404 ? 'PROFILE_NOT_FOUND' : 'PROFILE_UPDATE_FAILED',
          statusCode: status,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * POST /api/v1/client-profiles/:clientId/notes
   * Add note to client profile
   * RBAC: ADMIN, STAFF
   */
  fastify.post(
    '/api/v1/client-profiles/:clientId/notes',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const { clientId } = request.params as { clientId: string }
        const orgId = request.user?.orgId
        const userId = request.user?.userId

        if (!orgId || !userId) {
          return reply.status(400).send({
            error: 'Missing organization or user context',
            code: 'CONTEXT_MISSING',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const input = ClientNoteSchema.parse(request.body)
        const note = await clientProfileService.addNote(clientId, orgId, userId, input)

        return reply.status(201).send(note)
      } catch (error) {
        const message = error instanceof z.ZodError ? error.errors[0].message : 'Failed to add note'
        return reply.status(400).send({
          error: message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/client-profiles/:clientId/notes
   * Get notes for client
   * RBAC: ADMIN, STAFF
   */
  fastify.get(
    '/api/v1/client-profiles/:clientId/notes',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const { clientId } = request.params as { clientId: string }
        const orgId = request.user?.orgId

        if (!orgId) {
          return reply.status(400).send({
            error: 'Missing organization context',
            code: 'ORG_CONTEXT_MISSING',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const notes = await clientProfileService.getNotes(clientId, orgId)

        return reply.status(200).send({
          data: notes,
          total: notes.length,
        })
      } catch (error) {
        console.error('Get notes error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve notes',
          code: 'NOTES_FETCH_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * POST /api/v1/client-profiles/:clientId/files
   * Upload/record file for client
   * RBAC: ADMIN, STAFF
   */
  fastify.post(
    '/api/v1/client-profiles/:clientId/files',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const { clientId } = request.params as { clientId: string }
        const orgId = request.user?.orgId
        const userId = request.user?.userId

        if (!orgId || !userId) {
          return reply.status(400).send({
            error: 'Missing organization or user context',
            code: 'CONTEXT_MISSING',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const input = ClientFileSchema.parse(request.body)
        const file = await clientProfileService.addFile(clientId, orgId, userId, input)

        return reply.status(201).send(file)
      } catch (error) {
        const message = error instanceof z.ZodError ? error.errors[0].message : 'Failed to add file'
        return reply.status(400).send({
          error: message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/client-profiles/:clientId/files
   * Get files for client
   * RBAC: ADMIN, STAFF
   */
  fastify.get(
    '/api/v1/client-profiles/:clientId/files',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const { clientId } = request.params as { clientId: string }
        const orgId = request.user?.orgId
        const { category } = request.query as { category?: string }

        if (!orgId) {
          return reply.status(400).send({
            error: 'Missing organization context',
            code: 'ORG_CONTEXT_MISSING',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const files = await clientProfileService.getFiles(clientId, orgId, category)

        return reply.status(200).send({
          data: files,
          total: files.length,
        })
      } catch (error) {
        console.error('Get files error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve files',
          code: 'FILES_FETCH_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * POST /api/v1/orgs/:orgId/client-fields
   * Define custom field for organization
   * RBAC: ADMIN only
   */
  fastify.post(
    '/api/v1/orgs/:orgId/client-fields',
    { preHandler: [authMiddleware, requireRole('ADMIN')] },
    async (request, reply) => {
      try {
        const { orgId } = request.params as { orgId: string }
        const requestOrgId = request.user?.orgId

        if (orgId !== requestOrgId) {
          return reply.status(403).send({
            error: 'Access denied',
            code: 'ACCESS_DENIED',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }

        const input = ClientFieldDefinitionSchema.parse(request.body)
        const fieldDef = await clientProfileService.defineField(orgId, input)

        return reply.status(201).send(fieldDef)
      } catch (error) {
        const message = error instanceof z.ZodError ? error.errors[0].message : 'Failed to define field'
        return reply.status(400).send({
          error: message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/orgs/:orgId/client-fields
   * Get custom field definitions for organization
   * RBAC: ADMIN, STAFF
   */
  fastify.get(
    '/api/v1/orgs/:orgId/client-fields',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const { orgId } = request.params as { orgId: string }
        const requestOrgId = request.user?.orgId

        if (orgId !== requestOrgId) {
          return reply.status(403).send({
            error: 'Access denied',
            code: 'ACCESS_DENIED',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }

        const fields = await clientProfileService.getFieldDefinitions(orgId)

        return reply.status(200).send({
          data: fields,
          total: fields.length,
        })
      } catch (error) {
        console.error('Get fields error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve custom fields',
          code: 'FIELDS_FETCH_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * PUT /api/v1/orgs/:orgId/client-fields/:fieldId
   * Update custom field definition
   * RBAC: ADMIN only
   */
  fastify.put(
    '/api/v1/orgs/:orgId/client-fields/:fieldId',
    { preHandler: [authMiddleware, requireRole('ADMIN')] },
    async (request, reply) => {
      try {
        const { orgId, fieldId } = request.params as { orgId: string; fieldId: string }
        const requestOrgId = request.user?.orgId

        if (orgId !== requestOrgId) {
          return reply.status(403).send({
            error: 'Access denied',
            code: 'ACCESS_DENIED',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }

        const input = ClientFieldUpdateSchema.parse(request.body)
        const updated = await clientProfileService.updateFieldDefinition(orgId, fieldId, input)
        if (!updated) {
          return reply.status(404).send({
            error: 'Field not found',
            code: 'FIELD_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send(updated)
      } catch (error) {
        const message = error instanceof z.ZodError ? error.errors[0].message : 'Failed to update field'
        return reply.status(400).send({
          error: message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
