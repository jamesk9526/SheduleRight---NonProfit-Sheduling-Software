import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import twilio from 'twilio'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { config } from '../config.js'
import type { createBookingService } from '../services/booking.service.js'
import type { createMessagingService } from '../services/messaging.service.js'

const MessageSendSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid E.164 phone number format'),
  message: z.string().min(1).max(160, 'Message must be 160 characters or less'),
})

const TwilioStatusSchema = z.object({
  MessageSid: z.string(),
  MessageStatus: z.string(),
  ErrorMessage: z.string().optional(),
})

export async function registerMessagingRoutes(
  fastify: FastifyInstance,
  bookingService: ReturnType<typeof createBookingService>,
  messagingService: ReturnType<typeof createMessagingService>
) {
  fastify.get(
    '/api/v1/bookings/:bookingId/messages',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const bookingId = (request.params as any)?.bookingId as string
        const orgId = request.user?.orgId

        if (!orgId || !bookingId) {
          return reply.status(400).send({
            error: 'Missing organization or booking context',
            code: 'CONTEXT_REQUIRED',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const booking = await bookingService.getBooking(bookingId)
        if (!booking) {
          return reply.status(404).send({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        if (booking.orgId !== orgId) {
          return reply.status(403).send({
            error: 'Insufficient permissions',
            code: 'FORBIDDEN',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }

        const messages = await messagingService.listMessages(orgId, bookingId)
        return reply.status(200).send({ data: messages })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to load message history',
          code: 'MESSAGES_LOAD_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  fastify.post(
    '/api/v1/bookings/:bookingId/messages',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const bookingId = (request.params as any)?.bookingId as string
        const orgId = request.user?.orgId
        const senderId = request.user?.userId
        const senderRole = (request.user?.roles || [])[0] || 'STAFF'

        if (!orgId || !bookingId || !senderId) {
          return reply.status(400).send({
            error: 'Missing organization or booking context',
            code: 'CONTEXT_REQUIRED',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const booking = await bookingService.getBooking(bookingId)
        if (!booking) {
          return reply.status(404).send({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        if (booking.orgId !== orgId) {
          return reply.status(403).send({
            error: 'Insufficient permissions',
            code: 'FORBIDDEN',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }

        if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
          return reply.status(503).send({
            error: 'Twilio is not configured',
            code: 'TWILIO_NOT_CONFIGURED',
            statusCode: 503,
            timestamp: new Date().toISOString(),
          })
        }

        const parsed = MessageSendSchema.safeParse(request.body)
        if (!parsed.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + parsed.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const { phoneNumber, message } = parsed.data
        const twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken)
        const result = await twilioClient.messages.create({
          body: message,
          from: config.twilioPhoneNumber,
          to: phoneNumber,
        })

        const record = await messagingService.createMessage({
          orgId,
          bookingId,
          siteId: booking.siteId,
          senderId,
          senderRole,
          phoneNumber,
          message,
          status: result.status || 'sent',
          twilioMessageId: result.sid,
        })

        return reply.status(201).send({
          success: true,
          data: record,
        })
      } catch (error: any) {
        return reply.status(500).send({
          error: 'Failed to send message',
          code: 'MESSAGE_SEND_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  fastify.post('/api/v1/webhooks/twilio/status', async (request, reply) => {
    try {
      const parsed = TwilioStatusSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const { MessageSid, MessageStatus, ErrorMessage } = parsed.data
      const updated = await messagingService.updateStatusByTwilioSid(
        MessageSid,
        MessageStatus,
        ErrorMessage
      )

      return reply.status(200).send({
        success: true,
        updated: !!updated,
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to process Twilio webhook',
        code: 'TWILIO_WEBHOOK_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })
}
