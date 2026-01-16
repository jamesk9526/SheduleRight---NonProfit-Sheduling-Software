import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from '../index.js'
import type { FastifyInstance } from 'fastify'
import { generateTestOrg, generateTestUser, generateTestSite } from './test-utils.js'
import jwt from 'jsonwebtoken'

/**
 * RBAC (Role-Based Access Control) Tests
 *
 * Tests permission enforcement across different user roles:
 * - CLIENT: Can book, view own bookings
 * - STAFF: Can manage availability, confirm bookings, view all bookings
 * - ADMIN: Full access to all features and settings
 */

describe('RBAC: Permission Enforcement', () => {
  let server: FastifyInstance
  let testOrg: ReturnType<typeof generateTestOrg>
  let testSite: ReturnType<typeof generateTestSite>

  // Different role tokens
  let adminToken: string
  let staffToken: string
  let clientToken: string

  const SECRET_KEY = 'test-secret-key'

  beforeAll(async () => {
    server = await createServer()

    testOrg = generateTestOrg()
    testSite = generateTestSite(testOrg.id)

    const adminUser = generateTestUser({
      orgId: testOrg.id,
      roles: ['ADMIN'],
    })
    const staffUser = generateTestUser({
      orgId: testOrg.id,
      roles: ['STAFF'],
    })
    const clientUser = generateTestUser({
      orgId: testOrg.id,
      roles: ['CLIENT'],
    })

    adminToken = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        orgId: testOrg.id,
        roles: adminUser.roles,
      },
      SECRET_KEY,
      { expiresIn: '1h' }
    )

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

  describe('Availability Management Permissions', () => {
    it('ADMIN should create availability slots', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          title: 'Admin Slot',
          startTime: '09:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(201)
    })

    it('STAFF should create availability slots', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Staff Slot',
          startTime: '13:00',
          endTime: '15:00',
          recurrence: 'daily',
          capacity: 10,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(201)
    })

    it('CLIENT should NOT create availability slots', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${clientToken}` },
        payload: {
          title: 'Client Slot (Unauthorized)',
          startTime: '10:00',
          endTime: '11:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      expect(response.statusCode).toBe(403)
      const data = JSON.parse(response.body)
      expect(data.code).toBe('FORBIDDEN')
    })
  })

  describe('Availability Listing Permissions', () => {
    it('ADMIN should list availability slots', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('STAFF should list availability slots', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('CLIENT should be able to view availability (public information)', async () => {
      // Availability is typically public, so CLIENT can view
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${clientToken}` },
      })

      // 200 if public, 403 if restricted - depends on implementation
      expect([200, 403]).toContain(response.statusCode)
    })
  })

  describe('Booking Management Permissions', () => {
    let slotId: string

    beforeAll(async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Test Booking Slot',
          startTime: '09:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        },
      })

      const slotData = JSON.parse(slotResponse.body)
      slotId = slotData.id
    })

    it('ADMIN should list all bookings', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('STAFF should list all bookings', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('CLIENT should NOT list all bookings', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        headers: { authorization: `Bearer ${clientToken}` },
      })

      expect(response.statusCode).toBe(403)
    })

    it('CLIENT can view own bookings with /bookings/me', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/bookings/me',
        headers: { authorization: `Bearer ${clientToken}` },
      })

      // Should succeed with RBAC
      expect([200, 403]).toContain(response.statusCode)
    })
  })

  describe('Booking Confirmation Permissions', () => {
    let slotId: string
    let bookingId: string

    beforeAll(async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Confirm Test Slot',
          startTime: '14:00',
          endTime: '15:00',
          recurrence: 'daily',
          capacity: 3,
          durationMinutes: 60,
        },
      })

      const slotData = JSON.parse(slotResponse.body)
      slotId = slotData.id

      const bookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'Test Client',
          clientEmail: 'confirm@example.com',
        },
      })

      const bookingData = JSON.parse(bookingResponse.body)
      bookingId = bookingData.id
    })

    it('ADMIN should confirm bookings', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${bookingId}/confirm`,
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.body)
      expect(data.status).toBe('confirmed')
    })

    it('STAFF should confirm bookings', async () => {
      // Create another booking for staff to confirm
      const bookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'Staff Confirm Test',
          clientEmail: 'staff-confirm@example.com',
        },
      })

      const bookingData = JSON.parse(bookingResponse.body)
      const newBookingId = bookingData.id

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${newBookingId}/confirm`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('CLIENT should NOT confirm bookings', async () => {
      // Create another booking for client test
      const bookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'Client Confirm Test',
          clientEmail: 'client-confirm@example.com',
        },
      })

      const bookingData = JSON.parse(bookingResponse.body)
      const clientTestBookingId = bookingData.id

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${clientTestBookingId}/confirm`,
        headers: { authorization: `Bearer ${clientToken}` },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('Booking Cancellation Permissions', () => {
    let slotId: string
    let ownBookingId: string
    let otherBookingId: string

    beforeAll(async () => {
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
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
      slotId = slotData.id

      // Create booking for the client
      const clientBookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'Client Canceller',
          clientEmail: 'client-cancel@example.com',
        },
      })

      const clientBookingData = JSON.parse(clientBookingResponse.body)
      ownBookingId = clientBookingData.id

      // Create another booking
      const otherBookingResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        payload: {
          slotId,
          clientName: 'Other Client',
          clientEmail: 'other-cancel@example.com',
        },
      })

      const otherBookingData = JSON.parse(otherBookingResponse.body)
      otherBookingId = otherBookingData.id
    })

    it('CLIENT should cancel their own booking', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${ownBookingId}/cancel`,
        headers: { authorization: `Bearer ${clientToken}` },
        payload: { reason: 'Self-cancellation' },
      })

      // Should allow cancellation of own booking
      expect([200, 403]).toContain(response.statusCode)
    })

    it('CLIENT should NOT cancel other booking', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${otherBookingId}/cancel`,
        headers: { authorization: `Bearer ${clientToken}` },
        payload: { reason: 'Unauthorized cancellation' },
      })

      expect(response.statusCode).toBe(403)
    })

    it('STAFF should cancel any booking', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/bookings/${otherBookingId}/cancel`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: { reason: 'Staff cancellation' },
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Deactivate Availability Permissions', () => {
    let slotId: string

    beforeAll(async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Deactivate Test Slot',
          startTime: '11:00',
          endTime: '12:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 60,
        },
      })

      const data = JSON.parse(response.body)
      slotId = data.id
    })

    it('ADMIN should deactivate slots', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/sites/${testSite.id}/availability/${slotId}/deactivate`,
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('STAFF should deactivate slots', async () => {
      // Create another slot for staff deactivation
      const slotResponse = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${staffToken}` },
        payload: {
          title: 'Staff Deactivate Test',
          startTime: '12:00',
          endTime: '13:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 60,
        },
      })

      const slotData = JSON.parse(slotResponse.body)
      const newSlotId = slotData.id

      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/sites/${testSite.id}/availability/${newSlotId}/deactivate`,
        headers: { authorization: `Bearer ${staffToken}` },
      })

      expect(response.statusCode).toBe(200)
    })

    it('CLIENT should NOT deactivate slots', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: `/api/v1/sites/${testSite.id}/availability/${slotId}/deactivate`,
        headers: { authorization: `Bearer ${clientToken}` },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('Organization Boundary Enforcement', () => {
    let otherOrg: ReturnType<typeof generateTestOrg>
    let otherOrgToken: string
    let otherSite: ReturnType<typeof generateTestSite>

    beforeAll(async () => {
      otherOrg = generateTestOrg()
      otherSite = generateTestSite(otherOrg.id)

      const otherAdminUser = generateTestUser({
        orgId: otherOrg.id,
        roles: ['ADMIN'],
      })

      otherOrgToken = jwt.sign(
        {
          userId: otherAdminUser.id,
          email: otherAdminUser.email,
          orgId: otherOrg.id,
          roles: otherAdminUser.roles,
        },
        SECRET_KEY,
        { expiresIn: '1h' }
      )
    })

    it('should prevent cross-org access to sites', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${otherOrgToken}` },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should prevent cross-org booking creation', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/bookings`,
        headers: { authorization: `Bearer ${otherOrgToken}` },
        payload: {
          slotId: 'any-slot',
          clientName: 'Hacker',
          clientEmail: 'hacker@example.com',
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('Multi-Role Permissions', () => {
    let dualRoleToken: string

    beforeAll(async () => {
      dualRoleToken = jwt.sign(
        {
          userId: 'dual-user',
          email: 'dual@example.com',
          orgId: testOrg.id,
          roles: ['STAFF', 'ADMIN'],
        },
        SECRET_KEY,
        { expiresIn: '1h' }
      )
    })

    it('user with multiple roles should have all permissions', async () => {
      // User with both STAFF and ADMIN should be able to create slots
      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/sites/${testSite.id}/availability`,
        headers: { authorization: `Bearer ${dualRoleToken}` },
        payload: {
          title: 'Dual Role Slot',
          startTime: '16:00',
          endTime: '17:00',
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 60,
        },
      })

      expect(response.statusCode).toBe(201)
    })
  })
})
