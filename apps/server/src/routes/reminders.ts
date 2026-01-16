import type { FastifyInstance } from 'fastify'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { createReminderService } from '../services/reminder.service.js'
import { ReminderSettingsSchema } from '../services/reminder.service.js'

export async function registerReminderRoutes(
  fastify: FastifyInstance,
  reminderService: ReturnType<typeof createReminderService>
) {
  fastify.get('/api/v1/reminders/settings', { preHandler: [authMiddleware] }, async (request, reply) => {
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

      const settings = await reminderService.getSettings(orgId)
      return reply.status(200).send(settings)
    } catch (error) {
      console.error('Get reminder settings error:', error)
      return reply.status(500).send({
        error: 'Failed to load reminder settings',
        code: 'REMINDER_SETTINGS_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.put('/api/v1/reminders/settings', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
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

      const parsed = ReminderSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const updated = await reminderService.updateSettings(orgId, parsed.data)
      return reply.status(200).send(updated)
    } catch (error) {
      console.error('Update reminder settings error:', error)
      return reply.status(500).send({
        error: 'Failed to update reminder settings',
        code: 'REMINDER_SETTINGS_UPDATE_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })
}
