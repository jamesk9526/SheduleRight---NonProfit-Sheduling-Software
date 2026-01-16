import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { createReminderService } from '../services/reminder.service.js'
import { ReminderSettingsSchema } from '../services/reminder.service.js'
import { config } from '../config.js'
import twilio from 'twilio'

/**
 * SMS Send Request Schema
 * Validates incoming SMS send requests
 */
const SmsSendSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid E.164 phone number format'),
  message: z.string().min(1).max(160, 'Message must be 160 characters or less'),
  bookingId: z.string().optional(),
})

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

  /**
   * POST /api/v1/reminders/send
   * Send SMS reminder to a phone number
   * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
   */
  fastify.post('/api/v1/reminders/send', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      // Check if Twilio is configured
      if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
        return reply.status(503).send({
          error: 'Twilio is not configured',
          code: 'TWILIO_NOT_CONFIGURED',
          statusCode: 503,
          timestamp: new Date().toISOString(),
          details: {
            missingConfig: [
              !config.twilioAccountSid && 'TWILIO_ACCOUNT_SID',
              !config.twilioAuthToken && 'TWILIO_AUTH_TOKEN',
              !config.twilioPhoneNumber && 'TWILIO_PHONE_NUMBER',
            ].filter(Boolean),
          },
        })
      }

      // Validate request body
      const parsed = SmsSendSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const { phoneNumber, message, bookingId } = parsed.data

      try {
        // Initialize Twilio client
        const twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken)

        // Send SMS
        const result = await twilioClient.messages.create({
          body: message,
          from: config.twilioPhoneNumber,
          to: phoneNumber,
        })

        return reply.status(200).send({
          success: true,
          messageId: result.sid,
          status: result.status,
          phoneNumber: result.to,
          message: result.body,
          bookingId: bookingId || null,
          sentAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        })
      } catch (twilioError: any) {
        console.error('Twilio API error:', twilioError)
        return reply.status(400).send({
          error: 'Failed to send SMS via Twilio',
          code: 'TWILIO_SMS_FAILED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          details: {
            twilioErrorCode: twilioError.code,
            twilioErrorMessage: twilioError.message,
          },
        })
      }
    } catch (error) {
      console.error('Send SMS error:', error)
      return reply.status(500).send({
        error: 'Failed to process SMS request',
        code: 'SMS_SEND_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  /**
   * GET /api/v1/reminders/twilio-status
   * Check if Twilio is properly configured
   * Useful for UI to display connection status
   */
  fastify.get('/api/v1/reminders/twilio-status', { preHandler: [authMiddleware] }, async (request, reply) => {
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

      const isConfigured = !!(config.twilioAccountSid && config.twilioAuthToken && config.twilioPhoneNumber)
      const settings = await reminderService.getSettings(orgId)

      return reply.status(200).send({
        twilioConfigured: isConfigured,
        remindersEnabled: settings.enabled,
        phoneNumber: isConfigured ? config.twilioPhoneNumber : null,
        message: isConfigured ? 'Twilio SMS configured and ready' : 'Twilio SMS not configured',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Twilio status check error:', error)
      return reply.status(500).send({
        error: 'Failed to check Twilio status',
        code: 'TWILIO_STATUS_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })
}
