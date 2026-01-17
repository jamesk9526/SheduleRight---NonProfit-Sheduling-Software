import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import type { createNotificationService } from '../services/notification.service.js'
import { NotificationPreferencesSchema } from '../services/notification.service.js'

export async function registerNotificationRoutes(
  fastify: FastifyInstance,
  notificationService: ReturnType<typeof createNotificationService>
) {
  /**
   * GET /api/v1/notifications/preferences
   * Get current user's notification preferences
   */
  fastify.get('/api/v1/notifications/preferences', { preHandler: [authMiddleware] }, async (request, reply) => {
    try {
      const userId = request.user?.userId
      const orgId = request.user?.orgId

      if (!userId || !orgId) {
        return reply.status(400).send({
          error: 'Missing user or organization context',
          code: 'CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const preferences = await notificationService.getPreferences(userId, orgId)
      return reply.status(200).send(preferences)
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to load notification preferences',
        code: 'NOTIFICATION_PREFS_LOAD_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  /**
   * PUT /api/v1/notifications/preferences
   * Update current user's notification preferences
   */
  fastify.put('/api/v1/notifications/preferences', { preHandler: [authMiddleware] }, async (request, reply) => {
    try {
      const userId = request.user?.userId
      const orgId = request.user?.orgId

      if (!userId || !orgId) {
        return reply.status(400).send({
          error: 'Missing user or organization context',
          code: 'CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const parsed = NotificationPreferencesSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const updated = await notificationService.updatePreferences(userId, orgId, parsed.data)
      return reply.status(200).send(updated)
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to update notification preferences',
        code: 'NOTIFICATION_PREFS_UPDATE_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })
}
