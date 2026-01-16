import { randomUUID } from 'crypto'

/**
 * Test data generators and utilities for integration testing
 */

export interface TestUser {
  id: string
  email: string
  name: string
  orgId: string
  roles: string[]
}

export interface TestOrg {
  id: string
  name: string
  timezone: string
}

export interface TestSite {
  id: string
  orgId: string
  name: string
  timezone: string
}

/**
 * Generate test user with admin or staff role
 */
export function generateTestUser(overrides?: Partial<TestUser>): TestUser {
  return {
    id: `user:${randomUUID()}`,
    email: `test-${randomUUID().slice(0, 8)}@example.com`,
    name: 'Test User',
    orgId: `org:${randomUUID()}`,
    roles: ['STAFF'],
    ...overrides,
  }
}

/**
 * Generate test organization
 */
export function generateTestOrg(overrides?: Partial<TestOrg>): TestOrg {
  return {
    id: `org:${randomUUID()}`,
    name: `Test Org ${randomUUID().slice(0, 8)}`,
    timezone: 'America/New_York',
    ...overrides,
  }
}

/**
 * Generate test site
 */
export function generateTestSite(orgId: string, overrides?: Partial<TestSite>): TestSite {
  return {
    id: `site:${randomUUID()}`,
    orgId,
    name: `Test Site ${randomUUID().slice(0, 8)}`,
    timezone: 'America/New_York',
    ...overrides,
  }
}

/**
 * Generate test availability slot
 */
export function generateTestAvailabilitySlot(siteId: string, orgId: string) {
  return {
    siteId,
    orgId,
    title: `Test Slot ${randomUUID().slice(0, 8)}`,
    startTime: '09:00',
    endTime: '12:00',
    recurrence: 'daily' as const,
    capacity: 5,
    durationMinutes: 30,
    buffer: 5,
  }
}

/**
 * Generate test booking
 */
export function generateTestBooking(slotId: string, siteId: string, orgId: string) {
  return {
    slotId,
    siteId,
    orgId,
    clientName: `Client ${randomUUID().slice(0, 8)}`,
    clientEmail: `client-${randomUUID().slice(0, 8)}@example.com`,
    clientPhone: `+1-555-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`,
  }
}

/**
 * Test data seed for complete workflow testing
 */
export function generateCompleteSeedData() {
  const org = generateTestOrg()
  const site = generateTestSite(org.id)
  const user = generateTestUser({ orgId: org.id, roles: ['STAFF'] })
  const slot = generateTestAvailabilitySlot(site.id, org.id)
  const booking = generateTestBooking(slot.id, site.id, org.id)

  return {
    org,
    site,
    user,
    slot,
    booking,
  }
}

/**
 * Validation helpers
 */
export const validators = {
  isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  },

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  isValidTime(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  },

  isValidStatus(status: string): boolean {
    return ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'].includes(status)
  },

  isValidRole(role: string): boolean {
    return ['ADMIN', 'STAFF', 'CLIENT'].includes(role)
  },
}

/**
 * Assertion helpers for common test cases
 */
export const assertions = {
  assertIsSlot(slot: any): void {
    if (!slot) throw new Error('Slot is undefined')
    if (!slot.id) throw new Error('Slot missing id')
    if (!slot.siteId) throw new Error('Slot missing siteId')
    if (!slot.orgId) throw new Error('Slot missing orgId')
    if (typeof slot.capacity !== 'number') throw new Error('Slot missing capacity')
    if (typeof slot.currentBookings !== 'number') throw new Error('Slot missing currentBookings')
  },

  assertIsBooking(booking: any): void {
    if (!booking) throw new Error('Booking is undefined')
    if (!booking.id) throw new Error('Booking missing id')
    if (!booking.slotId) throw new Error('Booking missing slotId')
    if (!booking.clientName) throw new Error('Booking missing clientName')
    if (!booking.clientEmail) throw new Error('Booking missing clientEmail')
    if (!booking.status) throw new Error('Booking missing status')
  },

  assertBookingStatus(booking: any, expectedStatus: string): void {
    if (booking.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${booking.status}`)
    }
  },

  assertCapacityManagement(currentBookings: number, expectedCount: number): void {
    if (currentBookings !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} current bookings, got ${currentBookings}`
      )
    }
  },
}

/**
 * Time helpers for testing
 */
export const timeHelpers = {
  getNextBusinessDay(): Date {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1)
    }
    return date
  },

  getDateString(date: Date = new Date()): string {
    return date.toISOString().split('T')[0]
  },

  getTimeString(hours: number, minutes: number = 0): string {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  },

  addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date)
    result.setMinutes(result.getMinutes() + minutes)
    return result
  },

  addHours(date: Date, hours: number): Date {
    const result = new Date(date)
    result.setHours(result.getHours() + hours)
    return result
  },
}

/**
 * Mock data seeding
 */
export class TestDataSeed {
  private data: Map<string, any> = new Map()

  /**
   * Add an organization
   */
  addOrg(overrides?: Partial<TestOrg>): TestOrg {
    const org = generateTestOrg(overrides)
    this.data.set(`org:${org.id}`, org)
    return org
  }

  /**
   * Add a site
   */
  addSite(orgId: string, overrides?: Partial<TestSite>): TestSite {
    const site = generateTestSite(orgId, overrides)
    this.data.set(`site:${site.id}`, site)
    return site
  }

  /**
   * Add a user
   */
  addUser(overrides?: Partial<TestUser>): TestUser {
    const user = generateTestUser(overrides)
    this.data.set(`user:${user.id}`, user)
    return user
  }

  /**
   * Add an availability slot
   */
  addAvailability(siteId: string, orgId: string, overrides?: any) {
    const slot = generateTestAvailabilitySlot(siteId, orgId)
    const id = `availability:${randomUUID()}`
    this.data.set(id, { ...slot, id, _id: id })
    return { ...slot, id }
  }

  /**
   * Add a booking
   */
  addBooking(slotId: string, siteId: string, orgId: string, overrides?: any) {
    const booking = generateTestBooking(slotId, siteId, orgId)
    const id = `booking:${randomUUID()}`
    this.data.set(id, {
      ...booking,
      id,
      _id: id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...overrides,
    })
    return { ...booking, id, status: 'pending' }
  }

  /**
   * Get all seeded data
   */
  all() {
    return Array.from(this.data.values())
  }

  /**
   * Clear all data
   */
  clear() {
    this.data.clear()
  }

  /**
   * Get by ID
   */
  get(id: string) {
    return this.data.get(id)
  }
}
