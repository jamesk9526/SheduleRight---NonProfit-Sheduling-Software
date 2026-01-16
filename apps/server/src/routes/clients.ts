import type { FastifyInstance } from 'fastify'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { createBookingService, Booking } from '../services/booking.service.js'

interface ClientSummary {
  email: string
  name: string
  phone?: string
  totalBookings: number
  lastBookingAt?: string
  upcomingCount: number
  completedCount: number
  cancelledCount: number
}

function buildClientSummaries(bookings: Booking[]): ClientSummary[] {
  const summaryMap = new Map<string, ClientSummary>()

  for (const booking of bookings) {
    if (!booking.clientEmail) continue
    const key = booking.clientEmail.toLowerCase()

    const existing = summaryMap.get(key)
    const lastAt = booking.startTime || booking.createdAt
    const nextSummary: ClientSummary = existing ?? {
      email: booking.clientEmail,
      name: booking.clientName,
      phone: booking.clientPhone,
      totalBookings: 0,
      lastBookingAt: lastAt,
      upcomingCount: 0,
      completedCount: 0,
      cancelledCount: 0,
    }

    nextSummary.totalBookings += 1

    if (!nextSummary.name && booking.clientName) {
      nextSummary.name = booking.clientName
    }
    if (!nextSummary.phone && booking.clientPhone) {
      nextSummary.phone = booking.clientPhone
    }

    if (!nextSummary.lastBookingAt) {
      nextSummary.lastBookingAt = lastAt
    } else if (lastAt && new Date(lastAt).getTime() > new Date(nextSummary.lastBookingAt).getTime()) {
      nextSummary.lastBookingAt = lastAt
    }

    if (booking.status === 'completed') {
      nextSummary.completedCount += 1
    } else if (booking.status === 'cancelled') {
      nextSummary.cancelledCount += 1
    } else {
      nextSummary.upcomingCount += 1
    }

    summaryMap.set(key, nextSummary)
  }

  return Array.from(summaryMap.values()).sort((a, b) => {
    if (!a.lastBookingAt && !b.lastBookingAt) return 0
    if (!a.lastBookingAt) return 1
    if (!b.lastBookingAt) return -1
    return new Date(b.lastBookingAt).getTime() - new Date(a.lastBookingAt).getTime()
  })
}

export async function registerClientRoutes(
  fastify: FastifyInstance,
  bookingService: ReturnType<typeof createBookingService>
) {
  fastify.get('/api/v1/clients', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
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

      const bookings = await bookingService.getBookingsForOrg(orgId)
      const clients = buildClientSummaries(bookings)

      return reply.status(200).send({ data: clients, total: clients.length })
    } catch (error) {
      console.error('List clients error:', error)
      return reply.status(500).send({
        error: 'Failed to list clients',
        code: 'CLIENT_LIST_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.get(
    '/api/v1/clients/:clientEmail',
    { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] },
    async (request, reply) => {
      try {
        const orgId = request.user?.orgId
        const { clientEmail } = request.params as { clientEmail: string }

        if (!orgId) {
          return reply.status(400).send({
            error: 'Missing organization context',
            code: 'ORG_CONTEXT_REQUIRED',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const decodedEmail = decodeURIComponent(clientEmail)
        const bookings = await bookingService.getBookingsForOrgClient(orgId, decodedEmail)
        if (!bookings.length) {
          return reply.status(404).send({
            error: 'Client not found',
            code: 'CLIENT_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        const [summary] = buildClientSummaries(bookings)
        return reply.status(200).send({
          client: summary,
          bookings,
        })
      } catch (error) {
        console.error('Client detail error:', error)
        return reply.status(500).send({
          error: 'Failed to load client detail',
          code: 'CLIENT_DETAIL_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
