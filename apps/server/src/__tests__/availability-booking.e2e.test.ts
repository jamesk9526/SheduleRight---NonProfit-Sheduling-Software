import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createServer } from '../index.js'
import type { FastifyInstance } from 'fastify'
import { generateTestUser, generateTestOrg, generateTestSite, generateCompleteSeedData } from './test-utils.js'
import jwt from 'jsonwebtoken'

/**
 * E2E API Tests for Availability and Booking Endpoints
 *
 * Tests the complete HTTP flow from request to response,
 * including authentication, validation, and error handling
 */

describe('E2E: Availability & Booking Endpoints', () => {
  let server: FastifyInstance
  let accessToken: string
  let testOrg: ReturnType<typeof generateTestOrg>
  let testSite: ReturnType<typeof generateTestSite>

  beforeAll(async () => {
    // Start test server
    server = await createServer()

    // Create test organization and user
    testOrg = generateTestOrg()
    const testUser = generateTestUser({
      orgId: testOrg.id,
      roles: ['STAFF', 'ADMIN'],
    })

    // Generate JWT token for tests
    accessToken = jwt.sign(
      {
        userId: testUser.id,
        email: testUser.email,
        orgId: testOrg.id,
        roles: testUser.roles,
      },
      'test-secret-key',
      { expiresIn: '1h' }
    )

    // Create test site
    testSite = generateTestSite(testOrg.id)

    console.log('Test server started')
  })

  afterAll(async () => {
    await server.close()
  })

  describe('POST /api/v1/sites/:siteId/availability', () => {
    it('should create availability slot with valid data', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          title: 'Morning Hours',
          description: 'Morning consultation slots',
          startTime: '09:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
          buffer: 5,
        },
      })

      expect(response.statusCode).toBe(201)
      const data = JSON.parse(response.body)
      expect(data.title).toBe('Morning Hours')
      expect(data.capacity).toBe(5)
      expect(data.currentBookings).toBe(0)
      expect(data.status).toBe('active')
    })

    it('should reject with missing authentication', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        payload: {
          title: 'Test',
          startTime: '09:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject slot with invalid time (end before start)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          title: 'Invalid Slot',
          startTime: '14:00',
          endTime: '09:00', // Invalid: end before start
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should require dayOfWeek for weekly slots', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          title: 'Weekly Slot',
          startTime: '10:00',
          endTime: '11:00',
          recurrence: 'weekly', // Missing dayOfWeek
          capacity: 5,
          durationMinutes: 60,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should require specificDate for one-time slots', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          title: 'One-time Event',
          startTime: '14:00',
          endTime: '15:00',
          recurrence: 'once', // Missing specificDate
          capacity: 20,
          durationMinutes: 60,
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('GET /api/v1/sites/:siteId/availability', () => {
    it('should list all availability slots for a site', async () => {
      // First create a slot
      await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          title: 'Test Slot',
          startTime: '09:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      // Then list slots
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('POST /api/v1/sites/:siteId/bookings', () => {
    let slotId: string

    beforeAll(async () => {
      // Create a slot for booking tests
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          title: 'Booking Test Slot',
          startTime: '09:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 10,
          durationMinutes: 30,
        },
      })

      const data = JSON.parse(response.body)
      slotId = data.id
    })

    it('should create booking without authentication (public)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
          clientPhone: '+1-555-1234',
        },
      })

      expect(response.statusCode).toBe(201)
      const data = JSON.parse(response.body)
      expect(data.clientName).toBe('John Doe')
      expect(data.clientEmail).toBe('john@example.com')
      expect(data.status).toBe('pending')
    })

    it('should validate required booking fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          // Missing clientName and clientEmail
        },
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.body)
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should reject invalid email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'Jane Doe',
          clientEmail: 'invalid-email', // Invalid format
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('GET /api/v1/sites/:siteId/bookings', () => {
    it('should require staff role to list bookings', async () => {
      // Create a client token (non-staff)
      const clientToken = jwt.sign(
        {
          userId: 'user-123',
          email: 'client@example.com',
          orgId: testOrg.id,
          roles: ['CLIENT'],
        },
        'test-secret-key',
        { expiresIn: '1h' }
      )

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        headers: {
          authorization: `Bearer ${clientToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should list bookings for staff users', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should filter bookings by status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/bookings?status=pending`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(Array.isArray(data.data)).toBe(true)
      if (data.data.length > 0) {
        expect(data.data[0].status).toBe('pending')
      }
    })
  })

  describe('PUT /api/v1/bookings/:bookingId/confirm', () => {
    let bookingId: string

    beforeAll(async () => {
      // Create a booking first
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          title: 'Confirm Test Slot',
          startTime: '13:00',
          endTime: '15:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 60,
        },
      })

      const slotData = JSON.parse(slotResponse.body)
      const slotId = slotData.id

      const bookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'Test Client',
          clientEmail: 'test@example.com',
        },
      })

      const bookingData = JSON.parse(bookingResponse.body)
      bookingId = bookingData.id
    })

    it('should confirm pending booking', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${bookingId}/confirm`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.status).toBe('confirmed')
    })

    it('should require staff role to confirm', async () => {
      const clientToken = jwt.sign(
        {
          userId: 'user-456',
          email: 'another@example.com',
          orgId: testOrg.id,
          roles: ['CLIENT'],
        },
        'test-secret-key',
        { expiresIn: '1h' }
      )

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${bookingId}/confirm`,
        headers: {
          authorization: `Bearer ${clientToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('PUT /api/v1/bookings/:bookingId/cancel', () => {
    let bookingId: string

    beforeAll(async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          title: 'Cancel Test Slot',
          startTime: '10:00',
          endTime: '11:00',
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
          clientName: 'Cancel Test',
          clientEmail: 'cancel@example.com',
        },
      })

      const bookingData = JSON.parse(bookingResponse.body)
      bookingId = bookingData.id
    })

    it('should cancel booking', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${bookingId}/cancel`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          reason: 'Client request',
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.status).toBe('cancelled')
    })
  })

  describe('GET /api/v1/bookings/me', () => {
    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/bookings/me',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return authenticated user bookings', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/bookings/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent slot', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/availability/non-existent-slot`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })

    it('should return 404 for non-existent booking', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/bookings/non-existent-booking',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })

    it('should handle server errors gracefully', async () => {
      // This would test actual server errors - depends on specific error conditions
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/invalid-site/availability`,
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          title: 'Test',
          startTime: '09:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      // Should be 4xx or 5xx, but not crash
      expect(response.statusCode).toBeGreaterThanOrEqual(400)
    })
  })
})
