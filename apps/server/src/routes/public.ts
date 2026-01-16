import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { AvailabilityService } from '../services/availability.service.js'
import type { BookingService } from '../services/booking.service.js'
import type { createOrgService } from '../services/org.service.js'
import type { createEmbedConfigService } from '../services/embed-config.service.js'

const PublicBookingSchema = z.object({
  siteId: z.string(),
  slotId: z.string(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
  token: z.string().optional(),
})

export async function registerPublicRoutes(
  fastify: FastifyInstance,
  orgService: ReturnType<typeof createOrgService>,
  availabilityService: AvailabilityService,
  bookingService: BookingService,
  embedConfigService?: ReturnType<typeof createEmbedConfigService>
) {
  const ensureEmbedAccess = async (
    request: FastifyRequest,
    siteId: string,
    token?: string
  ) => {
    if (!token || !embedConfigService) return

    const config = await embedConfigService.getByToken(token)
    if (!config) {
      const error = new Error('Invalid embed token') as Error & { statusCode?: number }
      error.statusCode = 403
      throw error
    }

    if (config.siteId !== siteId) {
      const error = new Error('Embed token does not match site') as Error & { statusCode?: number }
      error.statusCode = 403
      throw error
    }

    if (config.allowDomains && config.allowDomains.length > 0) {
      const origin = request.headers.origin || request.headers.referer
      if (!origin) {
        const error = new Error('Embed origin required') as Error & { statusCode?: number }
        error.statusCode = 403
        throw error
      }

      const hostname = new URL(origin).hostname
      if (!config.allowDomains.includes(hostname)) {
        const error = new Error('Embed origin not allowed') as Error & { statusCode?: number }
        error.statusCode = 403
        throw error
      }
    }
  }
  fastify.get<{
    Params: { siteId: string }
    Querystring: { token?: string }
  }>(
    '/api/public/sites/:siteId/info',
    async (request: FastifyRequest<{ Params: { siteId: string }; Querystring: { token?: string } }>, reply: FastifyReply) => {
      try {
        const { siteId } = request.params
        const { token } = request.query

        await ensureEmbedAccess(request, siteId, token)
        const site = await orgService.getSiteById(siteId)

        if (!site) {
          return reply.status(404).send({
            error: 'Site not found',
            code: 'SITE_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send({
          data: {
            id: site.id,
            name: site.name,
            address: site.address,
            timezone: site.timezone,
          },
        })
      } catch (error: any) {
        if (error?.statusCode === 403) {
          return reply.status(403).send({
            error: error.message || 'Forbidden',
            code: 'EMBED_FORBIDDEN',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }
        return reply.status(500).send({
          error: 'Failed to load site info',
          code: 'SITE_INFO_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  fastify.get<{
    Params: { siteId: string }
    Querystring: { date?: string; startDate?: string; endDate?: string; token?: string }
  }>(
    '/api/public/sites/:siteId/availability',
    async (
      request: FastifyRequest<{ Params: { siteId: string }; Querystring: { date?: string; startDate?: string; endDate?: string; token?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { siteId } = request.params
        const { date, startDate, endDate, token } = request.query

        await ensureEmbedAccess(request, siteId, token)

        const rangeStart = startDate || date
        const rangeEnd = endDate || date

        if (!rangeStart || !rangeEnd) {
          return reply.status(400).send({
            error: 'date or startDate/endDate is required',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const slots = await availabilityService.getSlotsForDateRange(siteId, rangeStart, rangeEnd)
        const available = slots.filter((slot) => availabilityService.isSlotAvailable(slot))

        return reply.status(200).send({
          data: available,
          total: available.length,
        })
      } catch (error: any) {
        if (error?.statusCode === 403) {
          return reply.status(403).send({
            error: error.message || 'Forbidden',
            code: 'EMBED_FORBIDDEN',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }
        return reply.status(500).send({
          error: 'Failed to load availability',
          code: 'AVAILABILITY_PUBLIC_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  fastify.post<{
    Body: z.infer<typeof PublicBookingSchema>
  }>(
    '/api/public/bookings',
    async (request: FastifyRequest<{ Body: z.infer<typeof PublicBookingSchema> }>, reply: FastifyReply) => {
      try {
        const parsed = PublicBookingSchema.safeParse(request.body)
        if (!parsed.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + parsed.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const { siteId, slotId, token } = parsed.data

        await ensureEmbedAccess(request, siteId, token)
        const slot = await availabilityService.getSlot(slotId)

        if (!slot) {
          return reply.status(404).send({
            error: 'Availability slot not found',
            code: 'SLOT_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        if (slot.siteId !== siteId) {
          return reply.status(400).send({
            error: 'Slot does not belong to this site',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        if (!availabilityService.isSlotAvailable(slot)) {
          return reply.status(409).send({
            error: 'This time slot is fully booked',
            code: 'SLOT_UNAVAILABLE',
            statusCode: 409,
            timestamp: new Date().toISOString(),
          })
        }

        const booking = await bookingService.createBooking(
          slot.orgId,
          siteId,
          slot.id,
          parsed.data,
          slot
        )

        return reply.status(201).send(booking)
      } catch (error: any) {
        if (error?.statusCode === 403) {
          return reply.status(403).send({
            error: error.message || 'Forbidden',
            code: 'EMBED_FORBIDDEN',
            statusCode: 403,
            timestamp: new Date().toISOString(),
          })
        }
        return reply.status(500).send({
          error: 'Failed to create booking',
          code: 'PUBLIC_BOOKING_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
