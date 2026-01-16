import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { BookingService } from '../services/booking.service.js'
import type { AvailabilityService } from '../services/availability.service.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

/**
 * Booking Routes
 * 
 * Endpoints:
 * - POST /api/v1/sites/:siteId/bookings - Create new booking (PUBLIC)
 * - GET /api/v1/sites/:siteId/bookings - List bookings for site (STAFF+)
 * - GET /api/v1/bookings/me - Get my bookings (AUTHENTICATED)
 * - GET /api/v1/bookings/:bookingId - Get booking details
 * - PUT /api/v1/bookings/:bookingId/confirm - Confirm booking (STAFF+)
 * - PUT /api/v1/bookings/:bookingId/cancel - Cancel booking
 * - PUT /api/v1/bookings/:bookingId/complete - Mark as completed (STAFF+)
 * - PUT /api/v1/bookings/:bookingId/no-show - Mark as no-show (STAFF+)
 * - PUT /api/v1/bookings/:bookingId/notes - Update staff notes (STAFF+)
 */

const CreateBookingSchema = z.object({
  slotId: z.string(),
  clientName: z.string().min(2, 'Name must be at least 2 characters'),
  clientEmail: z.string().email('Invalid email address'),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
})

export async function registerBookingRoutes(
  fastify: FastifyInstance,
  bookingService: BookingService,
  availabilityService: AvailabilityService
) {
  /**
   * POST /api/v1/sites/:siteId/bookings
   * Create new booking
   * RBAC: PUBLIC (no auth required)
   */
  fastify.post<{
    Params: { siteId: string }
    Body: z.infer<typeof CreateBookingSchema>
  }>(
    '/api/v1/sites/:siteId/bookings',
    async (request: FastifyRequest<{ Params: { siteId: string }; Body: z.infer<typeof CreateBookingSchema> }>, reply: FastifyReply) => {
      try {
        const { siteId } = request.params as { siteId: string }

        // Validate request body
        const validationResult = CreateBookingSchema.safeParse(request.body)
        if (!validationResult.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + validationResult.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        // Get the slot
        const slot = await availabilityService.getSlot(validationResult.data.slotId)
        if (!slot) {
          return reply.status(404).send({
            error: 'Availability slot not found',
            code: 'SLOT_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        // Verify slot is for this site
        if (slot.siteId !== siteId) {
          return reply.status(400).send({
            error: 'Slot does not belong to this site',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        // Check availability
        if (!availabilityService.isSlotAvailable(slot)) {
          return reply.status(409).send({
            error: 'This time slot is fully booked',
            code: 'SLOT_UNAVAILABLE',
            statusCode: 409,
            timestamp: new Date().toISOString(),
          })
        }

        // Create booking
        const booking = await bookingService.createBooking(
          slot.orgId,
          siteId,
          slot.id,
          validationResult.data,
          slot
        )

        return reply.status(201).send(booking)
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('fully booked') || error.message.includes('no longer available')) {
            return reply.status(409).send({
              error: error.message,
              code: 'SLOT_UNAVAILABLE',
              statusCode: 409,
              timestamp: new Date().toISOString(),
            })
          }
        }

        console.error('Create booking error:', error)
        return reply.status(500).send({
          error: 'Failed to create booking',
          code: 'BOOKING_CREATE_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/sites/:siteId/bookings
   * List all bookings for a site
   * RBAC: STAFF or ADMIN
   */
  fastify.get<{
    Params: { siteId: string }
    Querystring: { status?: string }
  }>(
    '/api/v1/sites/:siteId/bookings',
    {
      preHandler: [authMiddleware, requireRole('STAFF')],
    },
    async (request: FastifyRequest<{ Params: { siteId: string }; Querystring: { status?: string } }>, reply: FastifyReply) => {
      try {
        const { siteId } = request.params as { siteId: string }
        const { status } = request.query as { status?: string }

        const bookings = await bookingService.getBookingsForSite(siteId, status)

        return reply.status(200).send({
          data: bookings,
          total: bookings.length,
        })
      } catch (error) {
        console.error('List bookings error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve bookings',
          code: 'BOOKING_LIST_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/bookings/me
   * Get current user's bookings
   * RBAC: Any authenticated user
   */
  fastify.get(
    '/api/v1/bookings/me',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const clientEmail = request.user?.email

        if (!clientEmail) {
          return reply.status(401).send({
            error: 'Email not found in token',
            code: 'UNAUTHORIZED',
            statusCode: 401,
            timestamp: new Date().toISOString(),
          })
        }

        const bookings = await bookingService.getBookingsForClient(clientEmail)

        return reply.status(200).send({
          data: bookings,
          total: bookings.length,
        })
      } catch (error) {
        console.error('Get my bookings error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve your bookings',
          code: 'BOOKING_LIST_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/bookings/:bookingId
   * Get single booking details
   * RBAC: STAFF or the booking client
   */
  fastify.get<{
    Params: { bookingId: string }
  }>(
    '/api/v1/bookings/:bookingId',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { bookingId: string } }>, reply: FastifyReply) => {
      try {
        const { bookingId } = request.params as { bookingId: string }

        const booking = await bookingService.getBooking(bookingId)

        if (!booking) {
          return reply.status(404).send({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        // Check permission: must be staff or the booking client
        const isStaff = request.user?.roles?.includes('STAFF')
        const isOwner = booking.clientEmail === request.user?.email

        if (!isStaff && !isOwner) {
          return reply.status(403).send({
            error: 'You do not have permission to view this booking',
            code: 'FORBIDDEN',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send(booking)
      } catch (error) {
        console.error('Get booking error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve booking',
          code: 'BOOKING_GET_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * PUT /api/v1/bookings/:bookingId/confirm
   * Confirm a pending booking
   * RBAC: STAFF or ADMIN
   */
  fastify.put<{
    Params: { bookingId: string }
  }>(
    '/api/v1/bookings/:bookingId/confirm',
    {
      preHandler: [authMiddleware, requireRole('STAFF')],
    },
    async (request: FastifyRequest<{ Params: { bookingId: string } }>, reply: FastifyReply) => {
      try {
        const { bookingId } = request.params as { bookingId: string }

        const booking = await bookingService.confirmBooking(bookingId)

        if (!booking) {
          return reply.status(404).send({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send(booking)
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Booking not found') {
            return reply.status(404).send({
              error: 'Booking not found',
              code: 'BOOKING_NOT_FOUND',
              statusCode: 404,
              timestamp: new Date().toISOString(),
            })
          }
        }

        console.error('Confirm booking error:', error)
        return reply.status(500).send({
          error: 'Failed to confirm booking',
          code: 'BOOKING_CONFIRM_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * PUT /api/v1/bookings/:bookingId/cancel
   * Cancel a booking
   * RBAC: STAFF or the booking client
   */
  fastify.put<{
    Params: { bookingId: string }
    Body: { reason?: string }
  }>(
    '/api/v1/bookings/:bookingId/cancel',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { bookingId: string }; Body: { reason?: string } }>, reply: FastifyReply) => {
      try {
        const { bookingId } = request.params as { bookingId: string }
        const { reason } = request.body as { reason?: string }

        // Get booking to check permissions
        const booking = await bookingService.getBooking(bookingId)
        if (!booking) {
          return reply.status(404).send({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        const isStaff = request.user?.roles?.includes('STAFF')
        const isOwner = booking.clientEmail === request.user?.email

        if (!isStaff && !isOwner) {
          return reply.status(403).send({
            error: 'You do not have permission to cancel this booking',
            code: 'FORBIDDEN',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }

        const cancelled = await bookingService.cancelBooking(bookingId, reason)

        return reply.status(200).send(cancelled)
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Cannot cancel')) {
            return reply.status(400).send({
              error: error.message,
              code: 'INVALID_STATE',
              statusCode: 400,
              timestamp: new Date().toISOString(),
            })
          }
        }

        console.error('Cancel booking error:', error)
        return reply.status(500).send({
          error: 'Failed to cancel booking',
          code: 'BOOKING_CANCEL_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * PUT /api/v1/bookings/:bookingId/complete
   * Mark booking as completed
   * RBAC: STAFF or ADMIN
   */
  fastify.put<{
    Params: { bookingId: string }
  }>(
    '/api/v1/bookings/:bookingId/complete',
    {
      preHandler: [authMiddleware, requireRole('STAFF')],
    },
    async (request: FastifyRequest<{ Params: { bookingId: string } }>, reply: FastifyReply) => {
      try {
        const { bookingId } = request.params as { bookingId: string }

        const booking = await bookingService.completeBooking(bookingId)

        if (!booking) {
          return reply.status(404).send({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send(booking)
      } catch (error) {
        console.error('Complete booking error:', error)
        return reply.status(500).send({
          error: 'Failed to complete booking',
          code: 'BOOKING_COMPLETE_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * PUT /api/v1/bookings/:bookingId/no-show
   * Mark booking as no-show
   * RBAC: STAFF or ADMIN
   */
  fastify.put<{
    Params: { bookingId: string }
  }>(
    '/api/v1/bookings/:bookingId/no-show',
    {
      preHandler: [authMiddleware, requireRole('STAFF')],
    },
    async (request: FastifyRequest<{ Params: { bookingId: string } }>, reply: FastifyReply) => {
      try {
        const { bookingId } = request.params as { bookingId: string }

        const booking = await bookingService.markNoShow(bookingId)

        if (!booking) {
          return reply.status(404).send({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send(booking)
      } catch (error) {
        console.error('Mark no-show error:', error)
        return reply.status(500).send({
          error: 'Failed to mark booking as no-show',
          code: 'BOOKING_NO_SHOW_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * PUT /api/v1/bookings/:bookingId/notes
   * Update staff notes on a booking
   * RBAC: STAFF or ADMIN
   */
  fastify.put<{
    Params: { bookingId: string }
    Body: { notes: string }
  }>(
    '/api/v1/bookings/:bookingId/notes',
    {
      preHandler: [authMiddleware, requireRole('STAFF')],
    },
    async (request: FastifyRequest<{ Params: { bookingId: string }; Body: { notes: string } }>, reply: FastifyReply) => {
      try {
        const { bookingId } = request.params as { bookingId: string }
        const { notes } = request.body as { notes: string }

        if (!notes || typeof notes !== 'string') {
          return reply.status(400).send({
            error: 'Notes field is required',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const booking = await bookingService.updateStaffNotes(bookingId, notes)

        if (!booking) {
          return reply.status(404).send({
            error: 'Booking not found',
            code: 'BOOKING_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send(booking)
      } catch (error) {
        console.error('Update notes error:', error)
        return reply.status(500).send({
          error: 'Failed to update booking notes',
          code: 'BOOKING_UPDATE_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
