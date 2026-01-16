import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from '../index.js'
import type { FastifyInstance } from 'fastify'
import { generateTestOrg, generateTestUser, generateTestSite } from './test-utils.js'
import jwt from 'jsonwebtoken'

/**
 * Error Scenario Tests
 *
 * Comprehensive tests for error conditions, edge cases, and exceptional scenarios
 * - Invalid inputs and validation failures
 * - Conflict detection and prevention
 * - Capacity management edge cases
 * - State transition errors
 * - Resource not found scenarios
 */

describe('Error Scenarios & Edge Cases', () => {
  let server: FastifyInstance
  let testOrg: ReturnType<typeof generateTestOrg>
  let testSite: ReturnType<typeof generateTestSite>
  let staffToken: string
  let clientToken: string

  const SECRET_KEY = 'test-secret-key'

  beforeAll(async () => {
    server = await createServer()

    testOrg = generateTestOrg()
    testSite = generateTestSite(testOrg.id)

    const staffUser = generateTestUser({
      orgId: testOrg.id,
      roles: ['STAFF', 'ADMIN'],
    })

    const clientUser = generateTestUser({
      orgId: testOrg.id,
      roles: ['CLIENT'],
    })

    staffToken = jwt.sign(
      {
        userId: staffUser.id,
        email: staffUser.email,
        orgId: testOrg.id,
        roles: staffUser.roles,
      },
      SECRET_KEY,
      { expiresIn: '1h' }
    )

    clientToken = jwt.sign(
      {
        userId: clientUser.id,
        email: clientUser.email,
        orgId: testOrg.id,
        roles: clientUser.roles,
      },
      SECRET_KEY,
      { expiresIn: '1h' }
    )
  })

  afterAll(async () => {
    await server.close()
  })

  describe('Availability Validation Errors', () => {
    it('should reject slot with end time before start time', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Invalid Time Slot',
          startTime: '14:00',
          endTime: '09:00', // End before start
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.code).toBe('VALIDATION_ERROR')
      expect(data.message).toContain('end')
    })

    it('should reject slot with invalid time format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Invalid Format',
          startTime: '9:00', // Invalid: missing leading zero
          endTime: '10:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject slot with capacity of 0', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Zero Capacity',
          startTime: '09:00',
          endTime: '10:00',
          recurrence: 'daily',
          capacity: 0, // Invalid
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject slot with negative capacity', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Negative Capacity',
          startTime: '09:00',
          endTime: '10:00',
          recurrence: 'daily',
          capacity: -5, // Invalid
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject slot with missing required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Missing Start Time',
          // Missing startTime
          endTime: '10:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should require dayOfWeek for weekly recurrence', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Weekly No Day',
          startTime: '09:00',
          endTime: '10:00',
          recurrence: 'weekly',
          // Missing dayOfWeek
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should require specificDate for one-time recurrence', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'One-time No Date',
          startTime: '09:00',
          endTime: '10:00',
          recurrence: 'once',
          // Missing specificDate
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject invalid dayOfWeek value', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Invalid Day',
          startTime: '09:00',
          endTime: '10:00',
          recurrence: 'weekly',
          dayOfWeek: 'invalid-day', // Invalid
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject duration longer than slot time', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Duration Too Long',
          startTime: '09:00',
          endTime: '10:00', // 1 hour slot
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 120, // 2 hour duration - too long
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('Booking Validation Errors', () => {
    let slotId: string

    beforeAll(async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Booking Test Slot',
          startTime: '09:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 2,
          durationMinutes: 30,
        },
      })

      const data = JSON.parse(slotResponse.body)
      slotId = data.id
    })

    it('should reject booking with missing client name', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          // Missing clientName
          clientEmail: 'test@example.com',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject booking with invalid email format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'John Doe',
          clientEmail: 'not-an-email', // Invalid format
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject booking with non-existent slot', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId: 'non-existent-slot-id',
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
        },
      })

      expect(response.statusCode).toBe(404)
    })

    it('should reject booking for inactive slot', async () => {
      // First create and deactivate a slot
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Inactive Slot',
          startTime: '14:00',
          endTime: '15:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 60,
        },
      })

      const slotData = JSON.parse(slotResponse.body)
      const inactiveSlotId = slotData.id

      // Deactivate the slot
      await server.inject({
        method: 'PUT',
        url: `/api/v1/sites/${testSite.id}/availability/${inactiveSlotId}/deactivate`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      // Try to book the inactive slot
      const bookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId: inactiveSlotId,
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
        },
      })

      expect(bookingResponse.statusCode).toBe(409)
    })
  })

  describe('Capacity Overflow Scenarios', () => {
    let slotId: string

    beforeAll(async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Limited Capacity Slot',
          startTime: '10:00',
          endTime: '11:00',
          recurrence: 'daily',
          capacity: 2, // Only 2 slots available
          durationMinutes: 60,
        },
      })

      const data = JSON.parse(slotResponse.body)
      slotId = data.id
    })

    it('should fill all capacity slots successfully', async () => {
      const responses = []

      for (let i = 0; i < 2; i++) {
        const response = await server.inject({
          method: 'POST',
          url: `/api/v1/sites/${testSite.id}/bookings`,
          payload: {
            slotId,
            clientName: `Client ${i + 1}`,
            clientEmail: `client${i + 1}@example.com`,
          },
        })

        responses.push(response)
        expect(response.statusCode).toBe(201)
      }

      expect(responses).toHaveLength(2)
    })

    it('should reject booking when capacity exceeded', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'Overflow Client',
          clientEmail: 'overflow@example.com',
        },
      })

      expect(response.statusCode).toBe(409) // Conflict
      const data = JSON.parse(response.body)
      expect(data.code).toBe('CAPACITY_EXCEEDED')
    })
  })

  describe('Booking State Transition Errors', () => {
    let bookingId: string

    beforeAll(async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'State Transition Slot',
          startTime: '11:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 60,
        },
      })

      const slotData = JSON.parse(slotResponse.body)

      const bookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId: slotData.id,
          clientName: 'State Test',
          clientEmail: 'state@example.com',
        },
      })

      const bookingData = JSON.parse(bookingResponse.body)
      bookingId = bookingData.id
    })

    it('should confirm pending booking', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${bookingId}/confirm`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.status).toBe('confirmed')
    })

    it('should reject confirming already confirmed booking', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${bookingId}/confirm`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(409) // Conflict
    })

    it('should reject completing pending booking directly (must confirm first)', async () => {
      // Create another booking
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Complete Test Slot',
          startTime: '13:00',
          endTime: '14:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 60,
        },
      })

      const slotData = JSON.parse(slotResponse.body)

      const bookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId: slotData.id,
          clientName: 'Complete Test',
          clientEmail: 'complete@example.com',
        },
      })

      const bookingData = JSON.parse(bookingResponse.body)
      const pendingBookingId = bookingData.id

      // Try to complete pending booking
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${pendingBookingId}/complete`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect([409, 400]).toContain(response.statusCode)
    })
  })

  describe('Resource Not Found Scenarios', () => {
    it('should return 404 for non-existent site', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/sites/non-existent-site/availability',
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(404)
    })

    it('should return 404 for non-existent slot', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/availability/non-existent-slot`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(404)
    })

    it('should return 404 for non-existent booking', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/bookings/non-existent-booking',
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(404)
    })

    it('should return 404 when confirming non-existent booking', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/v1/bookings/non-existent/confirm',
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('Concurrency Edge Cases', () => {
    let slotId: string

    beforeAll(async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Concurrency Test Slot',
          startTime: '15:00',
          endTime: '16:00',
          recurrence: 'daily',
          capacity: 1, // Only 1 slot
          durationMinutes: 60,
        },
      })

      const data = JSON.parse(slotResponse.body)
      slotId = data.id
    })

    it('should handle simultaneous booking attempts correctly', async () => {
      // Simulate concurrent bookings by making rapid sequential requests
      const bookingPromises = []

      for (let i = 0; i < 3; i++) {
        const promise = server.inject({
          method: 'POST',
          url: `/api/v1/sites/${testSite.id}/bookings`,
          payload: {
            slotId,
            clientName: `Concurrent Client ${i}`,
            clientEmail: `concurrent${i}@example.com`,
          },
        })

        bookingPromises.push(promise)
      }

      const responses = await Promise.all(bookingPromises)

      // First should succeed, others should fail
      const successCount = responses.filter((r) => r.statusCode === 201).length
      const failureCount = responses.filter((r) => r.statusCode === 409).length

      expect(successCount).toBe(1)
      expect(failureCount).toBe(2)
    })
  })

  describe('Data Integrity Scenarios', () => {
    it('should maintain data consistency when cancelling bookings', async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Consistency Test Slot',
          startTime: '16:00',
          endTime: '17:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 60,
        },
      })

      const slotData = JSON.parse(slotResponse.body)
      const testSlotId = slotData.id
      const initialCapacity = slotData.capacity

      // Book the slot
      const bookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId: testSlotId,
          clientName: 'Consistency Test',
          clientEmail: 'consistency@example.com',
        },
      })

      const bookingData = JSON.parse(bookingResponse.body)
      const bookingId = bookingData.id

      // Check slot after booking
      const slotAfterBooking = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/availability/${testSlotId}`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      const slotDataAfterBooking = JSON.parse(slotAfterBooking.body)
      expect(slotDataAfterBooking.currentBookings).toBe(1)

      // Cancel booking
      await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${bookingId}/cancel`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: { reason: 'Test cancellation' },
      })

      // Check slot after cancellation
      const slotAfterCancellation = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/availability/${testSlotId}`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      const slotDataAfterCancellation = JSON.parse(slotAfterCancellation.body)
      expect(slotDataAfterCancellation.currentBookings).toBe(0)
      expect(slotDataAfterCancellation.capacity).toBe(initialCapacity)
    })
  })

  describe('Empty and Null Value Handling', () => {
    it('should reject empty client name', async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Empty Name Test',
          startTime: '09:00',
          endTime: '10:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      const slotData = JSON.parse(slotResponse.body)

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId: slotData.id,
          clientName: '', // Empty
          clientEmail: 'test@example.com',
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject null capacity', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Null Capacity Test',
          startTime: '09:00',
          endTime: '10:00',
          recurrence: 'daily',
          capacity: null, // Null
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })
})
