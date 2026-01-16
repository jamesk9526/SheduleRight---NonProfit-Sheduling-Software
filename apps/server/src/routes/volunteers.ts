import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { createVolunteerService } from '../services/volunteer.service.js'
import { CreateShiftSchema, CreateVolunteerSchema } from '../services/volunteer.service.js'

export async function registerVolunteerRoutes(
  fastify: FastifyInstance,
  volunteerService: ReturnType<typeof createVolunteerService>
) {
  fastify.get('/api/v1/volunteers', { preHandler: [authMiddleware] }, async (request, reply) => {
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

      const volunteers = await volunteerService.listVolunteers(orgId)
      return reply.status(200).send({ data: volunteers, total: volunteers.length })
    } catch (error) {
      console.error('List volunteers error:', error)
      return reply.status(500).send({
        error: 'Failed to list volunteers',
        code: 'VOLUNTEER_LIST_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.post<{ Body: z.infer<typeof CreateVolunteerSchema> }>(
    '/api/v1/volunteers',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
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

        const parsed = CreateVolunteerSchema.safeParse(request.body)
        if (!parsed.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + parsed.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const volunteer = await volunteerService.createVolunteer(orgId, parsed.data)
        return reply.status(201).send(volunteer)
      } catch (error) {
        console.error('Create volunteer error:', error)
        return reply.status(500).send({
          error: 'Failed to create volunteer',
          code: 'VOLUNTEER_CREATE_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  fastify.get('/api/v1/shifts', { preHandler: [authMiddleware] }, async (request, reply) => {
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

      const shifts = await volunteerService.listShifts(orgId)
      return reply.status(200).send({ data: shifts, total: shifts.length })
    } catch (error) {
      console.error('List shifts error:', error)
      return reply.status(500).send({
        error: 'Failed to list shifts',
        code: 'SHIFT_LIST_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.post<{ Body: z.infer<typeof CreateShiftSchema> }>(
    '/api/v1/shifts',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
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

        const parsed = CreateShiftSchema.safeParse(request.body)
        if (!parsed.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + parsed.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const shift = await volunteerService.createShift(orgId, parsed.data)
        return reply.status(201).send(shift)
      } catch (error) {
        console.error('Create shift error:', error)
        return reply.status(500).send({
          error: 'Failed to create shift',
          code: 'SHIFT_CREATE_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  fastify.post<{ Params: { shiftId: string }; Body: { volunteerIds: string[] } }>(
    '/api/v1/shifts/:shiftId/assign',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const orgId = request.user?.orgId
        const { shiftId } = request.params

        if (!orgId) {
          return reply.status(400).send({
            error: 'Missing organization context',
            code: 'ORG_CONTEXT_REQUIRED',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const parsed = z.object({ volunteerIds: z.array(z.string()) }).safeParse(request.body)
        if (!parsed.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + parsed.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const shift = await volunteerService.assignVolunteers(shiftId, orgId, parsed.data.volunteerIds)
        return reply.status(200).send(shift)
      } catch (error: any) {
        console.error('Assign volunteers error:', error)
        const status = error?.statusCode === 404 ? 404 : 500
        return reply.status(status).send({
          error: status === 404 ? 'Shift not found' : 'Failed to assign volunteers',
          code: status === 404 ? 'SHIFT_NOT_FOUND' : 'SHIFT_ASSIGN_FAILED',
          statusCode: status,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
