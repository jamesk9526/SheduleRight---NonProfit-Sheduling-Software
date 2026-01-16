import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { AvailabilityService } from '../services/availability.service.js'
import { CreateAvailabilitySchema } from '../services/availability.service.js'
import { authMiddleware, requireRole, enforceTenancy } from '../middleware/auth.js'

/**
 * Availability Routes
 * 
 * Endpoints:
 * - POST /api/v1/sites/:siteId/availability - Create availability slot (STAFF+)
 * - GET /api/v1/sites/:siteId/availability - List availability slots
 * - GET /api/v1/sites/:siteId/availability/:slotId - Get slot details
 * - DELETE /api/v1/sites/:siteId/availability/:slotId - Deactivate slot (STAFF+)
 * - GET /api/v1/sites/:siteId/availability/available?date=YYYY-MM-DD - Get available slots for date
 */

export async function registerAvailabilityRoutes(
  fastify: FastifyInstance,
  availabilityService: AvailabilityService
) {
  /**
   * POST /api/v1/sites/:siteId/availability
   * Create new availability slot
   * RBAC: STAFF or ADMIN
   */
  fastify.post<{
    Params: { siteId: string }
    Body: z.infer<typeof CreateAvailabilitySchema>
  }>(
    '/api/v1/sites/:siteId/availability',
    {
      preHandler: [authMiddleware, requireRole('STAFF')],
    },
    async (request: FastifyRequest<{ Params: { siteId: string }; Body: z.infer<typeof CreateAvailabilitySchema> }>, reply: FastifyReply) => {
      try {
        const { siteId } = request.params as { siteId: string }
        const orgId = request.user?.orgId

        if (!orgId) {
          return reply.status(401).send({
            error: 'Organization not determined',
            code: 'INVALID_ORG',
            statusCode: 401,
            timestamp: new Date().toISOString(),
          })
        }

        // Validate request body
        const validationResult = CreateAvailabilitySchema.safeParse(request.body)
        if (!validationResult.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + validationResult.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        // Ensure siteId in params matches body
        if (validationResult.data.siteId !== siteId) {
          return reply.status(400).send({
            error: 'Site ID mismatch',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const slot = await availabilityService.createSlot(orgId, validationResult.data)

        return reply.status(201).send(slot)
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('End time') || error.message.includes('required')) {
            return reply.status(400).send({
              error: error.message,
              code: 'VALIDATION_ERROR',
              statusCode: 400,
              timestamp: new Date().toISOString(),
            })
          }
        }

        console.error('Create availability error:', error)
        return reply.status(500).send({
          error: 'Failed to create availability slot',
          code: 'AVAILABILITY_CREATE_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/sites/:siteId/availability
   * List availability slots for a site
   * RBAC: Any authenticated user
   */
  fastify.get<{
    Params: { siteId: string }
  }>(
    '/api/v1/sites/:siteId/availability',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) => {
      try {
        const { siteId } = request.params as { siteId: string }

        const slots = await availabilityService.getSlotsForSite(siteId)

        return reply.status(200).send({
          data: slots,
          total: slots.length,
        })
      } catch (error) {
        console.error('List availability error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve availability slots',
          code: 'AVAILABILITY_LIST_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/sites/:siteId/availability/:slotId
   * Get single slot details
   * RBAC: Any authenticated user
   */
  fastify.get<{
    Params: { siteId: string; slotId: string }
  }>(
    '/api/v1/sites/:siteId/availability/:slotId',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { siteId: string; slotId: string } }>, reply: FastifyReply) => {
      try {
        const { slotId } = request.params as { slotId: string }

        const slot = await availabilityService.getSlot(slotId)

        if (!slot) {
          return reply.status(404).send({
            error: 'Availability slot not found',
            code: 'SLOT_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send(slot)
      } catch (error) {
        console.error('Get availability error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve availability slot',
          code: 'AVAILABILITY_GET_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/sites/:siteId/availability/available?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   * Get available slots for a date range
   * RBAC: Any authenticated user
   */
  fastify.get<{
    Params: { siteId: string }
    Querystring: { startDate?: string; endDate?: string }
  }>(
    '/api/v1/sites/:siteId/availability/available',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { siteId: string }; Querystring: { startDate?: string; endDate?: string } }>, reply: FastifyReply) => {
      try {
        const { siteId } = request.params as { siteId: string }
        const { startDate = '', endDate = '' } = request.query as { startDate?: string; endDate?: string }

        if (!startDate || !endDate) {
          return reply.status(400).send({
            error: 'startDate and endDate query parameters are required',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const slots = await availabilityService.getSlotsForDateRange(siteId, startDate, endDate)
        const availableSlots = slots.filter(slot => availabilityService.isSlotAvailable(slot))

        return reply.status(200).send({
          data: availableSlots,
          total: availableSlots.length,
        })
      } catch (error) {
        console.error('Get available slots error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve available slots',
          code: 'AVAILABILITY_GET_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * DELETE /api/v1/sites/:siteId/availability/:slotId
   * Deactivate (soft delete) an availability slot
   * RBAC: STAFF or ADMIN
   */
  fastify.delete<{
    Params: { siteId: string; slotId: string }
  }>(
    '/api/v1/sites/:siteId/availability/:slotId',
    {
      preHandler: [authMiddleware, requireRole('STAFF')],
    },
    async (request: FastifyRequest<{ Params: { siteId: string; slotId: string } }>, reply: FastifyReply) => {
      try {
        const { slotId } = request.params as { slotId: string }

        await availabilityService.deactivateSlot(slotId)

        return reply.status(200).send({
          message: 'Availability slot deactivated',
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Slot not found') {
            return reply.status(404).send({
              error: 'Availability slot not found',
              code: 'SLOT_NOT_FOUND',
              statusCode: 404,
              timestamp: new Date().toISOString(),
            })
          }
        }

        console.error('Delete availability error:', error)
        return reply.status(500).send({
          error: 'Failed to deactivate availability slot',
          code: 'AVAILABILITY_DELETE_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
