import type { FastifyInstance } from 'fastify'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { createPropertyService } from '../services/property.service.js'
import { PropertyTypeSchema, PropertyValueSchema } from '../services/property.service.js'
import { z } from 'zod'

const BulkValuesSchema = z.object({
  values: z.array(PropertyValueSchema).min(1),
})

export async function registerPropertyRoutes(
  fastify: FastifyInstance,
  propertyService: ReturnType<typeof createPropertyService>
) {
  fastify.get('/api/v1/properties', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const types = await propertyService.listPropertyTypes(orgId)
      return reply.status(200).send({ data: types, total: types.length })
    } catch (error) {
      console.error('List property types error:', error)
      return reply.status(500).send({
        error: 'Failed to list properties',
        code: 'PROPERTY_LIST_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.post('/api/v1/properties', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const parsed = PropertyTypeSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const type = await propertyService.createPropertyType(orgId, parsed.data)
      return reply.status(201).send(type)
    } catch (error) {
      console.error('Create property type error:', error)
      return reply.status(500).send({
        error: 'Failed to create property',
        code: 'PROPERTY_CREATE_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.put('/api/v1/properties/:propertyTypeId', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      const { propertyTypeId } = request.params as { propertyTypeId: string }

      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const parsed = PropertyTypeSchema.partial().safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const updated = await propertyService.updatePropertyType(orgId, propertyTypeId, parsed.data)
      return reply.status(200).send(updated)
    } catch (error: any) {
      const status = error?.statusCode === 404 ? 404 : 500
      return reply.status(status).send({
        error: status === 404 ? 'Property type not found' : 'Failed to update property',
        code: status === 404 ? 'PROPERTY_NOT_FOUND' : 'PROPERTY_UPDATE_FAILED',
        statusCode: status,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.delete('/api/v1/properties/:propertyTypeId', { preHandler: [authMiddleware, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      const { propertyTypeId } = request.params as { propertyTypeId: string }

      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const archived = await propertyService.archivePropertyType(orgId, propertyTypeId)
      return reply.status(200).send(archived)
    } catch (error: any) {
      const status = error?.statusCode === 404 ? 404 : 500
      return reply.status(status).send({
        error: status === 404 ? 'Property type not found' : 'Failed to delete property',
        code: status === 404 ? 'PROPERTY_NOT_FOUND' : 'PROPERTY_DELETE_FAILED',
        statusCode: status,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.get('/api/v1/entities/:entityType/:entityId/properties', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      const { entityType, entityId } = request.params as { entityType: string; entityId: string }

      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const values = await propertyService.listPropertyValues(orgId, entityType, entityId)
      return reply.status(200).send({ data: values, total: values.length })
    } catch (error) {
      console.error('List property values error:', error)
      return reply.status(500).send({
        error: 'Failed to list property values',
        code: 'PROPERTY_VALUES_LIST_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.put('/api/v1/entities/:entityType/:entityId/properties', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      const { entityType, entityId } = request.params as { entityType: string; entityId: string }

      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const parsed = BulkValuesSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      for (const entry of parsed.data.values) {
        const type = await propertyService.getPropertyTypeByPropertyId(orgId, entry.propertyId)
        if (!type) {
          return reply.status(400).send({
            error: `Unknown propertyId: ${entry.propertyId}`,
            code: 'PROPERTY_NOT_FOUND',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        if (!type.appliesTo.includes(entityType)) {
          return reply.status(400).send({
            error: `Property ${entry.propertyId} does not apply to ${entityType}`,
            code: 'PROPERTY_APPLIES_TO_MISMATCH',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        if (type.visibility === 'admin' && !request.user?.roles?.includes('ADMIN')) {
          return reply.status(403).send({
            error: `Property ${entry.propertyId} requires admin access`,
            code: 'PROPERTY_ADMIN_ONLY',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }

        const validationError = propertyService.validateValue(type, entry.value)
        if (validationError) {
          return reply.status(400).send({
            error: validationError,
            code: 'PROPERTY_VALUE_INVALID',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }
      }

      const values = await propertyService.upsertPropertyValues(
        orgId,
        entityType,
        entityId,
        parsed.data.values,
        request.user?.userId
      )
      return reply.status(200).send({ data: values, total: values.length })
    } catch (error) {
      console.error('Upsert property values error:', error)
      return reply.status(500).send({
        error: 'Failed to update property values',
        code: 'PROPERTY_VALUES_UPDATE_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.delete('/api/v1/entities/:entityType/:entityId/properties/:propertyId', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      const { entityType, entityId, propertyId } = request.params as { entityType: string; entityId: string; propertyId: string }

      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const archived = await propertyService.archivePropertyValue(orgId, entityType, entityId, propertyId)
      if (!archived) {
        return reply.status(404).send({
          error: 'Property value not found',
          code: 'PROPERTY_VALUE_NOT_FOUND',
          statusCode: 404,
          timestamp: new Date().toISOString(),
        })
      }

      return reply.status(200).send(archived)
    } catch (error) {
      console.error('Archive property value error:', error)
      return reply.status(500).send({
        error: 'Failed to delete property value',
        code: 'PROPERTY_VALUES_DELETE_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })
}
